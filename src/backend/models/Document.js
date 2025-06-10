// src/backend/models/Document.js

/**
 * =================================================================
 * EDMS 1CAR - Document Model (Updated Complete)
 * Document management with version control and workflow
 * Based on C-PR-VM-001, C-TD-VM-001, C-PR-AR-001 requirements
 * Updated with transaction support and enhanced field handling
 * =================================================================
 */

const { dbManager } = require('../config/database');
const DocumentCodeGenerator = require('../utils/documentCodeGenerator');
const AuditService = require('../services/auditService');

class Document {
    // === Constructor ===
    constructor(documentData = {}) {
        // Core document fields
        this.id = documentData.id || null;
        this.document_code = documentData.document_code || null;
        this.title = documentData.title || null;
        this.description = documentData.description || null;
        this.type = documentData.type || null;
        this.department = documentData.department || null;
        this.status = documentData.status || 'draft';
        this.version = documentData.version || '01.00';
        this.priority = documentData.priority || 'normal';
        this.security_level = documentData.security_level || 'internal';
        
        // User references
        this.author_id = documentData.author_id || null;
        this.reviewer_id = documentData.reviewer_id || null;
        this.approver_id = documentData.approver_id || null;
        
        // File information
        this.file_path = documentData.file_path || null;
        this.file_name = documentData.file_name || null;
        this.file_size = documentData.file_size || null;
        this.mime_type = documentData.mime_type || null;
        
        // Enhanced document fields
        this.scope_of_application = documentData.scope_of_application || null;
        
        // Recipients field - handle JSON parsing from database
        if (documentData.recipients) {
            if (typeof documentData.recipients === 'string') {
                try {
                    this.recipients = JSON.parse(documentData.recipients);
                } catch (error) {
                    console.warn('Failed to parse recipients JSON:', error);
                    this.recipients = [];
                }
            } else if (Array.isArray(documentData.recipients)) {
                this.recipients = documentData.recipients;
            } else {
                this.recipients = [];
            }
        } else {
            this.recipients = [];
        }
        
        // Review and retention fields
        this.review_cycle = documentData.review_cycle || 365;
        this.retention_period = documentData.retention_period || 2555;
        this.next_review_date = documentData.next_review_date || null;
        this.disposal_date = documentData.disposal_date || null;
        
        // Change tracking fields
        this.change_reason = documentData.change_reason || null;
        this.change_summary = documentData.change_summary || null;
        this.keywords = documentData.keywords || null;
        
        // Timestamps
        this.created_at = documentData.created_at || null;
        this.updated_at = documentData.updated_at || null;
        this.published_at = documentData.published_at || null;
        this.archived_at = documentData.archived_at || null;

        // Additional fields from joins
        this.author_name = documentData.author_name || null;
        this.author_department = documentData.author_department || null;
        this.reviewer_name = documentData.reviewer_name || null;
        this.approver_name = documentData.approver_name || null;
    }

    // === Static Configuration ===
    /**
     * Valid document types based on C-TD-MG-005
     */
    static get VALID_TYPES() {
        return ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC'];
    }

    /**
     * Valid document statuses
     */
    static get VALID_STATUSES() {
        return ['draft', 'review', 'published', 'archived', 'disposed'];
    }

    /**
     * Valid priority levels
     */
    static get VALID_PRIORITIES() {
        return ['low', 'normal', 'high', 'urgent'];
    }

    /**
     * Valid security levels
     */
    static get VALID_SECURITY_LEVELS() {
        return ['public', 'internal', 'confidential', 'restricted'];
    }

    /**
     * Valid departments based on 1CAR structure
     */
    static get VALID_DEPARTMENTS() {
        return [
            'Ban Giám đốc',
            'Phòng Phát triển Nhượng quyền',
            'Phòng Đào tạo Tiêu chuẩn',
            'Phòng Marketing',
            'Phòng Kỹ thuật QC',
            'Phòng Tài chính',
            'Phòng Công nghệ Hệ thống',
            'Phòng Pháp lý',
            'Bộ phận Tiếp nhận CSKH',
            'Bộ phận Kỹ thuật Garage',
            'Bộ phận QC Garage',
            'Bộ phận Kho/Kế toán Garage',
            'Bộ phận Marketing Garage',
            'Quản lý Garage'
        ];
    }

    // === Core Methods ===
    /**
     * Create new document with auto-generated document code
     */
    static async create(documentData, createdBy = null) {
        try {
            const {
                title,
                description,
                type,
                department,
                priority = 'normal',
                security_level = 'internal',
                scope_of_application,
                recipients,
                review_cycle,
                retention_period,
                change_reason,
                change_summary,
                keywords,
                author_id
            } = documentData;

            // Validate required fields
            if (!title || !type || !department || !author_id) {
                throw new Error('Missing required fields: title, type, department, author_id');
            }

            // Validate document type
            if (!this.VALID_TYPES.includes(type)) {
                throw new Error(`Invalid document type: ${type}. Valid types: ${this.VALID_TYPES.join(', ')}`);
            }

            // Validate department
            if (!this.VALID_DEPARTMENTS.includes(department)) {
                throw new Error(`Invalid department: ${department}`);
            }

            // Validate priority
            if (!this.VALID_PRIORITIES.includes(priority)) {
                throw new Error(`Invalid priority: ${priority}. Valid priorities: ${this.VALID_PRIORITIES.join(', ')}`);
            }

            // Validate security level
            if (!this.VALID_SECURITY_LEVELS.includes(security_level)) {
                throw new Error(`Invalid security level: ${security_level}. Valid levels: ${this.VALID_SECURITY_LEVELS.join(', ')}`);
            }

            // Generate document code using DocumentCodeGenerator
            const document_code = await DocumentCodeGenerator.generateCode(type, department);

            // Verify the generated code doesn't exist (should not happen, but safety check)
            const existingCode = await DocumentCodeGenerator.codeExists(document_code);
            if (existingCode) {
                throw new Error(`Generated document code ${document_code} already exists`);
            }

            // Calculate next review date if review cycle is provided
            let next_review_date = null;
            if (review_cycle) {
                const reviewDate = new Date();
                reviewDate.setDate(reviewDate.getDate() + review_cycle);
                next_review_date = reviewDate.toISOString().split('T')[0];
            }

            // Calculate disposal date if retention period is provided
            let disposal_date = null;
            if (retention_period) {
                const disposalDate = new Date();
                disposalDate.setDate(disposalDate.getDate() + retention_period);
                disposal_date = disposalDate.toISOString().split('T')[0];
            }

            // Handle recipients - ensure it's JSON string for database
            let recipientsJson = null;
            if (recipients) {
                if (Array.isArray(recipients)) {
                    recipientsJson = JSON.stringify(recipients);
                } else if (typeof recipients === 'string') {
                    try {
                        // Validate it's valid JSON
                        JSON.parse(recipients);
                        recipientsJson = recipients;
                    } catch (error) {
                        throw new Error('Invalid recipients JSON format');
                    }
                } else {
                    throw new Error('Recipients must be an array or valid JSON string');
                }
            }

            // Insert document
            const result = await dbManager.run(`
                INSERT INTO documents (
                    document_code, title, description, type, department, 
                    priority, security_level, author_id, scope_of_application,
                    recipients, review_cycle, retention_period, next_review_date,
                    disposal_date, change_reason, change_summary, keywords,
                    status, version, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', '01.00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
                document_code, title, description, type, department,
                priority, security_level, author_id, scope_of_application,
                recipientsJson, review_cycle, retention_period, next_review_date,
                disposal_date, change_reason, change_summary, keywords
            ]);

            // Create initial version record
            await dbManager.run(`
                INSERT INTO document_versions (
                    document_id, version, change_reason, change_summary, 
                    change_type, created_by, created_at
                ) VALUES (?, '01.00', ?, ?, 'major', ?, CURRENT_TIMESTAMP)
            `, [
                result.lastID,
                change_reason || 'Initial version',
                change_summary || 'Document created',
                author_id
            ]);

            // Log audit event - use author_id if createdBy not provided
            const auditUserId = createdBy || author_id;
            await AuditService.log({
                action: 'DOCUMENT_CREATED',
                userId: auditUserId,
                resourceType: 'document',
                resourceId: result.lastID,
                details: {
                    document_code,
                    title,
                    type,
                    department,
                    priority,
                    security_level
                }
            });

            // Return created document
            return await this.findById(result.lastID);

        } catch (error) {
            console.error('Error creating document:', error);
            throw error;
        }
    }

    /**
     * Update document
     */
    static async update(id, updateData, updatedBy = null) {
        try {
            const {
                title,
                description,
                priority,
                security_level,
                scope_of_application,
                recipients,
                review_cycle,
                retention_period,
                change_reason,
                change_summary,
                keywords
            } = updateData;

            // Build dynamic update query
            const updateFields = [];
            const updateValues = [];

            if (title !== undefined) {
                updateFields.push('title = ?');
                updateValues.push(title);
            }
            if (description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(description);
            }
            if (priority !== undefined) {
                if (!this.VALID_PRIORITIES.includes(priority)) {
                    throw new Error(`Invalid priority: ${priority}`);
                }
                updateFields.push('priority = ?');
                updateValues.push(priority);
            }
            if (security_level !== undefined) {
                if (!this.VALID_SECURITY_LEVELS.includes(security_level)) {
                    throw new Error(`Invalid security level: ${security_level}`);
                }
                updateFields.push('security_level = ?');
                updateValues.push(security_level);
            }
            if (scope_of_application !== undefined) {
                updateFields.push('scope_of_application = ?');
                updateValues.push(scope_of_application);
            }
            if (recipients !== undefined) {
                // Handle recipients - ensure it's JSON string for database
                let recipientsJson = null;
                if (recipients) {
                    if (Array.isArray(recipients)) {
                        recipientsJson = JSON.stringify(recipients);
                    } else if (typeof recipients === 'string') {
                        try {
                            // Validate it's valid JSON
                            JSON.parse(recipients);
                            recipientsJson = recipients;
                        } catch (error) {
                            throw new Error('Invalid recipients JSON format');
                        }
                    } else {
                        throw new Error('Recipients must be an array or valid JSON string');
                    }
                }
                updateFields.push('recipients = ?');
                updateValues.push(recipientsJson);
            }
            if (review_cycle !== undefined) {
                updateFields.push('review_cycle = ?');
                updateValues.push(review_cycle);
            }
            if (retention_period !== undefined) {
                updateFields.push('retention_period = ?');
                updateValues.push(retention_period);
            }
            if (change_reason !== undefined) {
                updateFields.push('change_reason = ?');
                updateValues.push(change_reason);
            }
            if (change_summary !== undefined) {
                updateFields.push('change_summary = ?');
                updateValues.push(change_summary);
            }
            if (keywords !== undefined) {
                updateFields.push('keywords = ?');
                updateValues.push(keywords);
            }

            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }

            // Always update the updated_at timestamp
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(id);

            const sql = `UPDATE documents SET ${updateFields.join(', ')} WHERE id = ?`;
            await dbManager.run(sql, updateValues);

            // Log audit event
            if (updatedBy) {
                await AuditService.log({
                    action: 'DOCUMENT_UPDATED',
                    userId: updatedBy,
                    resourceType: 'document',
                    resourceId: id,
                    details: updateData
                });
            }

            return await this.findById(id);

        } catch (error) {
            console.error('Error updating document:', error);
            throw error;
        }
    }

    /**
     * Create new version of document with transaction support
     */
    async createNewVersion(newVersion, changeReason, changeSummary, userId) {
        try {
            // Validate version format
            const versionRegex = /^\d{2}\.\d{2}$/;
            if (!versionRegex.test(newVersion)) {
                throw new Error('Invalid version format. Use XX.YY format (e.g., 01.00, 02.01)');
            }

            // Execute within transaction
            return await dbManager.transaction(async (transactionDb) => {
                // Check if version already exists
                const existingVersion = await transactionDb.get(
                    'SELECT id FROM document_versions WHERE document_id = ? AND version = ?',
                    [this.id, newVersion]
                );
                if (existingVersion) {
                    throw new Error('Version already exists');
                }

                // Create version history entry for current version
                await transactionDb.run(`
                    INSERT INTO document_versions (
                        document_id, version, file_path, file_name, file_size,
                        change_reason, change_summary, change_type, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'major', ?)
                `, [
                    this.id,
                    this.version,
                    this.file_path,
                    this.file_name,
                    this.file_size,
                    changeReason,
                    changeSummary,
                    userId
                ]);

                // Update document with new version
                await transactionDb.run(`
                    UPDATE documents
                    SET version = ?,
                        change_reason = ?,
                        change_summary = ?,
                        status = 'draft',
                        file_path = NULL,
                        file_name = NULL,
                        file_size = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [newVersion, changeReason, changeSummary, this.id]);

                // Log audit event
                await AuditService.log({
                    action: 'VERSION_CREATED',
                    userId,
                    resourceType: 'document',
                    resourceId: this.id,
                    details: {
                        oldVersion: this.version,
                        newVersion,
                        changeReason,
                        changeSummary
                    }
                });

                // Refresh document data
                const updatedDocument = await Document.findById(this.id);
                Object.assign(this, updatedDocument);

                return this;
            });

        } catch (error) {
            console.error('Error creating new version:', error);
            throw error;
        }
    }

    // === Status Management ===
    /**
     * Internal method to set document status and related timestamps
     * This method should primarily be called from WorkflowService
     * @param {number} id - Document ID
     * @param {string} newStatus - New status
     * @param {Object} relevantDateUpdates - Date fields to update
     * @param {number} updatedBy - User ID making the change
     */
    static async _internalSetStatus(id, newStatus, relevantDateUpdates = {}, updatedBy = null) {
        try {
            if (!this.VALID_STATUSES.includes(newStatus)) {
                throw new Error(`Invalid status: ${newStatus}`);
            }

            // Build update fields for status and timestamps
            const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
            const updateValues = [newStatus];

            // Handle relevant date updates
            if (relevantDateUpdates.published_at !== undefined) {
                updateFields.push('published_at = ?');
                updateValues.push(relevantDateUpdates.published_at);
            }
            if (relevantDateUpdates.archived_at !== undefined) {
                updateFields.push('archived_at = ?');
                updateValues.push(relevantDateUpdates.archived_at);
            }
            if (relevantDateUpdates.disposal_date !== undefined) {
                updateFields.push('disposal_date = ?');
                updateValues.push(relevantDateUpdates.disposal_date);
            }

            updateValues.push(id);

            const sql = `UPDATE documents SET ${updateFields.join(', ')} WHERE id = ?`;
            await dbManager.run(sql, updateValues);

            return await this.findById(id);

        } catch (error) {
            console.error('Error setting document status:', error);
            throw error;
        }
    }

    /**
     * Legacy updateStatus method - kept for backward compatibility
     * Consider using WorkflowService for status transitions instead
     */
    static async updateStatus(id, newStatus, updatedBy = null) {
        try {
            // Determine relevant date updates based on status
            const relevantDateUpdates = {};
            if (newStatus === 'published') {
                relevantDateUpdates.published_at = new Date().toISOString();
            } else if (newStatus === 'archived') {
                relevantDateUpdates.archived_at = new Date().toISOString();
            }

            // Update status using internal method
            const updatedDocument = await this._internalSetStatus(id, newStatus, relevantDateUpdates, updatedBy);

            // Log audit event (this should ideally be handled by WorkflowService)
            if (updatedBy) {
                await AuditService.log({
                    action: 'DOCUMENT_STATUS_CHANGED',
                    userId: updatedBy,
                    resourceType: 'document',
                    resourceId: id,
                    details: { newStatus }
                });
            }

            return updatedDocument;

        } catch (error) {
            console.error('Error updating document status:', error);
            throw error;
        }
    }

    // === Retrieval Methods ===
    /**
     * Find document by ID
     */
    static async findById(id) {
        try {
            // ***** SỬA LỖI SQL TẠI ĐÂY *****
            const document = await dbManager.get(`
                SELECT
                    d.*,
                    author.full_name as author_name,
                    reviewer.full_name as reviewer_name,
                    approver.full_name as approver_name
                FROM documents d
                LEFT JOIN users author ON d.author_id = author.id
                LEFT JOIN users reviewer ON d.reviewer_id = reviewer.id
                LEFT JOIN users approver ON d.approver_id = approver.id
                WHERE d.id = ?
            `, [id]);
            // ***** KẾT THÚC SỬA LỖI *****

            return document ? new Document(document) : null;
        } catch (error) {
            console.error('Error finding document by ID:', error);
            throw error;
        }
    }

    /**
     * Find document by document code
     */
    static async findByCode(document_code) {
        try {
            const document = await dbManager.get(`
                SELECT d.*, u.name as author_name, u.department as author_department,
                       r.name as reviewer_name, a.name as approver_name
                FROM documents d
                LEFT JOIN users u ON d.author_id = u.id
                LEFT JOIN users r ON d.reviewer_id = r.id
                LEFT JOIN users a ON d.approver_id = a.id
                WHERE d.document_code = ?
            `, [document_code]);

            return document ? new Document(document) : null;
        } catch (error) {
            console.error('Error finding document by code:', error);
            throw error;
        }
    }

    /**
     * Check if a document is favorited by a user
     * @param {number} documentId - The document ID
     * @param {number} userId - The user ID
     * @returns {boolean} - True if favorited, false otherwise
     */
    // ***** THÊM HÀM MỚI TẠI ĐÂY *****
    static async isFavorite(documentId, userId) {
        try {
            const result = await dbManager.get(
                `SELECT COUNT(*) as count FROM user_favorites WHERE document_id = ? AND user_id = ?`,
                [documentId, userId]
            );
            return result && result.count > 0;
        } catch (error) {
            console.error('Error checking favorite status:', error);
            throw error;
        }
    }
    // ***** KẾT THÚC THÊM HÀM MỚI *****

    // ĐỔI TÊN: từ getAll thành search để khớp với DocumentService
    /**
     * Search documents with filtering and pagination
     */
    static async search(filters = {}, page = 1, limit = 20) {
        try {
            const {
                type,
                department,
                status,
                priority,
                security_level,
                author_id,
                search,
                date_from,
                date_to
            } = filters;

            let whereConditions = [];
            let params = [];

            // Build WHERE clause
            if (type) {
                whereConditions.push('d.type = ?');
                params.push(type);
            }
            if (department) {
                whereConditions.push('d.department = ?');
                params.push(department);
            }
            if (status) {
                whereConditions.push('d.status = ?');
                params.push(status);
            }
            if (priority) {
                whereConditions.push('d.priority = ?');
                params.push(priority);
            }
            if (security_level) {
                whereConditions.push('d.security_level = ?');
                params.push(security_level);
            }
            if (author_id) {
                whereConditions.push('d.author_id = ?');
                params.push(author_id);
            }
            if (search) {
                whereConditions.push('(d.title LIKE ? OR d.description LIKE ? OR d.document_code LIKE ? OR d.keywords LIKE ?)');
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
            if (date_from) {
                whereConditions.push('d.created_at >= ?');
                params.push(date_from);
            }
            if (date_to) {
                whereConditions.push('d.created_at <= ?');
                params.push(date_to);
            }

            const whereClause = whereConditions.length > 0 
                ? 'WHERE ' + whereConditions.join(' AND ') 
                : '';

            // Get total count
            const countResult = await dbManager.get(`
                SELECT COUNT(*) as total 
                FROM documents d 
                ${whereClause}
            `, params);

            // Get paginated data
            const offset = (page - 1) * limit;
            const documents = await dbManager.all(`
                SELECT 
                    d.*,
                    u.name as author_name,
                    u.department as author_department
                FROM documents d
                LEFT JOIN users u ON d.author_id = u.id
                ${whereClause}
                ORDER BY d.updated_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            // Calculate pagination metadata
            const total = countResult.total;
            const totalPages = Math.ceil(total / limit);

            return {
                data: documents.map(doc => new Document(doc)),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {
            console.error('Error getting all documents:', error);
            throw error;
        }
    }

    /**
     * Get documents due for review
     */
    static async getDueForReview(daysBefore = 30) {
        try {
            const documents = await dbManager.all(`
                SELECT 
                    d.*,
                    u.name as author_name,
                    u.email as author_email
                FROM documents d
                LEFT JOIN users u ON d.author_id = u.id
                WHERE d.status = 'published'
                    AND d.next_review_date IS NOT NULL
                    AND d.next_review_date <= date('now', '+' || ? || ' days')
                ORDER BY d.next_review_date ASC
            `, [daysBefore]);

            return documents.map(doc => new Document(doc));

        } catch (error) {
            console.error('Error getting documents due for review:', error);
            throw error;
        }
    }

    // === Deletion ===
    /**
     * Delete document (soft delete by changing status)
     */
    static async delete(id, deletedBy = null) {
        try {
            // Instead of hard delete, mark as disposed
            await this.updateStatus(id, 'disposed', deletedBy);

            // Log audit event
            if (deletedBy) {
                await AuditService.log({
                    action: 'DOCUMENT_DELETED',
                    userId: deletedBy,
                    resourceType: 'document',
                    resourceId: id,
                    details: { action: 'soft_delete', status: 'disposed' }
                });
            }

            return { success: true, message: 'Document marked as disposed' };

        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    }

    // === Statistics ===
    /**
     * Get document statistics
     */
    static async getStatistics(filters = {}) {
        try {
            const { department, author_id } = filters;

            let whereConditions = [];
            let params = [];

            if (department) {
                whereConditions.push('department = ?');
                params.push(department);
            }
            if (author_id) {
                whereConditions.push('author_id = ?');
                params.push(author_id);
            }

            const whereClause = whereConditions.length > 0 
                ? 'WHERE ' + whereConditions.join(' AND ') 
                : '';

            const stats = await dbManager.get(`
                SELECT
                    COUNT(*) as total_documents,
                    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
                    COUNT(CASE WHEN status = 'review' THEN 1 END) as review_count,
                    COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count,
                    COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as recent_count,
                    COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_count,
                    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count
                FROM documents
                ${whereClause}
            `, params);

            return stats;

        } catch (error) {
            console.error('Error getting document statistics:', error);
            throw error;
        }
    }

    // === History Methods ===
    /**
     * Get version history
     */
    async getVersionHistory() {
        try {
            const versions = await dbManager.all(`
                SELECT
                    dv.*,
                    u.name as created_by_name
                FROM document_versions dv
                LEFT JOIN users u ON dv.created_by = u.id
                WHERE dv.document_id = ?
                ORDER BY dv.created_at DESC
            `, [this.id]);

            return versions;

        } catch (error) {
            console.error('Error getting version history:', error);
            throw error;
        }
    }

    /**
     * Get workflow history
     */
    async getWorkflowHistory() {
        try {
            const transitions = await dbManager.all(`
                SELECT
                    wt.*,
                    u.name as transitioned_by_name
                FROM workflow_transitions wt
                LEFT JOIN users u ON wt.transitioned_by = u.id
                WHERE wt.document_id = ?
                ORDER BY wt.transitioned_at DESC
            `, [this.id]);

            return transitions;

        } catch (error) {
            console.error('Error getting workflow history:', error);
            throw error;
        }
    }

    // === Serialization ===
    /**
     * Convert to JSON (for API responses)
     */
    toJSON() {
        return {
            id: this.id,
            document_code: this.document_code,
            title: this.title,
            description: this.description,
            type: this.type,
            department: this.department,
            status: this.status,
            version: this.version,
            priority: this.priority,
            security_level: this.security_level,
            author_id: this.author_id,
            reviewer_id: this.reviewer_id,
            approver_id: this.approver_id,
            file_path: this.file_path,
            file_name: this.file_name,
            file_size: this.file_size,
            mime_type: this.mime_type,
            scope_of_application: this.scope_of_application,
            recipients: this.recipients, // Already parsed as array in constructor
            review_cycle: this.review_cycle,
            retention_period: this.retention_period,
            next_review_date: this.next_review_date,
            disposal_date: this.disposal_date,
            change_reason: this.change_reason,
            change_summary: this.change_summary,
            keywords: this.keywords,
            created_at: this.created_at,
            updated_at: this.updated_at,
            published_at: this.published_at,
            archived_at: this.archived_at,
            author_name: this.author_name,
            author_department: this.author_department,
            reviewer_name: this.reviewer_name,
            approver_name: this.approver_name
        };
    }
}

module.exports = Document;
/**
 * =================================================================
 * EDMS 1CAR - Document Model
 * Document management with version control and workflow
 * Based on C-PR-VM-001, C-TD-VM-001, C-PR-AR-001 requirements
 * =================================================================
 */

const { dbManager } = require('../config/database');
const { logAudit, logError, logDocumentOperation } = require('../utils/logger');
const { generateDocumentCode } = require('../utils/db');
const path = require('path');

class Document {
    constructor(documentData = {}) {
        this.id = documentData.id || null;
        this.title = documentData.title || null;
        this.document_code = documentData.document_code || null;
        this.type = documentData.type || null;
        this.department = documentData.department || null;
        this.version = documentData.version || '1.0';
        this.status = documentData.status || 'draft';
        this.description = documentData.description || null;
        this.file_path = documentData.file_path || null;
        this.file_name = documentData.file_name || null;
        this.file_size = documentData.file_size || null;
        this.file_type = documentData.file_type || null;
        this.mime_type = documentData.mime_type || null;
        this.author_id = documentData.author_id || null;
        this.reviewer_id = documentData.reviewer_id || null;
        this.approver_id = documentData.approver_id || null;
        this.change_reason = documentData.change_reason || null;
        this.change_summary = documentData.change_summary || null;
        this.status_before = documentData.status_before || null;
        this.status_after = documentData.status_after || null;
        this.review_cycle = documentData.review_cycle || 365;
        this.next_review_date = documentData.next_review_date || null;
        this.retention_period = documentData.retention_period || 2555;
        this.disposal_date = documentData.disposal_date || null;
        this.scope_of_application = documentData.scope_of_application || null;
        this.recipients = documentData.recipients || null;
        this.created_at = documentData.created_at || null;
        this.updated_at = documentData.updated_at || null;
        this.published_at = documentData.published_at || null;
        this.archived_at = documentData.archived_at || null;
    }

    /**
     * Create new document
     * @param {Object} documentData - Document data
     * @param {number} authorId - ID of user creating document
     * @returns {Promise<Document>} - Created document instance
     */
    static async create(documentData, authorId) {
        try {
            // Validate required fields
            const { title, type, department, description } = documentData;
            
            if (!title || !type || !department) {
                throw new Error('Missing required fields: title, type, department');
            }

            // Validate document type
            const validTypes = ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC'];
            if (!validTypes.includes(type)) {
                throw new Error('Invalid document type. Must be one of: ' + validTypes.join(', '));
            }

            // Validate department
            const validDepartments = [
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
            
            if (!validDepartments.includes(department)) {
                throw new Error('Invalid department');
            }

            // Generate document code
            const document_code = await generateDocumentCode(type, department);

            // Calculate dates
            const now = new Date();
            const next_review_date = new Date(now);
            next_review_date.setDate(next_review_date.getDate() + (documentData.review_cycle || 365));
            
            const disposal_date = new Date(now);
            disposal_date.setDate(disposal_date.getDate() + (documentData.retention_period || 2555));

            // Prepare recipients as JSON
            const recipients = documentData.recipients ? 
                JSON.stringify(documentData.recipients) : 
                JSON.stringify([department]);

            // Insert document into database
            const result = await dbManager.run(`
                INSERT INTO documents (
                    title, document_code, type, department, version, status, description,
                    author_id, review_cycle, next_review_date, retention_period, disposal_date,
                    scope_of_application, recipients, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
                title,
                document_code,
                type,
                department,
                documentData.version || '1.0',
                'draft',
                description,
                authorId,
                documentData.review_cycle || 365,
                next_review_date.toISOString().split('T')[0],
                documentData.retention_period || 2555,
                disposal_date.toISOString().split('T')[0],
                documentData.scope_of_application || department,
                recipients
            ]);

            // Create initial workflow transition
            await dbManager.run(`
                INSERT INTO workflow_transitions (document_id, from_status, to_status, comment, transitioned_by)
                VALUES (?, NULL, 'draft', 'Document created', ?)
            `, [result.lastID, authorId]);

            // Get created document
            const newDocument = await Document.findById(result.lastID);
            
            // Log audit event
            await logAudit('DOCUMENT_CREATED', {
                documentId: result.lastID,
                documentCode: document_code,
                title: title,
                type: type,
                department: department,
                authorId: authorId
            });

            return newDocument;
        } catch (error) {
            logError(error, null, { operation: 'Document.create', documentData });
            throw error;
        }
    }

    /**
     * Find document by ID with author information
     * @param {number} id - Document ID
     * @returns {Promise<Document|null>} - Document instance or null
     */
    static async findById(id) {
        try {
            const documentData = await dbManager.get(`
                SELECT 
                    d.*,
                    u.name as author_name,
                    u.department as author_department,
                    r.name as reviewer_name,
                    a.name as approver_name
                FROM documents d
                LEFT JOIN users u ON d.author_id = u.id
                LEFT JOIN users r ON d.reviewer_id = r.id
                LEFT JOIN users a ON d.approver_id = a.id
                WHERE d.id = ?
            `, [id]);
            
            return documentData ? new Document(documentData) : null;
        } catch (error) {
            logError(error, null, { operation: 'Document.findById', id });
            throw error;
        }
    }

    /**
     * Find document by code
     * @param {string} documentCode - Document code
     * @returns {Promise<Document|null>} - Document instance or null
     */
    static async findByCode(documentCode) {
        try {
            const documentData = await dbManager.get(`
                SELECT 
                    d.*,
                    u.name as author_name,
                    u.department as author_department,
                    r.name as reviewer_name,
                    a.name as approver_name
                FROM documents d
                LEFT JOIN users u ON d.author_id = u.id
                LEFT JOIN users r ON d.reviewer_id = r.id
                LEFT JOIN users a ON d.approver_id = a.id
                WHERE d.document_code = ?
            `, [documentCode]);
            
            return documentData ? new Document(documentData) : null;
        } catch (error) {
            logError(error, null, { operation: 'Document.findByCode', documentCode });
            throw error;
        }
    }

    /**
     * Search documents with filters and pagination
     * @param {Object} filters - Search filters
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<Object>} - Paginated search results
     */
    static async search(filters = {}, page = 1, limit = 20) {
        try {
            let whereConditions = [];
            let params = [];

            // Full-text search
            if (filters.search && filters.search.trim()) {
                whereConditions.push(`d.id IN (
                    SELECT rowid FROM documents_fts 
                    WHERE documents_fts MATCH ?
                )`);
                params.push(filters.search.trim());
            }

            // Filter by type
            if (filters.type) {
                whereConditions.push('d.type = ?');
                params.push(filters.type);
            }

            // Filter by department
            if (filters.department) {
                whereConditions.push('d.department = ?');
                params.push(filters.department);
            }

            // Filter by status
            if (filters.status) {
                whereConditions.push('d.status = ?');
                params.push(filters.status);
            }

            // Filter by author
            if (filters.author_id) {
                whereConditions.push('d.author_id = ?');
                params.push(filters.author_id);
            }

            // Date range filters
            if (filters.date_from) {
                whereConditions.push('d.created_at >= ?');
                params.push(filters.date_from);
            }

            if (filters.date_to) {
                whereConditions.push('d.created_at <= ?');
                params.push(filters.date_to);
            }

            // Build base query
            const whereClause = whereConditions.length > 0 ? 
                'WHERE ' + whereConditions.join(' AND ') : '';

            const baseQuery = `
                SELECT 
                    d.*,
                    u.name as author_name,
                    u.department as author_department,
                    r.name as reviewer_name,
                    a.name as approver_name
                FROM documents d
                LEFT JOIN users u ON d.author_id = u.id
                LEFT JOIN users r ON d.reviewer_id = r.id
                LEFT JOIN users a ON d.approver_id = a.id
                ${whereClause}
                ORDER BY d.updated_at DESC
            `;

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM documents d ${whereClause}`;
            const countResult = await dbManager.get(countQuery, params);

            // Get paginated data
            const offset = (page - 1) * limit;
            const documents = await dbManager.all(
                `${baseQuery} LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );

            // Calculate pagination metadata
            const total = countResult.total;
            const totalPages = Math.ceil(total / limit);

            return {
                data: documents.map(doc => new Document(doc)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            logError(error, null, { operation: 'Document.search', filters, page, limit });
            throw error;
        }
    }

    /**
     * Get documents by department
     * @param {string} department - Department name
     * @param {Object} filters - Additional filters
     * @returns {Promise<Array>} - Array of documents
     */
    static async findByDepartment(department, filters = {}) {
        try {
            let whereConditions = ['d.department = ?'];
            let params = [department];

            if (filters.status) {
                whereConditions.push('d.status = ?');
                params.push(filters.status);
            }

            if (filters.type) {
                whereConditions.push('d.type = ?');
                params.push(filters.type);
            }

            const documents = await dbManager.all(`
                SELECT 
                    d.*,
                    u.name as author_name
                FROM documents d
                LEFT JOIN users u ON d.author_id = u.id
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY d.updated_at DESC
            `, params);

            return documents.map(doc => new Document(doc));
        } catch (error) {
            logError(error, null, { operation: 'Document.findByDepartment', department, filters });
            throw error;
        }
    }

    /**
     * Update document
     * @param {Object} updateData - Data to update
     * @param {number} updatedBy - ID of user making update
     * @returns {Promise<Document>} - Updated document
     */
    async update(updateData, updatedBy) {
        try {
            const allowedFields = [
                'title', 'description', 'scope_of_application', 'recipients',
                'review_cycle', 'retention_period', 'reviewer_id', 'approver_id'
            ];
            
            const updateFields = [];
            const params = [];

            // Build update query
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key)) {
                    updateFields.push(`${key} = ?`);
                    if (key === 'recipients' && Array.isArray(value)) {
                        params.push(JSON.stringify(value));
                    } else {
                        params.push(value);
                    }
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            // Add updated_at
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(this.id);

            await dbManager.run(
                `UPDATE documents SET ${updateFields.join(', ')} WHERE id = ?`,
                params
            );

            // Log audit event
            await logAudit('DOCUMENT_UPDATED', {
                documentId: this.id,
                documentCode: this.document_code,
                updateData: updateData,
                updatedBy: updatedBy
            });

            // Refresh document data
            const updatedDocument = await Document.findById(this.id);
            Object.assign(this, updatedDocument);

            return this;
        } catch (error) {
            logError(error, null, { operation: 'Document.update', documentId: this.id, updateData });
            throw error;
        }
    }

    /**
     * Update document status with workflow transition
     * @param {string} newStatus - New status
     * @param {number} userId - User making the change
     * @param {string} comment - Transition comment
     * @returns {Promise<Document>} - Updated document
     */
    async updateStatus(newStatus, userId, comment = '') {
        return await dbManager.transaction(async (db) => {
            try {
                const validStatuses = ['draft', 'review', 'published', 'archived'];
                if (!validStatuses.includes(newStatus)) {
                    throw new Error('Invalid status');
                }

                // Validate status transition
                const validTransitions = {
                    'draft': ['review', 'archived'],
                    'review': ['draft', 'published', 'archived'],
                    'published': ['review', 'archived'],
                    'archived': []
                };

                if (!validTransitions[this.status].includes(newStatus)) {
                    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
                }

                const oldStatus = this.status;

                // Update document status
                await db.run(`
                    UPDATE documents 
                    SET status = ?, 
                        status_before = ?, 
                        status_after = ?,
                        updated_at = CURRENT_TIMESTAMP,
                        published_at = CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE published_at END,
                        archived_at = CASE WHEN ? = 'archived' THEN CURRENT_TIMESTAMP ELSE archived_at END
                    WHERE id = ?
                `, [newStatus, oldStatus, newStatus, newStatus, newStatus, this.id]);

                // Create workflow transition record
                await db.run(`
                    INSERT INTO workflow_transitions (document_id, from_status, to_status, comment, transitioned_by)
                    VALUES (?, ?, ?, ?, ?)
                `, [this.id, oldStatus, newStatus, comment, userId]);

                // Update next review date if published
                if (newStatus === 'published') {
                    const nextReviewDate = new Date();
                    nextReviewDate.setDate(nextReviewDate.getDate() + this.review_cycle);
                    
                    await db.run(`
                        UPDATE documents 
                        SET next_review_date = ?
                        WHERE id = ?
                    `, [nextReviewDate.toISOString().split('T')[0], this.id]);
                }

                // Log audit event
                await logAudit('DOCUMENT_STATUS_CHANGED', {
                    documentId: this.id,
                    documentCode: this.document_code,
                    fromStatus: oldStatus,
                    toStatus: newStatus,
                    comment: comment,
                    userId: userId
                });

                // Refresh document data
                const updatedDocument = await Document.findById(this.id);
                Object.assign(this, updatedDocument);

                return this;
            } catch (error) {
                logError(error, null, { 
                    operation: 'Document.updateStatus', 
                    documentId: this.id, 
                    newStatus, 
                    userId 
                });
                throw error;
            }
        });
    }

    /**
     * Create new version of document
     * @param {string} newVersion - New version number
     * @param {string} changeReason - Reason for version change
     * @param {string} changeSummary - Summary of changes
     * @param {number} userId - User creating new version
     * @returns {Promise<Document>} - Updated document
     */
    async createNewVersion(newVersion, changeReason, changeSummary, userId) {
        return await dbManager.transaction(async (db) => {
            try {
                // Validate version format (X.Y)
                const versionRegex = /^\d+\.\d+$/;
                if (!versionRegex.test(newVersion)) {
                    throw new Error('Invalid version format. Use X.Y format (e.g., 1.0, 2.1)');
                }

                // Check if version already exists
                const existingVersion = await db.get(
                    'SELECT id FROM documents WHERE document_code = ? AND version = ?',
                    [this.document_code, newVersion]
                );

                if (existingVersion) {
                    throw new Error('Version already exists');
                }

                // Create version history entry for current version
                await db.run(`
                    INSERT INTO document_versions (
                        document_id, version, file_path, file_name, file_size,
                        change_reason, change_summary, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
                await db.run(`
                    UPDATE documents 
                    SET version = ?, 
                        change_reason = ?, 
                        change_summary = ?,
                        status_before = ?,
                        status_after = 'draft',
                        status = 'draft',
                        file_path = NULL,
                        file_name = NULL,
                        file_size = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [newVersion, changeReason, changeSummary, this.status, this.id]);

                // Create workflow transition
                await db.run(`
                    INSERT INTO workflow_transitions (document_id, from_status, to_status, comment, transitioned_by)
                    VALUES (?, ?, 'draft', ?, ?)
                `, [this.id, this.status, `New version ${newVersion}: ${changeReason}`, userId]);

                // Log audit event
                await logAudit('DOCUMENT_VERSION_CREATED', {
                    documentId: this.id,
                    documentCode: this.document_code,
                    oldVersion: this.version,
                    newVersion: newVersion,
                    changeReason: changeReason,
                    userId: userId
                });

                // Refresh document data
                const updatedDocument = await Document.findById(this.id);
                Object.assign(this, updatedDocument);

                return this;
            } catch (error) {
                logError(error, null, { 
                    operation: 'Document.createNewVersion', 
                    documentId: this.id, 
                    newVersion 
                });
                throw error;
            }
        });
    }

    /**
     * Get document version history
     * @returns {Promise<Array>} - Array of version history
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
            logError(error, null, { operation: 'Document.getVersionHistory', documentId: this.id });
            throw error;
        }
    }

    /**
     * Get document workflow history
     * @returns {Promise<Array>} - Array of workflow transitions
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
            logError(error, null, { operation: 'Document.getWorkflowHistory', documentId: this.id });
            throw error;
        }
    }

    /**
     * Attach file to document
     * @param {Object} fileInfo - File information
     * @param {number} userId - User uploading file
     * @returns {Promise<Document>} - Updated document
     */
    async attachFile(fileInfo, userId) {
        try {
            const { filename, path: filePath, size, mimetype } = fileInfo;
            const fileExtension = path.extname(filename).toLowerCase().substring(1);

            await dbManager.run(`
                UPDATE documents 
                SET file_path = ?, 
                    file_name = ?, 
                    file_size = ?, 
                    file_type = ?,
                    mime_type = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [filePath, filename, size, fileExtension, mimetype, this.id]);

            // Log audit event
            await logAudit('DOCUMENT_FILE_ATTACHED', {
                documentId: this.id,
                documentCode: this.document_code,
                fileName: filename,
                fileSize: size,
                userId: userId
            });

            // Refresh document data
            const updatedDocument = await Document.findById(this.id);
            Object.assign(this, updatedDocument);

            return this;
        } catch (error) {
            logError(error, null, { operation: 'Document.attachFile', documentId: this.id, fileInfo });
            throw error;
        }
    }

    /**
     * Get documents due for review
     * @param {number} daysBefore - Days before review date
     * @returns {Promise<Array>} - Documents due for review
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
                AND d.next_review_date <= date('now', '+${daysBefore} days')
                ORDER BY d.next_review_date ASC
            `);

            return documents.map(doc => new Document(doc));
        } catch (error) {
            logError(error, null, { operation: 'Document.getDueForReview', daysBefore });
            throw error;
        }
    }

    /**
     * Get document statistics
     * @returns {Promise<Object>} - Document statistics
     */
    static async getStatistics() {
        try {
            // Status statistics
            const statusStats = await dbManager.all(`
                SELECT status, COUNT(*) as count 
                FROM documents 
                GROUP BY status
            `);

            // Type statistics
            const typeStats = await dbManager.all(`
                SELECT type, COUNT(*) as count 
                FROM documents 
                GROUP BY type
            `);

            // Department statistics
            const deptStats = await dbManager.all(`
                SELECT department, COUNT(*) as count 
                FROM documents 
                GROUP BY department
                ORDER BY count DESC
            `);

            // Recent activity
            const recentActivity = await dbManager.all(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM documents 
                WHERE created_at >= date('now', '-30 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `);

            return {
                byStatus: statusStats.reduce((acc, row) => {
                    acc[row.status] = row.count;
                    return acc;
                }, {}),
                byType: typeStats.reduce((acc, row) => {
                    acc[row.type] = row.count;
                    return acc;
                }, {}),
                byDepartment: deptStats,
                recentActivity: recentActivity
            };
        } catch (error) {
            logError(error, null, { operation: 'Document.getStatistics' });
            throw error;
        }
    }

    /**
     * Check if user can access this document
     * @param {Object} user - User object
     * @returns {boolean} - Access permission
     */
    canUserAccess(user) {
        // Admin can access all documents
        if (user.role === 'admin') {
            return true;
        }

        // Author can access their own documents
        if (this.author_id === user.id) {
            return true;
        }

        // Users can access documents from their department
        if (this.department === user.department) {
            return true;
        }

        // Check recipients list
        if (this.recipients) {
            try {
                const recipientList = JSON.parse(this.recipients);
                return recipientList.includes(user.department);
            } catch (error) {
                return false;
            }
        }

        return false;
    }

    /**
     * Convert document to JSON
     * @returns {Object} - Document object
     */
    toJSON() {
        return {
            ...this,
            recipients: this.recipients ? JSON.parse(this.recipients) : []
        };
    }

    /**
     * Convert document to public JSON (limited info)
     * @returns {Object} - Public document object
     */
    toPublicJSON() {
        return {
            id: this.id,
            title: this.title,
            document_code: this.document_code,
            type: this.type,
            department: this.department,
            version: this.version,
            status: this.status,
            author_name: this.author_name,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Document;

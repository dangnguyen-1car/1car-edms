/**
 * =================================================================
 * EDMS 1CAR - Database Utility Functions
 * High-level database operations for 40 users system
 * Based on requirements from C-PR-VM-001, C-TD-VM-001, C-PR-AR-001
 * =================================================================
 */

const { dbManager } = require('../config/database');
const { logger } = require('../config');
const crypto = require('crypto');

/**
 * Database utility class with common operations
 */
class DatabaseUtils {
    constructor() {
        this.dbManager = dbManager;
    }

    /**
     * Execute query with automatic retry on failure
     * @param {Function} operation - Database operation function
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise} - Operation result
     */
    async withRetry(operation, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
                
                if (attempt < maxRetries) {
                    // Wait before retry (exponential backoff)
                    const delay = Math.pow(2, attempt) * 1000;
                    await this.sleep(delay);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Sleep utility function
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if database is connected and healthy
     * @returns {Promise<boolean>} - Health status
     */
    async isHealthy() {
        try {
            const health = await this.dbManager.healthCheck();
            return health.status === 'healthy';
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }

    /**
     * Get paginated results with metadata
     * @param {string} baseQuery - Base SQL query without LIMIT/OFFSET
     * @param {Array} params - Query parameters
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Items per page
     * @returns {Promise<Object>} - Paginated results with metadata
     */
    async paginate(baseQuery, params = [], page = 1, limit = 20) {
        try {
            // Validate pagination parameters
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
            const offset = (pageNum - 1) * limitNum;

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery})`;
            const countResult = await this.dbManager.get(countQuery, params);
            const total = countResult.total;

            // Get paginated data
            const dataQuery = `${baseQuery} LIMIT ? OFFSET ?`;
            const data = await this.dbManager.all(dataQuery, [...params, limitNum, offset]);

            // Calculate pagination metadata
            const totalPages = Math.ceil(total / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            return {
                data,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages,
                    hasNextPage,
                    hasPrevPage,
                    nextPage: hasNextPage ? pageNum + 1 : null,
                    prevPage: hasPrevPage ? pageNum - 1 : null
                }
            };
        } catch (error) {
            logger.error('Pagination failed:', error);
            throw error;
        }
    }

    /**
     * Search documents with full-text search
     * @param {string} searchTerm - Search term
     * @param {Object} filters - Additional filters
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<Object>} - Search results with pagination
     */
    async searchDocuments(searchTerm, filters = {}, page = 1, limit = 20) {
        try {
            let whereConditions = [];
            let params = [];

            // Full-text search if term provided
            if (searchTerm && searchTerm.trim()) {
                whereConditions.push(`d.id IN (
                    SELECT rowid FROM documents_fts 
                    WHERE documents_fts MATCH ?
                )`);
                params.push(searchTerm.trim());
            }

            // Apply filters
            if (filters.type) {
                whereConditions.push('d.type = ?');
                params.push(filters.type);
            }

            if (filters.department) {
                whereConditions.push('d.department = ?');
                params.push(filters.department);
            }

            if (filters.status) {
                whereConditions.push('d.status = ?');
                params.push(filters.status);
            }

            if (filters.author_id) {
                whereConditions.push('d.author_id = ?');
                params.push(filters.author_id);
            }

            if (filters.date_from) {
                whereConditions.push('d.created_at >= ?');
                params.push(filters.date_from);
            }

            if (filters.date_to) {
                whereConditions.push('d.created_at <= ?');
                params.push(filters.date_to);
            }

            // Build base query
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
                ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
                ORDER BY d.updated_at DESC
            `;

            return await this.paginate(baseQuery, params, page, limit);
        } catch (error) {
            logger.error('Document search failed:', error);
            throw error;
        }
    }

    /**
     * Get document statistics by department and type
     * @returns {Promise<Object>} - Document statistics
     */
    async getDocumentStats() {
        try {
            const stats = {};

            // Documents by status
            const statusStats = await this.dbManager.all(`
                SELECT status, COUNT(*) as count 
                FROM documents 
                GROUP BY status
            `);
            stats.byStatus = statusStats.reduce((acc, row) => {
                acc[row.status] = row.count;
                return acc;
            }, {});

            // Documents by type
            const typeStats = await this.dbManager.all(`
                SELECT type, COUNT(*) as count 
                FROM documents 
                GROUP BY type
            `);
            stats.byType = typeStats.reduce((acc, row) => {
                acc[row.type] = row.count;
                return acc;
            }, {});

            // Documents by department
            const deptStats = await this.dbManager.all(`
                SELECT department, COUNT(*) as count 
                FROM documents 
                GROUP BY department
                ORDER BY count DESC
            `);
            stats.byDepartment = deptStats;

            // Recent activity (last 30 days)
            const recentActivity = await this.dbManager.all(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM documents 
                WHERE created_at >= date('now', '-30 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `);
            stats.recentActivity = recentActivity;

            // Total counts
            const totalStats = await this.dbManager.get(`
                SELECT 
                    COUNT(*) as total_documents,
                    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_documents,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_documents,
                    COUNT(CASE WHEN status = 'review' THEN 1 END) as review_documents,
                    AVG(file_size) as avg_file_size
                FROM documents
            `);
            stats.totals = totalStats;

            return stats;
        } catch (error) {
            logger.error('Failed to get document statistics:', error);
            throw error;
        }
    }

    /**
     * Get user activity statistics
     * @returns {Promise<Object>} - User activity statistics
     */
    async getUserStats() {
        try {
            const stats = {};

            // Users by department
            const deptStats = await this.dbManager.all(`
                SELECT department, COUNT(*) as count 
                FROM users 
                WHERE is_active = 1
                GROUP BY department
                ORDER BY count DESC
            `);
            stats.byDepartment = deptStats;

            // Users by role
            const roleStats = await this.dbManager.all(`
                SELECT role, COUNT(*) as count 
                FROM users 
                WHERE is_active = 1
                GROUP BY role
            `);
            stats.byRole = roleStats.reduce((acc, row) => {
                acc[row.role] = row.count;
                return acc;
            }, {});

            // Recent logins (last 30 days)
            const recentLogins = await this.dbManager.all(`
                SELECT 
                    DATE(last_login) as date,
                    COUNT(DISTINCT id) as unique_users
                FROM users 
                WHERE last_login >= date('now', '-30 days')
                GROUP BY DATE(last_login)
                ORDER BY date DESC
            `);
            stats.recentLogins = recentLogins;

            // Active users (logged in last 7 days)
            const activeUsers = await this.dbManager.get(`
                SELECT COUNT(*) as count
                FROM users 
                WHERE last_login >= date('now', '-7 days')
                AND is_active = 1
            `);
            stats.activeUsers = activeUsers.count;

            return stats;
        } catch (error) {
            logger.error('Failed to get user statistics:', error);
            throw error;
        }
    }

    /**
     * Log audit event
     * @param {number} userId - User ID performing action
     * @param {string} action - Action performed
     * @param {string} resourceType - Type of resource
     * @param {number} resourceId - Resource ID
     * @param {Object} details - Additional details
     * @param {string} ipAddress - User IP address
     * @param {string} userAgent - User agent string
     * @returns {Promise<Object>} - Audit log entry
     */
    async logAudit(userId, action, resourceType, resourceId = null, details = {}, ipAddress = null, userAgent = null) {
        try {
            const auditData = {
                user_id: userId,
                action: action.toUpperCase(),
                resource_type: resourceType,
                resource_id: resourceId,
                details: JSON.stringify(details),
                ip_address: ipAddress,
                user_agent: userAgent,
                timestamp: new Date().toISOString()
            };

            const result = await this.dbManager.run(`
                INSERT INTO audit_logs (
                    user_id, action, resource_type, resource_id, 
                    details, ip_address, user_agent, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                auditData.user_id,
                auditData.action,
                auditData.resource_type,
                auditData.resource_id,
                auditData.details,
                auditData.ip_address,
                auditData.user_agent,
                auditData.timestamp
            ]);

            logger.info(`Audit logged: ${action} on ${resourceType} by user ${userId}`);
            return { id: result.lastID, ...auditData };
        } catch (error) {
            logger.error('Audit logging failed:', error);
            // Don't throw error for audit logging failures
            return null;
        }
    }

    /**
     * Clean up old audit logs
     * @param {number} retentionDays - Days to retain logs
     * @returns {Promise<number>} - Number of deleted records
     */
    async cleanupAuditLogs(retentionDays = 90) {
        try {
            const result = await this.dbManager.run(`
                DELETE FROM audit_logs 
                WHERE timestamp < date('now', '-${retentionDays} days')
            `);

            logger.info(`Cleaned up ${result.changes} old audit log entries`);
            return result.changes;
        } catch (error) {
            logger.error('Audit log cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Generate unique document code
     * @param {string} type - Document type
     * @param {string} department - Department code
     * @returns {Promise<string>} - Unique document code
     */
    async generateDocumentCode(type, department) {
        try {
            const year = new Date().getFullYear();
            const deptCode = department.substring(0, 3).toUpperCase();
            
            // Get next sequence number for this type/year combination
            const lastDoc = await this.dbManager.get(`
                SELECT document_code 
                FROM documents 
                WHERE document_code LIKE ? 
                ORDER BY document_code DESC 
                LIMIT 1
            `, [`${type}-%${year}%`]);

            let sequence = 1;
            if (lastDoc && lastDoc.document_code) {
                const parts = lastDoc.document_code.split('-');
                if (parts.length >= 5) {
                    sequence = parseInt(parts[4]) + 1;
                }
            }

            const sequenceStr = sequence.toString().padStart(3, '0');
            return `${type}-${sequenceStr}-${year}-${deptCode}-001`;
        } catch (error) {
            logger.error('Document code generation failed:', error);
            throw error;
        }
    }

    /**
     * Get documents due for review
     * @param {number} daysBefore - Days before review date to include
     * @returns {Promise<Array>} - Documents due for review
     */
    async getDocumentsDueForReview(daysBefore = 30) {
        try {
            const documents = await this.dbManager.all(`
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

            return documents;
        } catch (error) {
            logger.error('Failed to get documents due for review:', error);
            throw error;
        }
    }

    /**
     * Update document version
     * @param {number} documentId - Document ID
     * @param {string} newVersion - New version number
     * @param {string} changeReason - Reason for change
     * @param {string} changeSummary - Summary of changes
     * @param {number} userId - User making the change
     * @returns {Promise<Object>} - Updated document
     */
    async updateDocumentVersion(documentId, newVersion, changeReason, changeSummary, userId) {
        return await this.dbManager.transaction(async (db) => {
            try {
                // Get current document
                const currentDoc = await db.get('SELECT * FROM documents WHERE id = ?', [documentId]);
                if (!currentDoc) {
                    throw new Error('Document not found');
                }

                // Create version history entry
                await db.run(`
                    INSERT INTO document_versions (
                        document_id, version, file_path, file_name, file_size,
                        change_reason, change_summary, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    documentId,
                    currentDoc.version,
                    currentDoc.file_path,
                    currentDoc.file_name,
                    currentDoc.file_size,
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
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [newVersion, changeReason, changeSummary, currentDoc.status, documentId]);

                // Log audit event
                await this.logAudit(userId, 'UPDATE_VERSION', 'document', documentId, {
                    oldVersion: currentDoc.version,
                    newVersion: newVersion,
                    changeReason: changeReason
                });

                // Get updated document
                const updatedDoc = await db.get('SELECT * FROM documents WHERE id = ?', [documentId]);
                return updatedDoc;
            } catch (error) {
                logger.error('Document version update failed:', error);
                throw error;
            }
        });
    }

    /**
     * Get database performance metrics
     * @returns {Promise<Object>} - Performance metrics
     */
    async getPerformanceMetrics() {
        try {
            const metrics = {};

            // Query performance stats
            const queryStats = await this.dbManager.all(`
                SELECT 
                    name,
                    sql,
                    tbl_name
                FROM sqlite_master 
                WHERE type = 'index'
            `);
            metrics.indexes = queryStats.length;

            // Database size
            const dbStats = await this.dbManager.get('PRAGMA page_count');
            const pageSize = await this.dbManager.get('PRAGMA page_size');
            metrics.databaseSize = dbStats.page_count * pageSize.page_size;

            // Cache hit ratio
            const cacheStats = await this.dbManager.get('PRAGMA cache_size');
            metrics.cacheSize = cacheStats.cache_size;

            // WAL file size
            try {
                const walStats = await this.dbManager.get('PRAGMA wal_checkpoint(PASSIVE)');
                metrics.walCheckpoint = walStats;
            } catch (error) {
                metrics.walCheckpoint = null;
            }

            return metrics;
        } catch (error) {
            logger.error('Failed to get performance metrics:', error);
            throw error;
        }
    }

    /**
     * Backup database with metadata
     * @param {string} reason - Reason for backup
     * @returns {Promise<Object>} - Backup information
     */
    async createBackup(reason = 'Manual backup') {
        try {
            const timestamp = new Date().toISOString();
            const backupPath = await this.dbManager.backup(`backup_${timestamp.replace(/[:.]/g, '-')}`);
            
            const stats = await this.dbManager.getStats();
            
            const backupInfo = {
                path: backupPath,
                timestamp: timestamp,
                reason: reason,
                stats: stats,
                size: stats.file_size_mb
            };

            logger.info('Database backup created:', backupInfo);
            return backupInfo;
        } catch (error) {
            logger.error('Database backup failed:', error);
            throw error;
        }
    }
}

// Create singleton instance
const dbUtils = new DatabaseUtils();

// Export utility functions
module.exports = {
    // Main utility class
    dbUtils,
    
    // Convenience methods
    withRetry: (operation, maxRetries) => dbUtils.withRetry(operation, maxRetries),
    isHealthy: () => dbUtils.isHealthy(),
    paginate: (query, params, page, limit) => dbUtils.paginate(query, params, page, limit),
    searchDocuments: (term, filters, page, limit) => dbUtils.searchDocuments(term, filters, page, limit),
    getDocumentStats: () => dbUtils.getDocumentStats(),
    getUserStats: () => dbUtils.getUserStats(),
    logAudit: (userId, action, resourceType, resourceId, details, ip, userAgent) => 
        dbUtils.logAudit(userId, action, resourceType, resourceId, details, ip, userAgent),
    cleanupAuditLogs: (retentionDays) => dbUtils.cleanupAuditLogs(retentionDays),
    generateDocumentCode: (type, department) => dbUtils.generateDocumentCode(type, department),
    getDocumentsDueForReview: (daysBefore) => dbUtils.getDocumentsDueForReview(daysBefore),
    updateDocumentVersion: (docId, version, reason, summary, userId) => 
        dbUtils.updateDocumentVersion(docId, version, reason, summary, userId),
    getPerformanceMetrics: () => dbUtils.getPerformanceMetrics(),
    createBackup: (reason) => dbUtils.createBackup(reason)
};

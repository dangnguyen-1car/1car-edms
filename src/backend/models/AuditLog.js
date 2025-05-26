/**
 * =================================================================
 * EDMS 1CAR - Audit Log Model (Complete Rewrite)
 * Comprehensive audit logging for compliance and security
 * Based on C-PR-AR-001 audit requirements and security policies
 * =================================================================
 */

const { dbManager } = require('../config/database');
const { logError } = require('../utils/logger');

class AuditLog {
    constructor(auditData = {}) {
        this.id = auditData.id || null;
        this.user_id = auditData.user_id || null;
        this.action = auditData.action || null;
        this.resource_type = auditData.resource_type || null;
        this.resource_id = auditData.resource_id || null;
        this.details = auditData.details || null;
        this.ip_address = auditData.ip_address || null;
        this.user_agent = auditData.user_agent || null;
        this.timestamp = auditData.timestamp || null;
        
        // Additional fields from joins
        this.user_name = auditData.user_name || null;
        this.user_email = auditData.user_email || null;
        this.user_department = auditData.user_department || null;
    }

    /**
     * Create audit log entry
     * @param {Object} auditData - Audit log data
     * @returns {Promise<AuditLog>} - Created audit log instance
     */
    static async create(auditData) {
        try {
            const {
                user_id,
                action,
                resource_type,
                resource_id = null,
                details = {},
                ip_address = null,
                user_agent = null
            } = auditData;

            // Validate required fields
            if (!action || !resource_type) {
                throw new Error('Missing required fields: action, resource_type');
            }

            // Validate and normalize action
            const normalizedAction = this.validateAndNormalizeAction(action);
            
            // Validate resource type
            const normalizedResourceType = this.validateResourceType(resource_type);

            // Serialize details as JSON
            const detailsJson = typeof details === 'object' ? 
                JSON.stringify(details) : details;

            // Insert audit log
            const result = await dbManager.run(`
                INSERT INTO audit_logs (
                    user_id, action, resource_type, resource_id, 
                    details, ip_address, user_agent, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                user_id,
                normalizedAction,
                normalizedResourceType,
                resource_id,
                detailsJson,
                ip_address,
                user_agent
            ]);

            // Get created audit log
            const newAuditLog = await AuditLog.findById(result.lastID);
            return newAuditLog;
        } catch (error) {
            logError(error, null, { operation: 'AuditLog.create', auditData });
            throw error;
        }
    }

    /**
     * Validate and normalize action
     * @param {string} action - Action to validate
     * @returns {string} - Normalized action
     */
    static validateAndNormalizeAction(action) {
        if (!action || typeof action !== 'string') {
            throw new Error('Action must be a non-empty string');
        }

        // Convert to uppercase for consistency
        const normalizedAction = action.toUpperCase().trim();

        // Basic format validation - only letters, numbers, and underscores
        if (!/^[A-Z0-9_]+$/.test(normalizedAction)) {
            throw new Error(`Invalid action format: ${action}. Only letters, numbers, and underscores allowed.`);
        }

        // Length validation
        if (normalizedAction.length > 50) {
            throw new Error('Action length cannot exceed 50 characters');
        }

        return normalizedAction;
    }

    /**
     * Validate resource type
     * @param {string} resourceType - Resource type to validate
     * @returns {string} - Normalized resource type
     */
    static validateResourceType(resourceType) {
        if (!resourceType || typeof resourceType !== 'string') {
            throw new Error('Resource type must be a non-empty string');
        }

        const normalizedType = resourceType.toLowerCase().trim();

        // Valid resource types for EDMS
        const validResourceTypes = [
            'document', 'user', 'system', 'auth', 'workflow', 
            'permission', 'file', 'audit', 'setting', 'backup'
        ];

        if (!validResourceTypes.includes(normalizedType)) {
            // Allow any resource type but log warning
            logError(new Error(`Unknown resource type: ${resourceType}`), null, { 
                operation: 'AuditLog.validateResourceType',
                resourceType: resourceType 
            });
        }

        return normalizedType;
    }

    /**
     * Find audit log by ID
     * @param {number} id - Audit log ID
     * @returns {Promise<AuditLog|null>} - Audit log instance or null
     */
    static async findById(id) {
        try {
            const auditData = await dbManager.get(`
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email,
                    u.department as user_department
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.id = ?
            `, [id]);
            
            return auditData ? new AuditLog(auditData) : null;
        } catch (error) {
            logError(error, null, { operation: 'AuditLog.findById', id });
            throw error;
        }
    }

    /**
     * Get audit logs with filters and pagination
     * @param {Object} filters - Filter options
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<Object>} - Paginated audit logs
     */
    static async findAll(filters = {}, page = 1, limit = 50) {
        try {
            let whereConditions = [];
            let params = [];

            // Filter by user
            if (filters.user_id) {
                whereConditions.push('al.user_id = ?');
                params.push(filters.user_id);
            }

            // Filter by action
            if (filters.action) {
                whereConditions.push('al.action = ?');
                params.push(filters.action.toUpperCase());
            }

            // Filter by resource type
            if (filters.resource_type) {
                whereConditions.push('al.resource_type = ?');
                params.push(filters.resource_type.toLowerCase());
            }

            // Filter by resource ID
            if (filters.resource_id) {
                whereConditions.push('al.resource_id = ?');
                params.push(filters.resource_id);
            }

            // Filter by department
            if (filters.department) {
                whereConditions.push('u.department = ?');
                params.push(filters.department);
            }

            // Date range filters
            if (filters.date_from) {
                whereConditions.push('al.timestamp >= ?');
                params.push(filters.date_from);
            }

            if (filters.date_to) {
                whereConditions.push('al.timestamp <= ?');
                params.push(filters.date_to);
            }

            // IP address filter
            if (filters.ip_address) {
                whereConditions.push('al.ip_address = ?');
                params.push(filters.ip_address);
            }

            // Search in details
            if (filters.search) {
                whereConditions.push('(al.details LIKE ? OR al.action LIKE ?)');
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? 
                'WHERE ' + whereConditions.join(' AND ') : '';

            // Get total count
            const countResult = await dbManager.get(`
                SELECT COUNT(*) as total 
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ${whereClause}
            `, params);

            // Get paginated data
            const offset = (page - 1) * limit;
            const auditLogs = await dbManager.all(`
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email,
                    u.department as user_department
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ${whereClause}
                ORDER BY al.timestamp DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            // Calculate pagination metadata
            const total = countResult.total;
            const totalPages = Math.ceil(total / limit);

            return {
                data: auditLogs.map(log => new AuditLog(log)),
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
            logError(error, null, { operation: 'AuditLog.findAll', filters, page, limit });
            throw error;
        }
    }

    /**
     * Get audit logs for specific user
     * @param {number} userId - User ID
     * @param {number} limit - Number of logs to return
     * @returns {Promise<Array>} - Array of audit logs
     */
    static async findByUser(userId, limit = 100) {
        try {
            const auditLogs = await dbManager.all(`
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email,
                    u.department as user_department
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.user_id = ?
                ORDER BY al.timestamp DESC
                LIMIT ?
            `, [userId, limit]);

            return auditLogs.map(log => new AuditLog(log));
        } catch (error) {
            logError(error, null, { operation: 'AuditLog.findByUser', userId, limit });
            throw error;
        }
    }

    /**
     * Get audit logs for specific resource
     * @param {string} resourceType - Resource type
     * @param {number} resourceId - Resource ID
     * @param {number} limit - Number of logs to return
     * @returns {Promise<Array>} - Array of audit logs
     */
    static async findByResource(resourceType, resourceId, limit = 50) {
        try {
            const auditLogs = await dbManager.all(`
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email,
                    u.department as user_department
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.resource_type = ? AND al.resource_id = ?
                ORDER BY al.timestamp DESC
                LIMIT ?
            `, [resourceType.toLowerCase(), resourceId, limit]);

            return auditLogs.map(log => new AuditLog(log));
        } catch (error) {
            logError(error, null, { 
                operation: 'AuditLog.findByResource', 
                resourceType, 
                resourceId, 
                limit 
            });
            throw error;
        }
    }

    /**
     * Get audit statistics
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} - Audit statistics
     */
    static async getStatistics(filters = {}) {
        try {
            const stats = {};

            // Date range for statistics
            const dateFrom = filters.date_from || 
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
            const dateTo = filters.date_to || new Date().toISOString();

            // Actions statistics
            const actionStats = await dbManager.all(`
                SELECT action, COUNT(*) as count 
                FROM audit_logs 
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY action
                ORDER BY count DESC
            `, [dateFrom, dateTo]);
            stats.byAction = actionStats;

            // Resource type statistics
            const resourceStats = await dbManager.all(`
                SELECT resource_type, COUNT(*) as count 
                FROM audit_logs 
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY resource_type
                ORDER BY count DESC
            `, [dateFrom, dateTo]);
            stats.byResourceType = resourceStats;

            // User activity statistics
            const userStats = await dbManager.all(`
                SELECT 
                    al.user_id,
                    u.name as user_name,
                    u.department,
                    COUNT(*) as activity_count
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.timestamp BETWEEN ? AND ?
                AND al.user_id IS NOT NULL
                GROUP BY al.user_id, u.name, u.department
                ORDER BY activity_count DESC
                LIMIT 20
            `, [dateFrom, dateTo]);
            stats.topUsers = userStats;

            // Department activity statistics
            const deptStats = await dbManager.all(`
                SELECT 
                    u.department,
                    COUNT(*) as activity_count
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.timestamp BETWEEN ? AND ?
                AND u.department IS NOT NULL
                GROUP BY u.department
                ORDER BY activity_count DESC
            `, [dateFrom, dateTo]);
            stats.byDepartment = deptStats;

            // Daily activity trend
            const dailyStats = await dbManager.all(`
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as count
                FROM audit_logs 
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY DATE(timestamp)
                ORDER BY date DESC
                LIMIT 30
            `, [dateFrom, dateTo]);
            stats.dailyActivity = dailyStats;

            // Security events
            const securityStats = await dbManager.all(`
                SELECT 
                    action,
                    COUNT(*) as count,
                    COUNT(DISTINCT ip_address) as unique_ips
                FROM audit_logs 
                WHERE timestamp BETWEEN ? AND ?
                AND action IN ('LOGIN_FAILED', 'PERMISSION_DENIED', 'UNAUTHORIZED_ACCESS')
                GROUP BY action
            `, [dateFrom, dateTo]);
            stats.securityEvents = securityStats;

            // Total counts
            const totalStats = await dbManager.get(`
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    MIN(timestamp) as earliest_event,
                    MAX(timestamp) as latest_event
                FROM audit_logs 
                WHERE timestamp BETWEEN ? AND ?
            `, [dateFrom, dateTo]);
            stats.totals = totalStats;

            return stats;
        } catch (error) {
            logError(error, null, { operation: 'AuditLog.getStatistics', filters });
            throw error;
        }
    }

    /**
     * Get recent security events
     * @param {number} hours - Hours to look back
     * @param {number} limit - Maximum number of events
     * @returns {Promise<Array>} - Recent security events
     */
    static async getRecentSecurityEvents(hours = 24, limit = 100) {
        try {
            const securityEvents = await dbManager.all(`
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email,
                    u.department as user_department
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.timestamp >= datetime('now', '-${hours} hours')
                AND al.action IN (
                    'LOGIN_FAILED', 'PERMISSION_DENIED', 'UNAUTHORIZED_ACCESS',
                    'PASSWORD_UPDATED', 'USER_DEACTIVATED', 'ROLE_CHANGED'
                )
                ORDER BY al.timestamp DESC
                LIMIT ?
            `, [limit]);

            return securityEvents.map(log => new AuditLog(log));
        } catch (error) {
            logError(error, null, { 
                operation: 'AuditLog.getRecentSecurityEvents', 
                hours, 
                limit 
            });
            throw error;
        }
    }

    /**
     * Get document activity timeline
     * @param {number} documentId - Document ID
     * @returns {Promise<Array>} - Document activity timeline
     */
    static async getDocumentTimeline(documentId) {
        try {
            const timeline = await dbManager.all(`
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.department as user_department
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.resource_type = 'document' 
                AND al.resource_id = ?
                ORDER BY al.timestamp ASC
            `, [documentId]);

            return timeline.map(log => new AuditLog(log));
        } catch (error) {
            logError(error, null, { 
                operation: 'AuditLog.getDocumentTimeline', 
                documentId 
            });
            throw error;
        }
    }

    /**
     * Clean up old audit logs
     * @param {number} retentionDays - Days to retain logs
     * @returns {Promise<number>} - Number of deleted records
     */
    static async cleanup(retentionDays = 90) {
        try {
            const result = await dbManager.run(`
                DELETE FROM audit_logs 
                WHERE timestamp < datetime('now', '-${retentionDays} days')
            `);

            return result.changes;
        } catch (error) {
            logError(error, null, { operation: 'AuditLog.cleanup', retentionDays });
            throw error;
        }
    }

    /**
     * Export audit logs for compliance
     * @param {Object} filters - Export filters
     * @returns {Promise<Array>} - Audit logs for export
     */
    static async exportForCompliance(filters = {}) {
        try {
            let whereConditions = [];
            let params = [];

            // Date range (required for compliance exports)
            if (filters.date_from && filters.date_to) {
                whereConditions.push('al.timestamp BETWEEN ? AND ?');
                params.push(filters.date_from, filters.date_to);
            } else {
                throw new Error('Date range is required for compliance export');
            }

            // Optional filters
            if (filters.user_id) {
                whereConditions.push('al.user_id = ?');
                params.push(filters.user_id);
            }

            if (filters.resource_type) {
                whereConditions.push('al.resource_type = ?');
                params.push(filters.resource_type);
            }

            if (filters.department) {
                whereConditions.push('u.department = ?');
                params.push(filters.department);
            }

            const whereClause = 'WHERE ' + whereConditions.join(' AND ');

            const auditLogs = await dbManager.all(`
                SELECT 
                    al.id,
                    al.user_id,
                    u.name as user_name,
                    u.email as user_email,
                    u.department as user_department,
                    al.action,
                    al.resource_type,
                    al.resource_id,
                    al.details,
                    al.ip_address,
                    al.user_agent,
                    al.timestamp
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ${whereClause}
                ORDER BY al.timestamp ASC
            `, params);

            return auditLogs.map(log => new AuditLog(log));
        } catch (error) {
            logError(error, null, { operation: 'AuditLog.exportForCompliance', filters });
            throw error;
        }
    }

    /**
     * Get parsed details object
     * @returns {Object} - Parsed details
     */
    getParsedDetails() {
        if (!this.details) return {};
        
        try {
            return JSON.parse(this.details);
        } catch (error) {
            return { raw: this.details };
        }
    }

    /**
     * Check if this is a security-related event
     * @returns {boolean} - True if security event
     */
    isSecurityEvent() {
        const securityActions = [
            'LOGIN_FAILED', 'PERMISSION_DENIED', 'UNAUTHORIZED_ACCESS',
            'PASSWORD_UPDATED', 'USER_DEACTIVATED', 'ROLE_CHANGED',
            'PERMISSION_GRANTED', 'PERMISSION_REVOKED'
        ];
        
        return securityActions.includes(this.action);
    }

    /**
     * Get severity level of the audit event
     * @returns {string} - Severity level (low, medium, high, critical)
     */
    getSeverityLevel() {
        const criticalActions = ['USER_DEACTIVATED', 'ROLE_CHANGED', 'SYSTEM_SHUTDOWN'];
        const highActions = ['LOGIN_FAILED', 'PERMISSION_DENIED', 'UNAUTHORIZED_ACCESS'];
        const mediumActions = ['PASSWORD_UPDATED', 'DOCUMENT_DELETED', 'USER_CREATED'];
        
        if (criticalActions.includes(this.action)) return 'critical';
        if (highActions.includes(this.action)) return 'high';
        if (mediumActions.includes(this.action)) return 'medium';
        return 'low';
    }

    /**
     * Convert audit log to JSON
     * @returns {Object} - Audit log object with parsed details
     */
    toJSON() {
        return {
            ...this,
            details: this.getParsedDetails(),
            severity: this.getSeverityLevel(),
            isSecurityEvent: this.isSecurityEvent()
        };
    }

    /**
     * Convert to compliance format
     * @returns {Object} - Compliance-formatted audit log
     */
    toComplianceFormat() {
        return {
            audit_id: this.id,
            timestamp: this.timestamp,
            user: {
                id: this.user_id,
                name: this.user_name,
                email: this.user_email,
                department: this.user_department
            },
            action: this.action,
            resource: {
                type: this.resource_type,
                id: this.resource_id
            },
            details: this.getParsedDetails(),
            session: {
                ip_address: this.ip_address,
                user_agent: this.user_agent
            },
            severity: this.getSeverityLevel()
        };
    }
}

module.exports = AuditLog;

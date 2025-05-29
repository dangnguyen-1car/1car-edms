/**
 * =================================================================
 * EDMS 1CAR - Audit Log Model (Complete Rewrite)
 * Comprehensive audit logging for compliance and security
 * Based on C-PR-AR-001 audit requirements and security policies
 * Aligned with final schema after migration 003-align-schema-definition.sql
 * =================================================================
 */

const { dbManager } = require('../config/database');

class AuditLog {
    // =================================================================
    // Constructor
    // =================================================================
    constructor(auditData = {}) {
        // Core audit fields from audit_logs table (post-migration schema)
        this.id = auditData.id || null;
        this.user_id = auditData.user_id || null;
        this.action = auditData.action || null;
        this.resource_type = auditData.resource_type || null;
        this.resource_id = auditData.resource_id || null;
        this.details = auditData.details || null;
        this.ip_address = auditData.ip_address || null;
        this.user_agent = auditData.user_agent || null;
        this.session_id = auditData.session_id || null;
        this.timestamp = auditData.timestamp || null;

        // Additional fields from joins (users table)
        this.user_name = auditData.user_name || null;
        this.user_email = auditData.user_email || null;
        this.user_department = auditData.user_department || null;
    }

    // =================================================================
    // Constants
    // =================================================================
    /**
     * Valid audit actions for the EDMS 1CAR system
     * Based on C-PR-AR-001 compliance requirements
     */
    static get VALID_ACTIONS() {
        return [
            // Authentication actions
            'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET',
            'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
            
            // User management actions
            'USER_CREATED', 'USER_UPDATED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 
            'USER_DELETED', 'USER_VIEWED', 'USERS_LISTED',
            
            // Document management actions
            'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_VIEWED',
            'DOCUMENT_DOWNLOADED', 'DOCUMENT_UPLOADED', 'DOCUMENT_SEARCHED', 'DOCUMENT_APPROVED',
            'DOCUMENT_REJECTED', 'DOCUMENT_PUBLISHED', 'DOCUMENT_ARCHIVED',
            
            // Version management actions
            'VERSION_CREATED', 'VERSION_COMPARED', 'VERSION_RESTORED',
            
            // Workflow actions
            'WORKFLOW_TRANSITION', 'WORKFLOW_APPROVED', 'WORKFLOW_REJECTED', 'WORKFLOW_RETURNED',
            
            // File management actions
            'FILE_UPLOADED', 'FILE_DOWNLOADED', 'FILE_DELETED', 'FILE_ATTACHED',
            
            // Permission actions
            'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'PERMISSION_CHECKED',
            
            // System actions
            'SYSTEM_BACKUP', 'SYSTEM_RESTORE', 'SYSTEM_MAINTENANCE',
            'SYSTEM_ERROR', 'SYSTEM_STARTUP', 'SYSTEM_SHUTDOWN'
        ];
    }

    /**
     * Valid resource types for audit logging
     */
    static get VALID_RESOURCE_TYPES() {
        return ['user', 'document', 'version', 'file', 'workflow', 'permission', 'system'];
    }

    // =================================================================
    // CRUD Operations
    // =================================================================
    /**
     * Create audit log entry
     * Uses the standardized schema with all required columns
     */
    static async create(auditData) {
        try {
            const {
                user_id = null,
                action,
                resource_type,
                resource_id = null,
                details = {},
                ip_address = null,
                user_agent = null,
                session_id = null
            } = auditData;

            // Validate required fields
            if (!action || !resource_type) {
                throw new Error('Missing required fields: action, resource_type');
            }

            // Validate action - only warn if not in VALID_ACTIONS, don't throw error
            if (!this.VALID_ACTIONS.includes(action)) {
                console.warn(`Unknown audit action: ${action}. This action will be logged but should be added to VALID_ACTIONS.`);
            }

            // Validate resource type - only warn if not in VALID_RESOURCE_TYPES, don't throw error
            if (!this.VALID_RESOURCE_TYPES.includes(resource_type)) {
                console.warn(`Unknown resource type: ${resource_type}. This resource type will be logged but should be added to VALID_RESOURCE_TYPES.`);
            }

            // Serialize details as JSON if it's an object
            const root = typeof details === 'object' ? 
                JSON.stringify(details) : details;

            // Insert audit log using the standardized schema
            const result = await dbManager.run(`
                INSERT INTO audit_logs (
                    user_id, action, resource_type, resource_id,
                    details, ip_address, user_agent, session_id, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                user_id,
                action,
                resource_type,
                resource_id,
                detailsJson,
                ip_address,
                user_agent,
                session_id
            ]);

            // Get created audit log
            return await this.findById(result.lastID);

        } catch (error) {
            console.error('Error creating audit log:', error);
            // Don't throw error to prevent disrupting main application flow
            // but ensure critical audit failures are logged
            if (this.isCriticalAuditEvent(auditData.action)) {
                console.error('CRITICAL AUDIT FAILURE:', error.message);
            }
            return null;
        }
    }

    /**
     * Find audit log by ID
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
            console.error('Error finding audit log by ID:', error);
            throw error;
        }
    }

    // =================================================================
    // Filtering and Query Methods
    // =================================================================
    /**
     * Get audit logs with comprehensive filtering and pagination
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

            // Session ID filter
            if (filters.session_id) {
                whereConditions.push('al.session_id = ?');
                params.push(filters.session_id);
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
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {
            console.error('Error finding audit logs:', error);
            throw error;
        }
    }

    /**
     * Get audit logs for specific user
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
            console.error('Error finding audit logs by user:', error);
            throw error;
        }
    }

    /**
     * Get audit logs for specific resource
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
            console.error('Error finding audit logs by resource:', error);
            throw error;
        }
    }

    /**
     * Get document activity timeline
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
            console.error('Error getting document timeline:', error);
            throw error;
        }
    }

    // =================================================================
    // Statistics and Reporting
    // =================================================================
    /**
     * Get comprehensive audit statistics
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

            // Total counts including session tracking
            const totalStats = await dbManager.get(`
                SELECT
                    COUNT(*) as total_events,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    COUNT(DISTINCT session_id) as unique_sessions,
                    MIN(timestamp) as earliest_event,
                    MAX(timestamp) as latest_event
                FROM audit_logs
                WHERE timestamp BETWEEN ? AND ?
            `, [dateFrom, dateTo]);
            stats.totals = totalStats;

            return stats;

        } catch (error) {
            console.error('Error getting audit statistics:', error);
            throw error;
        }
    }

    /**
     * Get recent security events
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
            console.error('Error getting recent security events:', error);
            throw error;
        }
    }

    /**
     * Export audit logs for compliance reporting
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
                    al.session_id,
                    al.timestamp
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ${whereClause}
                ORDER BY al.timestamp ASC
            `, params);

            return auditLogs.map(log => new AuditLog(log));

        } catch (error) {
            console.error('Error exporting audit logs for compliance:', error);
            throw error;
        }
    }

    /**
     * Clean up old audit logs based on retention policy
     */
    static async cleanup(retentionDays = 90) {
        try {
            const result = await dbManager.run(`
                DELETE FROM audit_logs
                WHERE timestamp < datetime('now', '-${retentionDays} days')
            `);

            return {
                success: true,
                deletedCount: result.changes,
                message: `Deleted ${result.changes} audit logs older than ${retentionDays} days`
            };

        } catch (error) {
            console.error('Error cleaning up audit logs:', error);
            throw error;
        }
    }

    // =================================================================
    // Utility Methods
    // =================================================================
    /**
     * Get parsed details object
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
     * Check if event is critical for audit (private method)
     */
    static isCriticalAuditEvent(action) {
        const criticalActions = [
            'USER_DELETED',
            'DOCUMENT_DELETED',
            'SYSTEM_BACKUP',
            'SYSTEM_RESTORE',
            'PERMISSION_REVOKED'
        ];
        return criticalActions.includes(action);
    }

    /**
     * Convert audit log to JSON with all fields including session_id
     */
    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            action: this.action,
            resource_type: this.resource_type,
            resource_id: this.resource_id,
            details: this.getParsedDetails(), // Use parsed details
            ip_address: this.ip_address,
            user_agent: this.user_agent,
            session_id: this.session_id, // Include session_id
            timestamp: this.timestamp,
            user_name: this.user_name,
            user_email: this.user_email,
            user_department: this.user_department,
            severity: this.getSeverityLevel(),
            isSecurityEvent: this.isSecurityEvent()
        };
    }

    /**
     * Convert to compliance format with all required fields
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
            details: this.getParsedDetails(), // Use parsed details
            session: {
                ip_address: this.ip_address,
                user_agent: this.user_agent,
                session_id: this.session_id // Include session_id
            },
            severity: this.getSeverityLevel(),
            compliance_metadata: {
                standard: 'C-PR-AR-001',
                retention_required: true,
                security_event: this.isSecurityEvent()
            }
        };
    }

    /**
     * Convert to CSV format for export
     */
    toCSVRow() {
        const details = this.getParsedDetails();
        return [
            this.id,
            this.timestamp,
            this.user_name || '',
            this.user_email || '',
            this.user_department || '',
            this.action,
            this.resource_type,
            this.resource_id || '',
            this.ip_address || '',
            this.session_id || '',
            JSON.stringify(details),
            this.getSeverityLevel()
        ];
    }

    /**
     * Get CSV headers for export
     */
    static getCSVHeaders() {
        return [
            'ID',
            'Timestamp',
            'User Name',
            'User Email',
            'Department',
            'Action',
            'Resource Type',
            'Resource ID',
            'IP Address',
            'Session ID',
            'Details',
            'Severity'
        ];
    }
}

module.exports = AuditLog;
// src/backend/models/AuditLog.js
/**
 * =================================================================
 * EDMS 1CAR - Audit Log Model
 * CORRECTED: Added AUDIT_LOGS_VIEWED and confirmed SYSTEM_VIEWED to VALID_ACTIONS.
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
        this.session_id = auditData.session_id || null;
        this.timestamp = auditData.timestamp || null;
        this.user_name = auditData.user_name || null;
        this.user_email = auditData.user_email || null;
        this.user_department = auditData.user_department || null;
    }

    static get VALID_ACTIONS() {
        return [
            // Authentication actions
            'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET',
            'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'TOKEN_REFRESHED',
            // User management actions
            'USER_CREATED', 'USER_UPDATED', 'USER_PROFILE_UPDATED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
            'USER_DELETED', 'USER_VIEWED', 'USERS_LISTED', 'USER_PASSWORD_RESET',
            // Document management actions
            'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_VIEWED',
            'DOCUMENT_DOWNLOADED', 'DOCUMENT_UPLOADED', 'DOCUMENT_SEARCHED',
            'DOCUMENTS_SEARCHED', // Retained if distinct use cases exist
            'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'DOCUMENT_PUBLISHED', 'DOCUMENT_ARCHIVED', 'DOCUMENT_STATUS_CHANGED',
            // Version management actions
            'VERSION_CREATED', 'VERSION_COMPARED', 'VERSION_RESTORED', 'VERSION_HISTORY_VIEWED',
            // Workflow actions
            'WORKFLOW_TRANSITION', 'WORKFLOW_APPROVED', 'WORKFLOW_REJECTED', 'WORKFLOW_RETURNED',
            'WORKFLOW_HISTORY_VIEWED', 'WORKFLOW_TRANSITIONS_QUERIED', 'WORKFLOW_STATS_VIEWED',
            // File management actions
            'FILE_UPLOADED', 'FILE_DOWNLOADED', 'FILE_DELETED', 'FILE_ATTACHED', 'DOCUMENT_FILE_ATTACHED',
            // Permission actions
            'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'PERMISSION_CHECKED', 'PERMISSION_DENIED',
            // System actions
            'SYSTEM_BACKUP', 'SYSTEM_RESTORE', 'SYSTEM_MAINTENANCE', 'SYSTEM_ERROR', 'SYSTEM_STARTUP',
            'SYSTEM_SHUTDOWN', 'SYSTEM_SETTINGS_UPDATED', 'ENDPOINT_NOT_FOUND', 'ERROR_OCCURRED',
            'DOCUMENT_STATISTICS_VIEWED', 'DOCUMENTS_DUE_REVIEW_VIEWED', 'SEARCH_FILTERS_VIEWED',
            'LOCKED_USERS_VIEWED', 'SYSTEM_STATS_VIEWED', 'DEPARTMENT_STATS_VIEWED', 'USER_STATS_VIEWED',
            'SYSTEM_DATA_VIEWED', // More generic for system data GETs
            'SYSTEM_VIEWED',      // Used by auditCRUD.read('system')
            'AUDIT_LOGS_VIEWED'   // For the new audit log route
        ];
    }

    static get VALID_RESOURCE_TYPES() {
        // This list MUST match the CHECK constraint in the database schema
        // (user, document, version, file, workflow, permission, system)
        return ['user', 'document', 'version', 'file', 'workflow', 'permission', 'system', 'audit_log']; // Added 'audit_log'
    }

    static async create(auditData) { /* ... (Ensure this method uses the VALID_ACTIONS and VALID_RESOURCE_TYPES for validation if any, though primary validation will be DB CHECK constraint) ... */
        // ... (implementation from your previous correct version or my last response)
        // This method should ideally be part of AuditService or a private method here,
        // with AuditService.log being the public API.
        // For now, keeping its signature simple for direct use if that's the pattern.
        const { dbManager } = require('../config/database'); // Late require
        const { user_id = null, action, resource_type, resource_id = null, details = {}, ip_address = null, user_agent = null, session_id = null } = auditData;
        if (!action || !resource_type) {
             logError(new Error('Audit log creation failed: Missing required fields (action, resource_type).'), null, {auditData});
            return null; // Or throw, but be careful of disrupting flows
        }
        const detailsJson = typeof details === 'object' ? JSON.stringify(details) : String(details);
        try {
            const result = await dbManager.run(
                `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, session_id, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [user_id, action, resource_type, resource_id, detailsJson, ip_address, user_agent, session_id]
            );
            return { success: true, id: result.lastID };
        } catch (dbError) {
            logError(dbError, null, {operation: 'AuditLog.create.dbManager.run', auditAction: action, auditResourceType: resource_type});
            // If it's a CHECK constraint error, log more specific info
            if (dbError.message && (dbError.message.includes("CHECK constraint failed: action") || dbError.message.includes("CHECK constraint failed: resource_type"))) {
                console.error(`AUDIT LOG DB CONSTRAINT VIOLATION: Action='${action}', ResourceType='${resource_type}'. Ensure these are in schema's CHECK constraints.`);
            }
            return null; // Don't let audit logging failure break the main operation
        }
    }
    // ... other methods from your AuditLog.js ...
    static async findAll(filters = {}, page = 1, limit = 50) { /* ... as previously provided ... */ }
}
module.exports = AuditLog;
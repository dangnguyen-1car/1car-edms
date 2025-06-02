// src/backend/models/AuditLog.js
/**
 * =================================================================
 * EDMS 1CAR - Audit Log Model
 * Standardized VALID_ACTIONS and VALID_RESOURCE_TYPES.
 * VIEW_AUDIT_LOGS (plural) is the standard action name.
 * =================================================================
 */

const { dbManager } = require('../config/database');
const { logError } = require('../utils/logger'); // Đảm bảo logError được import đúng

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
        const actions = new Set([
            // Authentication
            'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET',
            'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'TOKEN_REFRESHED',
            // User Management
            'CREATE_USER', 'USER_CREATED', 'UPDATE_USER', 'USER_UPDATED', 'USER_PROFILE_UPDATED',
            'ACTIVATE_USER', 'USER_ACTIVATED', 'DEACTIVATE_USER', 'USER_DEACTIVATED',
            'DELETE_USER', 'USER_DELETED', 'VIEW_USER', 'USER_VIEWED', 'LIST_USERS', 'USERS_LISTED',
            'RESET_USER_PASSWORD', 'USER_PASSWORD_RESET', 'UNLOCK_USER_ACCOUNT', 'USER_ACCOUNT_UNLOCKED',
            // Document Management
            'CREATE_DOCUMENT', 'DOCUMENT_CREATED', 'UPDATE_DOCUMENT', 'DOCUMENT_UPDATED',
            'DELETE_DOCUMENT', 'DOCUMENT_DELETED', 'VIEW_DOCUMENT', 'DOCUMENT_VIEWED',
            'DOWNLOAD_DOCUMENT', 'DOCUMENT_DOWNLOADED', 'UPLOAD_DOCUMENT_METADATA', 'DOCUMENT_UPLOADED',
            'SEARCH_DOCUMENTS', 'DOCUMENTS_SEARCHED',
            'APPROVE_DOCUMENT', 'DOCUMENT_APPROVED', 'REJECT_DOCUMENT', 'DOCUMENT_REJECTED',
            'PUBLISH_DOCUMENT', 'DOCUMENT_PUBLISHED', 'ARCHIVE_DOCUMENT', 'DOCUMENT_ARCHIVED',
            'CHANGE_DOCUMENT_STATUS', 'DOCUMENT_STATUS_CHANGED', 'DISPOSE_DOCUMENT',
            // Version Management
            'CREATE_VERSION', 'VERSION_CREATED', 'COMPARE_VERSIONS', 'VERSION_COMPARED',
            'RESTORE_VERSION', 'VERSION_RESTORED', 'VIEW_VERSION_HISTORY', 'VERSION_HISTORY_VIEWED',
            // Workflow
            'WORKFLOW_TRANSITION', 'APPROVE_WORKFLOW', 'WORKFLOW_APPROVED',
            'REJECT_WORKFLOW', 'WORKFLOW_REJECTED', 'RETURN_WORKFLOW', 'WORKFLOW_RETURNED',
            'VIEW_WORKFLOW_HISTORY', 'WORKFLOW_HISTORY_VIEWED',
            'QUERY_WORKFLOW_TRANSITIONS', 'WORKFLOW_TRANSITIONS_QUERIED',
            'VIEW_WORKFLOW_STATS', 'WORKFLOW_STATS_VIEWED',
            // File Management
            'UPLOAD_FILE', 'FILE_UPLOADED', 'DOWNLOAD_FILE', 'FILE_DOWNLOADED',
            'DELETE_FILE', 'FILE_DELETED', 'ATTACH_FILE', 'FILE_ATTACHED', 'DOCUMENT_FILE_ATTACHED',
            // Permission Management
            'GRANT_PERMISSION', 'PERMISSION_GRANTED', 'REVOKE_PERMISSION', 'PERMISSION_REVOKED',
            'CHECK_PERMISSION', 'PERMISSION_CHECKED', 'PERMISSION_DENIED', 'MANAGE_PERMISSIONS',
            // System & Admin
            'SYSTEM_BACKUP', 'SYSTEM_RESTORE', 'SYSTEM_MAINTENANCE', 'SYSTEM_ERROR',
            'SYSTEM_STARTUP', 'SYSTEM_SHUTDOWN', 'UPDATE_SYSTEM_SETTINGS', 'SYSTEM_SETTINGS_UPDATED',
            'VIEW_SYSTEM_SETTINGS',
            'ENDPOINT_NOT_FOUND', 'ERROR_OCCURRED',
            'VIEW_DOCUMENT_STATISTICS', 'DOCUMENT_STATISTICS_VIEWED',
            'VIEW_DOCUMENTS_DUE_REVIEW', 'DOCUMENTS_DUE_REVIEW_VIEWED',
            'VIEW_SEARCH_FILTERS', 'SEARCH_FILTERS_VIEWED',
            'VIEW_LOCKED_USERS', 'LOCKED_USERS_VIEWED',
            'VIEW_SYSTEM_STATS', 'SYSTEM_STATS_VIEWED',
            'VIEW_DEPARTMENT_STATS', 'DEPARTMENT_STATS_VIEWED',
            'VIEW_USER_STATS', 'USER_STATS_VIEWED',
            'VIEW_SYSTEM_DATA', 'SYSTEM_DATA_VIEWED',
            'SYSTEM_VIEWED',
            'VIEW_AUDIT_LOGS', // <<<### ĐÃ CHUẨN HÓA TÊN ACTION ###>>>
            'EXPORT_AUDIT_LOGS',
            'MANAGE_SYSTEM',
            // Internal/Specific checks
            'CHECK_PERMISSION_INTERNAL',
            'SUBMIT_FOR_REVIEW',
            'REVIEW_DOCUMENT',
            // More specific actions as needed by services/routes
            'USER_PROFILE_VIEWED',
            'USER_ACTIVITY_VIEWED',
            'EDIT_USER_PROFILE',
            'UPLOAD_FILES'
        ]);
        return Array.from(actions);
    }

    static get VALID_RESOURCE_TYPES() {
        const resourceTypes = new Set([
            'user', 'document', 'version', 'file', 'workflow', 'permission', 'system',
            'audit_log', // <<<### ĐẢM BẢO RESOURCE TYPE NÀY TỒN TẠI ###>>>
            'auth',
            'permission_check', 'permission_grant', 'permission_revoke',
            'effective_permission_query',
            'system_settings',
            'workflow_task',
            'workflow_dashboard',
            'upload',
            'search_suggestion',
            'document_statistics',
            'documents_due_review',
            'search_filters',
            'locked_users',
            'system_stats',
            'department_stats',
            'user_stats',
        ]);
        return Array.from(resourceTypes);
    }

    static async create(auditData) {
        // dbManager và logError được import ở đầu file
        const { user_id = null, action, resource_type, resource_id = null, details = {}, ip_address = null, user_agent = null, session_id = null } = auditData;

        if (!action || !resource_type) {
             if (typeof logError === 'function') { // Kiểm tra trước khi gọi
                logError(new Error('Audit log creation failed: Missing required fields (action, resource_type).'), null, {auditData});
             } else {
                console.error('[AuditLog.create] logError is not a function. Audit log creation failed: Missing required fields (action, resource_type).', {auditData});
             }
            return null;
        }
        if (!AuditLog.VALID_ACTIONS.includes(action)) {
            if (typeof logError === 'function') {
                logError(new Error(`Invalid audit action before DB insert: ${action}.`), null, { auditData });
            } else {
                console.error(`[AuditLog.create] logError is not a function. Invalid audit action before DB insert: ${action}.`, { auditData });
            }
        }
        if (!AuditLog.VALID_RESOURCE_TYPES.includes(resource_type)) {
             if (typeof logError === 'function') {
                logError(new Error(`Invalid audit resource_type before DB insert: ${resource_type}.`), null, { auditData });
             } else {
                console.error(`[AuditLog.create] logError is not a function. Invalid audit resource_type before DB insert: ${resource_type}.`, { auditData });
             }
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
            if (typeof logError === 'function') {
                logError(dbError, null, {operation: 'AuditLog.create.dbManager.run', auditAction: action, auditResourceType: resource_type});
            } else {
                console.error('[AuditLog.create] logError is not a function.', {operation: 'AuditLog.create.dbManager.run', auditAction: action, auditResourceType: resource_type, error: dbError});
            }
            if (dbError.message && (dbError.message.toLowerCase().includes("check constraint failed") || dbError.message.toLowerCase().includes("constraint failed"))) {
                 console.error(`AUDIT LOG DB CONSTRAINT VIOLATION: Action='${action}', ResourceType='${resource_type}'. Ensure these are in schema's CHECK constraints AND in AuditLog.js model's VALID_ACTIONS/VALID_RESOURCE_TYPES.`);
            }
            return null;
        }
    }

    static async findAll(filters = {}, page = 1, limit = 50) { /* ... Giữ nguyên implementation ... */ }
}
module.exports = AuditLog;
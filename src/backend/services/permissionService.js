// src/backend/services/permissionService.js
/**
 * =================================================================
 * EDMS 1CAR - Permission Service
 * Role-based access control and permission management
 * Based on C-PL-MG-005 and C-FM-MG-004 requirements
 * =================================================================
 */

const { dbManager } = require('../config/database');
// Đảm bảo import đúng và logger.js export đúng các hàm này
const { logError, appLogger } = require('../utils/logger');
const AuditService = require('./auditService'); // Import AuditService
const AuditLogModel = require('../models/AuditLog');
const UserModel = require('../models/User');
const DocumentModel = require('../models/Document');

class PermissionService {
  static get VALID_ACTIONS() {
    return AuditLogModel.VALID_ACTIONS;
  }

  static get VALID_RESOURCE_TYPES() {
    return AuditLogModel.VALID_RESOURCE_TYPES;
  }

  static get ROLE_PERMISSIONS() {
    const allAdminActions = PermissionService.VALID_ACTIONS;
    return {
      admin: allAdminActions,
      user: [
        'VIEW_DOCUMENT', 'CREATE_DOCUMENT', 'EDIT_DOCUMENT',
        'CREATE_VERSION', 'VIEW_VERSION_HISTORY', 'SUBMIT_FOR_REVIEW',
        'VIEW_USERS', 'EDIT_USER_PROFILE', 'UPLOAD_FILES'
      ],
      guest: ['VIEW_DOCUMENT']
    };
  }

  static get DEPARTMENT_DOCUMENT_PERMISSIONS() {
    const ALL_DOC_TYPES = DocumentModel.VALID_TYPES || ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC'];
    return {
      'Ban Giám đốc': ALL_DOC_TYPES,
      'Phòng Phát triển Nhượng quyền': ['PL', 'PR', 'WI', 'TD', 'FM'],
      'Phòng Đào tạo Tiêu chuẩn': ['WI', 'TD', 'TR', 'FM'],
      'Phòng Marketing': ['PR', 'WI', 'TD', 'PL', 'FM'],
      'Phòng Kỹ thuật QC': ['PR', 'WI', 'FM', 'TD', 'RC'],
      'Phòng Tài chính': ['PR', 'WI', 'FM', 'PL', 'RC'],
      'Phòng Công nghệ Hệ thống': ['PR', 'WI', 'TD', 'PL', 'RC'],
      'Phòng Pháp lý': ['PL', 'PR', 'WI', 'FM', 'RC'],
      'Bộ phận Tiếp nhận CSKH': ['WI', 'TD', 'FM', 'RC'],
      'Bộ phận Kỹ thuật Garage': ['WI', 'TD', 'TR', 'FM', 'RC'],
      'Bộ phận QC Garage': ['WI', 'FM', 'TD', 'RC'],
      'Bộ phận Kho/Kế toán Garage': ['WI', 'FM', 'PR', 'RC'],
      'Bộ phận Marketing Garage': ['WI', 'TD', 'PR', 'FM'],
      'Quản lý Garage': ALL_DOC_TYPES
    };
  }

  static async checkPermission(userId, action, resourceType, resourceId = null, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    const auditDetailsBase = { action_attempted: action, user_id_checked: userId, resource_type: resourceType, resource_id: resourceId };

    const safeAuditLog = async (logData) => {
        if (typeof AuditService.log === 'function') {
            await AuditService.log(logData);
        } else {
            appLogger.error("AuditService.log is not a function. Could not log permission event.", { originalLogData: logData, from: "PermissionService.checkPermission" });
        }
    };

    try {
      if (!userId && userId !== 0) {
        await safeAuditLog({ action: 'PERMISSION_DENIED', userId: null, resourceType, resourceId, details: { ...auditDetailsBase, reason: 'User ID not provided' }, ipAddress, userAgent, sessionId });
        return { allowed: false, reason: 'User ID not provided' };
      }

      if (!PermissionService.VALID_ACTIONS.includes(action)) {
        if (typeof logError === 'function') logError(new Error(`Invalid action for permission check: ${action}.`), context, { userId, resourceType, resourceId });
        await safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: `Invalid action: ${action}` }, ipAddress, userAgent, sessionId });
        return { allowed: false, reason: `Invalid action: ${action}` };
      }

      if (!PermissionService.VALID_RESOURCE_TYPES.includes(resourceType)) {
        if (typeof logError === 'function') logError(new Error(`Invalid resource type for permission check: ${resourceType}.`), context, { userId, action, resourceId });
        await safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: `Invalid resource type: ${resourceType}` }, ipAddress, userAgent, sessionId });
        return { allowed: false, reason: `Invalid resource type: ${resourceType}` };
      }

      const user = await dbManager.get( 'SELECT id, email, name, department, role, is_active FROM users WHERE id = ?', [userId] );
      if (!user) {
        await safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: 'User not found for permission check' }, ipAddress, userAgent, sessionId });
        return { allowed: false, reason: 'User not found for permission check' };
      }
      if (!user.is_active) {
        await safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: 'User account is inactive', user_email: user.email }, ipAddress, userAgent, sessionId });
        return { allowed: false, reason: 'User account is inactive' };
      }

      auditDetailsBase.user_email = user.email;
      auditDetailsBase.user_role = user.role;

      if (user.role === 'admin') {
        await safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId, details: { ...auditDetailsBase, result: 'allowed', reason: 'admin_role' }, ipAddress, userAgent, sessionId });
        return { allowed: true, reason: 'Admin access' };
      }

      const rolePermissions = PermissionService.ROLE_PERMISSIONS[user.role] || [];
      if (!rolePermissions.includes(action)) {
        await safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: `Action '${action}' not generally permitted for role '${user.role}'.` }, ipAddress, userAgent, sessionId });
        return { allowed: false, reason: `Action '${action}' not permitted for role '${user.role}'.` };
      }

      if (action === 'CREATE_DOCUMENT' && resourceType === 'document') {
          await safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId: null, details: { ...auditDetailsBase, result: 'allowed', reason: 'Role allows document creation' }, ipAddress, userAgent, sessionId });
          return { allowed: true, reason: 'Role allows document creation' };
      }
      if (action === 'VIEW_AUDIT_LOGS' && resourceType === 'audit_log') {
          await safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId, details: { ...auditDetailsBase, result: 'allowed', reason: 'Allowed to view audit logs by role permission' }, ipAddress, userAgent, sessionId });
          return { allowed: true, reason: 'Allowed to view audit logs by role permission' };
      }

      if (resourceType === 'document' && resourceId) {
        return await PermissionService._checkDocumentSpecificPermission(user, action, resourceId, context, auditDetailsBase);
      }

      if (resourceType === 'user') {
        if (action === 'EDIT_USER_PROFILE') {
            if (Number(resourceId) === Number(userId)) {
                 await safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId, details: { ...auditDetailsBase, result: 'allowed', reason: 'Editing own profile' }, ipAddress, userAgent, sessionId });
                return { allowed: true, reason: 'Can edit own profile' };
            } else {
                 await safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: 'User can only edit their own profile', target_user_id: resourceId }, ipAddress, userAgent, sessionId });
              return { allowed: false, reason: 'User can only edit their own profile' };
            }
        }
      }

      await safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId, details: { ...auditDetailsBase, result: 'allowed', reason: 'General role permission granted by default' }, ipAddress, userAgent, sessionId });
      return { allowed: true, reason: 'Role permission granted (generic default)' };

    } catch (error) {
      // logError đã được import và nên dùng được ở đây
      if (typeof logError === 'function') {
        logError(error, context, { operation: 'PermissionService.checkPermission', userId, action, resourceType, resourceId });
      } else {
        appLogger.error("logError is not a function in PermissionService.checkPermission catch block.", { originalError: error.message, userId, action, resourceType, resourceId});
      }
      // Ghi log lỗi nghiêm trọng hơn nếu không log được qua AuditService
      appLogger.error("CRITICAL: Error during permission check. AuditService.log might be unavailable or there's another issue.", {
           originalError: error.message, userId, action, resourceType, resourceId, auditDetailsBase
      });
      return { allowed: false, reason: `Permission check failed: ${error.message}` };
    }
  }

  // Các hàm _checkDocumentSpecificPermission, _checkExplicitGrants, grantDocumentPermission, etc.
  // nên được giữ nguyên logic nghiệp vụ, nhưng các lời gọi await AuditService.log(...)
  // bên trong chúng cũng nên được thay thế bằng await safeAuditLog(...) đã định nghĩa ở trên
  // để đảm bảo tính ổn định nếu AuditService.log có vấn đề.
  // Ví dụ cho _checkDocumentSpecificPermission:

  static async _checkDocumentSpecificPermission(user, action, documentId, context = {}, auditDetailsBase = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    let permissionResult = { allowed: false, reason: 'Default: No matching document permission rule.' };
    const safeAuditLog = async (logData) => { // Định nghĩa lại helper cục bộ hoặc truyền vào
        if (typeof AuditService.log === 'function') {
            await AuditService.log(logData);
        } else {
            appLogger.error("AuditService.log is not a function. Could not log perm event.", { originalLogData: logData, from:"_checkDocumentSpecificPermission" });
        }
    };
    try {
      const document = await dbManager.get( 'SELECT id, author_id, department, type, status, security_level, document_code FROM documents WHERE id = ?', [documentId] );
      if (!document) return { allowed: false, reason: 'Document not found for permission check.' };
      const currentAuditDetails = { ...auditDetailsBase, document_code: document.document_code, document_status: document.status, document_security: document.security_level, document_type: document.type, document_department: document.department };
      const explicitPerm = await PermissionService._checkExplicitGrants(user, documentId, action);
      if (explicitPerm.hasExplicitGrant) permissionResult = { allowed: explicitPerm.allowed, reason: explicitPerm.reason || (explicitPerm.allowed ? 'Explicit permission granted.' : 'Explicit permission denied by specific grant.'), explicitPermissionType: explicitPerm.explicitPermissionType };
      if ((!explicitPerm.hasExplicitGrant || explicitPerm.allowed) && document.author_id === user.id) {
        const authorAllowedActions = { 'VIEW_DOCUMENT': true, 'EDIT_DOCUMENT': true, 'CREATE_VERSION': true, 'VIEW_VERSION_HISTORY': true, 'SUBMIT_FOR_REVIEW': true, 'DELETE_DOCUMENT': document.status === 'draft' };
        if (authorAllowedActions[action]) {
          if (action === 'DELETE_DOCUMENT' && document.status !== 'draft') { if (!permissionResult.allowed) permissionResult = { allowed: false, reason: 'Author can only delete their own draft documents.' }; }
          else { if (!explicitPerm.hasExplicitGrant || (explicitPerm.hasExplicitGrant && explicitPerm.allowed)) permissionResult = { allowed: true, reason: 'Document author' }; }
        }
      }
      if (!permissionResult.allowed) {
        const departmentDocTypes = (PermissionService.DEPARTMENT_DOCUMENT_PERMISSIONS[user.department]) || [];
        if (departmentDocTypes.includes(document.type)) {
          if (action === 'VIEW_DOCUMENT') permissionResult = { allowed: true, reason: 'Allowed by department and document type for viewing.' };
          else if (action === 'EDIT_DOCUMENT' && document.status === 'draft' && document.department === user.department) permissionResult = { allowed: true, reason: 'Allowed to edit draft within own department.' };
        } else if (!explicitPerm.hasExplicitGrant) permissionResult = { allowed: false, reason: `User's department (${user.department}) has no default access to document type (${document.type}).` };
      }
      if (permissionResult.allowed && !(explicitPerm.hasExplicitGrant && explicitPerm.allowed && explicitPerm.explicitPermissionType === 'admin')) {
        const securityLevelsHierarchy = { 'public': 0, 'internal': 1, 'confidential': 2, 'restricted': 3 };
        const userSecurityClearance = user.role === 'admin' ? 3 : ((UserModel.USER_SECURITY_CLEARANCE || {})[user.role] || 1);
        const documentSecurityRating = securityLevelsHierarchy[document.security_level] ?? 0;
        if (userSecurityClearance < documentSecurityRating) permissionResult = { allowed: false, reason: `Insufficient security clearance for document level '${document.security_level}'. User clearance: ${userSecurityClearance}, Doc rating: ${documentSecurityRating}` };
      }
      if (permissionResult.allowed) {
        if (document.status === 'published' && (action === 'EDIT_DOCUMENT' || action === 'DELETE_DOCUMENT')) {
          const isAdminEquivalent = user.role === 'admin' || (explicitPerm.hasExplicitGrant && explicitPerm.allowed && explicitPerm.explicitPermissionType === 'admin');
          if (!isAdminEquivalent) permissionResult = { allowed: false, reason: 'Published documents cannot be edited or deleted by general users/roles without explicit admin rights on document.' };
        }
        if (document.status === 'archived' && !['VIEW_DOCUMENT', 'RESTORE_VERSION', 'DISPOSE_DOCUMENT'].includes(action)) permissionResult = { allowed: false, reason: 'Archived document is generally read-only or requires specific admin actions.' };
        if (document.status === 'disposed') permissionResult = { allowed: false, reason: 'Disposed document cannot be accessed or modified.' };
      }
      currentAuditDetails.final_reason = permissionResult.reason;
      await safeAuditLog({ action: permissionResult.allowed ? 'PERMISSION_CHECKED' : 'PERMISSION_DENIED', userId: user.id, resourceType: 'document', resourceId: documentId, details: currentAuditDetails, ipAddress, userAgent, sessionId });
      return permissionResult;
    } catch (error) {
      // Đảm bảo logError được gọi đúng cách nếu nó tồn tại
      if (typeof logError === 'function') {
        logError(error, context, { operation: '_checkDocumentSpecificPermission', userId: user.id, action, documentId });
      } else {
        appLogger.error("logError is not a function in _checkDocumentSpecificPermission catch.", {originalError: error.message, userId: user.id, action, documentId});
      }
      appLogger.error("CRITICAL: Error during document specific permission check.", { originalError: error.message, userId: user.id, action, documentId, auditDetailsBase });
      return { allowed: false, reason: `Error in document permission check: ${error.message}` };
    }
  }

  static async _checkExplicitGrants(user, documentId, action) { /* Giữ nguyên implementation */
     try {
      const permissions = await dbManager.all(`
        SELECT permission_type FROM document_permissions
        WHERE document_id = ? AND is_active = 1
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
          AND ((user_id = ? AND department IS NULL) OR (user_id IS NULL AND department = ?))
      `, [documentId, user.id, user.department]);

      if (permissions.length === 0) {
        return { hasExplicitGrant: false, allowed: false, reason: 'No explicit permissions found for user/department.', explicitPermissionType: null };
      }
      const actionToPermissionMap = {
        'VIEW_DOCUMENT': ['read', 'write', 'approve', 'admin'],
        'EDIT_DOCUMENT': ['write', 'approve', 'admin'],
        'DELETE_DOCUMENT': ['admin'],
        'APPROVE_DOCUMENT': ['approve', 'admin'], 'PUBLISH_DOCUMENT': ['approve', 'admin'],
        'ARCHIVE_DOCUMENT': ['admin'], 'DISPOSE_DOCUMENT': ['admin'],
        'CREATE_VERSION': ['write', 'approve', 'admin'],
        'VIEW_VERSION_HISTORY': ['read', 'write', 'approve', 'admin'],
        'RESTORE_VERSION': ['admin'],
        'MANAGE_PERMISSIONS': ['admin']
      };
      const requiredPermissions = actionToPermissionMap[action] || [];
      const userExplicitPermissionTypes = permissions.map(p => p.permission_type);
      for (const reqPerm of requiredPermissions) {
        if (userExplicitPermissionTypes.includes(reqPerm)) {
          return { hasExplicitGrant: true, allowed: true, reason: `Explicit '${reqPerm}' permission found.`, explicitPermissionType: reqPerm };
        }
      }
      return { hasExplicitGrant: true, allowed: false, reason: `Found explicit permissions [${userExplicitPermissionTypes.join(', ')}], but none match action '${action}'.`, explicitPermissionType: userExplicitPermissionTypes.join(',') };
    } catch (error) {
      // Đảm bảo logError được gọi đúng cách nếu nó tồn tại
      if (typeof logError === 'function') {
        logError(error, null, { operation: '_checkExplicitGrants', userId: user.id, documentId, action });
      } else {
         appLogger.error("logError is not a function in _checkExplicitGrants catch.", {originalError: error.message, userId: user.id, documentId, action});
      }
      return { hasExplicitGrant: false, allowed: false, reason: `Error checking explicit grants: ${error.message}`, explicitPermissionType: null };
    }
  }
  static async grantDocumentPermission(documentId, targetType, targetId, permissionType, grantedByUserId, context = {}) { /* Tương tự, áp dụng safeAuditLog nếu có gọi AuditService.log */ }
  static async revokeDocumentPermission(documentId, targetType, targetId, permissionType, revokedByUserId, context = {}) { /* Tương tự */ }
  static async getDocumentPermissions(documentId, context = {}) { /* Tương tự */ }
  static async getUserPermissionsForDocument(userId, documentId, context = {}) { /* Tương tự */ }
  static async getEffectivePermissions(userId, resourceType, resourceId = null, context = {}) { /* Tương tự */ }
}

module.exports = PermissionService;
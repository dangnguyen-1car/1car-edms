// src/backend/services/permissionService.js (Hoàn thiện - Cập nhật)

/**
 * =================================================================
 * EDMS 1CAR - Permission Service
 * Role-based access control and permission management
 * Based on C-PL-MG-005 and C-FM-MG-004 requirements
 * =================================================================
 */

const { dbManager } = require('../config/database');
const { logError, appLogger } = require('../utils/logger');
const AuditService = require('./auditService');
const AuditLogModel = require('../models/AuditLog'); // Giả định export VALID_ACTIONS, VALID_RESOURCE_TYPES
const UserModel = require('../models/User');
const DocumentModel = require('../models/Document');

class PermissionService {
  static get VALID_ACTIONS() {
    // return AuditLogModel.VALID_ACTIONS; // Lý tưởng
    return [
      'VIEW_DOCUMENT', 'EDIT_DOCUMENT', 'DELETE_DOCUMENT', 'APPROVE_DOCUMENT',
      'PUBLISH_DOCUMENT', 'ARCHIVE_DOCUMENT', 'DISPOSE_DOCUMENT',
      'CREATE_VERSION', 'VIEW_VERSION_HISTORY', 'RESTORE_VERSION',
      'VIEW_USERS', 'CREATE_USER', 'EDIT_USER', 'DELETE_USER', 'MANAGE_PERMISSIONS', 'EDIT_USER_PROFILE',
      'VIEW_AUDIT_LOGS', 'EXPORT_AUDIT_LOGS', 'MANAGE_SYSTEM', 'BACKUP_SYSTEM', 'RESTORE_SYSTEM',
      'SUBMIT_FOR_REVIEW', 'REVIEW_DOCUMENT', 'APPROVE_WORKFLOW', 'REJECT_WORKFLOW',
      // Thêm các action kiểm tra quyền nội bộ nếu cần, ví dụ:
      'CHECK_PERMISSION_INTERNAL', // Dùng cho các hàm check phức tạp hơn
      'CREATE_DOCUMENT' // <--- *** FIX: Added CREATE_DOCUMENT action ***
    ];
  }

  static get VALID_RESOURCE_TYPES() {
    // return AuditLogModel.VALID_RESOURCE_TYPES; // Lý tưởng
    return ['user', 'document', 'version', 'file', 'workflow', 'permission', 'system', 'permission_check', 'permission_grant', 'permission_revoke', 'effective_permission_query'];
  }

  static get ROLE_PERMISSIONS() {
    return {
      admin: PermissionService.VALID_ACTIONS, // Admin has all, now including CREATE_DOCUMENT
      user: [
        'VIEW_DOCUMENT', 
        'CREATE_DOCUMENT', // <-- Added for 'user' role, assuming users can create documents
        'EDIT_DOCUMENT', 
        'CREATE_VERSION', 
        'VIEW_VERSION_HISTORY',
        'SUBMIT_FOR_REVIEW', 
        'VIEW_USERS', // Typically users might only view their own profile or limited user info
        'EDIT_USER_PROFILE'
      ],
      guest: ['VIEW_DOCUMENT'] // Guests can usually only view public documents
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
      'Quản lý Garage': ALL_DOC_TYPES // Quản lý Garage có thể cần truy cập nhiều loại
    };
  }

  static async checkPermission(userId, action, resourceType, resourceId = null, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    const auditDetailsBase = { action_attempted: action, user_id_checked: userId, resource_type: resourceType, resource_id: resourceId };

    try {
      if (!userId && userId !== 0) { // Handles userId being 0 if that's a valid system/guest ID
        await AuditService.log({
          action: 'PERMISSION_DENIED', userId: null, resourceType, resourceId,
          details: { ...auditDetailsBase, reason: 'User ID not provided' },
          ipAddress, userAgent, sessionId
        });
        return { allowed: false, reason: 'User ID not provided' };
      }

      if (!(PermissionService.VALID_ACTIONS || []).includes(action)) {
        logError(new Error(`Invalid action for permission check: ${action}`), context, { userId, resourceType, resourceId });
        await AuditService.log({
          action: 'PERMISSION_DENIED', userId, resourceType, resourceId,
          details: { ...auditDetailsBase, reason: `Invalid action: ${action}` },
          ipAddress, userAgent, sessionId
        });
        return { allowed: false, reason: `Invalid action: ${action}` };
      }

      if (!(PermissionService.VALID_RESOURCE_TYPES || []).includes(resourceType)) {
        logError(new Error(`Invalid resource type for permission check: ${resourceType}`), context, { userId, action, resourceId });
        await AuditService.log({
          action: 'PERMISSION_DENIED', userId, resourceType, resourceId,
          details: { ...auditDetailsBase, reason: `Invalid resource type: ${resourceType}` },
          ipAddress, userAgent, sessionId
        });
        return { allowed: false, reason: `Invalid resource type: ${resourceType}` };
      }

      const user = await dbManager.get(
        'SELECT id, email, name, department, role, is_active FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        await AuditService.log({
          action: 'PERMISSION_DENIED', userId, resourceType, resourceId,
          details: { ...auditDetailsBase, reason: 'User not found for permission check' },
          ipAddress, userAgent, sessionId
        });
        return { allowed: false, reason: 'User not found for permission check' };
      }
      if (!user.is_active) {
        await AuditService.log({
          action: 'PERMISSION_DENIED', userId, resourceType, resourceId,
          details: { ...auditDetailsBase, reason: 'User account is inactive', user_email: user.email },
          ipAddress, userAgent, sessionId
        });
        return { allowed: false, reason: 'User account is inactive' };
      }

      // Gán user_email vào auditDetailsBase để dùng sau
      auditDetailsBase.user_email = user.email;
      auditDetailsBase.user_role = user.role;

      if (user.role === 'admin') {
        await AuditService.log({
          action: 'PERMISSION_CHECKED', userId, resourceType, resourceId,
          details: { ...auditDetailsBase, result: 'allowed', reason: 'admin_role' },
          ipAddress, userAgent, sessionId
        });
        return { allowed: true, reason: 'Admin access' };
      }

      const rolePermissions = (PermissionService.ROLE_PERMISSIONS[user.role]) || [];
      if (!rolePermissions.includes(action)) {
        await AuditService.log({
          action: 'PERMISSION_DENIED', userId, resourceType, resourceId,
          details: { ...auditDetailsBase, reason: 'Insufficient role permissions' },
          ipAddress, userAgent, sessionId
        });
        return { allowed: false, reason: 'Insufficient role permissions' };
      }

      // Specific logic for document creation, as resourceId might not exist yet.
      // If it's a CREATE_DOCUMENT action, and role allows it, generally it's permitted at this stage.
      // Further validation (e.g., department specific creation rights) might happen in the service layer.
      if (action === 'CREATE_DOCUMENT' && resourceType === 'document') {
          // If user role has CREATE_DOCUMENT, allow here.
          // Additional logic can be added, e.g., can user create this TYPE of document in THIS department?
          // For now, if the role permits general creation, we allow.
          // Department-specific creation rules can be checked in the DocumentService.createDocument itself.
          await AuditService.log({
            action: 'PERMISSION_CHECKED', userId, resourceType, resourceId: null, // resourceId is null for creation
            details: { ...auditDetailsBase, result: 'allowed', reason: 'Role allows document creation' },
            ipAddress, userAgent, sessionId
          });
          return { allowed: true, reason: 'Role allows document creation' };
      }


      if (resourceType === 'document' && resourceId) {
        // Không cần await AuditService.log ở đây nữa, vì _checkDocumentSpecificPermission sẽ log
        return await PermissionService._checkDocumentSpecificPermission(user, action, resourceId, context, auditDetailsBase);
      }

      if (resourceType === 'user') {
        if (action === 'EDIT_USER_PROFILE' && Number(resourceId) !== Number(userId)) {
           await AuditService.log({
                action: 'PERMISSION_DENIED', userId, resourceType, resourceId,
                details: { ...auditDetailsBase, reason: 'User can only edit their own profile', target_user_id: resourceId },
                ipAddress, userAgent, sessionId
            });
          return { allowed: false, reason: 'User can only edit their own profile' };
        }
        if (action === 'EDIT_USER_PROFILE' && Number(resourceId) === Number(userId)) {
             await AuditService.log({
                action: 'PERMISSION_CHECKED', userId, resourceType, resourceId,
                details: { ...auditDetailsBase, result: 'allowed', reason: 'Editing own profile' },
                ipAddress, userAgent, sessionId
            });
            return { allowed: true, reason: 'Can edit own profile' };
        }
        // Các trường hợp khác của resourceType 'user' (như VIEW_USERS, EDIT_USER bởi admin) đã được xử lý bởi rolePermissions
      }

      // If no specific rules apply, but action is in rolePermissions, grant permission.
      await AuditService.log({
        action: 'PERMISSION_CHECKED', userId, resourceType, resourceId,
        details: { ...auditDetailsBase, result: 'allowed', reason: 'General role permission granted' },
        ipAddress, userAgent, sessionId
      });
      return { allowed: true, reason: 'Role permission granted (generic)' };

    } catch (error) {
      logError(error, context, {
        operation: 'PermissionService.checkPermission',
        userId, action, resourceType, resourceId
      });
      await AuditService.log({
          action: 'SYSTEM_ERROR', userId, resourceType: 'permission_check', resourceId,
          details: { ...auditDetailsBase, error: error.message, original_action: action }, // Đổi tên `action` để tránh trùng key
          ipAddress, userAgent, sessionId
      }).catch(e => appLogger.error("CRITICAL: Error logging audit for permission check failure itself:", { originalError: error.message, auditError: e.message }));
      return { allowed: false, reason: `Permission check failed: ${error.message}` };
    }
  }

  static async _checkDocumentSpecificPermission(user, action, documentId, context = {}, auditDetailsBase = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    let permissionResult = { allowed: false, reason: 'Default: No matching document permission rule.' };

    try {
      const document = await dbManager.get(
        'SELECT id, author_id, department, type, status, security_level, document_code FROM documents WHERE id = ?',
        [documentId]
      );

      if (!document) {
        return { allowed: false, reason: 'Document not found for permission check.' };
      }
      
      const currentAuditDetails = {
          ...auditDetailsBase,
          document_code: document.document_code,
          document_status: document.status,
          document_security: document.security_level,
          document_type: document.type,
          document_department: document.department
      };

      const explicitPerm = await PermissionService._checkExplicitGrants(user, documentId, action);
      if (explicitPerm.hasExplicitGrant) {
        permissionResult = { allowed: explicitPerm.allowed, reason: explicitPerm.reason || (explicitPerm.allowed ? 'Explicit permission granted.' : 'Explicit permission denied by specific grant.'), explicitPermissionType: explicitPerm.explicitPermissionType };
      }


      if ((!explicitPerm.hasExplicitGrant || explicitPerm.allowed) && document.author_id === user.id) {
        const authorAllowedActions = {
          'VIEW_DOCUMENT': true, 'EDIT_DOCUMENT': true, 'CREATE_VERSION': true,
          'VIEW_VERSION_HISTORY': true, 'SUBMIT_FOR_REVIEW': true,
          'DELETE_DOCUMENT': document.status === 'draft'
        };
        if (authorAllowedActions[action]) {
          if (action === 'DELETE_DOCUMENT' && document.status !== 'draft') {
            if (!permissionResult.allowed) { 
               permissionResult = { allowed: false, reason: 'Author can only delete their own draft documents.' };
            }
          } else {
            if (!explicitPerm.hasExplicitGrant || (explicitPerm.hasExplicitGrant && explicitPerm.allowed)) {
              permissionResult = { allowed: true, reason: 'Document author' };
            }
          }
        }
      }


      if (!permissionResult.allowed) {
        const departmentDocTypes = (PermissionService.DEPARTMENT_DOCUMENT_PERMISSIONS[user.department]) || [];
        if (departmentDocTypes.includes(document.type)) {
          if (action === 'VIEW_DOCUMENT') {
            permissionResult = { allowed: true, reason: 'Allowed by department and document type for viewing.' };
          } else if (action === 'EDIT_DOCUMENT' && document.status === 'draft' && document.department === user.department) {
            permissionResult = { allowed: true, reason: 'Allowed to edit draft within own department.' };
          }
        } else if (!explicitPerm.hasExplicitGrant) { 
            permissionResult = { allowed: false, reason: `User's department (${user.department}) has no default access to document type (${document.type}).` };
        }
      }

      if (permissionResult.allowed && !(explicitPerm.hasExplicitGrant && explicitPerm.allowed && explicitPerm.explicitPermissionType === 'admin')) {
        const securityLevelsHierarchy = { 'public': 0, 'internal': 1, 'confidential': 2, 'restricted': 3 };
        const userSecurityClearance = user.role === 'admin' ? 3 : ((UserModel.USER_SECURITY_CLEARANCE || {})[user.role] || 1);
        const documentSecurityRating = securityLevelsHierarchy[document.security_level] ?? 0;

        if (userSecurityClearance < documentSecurityRating) {
          permissionResult = { allowed: false, reason: `Insufficient security clearance for document level '${document.security_level}'. User clearance: ${userSecurityClearance}, Doc rating: ${documentSecurityRating}` };
        }
      }

      if (permissionResult.allowed) {
        if (document.status === 'published' && (action === 'EDIT_DOCUMENT' || action === 'DELETE_DOCUMENT')) {
          const isAdminEquivalent = user.role === 'admin' || (explicitPerm.hasExplicitGrant && explicitPerm.allowed && explicitPerm.explicitPermissionType === 'admin');
          if (!isAdminEquivalent) {
            permissionResult = { allowed: false, reason: 'Published documents cannot be edited or deleted by general users/roles without explicit admin rights on document.' };
          }
        }
        if (document.status === 'archived' && !['VIEW_DOCUMENT', 'RESTORE_VERSION', 'DISPOSE_DOCUMENT'].includes(action)) {
          permissionResult = { allowed: false, reason: 'Archived document is generally read-only or requires specific admin actions.' };
        }
        if (document.status === 'disposed') {
          permissionResult = { allowed: false, reason: 'Disposed document cannot be accessed or modified.' };
        }
      }
      
      currentAuditDetails.final_reason = permissionResult.reason;
      await AuditService.log({
        action: permissionResult.allowed ? 'PERMISSION_CHECKED' : 'PERMISSION_DENIED',
        userId: user.id,
        resourceType: 'document',
        resourceId: documentId,
        details: currentAuditDetails,
        ipAddress, userAgent, sessionId
      });

      return permissionResult;

    } catch (error) {
      logError(error, context, { operation: '_checkDocumentSpecificPermission', userId: user.id, action, documentId });
      const errorAuditDetails = { ...auditDetailsBase, error: error.message, original_action_doc: action };
      await AuditService.log({
          action: 'SYSTEM_ERROR', userId: user.id, resourceType: 'document_permission_check', resourceId:documentId,
          details: errorAuditDetails,
          ipAddress, userAgent, sessionId
      }).catch(e => appLogger.error("CRITICAL: Error logging audit for doc perm check failure itself:", { originalError: error.message, auditError: e.message }));
      return { allowed: false, reason: `Error in document permission check: ${error.message}` };
    }
  }

  static async _checkExplicitGrants(user, documentId, action) {
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
      logError(error, null, { operation: '_checkExplicitGrants', userId: user.id, documentId, action });
      return { hasExplicitGrant: false, allowed: false, reason: `Error checking explicit grants: ${error.message}`, explicitPermissionType: null };
    }
  }
  

  static async grantDocumentPermission(documentId, targetType, targetId, permissionType, grantedByUserId, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    const auditDetailsBase = { granting_user_id: grantedByUserId, target_type: targetType, target_id: String(targetId), permission_type_granted: permissionType };
    try {
      const validPermissionTypes = ['read', 'write', 'approve', 'admin'];
      if (!validPermissionTypes.includes(permissionType)) {
          throw new Error(`Invalid permission type: ${permissionType}`);
      }
      if (!['user', 'department'].includes(targetType)) {
          throw new Error(`Invalid target type: ${targetType}`);
      }

      const canGrantCheck = await PermissionService.checkPermission(grantedByUserId, 'MANAGE_PERMISSIONS', 'document', documentId, context);
      if (!canGrantCheck.allowed) {
        throw new Error(`Granter (ID: ${grantedByUserId}) lacks permission to manage permissions for document ID ${documentId}. Reason: ${canGrantCheck.reason}`);
      }

       const userIdToInsert = targetType === 'user' ? targetId : null;
       const departmentToInsert = targetType === 'department' ? targetId : null;

       await dbManager.run(`
        DELETE FROM document_permissions
        WHERE document_id = ? AND
              (user_id = ? OR (? IS NULL AND user_id IS NULL)) AND 
              (department = ? OR (? IS NULL AND department IS NULL)) AND
              permission_type = ?
      `, [documentId, userIdToInsert, userIdToInsert, departmentToInsert, departmentToInsert, permissionType]);


      const result = await dbManager.run(`
        INSERT INTO document_permissions (document_id, user_id, department, permission_type, granted_by, granted_at, is_active)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `, [documentId, userIdToInsert, departmentToInsert, permissionType, grantedByUserId]);


      let targetEmail = null;
      if (targetType === 'user') {
          const targetUser = await dbManager.get('SELECT email FROM users WHERE id = ?', [targetId]);
          targetEmail = targetUser?.email;
      }

      await AuditService.log({
        action: 'PERMISSION_GRANTED', userId: grantedByUserId, resourceType: 'document', resourceId: documentId,
        details: { ...auditDetailsBase, new_permission_id: result.lastID, granted_to_user_email: targetEmail, granted_to_department: departmentToInsert },
        ipAddress, userAgent, sessionId
      });

      appLogger.info('Document permission granted.', { documentId, targetType, targetId, permissionType, grantedByUserId });
      return { success: true, permissionId: result.lastID, message: 'Permission granted successfully.' };

    } catch (error) {
      logError(error, context, { operation: 'grantDocumentPermission', documentId, targetType, targetId, permissionType, grantedByUserId });
      await AuditService.log({
          action: 'SYSTEM_ERROR', userId: grantedByUserId, resourceType: 'permission_grant', resourceId: documentId,
          details: { ...auditDetailsBase, error: error.message },
          ipAddress, userAgent, sessionId
      }).catch(e => appLogger.error("CRITICAL: Error logging audit for grant permission failure itself:", { originalError: error.message, auditError: e.message }));
      throw error;
    }
  }

  static async revokeDocumentPermission(documentId, targetType, targetId, permissionType, revokedByUserId, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    const auditDetailsBase = { revoking_user_id: revokedByUserId, target_type: targetType, target_id: String(targetId), permission_type_revoked: permissionType };
    try {
      if (!['user', 'department'].includes(targetType)) {
          throw new Error(`Invalid target type: ${targetType}`);
      }

      const canRevokeCheck = await PermissionService.checkPermission(revokedByUserId, 'MANAGE_PERMISSIONS', 'document', documentId, context);
      if (!canRevokeCheck.allowed) {
        throw new Error(`Revoker (ID: ${revokedByUserId}) lacks permission to manage permissions for document ID ${documentId}. Reason: ${canRevokeCheck.reason}`);
      }

      const userIdToUpdate = targetType === 'user' ? targetId : null;
      const departmentToUpdate = targetType === 'department' ? targetId : null;

      const result = await dbManager.run(`
        UPDATE document_permissions
        SET is_active = 0, expires_at = CURRENT_TIMESTAMP 
        WHERE document_id = ? AND
              (user_id = ? OR (? IS NULL AND user_id IS NULL)) AND
              (department = ? OR (? IS NULL AND department IS NULL)) AND
              permission_type = ? AND
              is_active = 1
      `, [documentId, userIdToUpdate, userIdToUpdate, departmentToUpdate, departmentToUpdate, permissionType]);


      if (result.changes === 0) {
        appLogger.warn('Attempted to revoke a permission that was not found or already inactive.',
            { documentId, targetType, targetId, permissionType, revokedByUserId });
      }
      
      let targetEmail = null;
      if (targetType === 'user') {
          const targetUser = await dbManager.get('SELECT email FROM users WHERE id = ?', [targetId]);
          targetEmail = targetUser?.email;
      }

      await AuditService.log({
        action: 'PERMISSION_REVOKED', userId: revokedByUserId, resourceType: 'document', resourceId: documentId,
        details: { ...auditDetailsBase, revoked_from_user_email: targetEmail, revoked_from_department: departmentToUpdate },
        ipAddress, userAgent, sessionId
      });

      appLogger.info('Document permission revoked.', { documentId, targetType, targetId, permissionType, revokedByUserId });
      return { success: true, message: 'Permission revoked successfully.', changes: result.changes };

    } catch (error) {
      logError(error, context, { operation: 'revokeDocumentPermission', documentId, targetType, targetId, permissionType, revokedByUserId });
       await AuditService.log({
          action: 'SYSTEM_ERROR', userId: revokedByUserId, resourceType: 'permission_revoke', resourceId: documentId,
          details: { ...auditDetailsBase, error: error.message },
          ipAddress, userAgent, sessionId
      }).catch(e => appLogger.error("CRITICAL: Error logging audit for revoke permission failure itself:", { originalError: error.message, auditError: e.message }));
      throw error;
    }
  }

  static async getDocumentPermissions(documentId, context = {}) {
    const { userId: requesterUserId, ipAddress, userAgent, sessionId } = context;
    try {
        if (requesterUserId) { 
            const canViewPermissions = await PermissionService.checkPermission(requesterUserId, 'MANAGE_PERMISSIONS', 'document', documentId, context);
            if (!canViewPermissions.allowed) {
                appLogger.warn("User tried to list document permissions without MANAGE_PERMISSIONS right", {requesterUserId, documentId});
                return { success: true, data: [], message: "Insufficient rights to view all permissions for this document." };
            }
        }

      const permissions = await dbManager.all(`
        SELECT dp.id, dp.document_id, dp.user_id, u.name as user_name, u.email as user_email,
               dp.department, dp.permission_type, dp.granted_at, dp.expires_at, gb.name as granted_by_name
        FROM document_permissions dp
        LEFT JOIN users u ON dp.user_id = u.id
        LEFT JOIN users gb ON dp.granted_by = gb.id
        WHERE dp.document_id = ? AND dp.is_active = 1
          AND (dp.expires_at IS NULL OR dp.expires_at > CURRENT_TIMESTAMP)
        ORDER BY dp.permission_type, COALESCE(u.name, dp.department)
      `, [documentId]);

       await AuditService.log({
          action: 'PERMISSION_CHECKED', 
          userId: requesterUserId || null,
          resourceType: 'document',
          resourceId: documentId,
          details: { operation: 'getDocumentPermissions', retrieved_count: permissions.length },
          ipAddress, userAgent, sessionId
      });

      return { success: true, data: permissions };
    } catch (error) {
      logError(error, context, { operation: 'getDocumentPermissions', documentId });
      return { success: false, error: error.message, data: [] };
    }
  }

  static async getUserPermissionsForDocument(userId, documentId, context = {}) {
    const { ipAddress, userAgent, sessionId } = context;
    try {
      const user = await dbManager.get('SELECT id, department, role, is_active, email FROM users WHERE id = ?', [userId]);
      if (!user || !user.is_active) {
        return { success: false, message: 'User not found or inactive.', data: { permissions: [], highestPermission: 'none' } };
      }

      const document = await dbManager.get('SELECT id FROM documents WHERE id = ?', [documentId]);
       if (!document) {
        return { success: false, message: 'Document not found.', data: { permissions: [], highestPermission: 'none' } };
      }

      const userGrants = await dbManager.all(
        `SELECT permission_type FROM document_permissions
         WHERE document_id = ? AND user_id = ? AND is_active = 1
           AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [documentId, userId]
      );
      const departmentGrants = await dbManager.all(
        `SELECT permission_type FROM document_permissions
         WHERE document_id = ? AND department = ? AND is_active = 1
           AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [documentId, user.department]
      );

      const allGrantedPermissionTypes = new Set([
          ...userGrants.map(p => p.permission_type),
          ...departmentGrants.map(p => p.permission_type)
      ]);

      const permissionHierarchy = ['read', 'write', 'approve', 'admin'];
      let highestLevel = -1;
      allGrantedPermissionTypes.forEach(pt => {
          const level = permissionHierarchy.indexOf(pt);
          if (level > highestLevel) highestLevel = level;
      });
      const highestPermissionType = highestLevel > -1 ? permissionHierarchy[highestLevel] : 'none';

      await AuditService.log({
          action: 'PERMISSION_CHECKED',
          userId, resourceType: 'document', resourceId: documentId,
          details: { operation: 'getUserPermissionsForDocument', target_user_id: userId, user_email: user.email, explicit_permissions_found: Array.from(allGrantedPermissionTypes), highest_explicit: highestPermissionType },
          ipAddress, userAgent, sessionId
      });

      return {
        success: true,
        data: {
          explicitPermissions: Array.from(allGrantedPermissionTypes),
          highestExplicitPermission: highestPermissionType
        }
      };
    } catch (error) {
      logError(error, context, { operation: 'getUserPermissionsForDocument', userId, documentId });
      return { success: false, error: error.message, data: { permissions: [], highestPermission: 'none' } };
    }
  }

  static async getEffectivePermissions(userId, resourceType, resourceId = null, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
        const user = await dbManager.get('SELECT id, email, name, department, role, is_active FROM users WHERE id = ?', [userId]);
        if (!user || !user.is_active) {
            return { success: false, message: 'User not found or inactive.', data: { permissions: [] } };
        }

        let effectivePermissions = new Set((PermissionService.ROLE_PERMISSIONS[user.role]) || []);

        if (resourceType === 'document' && resourceId) {
            // Check for all relevant actions and add to set if allowed
            const documentActions = ['VIEW_DOCUMENT', 'EDIT_DOCUMENT', 'DELETE_DOCUMENT', 'APPROVE_DOCUMENT', 'CREATE_VERSION']; // Add more as needed
            for (const action of documentActions) {
                if (effectivePermissions.has(action)) { // Only check specific doc perm if role already allows the general action
                    const docPermCheck = await PermissionService._checkDocumentSpecificPermission(user, action, resourceId, context, {user_email: user.email, user_role: user.role});
                    if (!docPermCheck.allowed) {
                        effectivePermissions.delete(action); // Remove if specific document check fails
                    }
                }
            }
        }
        
        const finalPermissionsArray = Array.from(effectivePermissions);
         await AuditService.log({
            action: 'PERMISSION_CHECKED',
            userId, resourceType, resourceId,
            details: { operation: 'getEffectivePermissions', user_email: user.email, count: finalPermissionsArray.length, effective_permissions: finalPermissionsArray },
            ipAddress, userAgent, sessionId
        });
        return {
            success: true,
            data: {
                userId, role: user.role, department: user.department,
                resourceType, resourceId, permissions: finalPermissionsArray
            }
        };
    } catch (error) {
        logError(error, context, {operation: 'getEffectivePermissions', userId, resourceType, resourceId});
        await AuditService.log({
            action: 'SYSTEM_ERROR', userId, resourceType: 'effective_permission_query', resourceId,
            details: { error: error.message, operation: 'getEffectivePermissions' },
            ipAddress, userAgent, sessionId
        }).catch(e => appLogger.error("CRITICAL: Error logging audit for effective perm check failure itself:", { originalError: error.message, auditError: e.message }));
        throw error;
    }
  }
}

module.exports = PermissionService;
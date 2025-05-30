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
      'CHECK_PERMISSION_INTERNAL' // Dùng cho các hàm check phức tạp hơn
    ];
  }

  static get VALID_RESOURCE_TYPES() {
    // return AuditLogModel.VALID_RESOURCE_TYPES; // Lý tưởng
    return ['user', 'document', 'version', 'file', 'workflow', 'permission', 'system', 'permission_check', 'permission_grant', 'permission_revoke', 'effective_permission_query'];
  }

  static get ROLE_PERMISSIONS() {
    return {
      admin: PermissionService.VALID_ACTIONS,
      user: [
        'VIEW_DOCUMENT', 'EDIT_DOCUMENT', 'CREATE_VERSION', 'VIEW_VERSION_HISTORY',
        'SUBMIT_FOR_REVIEW', 'VIEW_USERS', 'EDIT_USER_PROFILE'
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
      'Quản lý Garage': ALL_DOC_TYPES // Quản lý Garage có thể cần truy cập nhiều loại
    };
  }

  static async checkPermission(userId, action, resourceType, resourceId = null, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    const auditDetailsBase = { action_attempted: action, user_id_checked: userId, resource_type: resourceType, resource_id: resourceId };

    try {
      if (!userId && userId !== 0) {
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
        // Không log PERMISSION_DENIED vì resource không tồn tại, checkPermission sẽ log lỗi hệ thống nếu cần
        return { allowed: false, reason: 'Document not found for permission check.' };
      }
      
      // Thêm thông tin tài liệu vào auditDetailsBase để log một lần cuối cùng
      const currentAuditDetails = {
          ...auditDetailsBase,
          document_code: document.document_code,
          document_status: document.status,
          document_security: document.security_level,
          document_type: document.type,
          document_department: document.department
      };


      // Ưu tiên 1: Quyền tường minh (Explicit Grants)
      const explicitPerm = await PermissionService._checkExplicitGrants(user, documentId, action);
      if (explicitPerm.hasExplicitGrant) {
        permissionResult = { allowed: explicitPerm.allowed, reason: explicitPerm.reason || (explicitPerm.allowed ? 'Explicit permission granted.' : 'Explicit permission denied by specific grant.') };
      }

      // Ưu tiên 2: Quyền tác giả (nếu chưa có quyết định từ explicit grant hoặc explicit grant cho phép)
      if (!explicitPerm.hasExplicitGrant || permissionResult.allowed) {
        if (document.author_id === user.id) {
          const authorAllowedActions = {
            'VIEW_DOCUMENT': true, 'EDIT_DOCUMENT': true, 'CREATE_VERSION': true,
            'VIEW_VERSION_HISTORY': true, 'SUBMIT_FOR_REVIEW': true,
            'DELETE_DOCUMENT': document.status === 'draft'
          };
          if (authorAllowedActions[action]) {
            if (action === 'DELETE_DOCUMENT' && document.status !== 'draft') {
              if (!permissionResult.allowed) { // Chỉ cập nhật nếu chưa được phép bởi explicit grant
                 permissionResult = { allowed: false, reason: 'Author can only delete their own draft documents.' };
              }
            } else {
              // Nếu explicit grant đã cho phép, không ghi đè. Nếu chưa có quyết định, hoặc explicit grant cũng cho phép, thì đây là lý do
              if (!explicitPerm.hasExplicitGrant || (explicitPerm.hasExplicitGrant && explicitPerm.allowed)) {
                permissionResult = { allowed: true, reason: 'Document author' };
              }
            }
          }
        }
      }

      // Ưu tiên 3: Quyền theo phòng ban và loại tài liệu (CHỈ XÉT NẾU CHƯA ĐƯỢC PHÉP bởi tác giả hoặc quyền tường minh)
      if (!permissionResult.allowed) {
        const departmentDocTypes = (PermissionService.DEPARTMENT_DOCUMENT_PERMISSIONS[user.department]) || [];
        if (departmentDocTypes.includes(document.type)) {
          if (action === 'VIEW_DOCUMENT') {
            permissionResult = { allowed: true, reason: 'Allowed by department and document type for viewing.' };
          } else if (action === 'EDIT_DOCUMENT' && document.status === 'draft' && document.department === user.department) {
            permissionResult = { allowed: true, reason: 'Allowed to edit draft within own department.' };
          }
        } else if (!explicitPerm.hasExplicitGrant) { // Nếu không có explicit grant và department cũng không có quyền
            permissionResult = { allowed: false, reason: `User's department (${user.department}) has no default access to document type (${document.type}).` };
        }
      }

      // Ưu tiên 4: Ràng buộc mức độ bảo mật (GHI ĐÈ NẾU KHÔNG ĐẠT)
      // Kiểm tra này áp dụng ngay cả khi các bước trước đã cho phép, trừ khi có quyền tường minh 'admin' cho tài liệu
      if (permissionResult.allowed && !(explicitPerm.hasExplicitGrant && explicitPerm.allowed && explicitPerm.explicitPermissionType === 'admin')) {
        const securityLevelsHierarchy = { 'public': 0, 'internal': 1, 'confidential': 2, 'restricted': 3 };
        const userSecurityClearance = user.role === 'admin' ? 3 : ((UserModel.USER_SECURITY_CLEARANCE || {})[user.role] || 1);
        const documentSecurityRating = securityLevelsHierarchy[document.security_level] ?? 0;

        if (userSecurityClearance < documentSecurityRating) {
          permissionResult = { allowed: false, reason: `Insufficient security clearance for document level '${document.security_level}'. User clearance: ${userSecurityClearance}, Doc rating: ${documentSecurityRating}` };
        }
      }

      // Ưu tiên 5: Ràng buộc trạng thái tài liệu (GHI ĐÈ NẾU KHÔNG ĐẠT)
      if (permissionResult.allowed) {
        if (document.status === 'published' && (action === 'EDIT_DOCUMENT' || action === 'DELETE_DOCUMENT')) {
          // Cho phép admin hệ thống hoặc người có quyền 'admin' tường minh trên tài liệu được sửa/xóa published doc
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
      
      currentAuditDetails.final_reason = permissionResult.reason; // Thêm lý do cuối cùng vào audit
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
    // (Giữ nguyên như phiên bản trước, nhưng đảm bảo nó trả về thêm explicitPermissionType)
    try {
      const permissions = await dbManager.all(`
        SELECT permission_type FROM document_permissions
        WHERE document_id = ? AND is_active = 1
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
          AND ((user_id = ? AND department IS NULL) OR (user_id IS NULL AND department = ?))
      `, [documentId, user.id, user.department]);

      if (permissions.length === 0) {
        return { hasExplicitGrant: false, allowed: false, reason: 'No explicit permissions found for user/department.' };
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
      return { hasExplicitGrant: true, allowed: false, reason: `Found explicit permissions [${userExplicitPermissionTypes.join(', ')}], but none match action '${action}'.` };

    } catch (error) {
      logError(error, null, { operation: '_checkExplicitGrants', userId: user.id, documentId, action });
      return { hasExplicitGrant: false, allowed: false, reason: `Error checking explicit grants: ${error.message}` };
    }
  }
  
  // Các hàm grantDocumentPermission, revokeDocumentPermission, getDocumentPermissions, getUserPermissionsForDocument, getEffectivePermissions giữ nguyên như phiên bản trước của bạn
  // Chỉ cần đảm bảo chúng gọi checkPermission (nếu cần kiểm tra quyền của người thực hiện) và AuditService.log với đầy đủ context.

  // ... (Sao chép các hàm grant, revoke, getPermissions, getEffectivePermissions từ phiên bản trước của bạn)
  // Đảm bảo truyền `context` vào các lời gọi `checkPermission` và `AuditService.log` bên trong các hàm này.
  // Ví dụ cho grantDocumentPermission:
  static async grantDocumentPermission(documentId, targetType, targetId, permissionType, grantedByUserId, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    const auditDetailsBase = { granting_user_id: grantedByUserId, target_type: targetType, target_id: String(targetId), permission_type_granted: permissionType };
    try {
      // ... (validate inputs) ...

      const canGrantCheck = await PermissionService.checkPermission(grantedByUserId, 'MANAGE_PERMISSIONS', 'document', documentId, context);
      if (!canGrantCheck.allowed) {
        // AuditService.log đã được gọi bên trong checkPermission
        throw new Error(`Granter (ID: ${grantedByUserId}) lacks permission to manage permissions for document ID ${documentId}. Reason: ${canGrantCheck.reason}`);
      }

      // ... (logic insert/delete from document_permissions) ...
       const userIdCol = targetType === 'user' ? 'user_id' : 'NULL';
       const departmentCol = targetType === 'department' ? 'department' : 'NULL';
       const targetVal = targetId;

       // Xóa quyền cũ (nếu có) trước khi thêm quyền mới để tránh trùng lặp hoặc xung đột
       // Hoặc có thể cập nhật is_active = 0 cho quyền cũ và tạo quyền mới
       await dbManager.run(`
        DELETE FROM document_permissions
        WHERE document_id = ? AND
              (${userIdCol !== 'NULL' ? `user_id = ?` : `department = ?`}) AND
              permission_type = ?
      `, [documentId, targetVal, permissionType]);


      const result = await dbManager.run(`
        INSERT INTO document_permissions (document_id, ${targetType === 'user' ? 'user_id' : 'department'}, permission_type, granted_by, granted_at, is_active)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
      `, [documentId, targetVal, permissionType, grantedByUserId]);


      await AuditService.log({
        action: 'PERMISSION_GRANTED', userId: grantedByUserId, resourceType: 'document', resourceId: documentId,
        details: { ...auditDetailsBase, new_permission_id: result.lastID, granted_to_user_email: (targetType === 'user' ? (await dbManager.get('SELECT email FROM users WHERE id = ?', [targetVal]))?.email : null) },
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
      // ... (validate inputs) ...

      const canRevokeCheck = await PermissionService.checkPermission(revokedByUserId, 'MANAGE_PERMISSIONS', 'document', documentId, context);
      if (!canRevokeCheck.allowed) {
        throw new Error(`Revoker (ID: ${revokedByUserId}) lacks permission to manage permissions for document ID ${documentId}. Reason: ${canRevokeCheck.reason}`);
      }

      // ... (logic update document_permissions.is_active = 0) ...
      const userIdCol = targetType === 'user' ? 'user_id' : 'NULL';
      const departmentCol = targetType === 'department' ? 'department' : 'NULL';
      const targetVal = targetId;

      const result = await dbManager.run(`
        UPDATE document_permissions
        SET is_active = 0, expires_at = CURRENT_TIMESTAMP 
        WHERE document_id = ? AND
              (${userIdCol !== 'NULL' ? `user_id = ?` : `department = ?`}) AND
              permission_type = ? AND
              is_active = 1
      `, [documentId, targetVal, permissionType]);


      if (result.changes === 0) {
        appLogger.warn('Attempted to revoke a permission that was not found or already inactive.',
            { documentId, targetType, targetId, permissionType, revokedByUserId });
      }

      await AuditService.log({
        action: 'PERMISSION_REVOKED', userId: revokedByUserId, resourceType: 'document', resourceId: documentId,
        details: { ...auditDetailsBase, revoked_from_user_email: (targetType === 'user' ? (await dbManager.get('SELECT email FROM users WHERE id = ?', [targetVal]))?.email : null) },
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
        // Kiểm tra quyền của người yêu cầu thông tin này (ví dụ: chỉ admin hoặc người có quyền MANAGE_PERMISSIONS trên tài liệu)
        if (requesterUserId) { // Chỉ check nếu có requesterUserId
            const canViewPermissions = await PermissionService.checkPermission(requesterUserId, 'MANAGE_PERMISSIONS', 'document', documentId, context);
            if (!canViewPermissions.allowed) {
                // Không throw error mà trả về rỗng, việc ghi log PERMISSION_DENIED đã được checkPermission xử lý
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
          action: 'PERMISSION_CHECKED', // Hoặc 'DOCUMENT_PERMISSIONS_LISTED'
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
    // (Giữ nguyên logic hàm này từ phiên bản bạn cung cấp ở lượt trước, chỉ cần đảm bảo
    // các lời gọi đến checkPermission, getUserPermissionsForDocument và AuditService.log
    // truyền đúng context và xử lý kết quả một cách nhất quán.)
    // ... (logic của getEffectivePermissions đã được cung cấp trước đó) ...
    // Quan trọng là phải gọi _checkDocumentSpecificPermission nếu resourceType là 'document'
    // thay vì chỉ dựa vào getUserPermissionsForDocument, vì _checkDocumentSpecificPermission
    // đã bao gồm nhiều logic hơn (tác giả, phòng ban/loại, security, status).

    // Phiên bản rút gọn của getEffectivePermissions, cần hoàn thiện dựa trên yêu cầu
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
        const user = await dbManager.get('SELECT id, email, name, department, role, is_active FROM users WHERE id = ?', [userId]);
        if (!user || !user.is_active) {
            return { success: false, message: 'User not found or inactive.', data: { permissions: [] } };
        }

        let effectivePermissions = new Set((PermissionService.ROLE_PERMISSIONS[user.role]) || []);

        if (resourceType === 'document' && resourceId) {
            // Thay vì lặp lại logic, ta có thể "mô phỏng" việc check từng action
            // hoặc có một hàm trả về tất cả các "quyền cơ sở" cho tài liệu đó
            // đối với người dùng này.
            // Ví dụ, kiểm tra quyền VIEW_DOCUMENT
            const viewCheck = await PermissionService._checkDocumentSpecificPermission(user, 'VIEW_DOCUMENT', resourceId, context, {user_email: user.email, user_role: user.role});
            if (viewCheck.allowed) effectivePermissions.add('VIEW_DOCUMENT');

            const editCheck = await PermissionService._checkDocumentSpecificPermission(user, 'EDIT_DOCUMENT', resourceId, context, {user_email: user.email, user_role: user.role});
            if (editCheck.allowed) effectivePermissions.add('EDIT_DOCUMENT');
            // Làm tương tự cho các actions quan trọng khác...
            // Đây là cách đơn giản, cách tốt hơn là _checkDocumentSpecificPermission trả về một tập các quyền
            // thay vì chỉ true/false cho một action.
        }
        // ... (thêm logic cho các resource types khác) ...

        const finalPermissionsArray = Array.from(effectivePermissions);
         await AuditService.log({
            action: 'PERMISSION_CHECKED',
            userId, resourceType, resourceId,
            details: { operation: 'getEffectivePermissions', user_email: user.email, count: finalPermissionsArray.length },
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
        // ... (log audit error) ...
        throw error;
    }
  }
}

module.exports = PermissionService;
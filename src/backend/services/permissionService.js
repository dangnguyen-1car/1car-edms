// src/backend/services/permissionService.js
/**
 * =================================================================
 * EDMS 1CAR - Permission Service
 * Role-based access control and permission management
 * Updated with complete document permission management
 * =================================================================
 */

const { dbManager } = require('../config/database')
const { logError, appLogger } = require('../utils/logger')
const AuditService = require('./auditService')
const AuditLogModel = require('../models/AuditLog')
const UserModel = require('../models/User') // Đảm bảo UserModel có định nghĩa USER_SECURITY_CLEARANCE nếu sử dụng
const DocumentModel = require('../models/Document')

class PermissionService {
  static get VALID_ACTIONS () {
    return AuditLogModel.VALID_ACTIONS
  }

  static get VALID_RESOURCE_TYPES () {
    return AuditLogModel.VALID_RESOURCE_TYPES
  }

  static get ROLE_PERMISSIONS () {
    const allAdminActions = PermissionService.VALID_ACTIONS
    return {
      admin: allAdminActions,
      user: [
        'VIEW_DOCUMENT', 'CREATE_DOCUMENT', 'EDIT_DOCUMENT',
        'CREATE_VERSION', 'VIEW_VERSION_HISTORY', 'SUBMIT_FOR_REVIEW',
        'VIEW_USERS', 'EDIT_USER_PROFILE', 'UPLOAD_FILES',
        'DOWNLOAD_DOCUMENT'
      ],
      guest: ['VIEW_DOCUMENT', 'DOWNLOAD_DOCUMENT']
    }
  }

  static get DEPARTMENT_DOCUMENT_PERMISSIONS () {
    // Đảm bảo DocumentModel.VALID_TYPES được định nghĩa hoặc cung cấp một danh sách mặc định
    const ALL_DOC_TYPES = DocumentModel.VALID_TYPES || ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC']
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
    }
  }

  /**
   * Helper function to safely log audit events, falling back to appLogger if AuditService.log is not available.
   * @param {object} logData - The data to be logged.
   * @param {string} from - The source of the log call (e.g., "PermissionService.grantDocumentPermission").
   */
  static async _safeAuditLog (logData, from) {
    if (typeof AuditService.log === 'function') {
      try {
        await AuditService.log(logData)
      } catch (auditError) {
        appLogger.error(`Failed to log audit event from ${from}. Original audit error: ${auditError.message}`, { originalLogData: logData, auditErrorDetails: auditError.stack })
      }
    } else {
      appLogger.error(`AuditService.log is not a function. Could not log event from ${from}.`, { originalLogData: logData })
    }
  }

  /**
   * Grants a specific permission to a user or department for a document.
   * @param {number} documentId - The ID of the document.
   * @param {'user'|'department'} targetType - The type of target ('user' or 'department').
   * @param {number|string} targetId - The ID of the user or name of the department.
   * @param {'read'|'write'|'approve'|'admin'} permissionType - The type of permission to grant.
   * @param {number} grantedByUserId - The ID of the user granting the permission.
   * @param {object} [context={}] - Additional context for logging (ipAddress, userAgent, sessionId).
   * @returns {Promise<object>} - Success status and granted permission details.
   * @throws {Error} If any validation fails or database operation fails.
   */
  static async grantDocumentPermission (documentId, targetType, targetId, permissionType, grantedByUserId, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context

    try {
      // Validate inputs
      if (!documentId || !targetType || !targetId || !permissionType || !grantedByUserId) {
        throw new Error('Missing required parameters for granting permission')
      }

      if (!['user', 'department'].includes(targetType)) {
        throw new Error('Invalid target type. Must be "user" or "department"')
      }

      if (!['read', 'write', 'approve', 'admin'].includes(permissionType)) {
        throw new Error('Invalid permission type. Must be "read", "write", "approve", or "admin"')
      }

      // Check if document exists
      const document = await dbManager.get(
        'SELECT id, document_code, title FROM documents WHERE id = ?',
        [documentId]
      )
      if (!document) {
        throw new Error('Document not found')
      }

      // Validate target exists and get details for logging
      let targetName = ''
      let targetEmail = null
      let targetDepartment = null

      if (targetType === 'user') {
        const user = await dbManager.get('SELECT id, name, email, department FROM users WHERE id = ?', [targetId])
        if (!user) {
          throw new Error('Target user not found')
        }
        targetName = user.name
        targetEmail = user.email
        targetDepartment = user.department
      } else { // targetType === 'department'
        const validDepartments = Object.keys(PermissionService.DEPARTMENT_DOCUMENT_PERMISSIONS)
        if (!validDepartments.includes(targetId)) {
          throw new Error('Invalid department')
        }
        targetName = targetId // Department name is the targetId
      }

      // Check if permission already exists for active grants
      const existingPermission = await dbManager.get(`
        SELECT id FROM document_permissions
        WHERE document_id = ? AND permission_type = ? AND is_active = 1
        AND (expires_at IS NULL OR expires_at > datetime('now', 'localtime'))
        AND ${targetType === 'user' ? 'user_id = ? AND department IS NULL' : 'department = ? AND user_id IS NULL'}
      `, targetType === 'user' ? [documentId, permissionType, targetId] : [documentId, permissionType, targetId])

      if (existingPermission) {
        // Option to update expires_at if exists, or just throw error
        throw new Error(`Permission already exists for this ${targetType} and permission type`)
      }

      // Insert permission
      const result = await dbManager.run(`
        INSERT INTO document_permissions (
          document_id, ${targetType === 'user' ? 'user_id' : 'department'},
          permission_type, granted_by, granted_at, is_active
        ) VALUES (?, ?, ?, ?, datetime('now', 'localtime'), 1)
      `, [documentId, targetId, permissionType, grantedByUserId])

      // Log audit
      await PermissionService._safeAuditLog({
        action: 'PERMISSION_GRANTED',
        userId: grantedByUserId,
        resourceType: 'permission_grant', // Sử dụng resourceType cụ thể hơn
        resourceId: result.lastID, // ID của bản ghi quyền mới
        details: {
          document_id: documentId,
          document_code: document.document_code,
          document_title: document.title,
          target_type: targetType,
          target_id: targetId,
          target_name: targetName,
          target_email: targetEmail,
          target_department: targetDepartment,
          permission_type: permissionType
        },
        ipAddress,
        userAgent,
        sessionId
      }, 'PermissionService.grantDocumentPermission')

      return {
        success: true,
        data: {
          id: result.lastID,
          documentId,
          targetType,
          targetId,
          permissionType,
          grantedBy: grantedByUserId,
          grantedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, context, { operation: 'PermissionService.grantDocumentPermission', documentId, targetType, targetId, permissionType })
      } else {
        appLogger.error('logError is not a function in grantDocumentPermission catch.', { originalError: error.message, documentId, targetType, targetId, permissionType })
      }
      throw error // Re-throw the error after logging
    }
  }

  /**
   * Revokes a specific document permission by setting it to inactive (soft delete).
   * @param {number} documentId - The ID of the document.
   * @param {number} permissionId - The ID of the permission record to revoke.
   * @param {number} revokedByUserId - The ID of the user revoking the permission.
   * @param {object} [context={}] - Additional context for logging (ipAddress, userAgent, sessionId).
   * @returns {Promise<object>} - Success status and message.
   * @throws {Error} If permission not found or database operation fails.
   */
  static async revokeDocumentPermission (documentId, permissionId, revokedByUserId, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context

    try {
      // Get permission details before revoking for audit log
      const permission = await dbManager.get(`
        SELECT dp.*, d.document_code, d.title as document_title,
               u.name as user_name, u.email as user_email, u.department as user_department
        FROM document_permissions dp
        LEFT JOIN documents d ON dp.document_id = d.id
        LEFT JOIN users u ON dp.user_id = u.id
        WHERE dp.id = ? AND dp.document_id = ? AND dp.is_active = 1
      `, [permissionId, documentId])

      if (!permission) {
        throw new Error('Permission not found or already revoked for this document.')
      }

      // Revoke permission (soft delete)
      const result = await dbManager.run(`
        UPDATE document_permissions
        SET is_active = 0, revoked_by = ?, revoked_at = datetime('now', 'localtime')
        WHERE id = ? AND document_id = ? AND is_active = 1
      `, [revokedByUserId, permissionId, documentId])

      if (result.changes === 0) {
        throw new Error('Failed to revoke permission. It might have been revoked already or does not exist.')
      }

      // Log audit
      await PermissionService._safeAuditLog({
        action: 'PERMISSION_REVOKED',
        userId: revokedByUserId,
        resourceType: 'permission_revoke', // Sử dụng resourceType cụ thể hơn
        resourceId: permissionId, // ID của bản ghi quyền đã bị thu hồi
        details: {
          document_id: documentId,
          document_code: permission.document_code,
          document_title: permission.document_title,
          permission_id: permissionId,
          target_type: permission.user_id ? 'user' : 'department',
          target_id: permission.user_id || permission.department,
          target_name: permission.user_name || permission.department,
          target_email: permission.user_email || null,
          target_department: permission.user_department || null,
          permission_type: permission.permission_type,
          originally_granted_by: permission.granted_by,
          originally_granted_at: permission.granted_at
        },
        ipAddress,
        userAgent,
        sessionId
      }, 'PermissionService.revokeDocumentPermission')

      return {
        success: true,
        message: 'Permission revoked successfully'
      }
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, context, { operation: 'PermissionService.revokeDocumentPermission', documentId, permissionId, revokedByUserId })
      } else {
        appLogger.error('logError is not a function in revokeDocumentPermission catch.', { originalError: error.message, documentId, permissionId, revokedByUserId })
      }
      throw error // Re-throw the error after logging
    }
  }

  /**
   * Retrieves all active permissions for a specific document.
   * @param {number} documentId - The ID of the document.
   * @param {object} [context={}] - Additional context for logging (ipAddress, userAgent, sessionId).
   * @returns {Promise<object>} - An object containing document info and its permissions.
   * @throws {Error} If document not found or database operation fails.
   */
  static async getDocumentPermissions (documentId, context = {}) {
    // Note: This method is for retrieving existing permissions, typically a 'VIEW_DOCUMENT_PERMISSIONS' action.
    // The audit log for this action should happen at the API layer,
    // not necessarily within this internal retrieval function, unless specifically required for deep introspection.
    // For now, I will omit an internal audit log call here to avoid excessive logging for simple data retrieval.
    // If you need it, uncomment and adapt the _safeAuditLog call.

    try {
      // Get document info
      const document = await dbManager.get(
        'SELECT id, document_code, title FROM documents WHERE id = ?',
        [documentId]
      )
      if (!document) {
        throw new Error('Document not found')
      }

      // Get all active permissions for the document
      const permissions = await dbManager.all(`
        SELECT
          dp.id,
          dp.permission_type,
          dp.user_id,
          dp.department,
          dp.granted_at,
          dp.expires_at,
          u.name as user_name,
          u.email as user_email,
          u.department as user_department,
          gb.name as granted_by_name,
          gb.email as granted_by_email
        FROM document_permissions dp
        LEFT JOIN users u ON dp.user_id = u.id
        LEFT JOIN users gb ON dp.granted_by = gb.id
        WHERE dp.document_id = ? AND dp.is_active = 1
        AND (dp.expires_at IS NULL OR dp.expires_at > datetime('now', 'localtime'))
        ORDER BY dp.granted_at DESC
      `, [documentId])

      // Format permissions
      const formattedPermissions = permissions.map(perm => ({
        id: perm.id,
        type: perm.user_id ? 'user' : 'department',
        targetId: perm.user_id || perm.department,
        targetName: perm.user_name || perm.department,
        targetEmail: perm.user_email || null,
        targetDepartment: perm.user_department || null,
        permissionType: perm.permission_type,
        grantedAt: perm.granted_at,
        expiresAt: perm.expires_at,
        grantedBy: {
          name: perm.granted_by_name,
          email: perm.granted_by_email
        }
      }))

      return {
        success: true,
        data: {
          document: {
            id: document.id,
            code: document.document_code,
            title: document.title
          },
          permissions: formattedPermissions,
          totalCount: formattedPermissions.length
        }
      }
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, context, { operation: 'PermissionService.getDocumentPermissions', documentId })
      } else {
        appLogger.error('logError is not a function in getDocumentPermissions catch.', { originalError: error.message, documentId })
      }
      throw error // Re-throw the error after logging
    }
  }

  /**
   * Checks a user's general permission for an action on a resource.
   * Includes role-based, author-based, department-based, explicit, and security level checks.
   * @param {number} userId - The ID of the user.
   * @param {string} action - The action being attempted (e.g., 'VIEW_DOCUMENT', 'EDIT_USER_PROFILE').
   * @param {string} resourceType - The type of resource (e.g., 'document', 'user', 'system').
   * @param {number|string} [resourceId=null] - The ID of the specific resource instance.
   * @param {object} [context={}] - Additional context for logging (ipAddress, userAgent, sessionId).
   * @returns {Promise<{allowed: boolean, reason: string}>} - The permission result.
   */
  static async checkPermission (userId, action, resourceType, resourceId = null, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context
    const auditDetailsBase = { action_attempted: action, user_id_checked: userId, resource_type: resourceType, resource_id: resourceId }

    try {
      if (!userId && userId !== 0) {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId: null, resourceType, resourceId, details: { ...auditDetailsBase, reason: 'User ID not provided' }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
        return { allowed: false, reason: 'User ID not provided' }
      }

      if (!PermissionService.VALID_ACTIONS.includes(action)) {
        if (typeof logError === 'function') logError(new Error(`Invalid action for permission check: ${action}.`), context, { userId, resourceType, resourceId })
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: `Invalid action: ${action}` }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
        return { allowed: false, reason: `Invalid action: ${action}` }
      }

      if (!PermissionService.VALID_RESOURCE_TYPES.includes(resourceType)) {
        if (typeof logError === 'function') logError(new Error(`Invalid resource type for permission check: ${resourceType}.`), context, { userId, action, resourceId })
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: `Invalid resource type: ${resourceType}` }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
        return { allowed: false, reason: `Invalid resource type: ${resourceType}` }
      }

      const user = await dbManager.get('SELECT id, email, name, department, role, is_active FROM users WHERE id = ?', [userId])
      if (!user) {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: 'User not found for permission check' }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
        return { allowed: false, reason: 'User not found for permission check' }
      }
      if (!user.is_active) {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: 'User account is inactive', user_email: user.email }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
        return { allowed: false, reason: 'User account is inactive' }
      }

      auditDetailsBase.user_email = user.email
      auditDetailsBase.user_role = user.role

      // Admin role has full access
      if (user.role === 'admin') {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId, details: { ...auditDetailsBase, result: 'allowed', reason: 'admin_role' }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
        return { allowed: true, reason: 'Admin access' }
      }

      // Check general role permissions
      const rolePermissions = PermissionService.ROLE_PERMISSIONS[user.role] || []
      if (!rolePermissions.includes(action)) {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: `Action '${action}' not generally permitted for role '${user.role}'.` }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
        return { allowed: false, reason: `Action '${action}' not permitted for role '${user.role}'.` }
      }

      // Specific checks for actions not requiring a specific resourceId (or default behavior)
      if (action === 'CREATE_DOCUMENT' && resourceType === 'document') {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId: null, details: { ...auditDetailsBase, result: 'allowed', reason: 'Role allows document creation' }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
        return { allowed: true, reason: 'Role allows document creation' }
      }
      if (action === 'VIEW_AUDIT_LOGS' && resourceType === 'audit_log') {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId, details: { ...auditDetailsBase, result: 'allowed', reason: 'Allowed to view audit logs by role permission' }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
        return { allowed: true, reason: 'Allowed to view audit logs by role permission' }
      }

      // Document-specific permissions (most complex checks)
      if (resourceType === 'document' && resourceId) {
        return await PermissionService._checkDocumentSpecificPermission(user, action, resourceId, context, auditDetailsBase)
      }

      // User-specific resource permissions (e.g., editing own profile)
      if (resourceType === 'user') {
        if (action === 'EDIT_USER_PROFILE') {
          if (Number(resourceId) === Number(userId)) {
            await PermissionService._safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId, details: { ...auditDetailsBase, result: 'allowed', reason: 'Editing own profile' }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
            return { allowed: true, reason: 'Can edit own profile' }
          } else {
            await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: 'User can only edit their own profile', target_user_id: resourceId }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
            return { allowed: false, reason: 'User can only edit their own profile' }
          }
        }
        if (action === 'VIEW_USER' || action === 'USER_PROFILE_VIEWED') {
          // Allow viewing any user profile for general 'VIEW_USERS' role permission
          // or if viewing own profile
          if (rolePermissions.includes('VIEW_USERS') || Number(resourceId) === Number(userId)) {
            await PermissionService._safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId, details: { ...auditDetailsBase, result: 'allowed', reason: 'Allowed to view user profile by role or self' }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
            return { allowed: true, reason: 'Allowed to view user profile by role or self' }
          } else {
            await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType, resourceId, details: { ...auditDetailsBase, reason: 'Not allowed to view other user profiles' }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
            return { allowed: false, reason: 'Not allowed to view other user profiles' }
          }
        }
      }

      // Default for actions on non-document/user resources, if role permission exists
      await PermissionService._safeAuditLog({ action: 'PERMISSION_CHECKED', userId, resourceType, resourceId, details: { ...auditDetailsBase, result: 'allowed', reason: 'General role permission granted by default' }, ipAddress, userAgent, sessionId }, 'PermissionService.checkPermission')
      return { allowed: true, reason: 'Role permission granted (generic default)' }
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, context, { operation: 'PermissionService.checkPermission', userId, action, resourceType, resourceId })
      } else {
        appLogger.error('logError is not a function in PermissionService.checkPermission catch block.', { originalError: error.message, userId, action, resourceType, resourceId })
      }
      appLogger.error("CRITICAL: Error during permission check. AuditService.log might be unavailable or there's another issue.", {
        originalError: error.message, userId, action, resourceType, resourceId, auditDetailsBase
      })
      return { allowed: false, reason: `Permission check failed: ${error.message}` }
    }
  }

  /**
   * Internal function to check document-specific permissions.
   * Applies explicit grants, author-based, department-based, and security level checks.
   * @param {object} user - The user object from the database.
   * @param {string} action - The action being attempted.
   * @param {number} documentId - The ID of the document.
   * @param {object} [context={}] - Additional context.
   * @param {object} [auditDetailsBase={}] - Base audit details.
   * @returns {Promise<{allowed: boolean, reason: string, explicitPermissionType?: string}>} - The permission result.
   */
  static async _checkDocumentSpecificPermission (user, action, documentId, context = {}, auditDetailsBase = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context
    let permissionResult = { allowed: false, reason: 'Default: No matching document permission rule.' }

    try {
      const document = await dbManager.get('SELECT id, author_id, department, type, status, security_level, document_code FROM documents WHERE id = ?', [documentId])
      if (!document) {
        permissionResult = { allowed: false, reason: 'Document not found for permission check.' }
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId: user.id, resourceType: 'document', resourceId: documentId, details: { ...auditDetailsBase, final_reason: permissionResult.reason }, ipAddress, userAgent, sessionId }, 'PermissionService._checkDocumentSpecificPermission')
        return permissionResult
      }

      const currentAuditDetails = {
        ...auditDetailsBase,
        document_code: document.document_code,
        document_status: document.status,
        document_security: document.security_level,
        document_type: document.type,
        document_department: document.department
      }

      // 1. Check Explicit Grants
      const explicitPerm = await PermissionService._checkExplicitGrants(user, documentId, action)
      if (explicitPerm.hasExplicitGrant) {
        permissionResult = { allowed: explicitPerm.allowed, reason: explicitPerm.reason || (explicitPerm.allowed ? 'Explicit permission granted.' : 'Explicit permission denied by specific grant.'), explicitPermissionType: explicitPerm.explicitPermissionType }
        // If explicit permission grants or denies, it takes precedence, unless it's a "hasExplicitGrant" that is false
        if (explicitPerm.hasExplicitGrant && !explicitPerm.allowed) { // Explicitly denied
          await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId: user.id, resourceType: 'document', resourceId: documentId, details: { ...currentAuditDetails, final_reason: permissionResult.reason, explicit_permission_check: explicitPerm }, ipAddress, userAgent, sessionId }, 'PermissionService._checkDocumentSpecificPermission')
          return permissionResult
        }
      }

      // 2. Check Document Author permissions (if not explicitly denied or already allowed by admin explicit grant)
      // If explicitPerm.hasExplicitGrant is true and explicitPerm.allowed is true, and explicitPermissionType is 'admin',
      // then we don't need to check author, department or security levels as admin overrides all.
      const isAdminExplicitGrant = explicitPerm.hasExplicitGrant && explicitPerm.allowed && explicitPerm.explicitPermissionType === 'admin'

      if (!permissionResult.allowed && !isAdminExplicitGrant) { // Only check if not already allowed by explicit admin grant
        if (document.author_id === user.id) {
          const authorAllowedActions = {
            VIEW_DOCUMENT: true,
            EDIT_DOCUMENT: true,
            CREATE_VERSION: true,
            VIEW_VERSION_HISTORY: true,
            SUBMIT_FOR_REVIEW: true,
            DOWNLOAD_DOCUMENT: true, // Author can always download their document
            DELETE_DOCUMENT: document.status === 'draft' // Author can only delete their own draft
          }
          if (authorAllowedActions[action]) {
            if (action === 'DELETE_DOCUMENT' && document.status !== 'draft') {
              // Author can only delete draft, if not draft, then not allowed by author
              permissionResult = { allowed: false, reason: 'Author can only delete their own draft documents.' }
            } else {
              permissionResult = { allowed: true, reason: 'Document author.' }
            }
          }
        }
      }

      // 3. Check Department-based permissions (if not yet allowed)
      if (!permissionResult.allowed && !isAdminExplicitGrant) {
        const departmentDocTypes = (PermissionService.DEPARTMENT_DOCUMENT_PERMISSIONS[user.department]) || []
        if (departmentDocTypes.includes(document.type)) {
          if (action === 'VIEW_DOCUMENT' || action === 'DOWNLOAD_DOCUMENT') {
            permissionResult = { allowed: true, reason: 'Allowed by department and document type for viewing/downloading.' }
          } else if (action === 'EDIT_DOCUMENT' && document.status === 'draft' && document.department === user.department) {
            permissionResult = { allowed: true, reason: 'Allowed to edit draft within own department.' }
          }
          // Other department-based rules can be added here
        } else if (!(explicitPerm.hasExplicitGrant && explicitPerm.allowed)) { // Only provide this reason if no explicit grant applied or it didn't allow
          permissionResult = { allowed: false, reason: `User's department (${user.department}) has no default access to document type (${document.type}).` }
        }
      }

      // 4. Security Level Check (Applies if permission is currently allowed, except for explicit admin override)
      if (permissionResult.allowed && !isAdminExplicitGrant) {
        const securityLevelsHierarchy = { public: 0, internal: 1, confidential: 2, restricted: 3 }
        // Ensure UserModel.USER_SECURITY_CLEARANCE is defined or fallback
        const userSecurityClearance = user.role === 'admin' ? 3 : ((UserModel.USER_SECURITY_CLEARANCE || {})[user.role] || 1) // Default to 1 (internal) if not defined
        const documentSecurityRating = securityLevelsHierarchy[document.security_level] ?? 0 // Default to 0 (public) if not defined

        if (userSecurityClearance < documentSecurityRating) {
          permissionResult = { allowed: false, reason: `Insufficient security clearance for document level '${document.security_level}'. User clearance: ${userSecurityClearance}, Doc rating: ${documentSecurityRating}` }
        }
      }

      // 5. Document Status-based restrictions (Applies if permission is currently allowed, except for explicit admin override)
      if (permissionResult.allowed && !isAdminExplicitGrant) {
        if (document.status === 'published' && (action === 'EDIT_DOCUMENT' || action === 'DELETE_DOCUMENT' || action === 'CREATE_VERSION' || action === 'SUBMIT_FOR_REVIEW')) {
          // Published documents generally require explicit 'admin' permission or workflow for changes
          const isAdminEquivalent = user.role === 'admin' || (explicitPerm.hasExplicitGrant && explicitPerm.allowed && explicitPerm.explicitPermissionType === 'admin')
          if (!isAdminEquivalent) {
            permissionResult = { allowed: false, reason: 'Published documents cannot be edited, deleted, or have new versions created by general users/roles without explicit admin rights on document.' }
          }
        }
        if (document.status === 'archived' && !['VIEW_DOCUMENT', 'RESTORE_VERSION', 'DISPOSE_DOCUMENT', 'DOWNLOAD_DOCUMENT'].includes(action)) {
          permissionResult = { allowed: false, reason: 'Archived document is generally read-only or requires specific admin actions.' }
        }
        if (document.status === 'disposed') {
          permissionResult = { allowed: false, reason: 'Disposed document cannot be accessed or modified.' }
        }
      }

      currentAuditDetails.final_reason = permissionResult.reason
      currentAuditDetails.explicit_permission_check = explicitPerm // Add explicit check results to audit details

      await PermissionService._safeAuditLog({
        action: permissionResult.allowed ? 'PERMISSION_CHECKED' : 'PERMISSION_DENIED',
        userId: user.id,
        resourceType: 'document',
        resourceId: documentId,
        details: currentAuditDetails,
        ipAddress,
        userAgent,
        sessionId
      }, 'PermissionService._checkDocumentSpecificPermission')

      return permissionResult
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, context, { operation: '_checkDocumentSpecificPermission', userId: user.id, action, documentId })
      } else {
        appLogger.error('logError is not a function in _checkDocumentSpecificPermission catch.', { originalError: error.message, userId: user.id, action, documentId })
      }
      appLogger.error('CRITICAL: Error during document specific permission check.', { originalError: error.message, userId: user.id, action, documentId, auditDetailsBase })
      return { allowed: false, reason: `Error in document permission check: ${error.message}` }
    }
  }

  /**
   * Internal function to check for explicit grants (permissions directly assigned to user or department for a document).
   * @param {object} user - The user object.
   * @param {number} documentId - The ID of the document.
   * @param {string} action - The action being attempted.
   * @returns {Promise<{hasExplicitGrant: boolean, allowed: boolean, reason: string, explicitPermissionType: string|null}>}
   */
  static async _checkExplicitGrants (user, documentId, action) {
    try {
      const permissions = await dbManager.all(`
        SELECT permission_type FROM document_permissions
        WHERE document_id = ? AND is_active = 1
          AND (expires_at IS NULL OR expires_at > datetime('now', 'localtime'))
          AND ((user_id = ? AND department IS NULL) OR (user_id IS NULL AND department = ?))
      `, [documentId, user.id, user.department]) // Check for user-specific AND department-specific explicit grants

      if (permissions.length === 0) {
        return { hasExplicitGrant: false, allowed: false, reason: 'No explicit permissions found for user/department.', explicitPermissionType: null }
      }

      // Map actions to required explicit permission types
      const actionToPermissionMap = {
        VIEW_DOCUMENT: ['read', 'write', 'approve', 'admin'],
        DOWNLOAD_DOCUMENT: ['read', 'write', 'approve', 'admin'],
        EDIT_DOCUMENT: ['write', 'approve', 'admin'],
        DELETE_DOCUMENT: ['admin'],
        APPROVE_DOCUMENT: ['approve', 'admin'],
        PUBLISH_DOCUMENT: ['approve', 'admin'],
        ARCHIVE_DOCUMENT: ['admin'],
        DISPOSE_DOCUMENT: ['admin'],
        CREATE_VERSION: ['write', 'approve', 'admin'],
        VIEW_VERSION_HISTORY: ['read', 'write', 'approve', 'admin'],
        RESTORE_VERSION: ['admin'],
        MANAGE_PERMISSIONS: ['admin'], // New action for managing permissions explicitly
        VIEW_DOCUMENT_PERMISSIONS: ['read', 'write', 'approve', 'admin'] // Permission to view who has access
      }

      const requiredPermissions = actionToPermissionMap[action] || []
      const userExplicitPermissionTypes = permissions.map(p => p.permission_type)

      for (const reqPerm of requiredPermissions) {
        if (userExplicitPermissionTypes.includes(reqPerm)) {
          return { hasExplicitGrant: true, allowed: true, reason: `Explicit '${reqPerm}' permission found.`, explicitPermissionType: reqPerm }
        }
      }

      // If explicit grants exist but none match the action
      return { hasExplicitGrant: true, allowed: false, reason: `Found explicit permissions [${userExplicitPermissionTypes.join(', ')}], but none match action '${action}'.`, explicitPermissionType: userExplicitPermissionTypes.join(',') }
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, null, { operation: '_checkExplicitGrants', userId: user.id, documentId, action })
      } else {
        appLogger.error('logError is not a function in _checkExplicitGrants catch.', { originalError: error.message, userId: user.id, documentId, action })
      }
      return { hasExplicitGrant: false, allowed: false, reason: `Error checking explicit grants: ${error.message}`, explicitPermissionType: null }
    }
  }

  /**
   * Retrieves all permissions a specific user has for a given document (role, explicit, department-based).
   * This is a comprehensive view for a single user on a single document.
   * @param {number} userId - The ID of the user.
   * @param {number} documentId - The ID of the document.
   * @param {object} [context={}] - Additional context.
   * @returns {Promise<object>} - An object detailing all effective permissions.
   */
  static async getUserPermissionsForDocument (userId, documentId, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context
    const auditDetailsBase = { user_id_checked: userId, document_id: documentId }

    try {
      const user = await dbManager.get('SELECT id, email, name, department, role, is_active FROM users WHERE id = ?', [userId])
      if (!user) {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType: 'permission_query', resourceId: documentId, details: { ...auditDetailsBase, reason: 'User not found' }, ipAddress, userAgent, sessionId }, 'PermissionService.getUserPermissionsForDocument')
        return { success: false, reason: 'User not found' }
      }

      const document = await dbManager.get('SELECT id, author_id, department, type, status, security_level, document_code, title FROM documents WHERE id = ?', [documentId])
      if (!document) {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType: 'permission_query', resourceId: documentId, details: { ...auditDetailsBase, reason: 'Document not found' }, ipAddress, userAgent, sessionId }, 'PermissionService.getUserPermissionsForDocument')
        return { success: false, reason: 'Document not found' }
      }

      auditDetailsBase.user_email = user.email
      auditDetailsBase.user_role = user.role
      auditDetailsBase.document_code = document.document_code
      auditDetailsBase.document_title = document.title

      const effectivePermissions = {}
      const allPossibleActions = PermissionService.VALID_ACTIONS.filter(action => AuditLogModel.VALID_RESOURCE_TYPES.includes('document') && (action.includes('DOCUMENT') || action.includes('VERSION') || action.includes('FILE') || action.includes('PERMISSION')))
      // Filter for document-related actions

      for (const action of allPossibleActions) {
        // Temporarily set context for internal check to avoid re-logging each sub-check
        const checkResult = await PermissionService.checkPermission(userId, action, 'document', documentId, { /* no ipAddress, userAgent, sessionId here to prevent duplicate logs from checkPermission */ })
        effectivePermissions[action] = checkResult
      }

      await PermissionService._safeAuditLog({
        action: 'GET_EFFECTIVE_PERMISSIONS_FOR_DOCUMENT', // Custom action for this comprehensive query
        userId,
        resourceType: 'effective_permission_query',
        resourceId: documentId,
        details: { ...auditDetailsBase, query_result_summary: `Checked ${Object.keys(effectivePermissions).length} actions.`, details: effectivePermissions },
        ipAddress,
        userAgent,
        sessionId
      }, 'PermissionService.getUserPermissionsForDocument')

      return { success: true, user, document, effectivePermissions }
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, context, { operation: 'PermissionService.getUserPermissionsForDocument', userId, documentId })
      } else {
        appLogger.error('logError is not a function in getUserPermissionsForDocument catch.', { originalError: error.message, userId, documentId })
      }
      throw error
    }
  }

  /**
   * Get effective permissions across all resources for a user.
   * This is a higher-level function to summarize what a user can do.
   * @param {number} userId
   * @param {string} resourceType
   * @param {number|string} resourceId
   * @param {object} context
   * @returns {Promise<object>}
   */
  static async getEffectivePermissions (userId, resourceType, resourceId = null, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context
    const auditDetailsBase = { user_id_checked: userId, resource_type: resourceType, resource_id: resourceId }

    try {
      const user = await dbManager.get('SELECT id, email, name, department, role, is_active FROM users WHERE id = ?', [userId])
      if (!user) {
        await PermissionService._safeAuditLog({ action: 'PERMISSION_DENIED', userId, resourceType: 'effective_permission_query', resourceId, details: { ...auditDetailsBase, reason: 'User not found' }, ipAddress, userAgent, sessionId }, 'PermissionService.getEffectivePermissions')
        return { success: false, reason: 'User not found' }
      }

      auditDetailsBase.user_email = user.email
      auditDetailsBase.user_role = user.role

      const effectivePermissions = {}
      const relevantActions = PermissionService.VALID_ACTIONS.filter(action => {
        // Filter actions relevant to the specific resourceType or general system actions
        if (resourceType === 'document') return action.includes('DOCUMENT') || action.includes('VERSION') || action.includes('FILE') || action.includes('PERMISSION')
        if (resourceType === 'user') return action.includes('USER')
        if (resourceType === 'audit_log') return action.includes('AUDIT_LOGS')
        if (resourceType === 'system') return action.includes('SYSTEM') || action.includes('ADMIN')
        // Add other resource types as needed
        return true // For general actions
      })

      for (const action of relevantActions) {
        const checkResult = await PermissionService.checkPermission(userId, action, resourceType, resourceId, { /* no ipAddress, userAgent, sessionId here */ })
        effectivePermissions[action] = checkResult
      }

      await PermissionService._safeAuditLog({
        action: 'GET_EFFECTIVE_PERMISSIONS', // Generic action for this query
        userId,
        resourceType: 'effective_permission_query',
        resourceId,
        details: { ...auditDetailsBase, query_result_summary: `Checked ${Object.keys(effectivePermissions).length} actions for ${resourceType}.`, details: effectivePermissions },
        ipAddress,
        userAgent,
        sessionId
      }, 'PermissionService.getEffectivePermissions')

      return { success: true, user, effectivePermissions }
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, context, { operation: 'PermissionService.getEffectivePermissions', userId, resourceType, resourceId })
      } else {
        appLogger.error('logError is not a function in getEffectivePermissions catch.', { originalError: error.message, userId, resourceType, resourceId })
      }
      throw error
    }
  }
}

module.exports = PermissionService

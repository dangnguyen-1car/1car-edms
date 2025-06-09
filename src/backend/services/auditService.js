// src/backend/services/auditService.js
/**
 * =================================================================
 * EDMS 1CAR - Audit Service (Enhanced for Dashboard)
 * Comprehensive audit logging for compliance with IATF 16949
 * Based on C-PR-AR-001 and C-PR-MG-003 requirements
 * =================================================================
 */

const { dbManager } = require('../config/database');
const { logError, appLogger } = require('../utils/logger');
const config = require('../config');
const AuditLogModel = require('../models/AuditLog');

class AuditService {
  static get VALID_ACTIONS() {
    return AuditLogModel.VALID_ACTIONS;
  }

  static get VALID_RESOURCE_TYPES() {
    return AuditLogModel.VALID_RESOURCE_TYPES;
  }

  static async log(auditData) {
    try {
      const {
        action,
        userId = null,
        resourceType = 'system',
        resourceId = null,
        details = {},
        ipAddress = null,
        userAgent = null,
        sessionId = null
      } = auditData;

      // Validate action and resourceType using model's definitions
      if (!AuditLogModel.VALID_ACTIONS.includes(action)) {
        if (typeof logError === 'function') {
            logError(new Error(`Invalid audit action: ${action}`), null, {
              operation: 'AuditService.log.validation',
              attemptedAction: action,
              allowedActions: AuditLogModel.VALID_ACTIONS.join(', ')
            });
        } else {
            appLogger.error("logError is not a function in AuditService.log for action validation", { attemptedAction: action });
        }
      }

      if (!AuditLogModel.VALID_RESOURCE_TYPES.includes(resourceType)) {
         if (typeof logError === 'function') {
            logError(new Error(`Invalid resource type: ${resourceType}`), null, {
              operation: 'AuditService.log.validation',
              attemptedResourceType: resourceType,
              allowedResourceTypes: AuditLogModel.VALID_RESOURCE_TYPES.join(', ')
            });
         } else {
            appLogger.error("logError is not a function in AuditService.log for resourceType validation", { attemptedResourceType: resourceType });
         }
      }

      const detailsJson = typeof details === 'object' ? JSON.stringify(details) : String(details);

      const result = await dbManager.run(
        `INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id,
          details, ip_address, user_agent, session_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          userId, action, resourceType, resourceId,
          detailsJson, ipAddress, userAgent, sessionId
        ]
      );

      if (AuditService.isHighPriorityEvent(action)) {
        appLogger.info(`[AUDIT_HIGH_PRIORITY] ${action}`, {
          userId, resourceType, resourceId, details, ipAddress
        });
      }

      return {
        success: true,
        auditId: result.lastID,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, null, {
          operation: 'AuditService.log',
          auditData,
          message: 'Failed to log audit event'
        });
      } else {
        appLogger.error('Failed to log audit event AND logError is not a function', {
            error: error.message, auditData
        });
      }

      if (AuditService.isCriticalAuditEvent(auditData.action)) {
        appLogger.error('CRITICAL AUDIT FAILURE', {
          error: error.message,
          auditData
        });
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recent activities based on user role and permissions
   * @param {Object} options - Query options
   * @returns {Promise} - Recent activities
   */
  static async getRecentActivities(options = {}) {
    try {
      const {
        limit = 10,
        userId = null,
        department = null,
        requestingUser
      } = options;

      let whereConditions = [];
      let params = [];

      // Role-based filtering
      if (requestingUser.role === 'user' && userId) {
        // User chỉ xem hoạt động của chính mình
        whereConditions.push('al.user_id = ?');
        params.push(userId);
      } else if (requestingUser.role === 'manager' && department) {
        // Manager xem hoạt động của phòng ban
        whereConditions.push('u.department = ?');
        params.push(department);
      } else if (requestingUser.role === 'manager' && !department) {
        // Manager mặc định xem phòng ban của mình
        whereConditions.push('u.department = ?');
        params.push(requestingUser.department);
      }
      // Admin không có giới hạn, xem tất cả

      // Filter out sensitive actions for non-admin users
      if (requestingUser.role !== 'admin') {
        const allowedActions = [
          'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_VIEWED',
          'DOCUMENT_DOWNLOADED', 'DOCUMENT_VERSION_CREATED', 
          'WORKFLOW_TRANSITION', 'LOGIN'
        ];
        const actionPlaceholders = allowedActions.map(() => '?').join(',');
        whereConditions.push(`al.action IN (${actionPlaceholders})`);
        params.push(...allowedActions);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const query = `
        SELECT 
          al.id,
          al.action,
          al.resource_type,
          al.resource_id,
          al.details,
          al.timestamp,
          al.ip_address,
          u.name as user_name,
          u.email as user_email,
          u.department as user_department,
          d.title as document_title,
          d.document_code
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN documents d ON al.resource_type = 'document' AND al.resource_id = d.id
        ${whereClause}
        ORDER BY al.timestamp DESC
        LIMIT ?
      `;

      params.push(parseInt(limit));
      const activities = await dbManager.all(query, params);

      // Process details JSON
      activities.forEach(activity => {
        if (activity.details) {
          try {
            activity.details = JSON.parse(activity.details);
          } catch (e) {
            activity.details = { raw_details: activity.details, parse_error: e.message };
          }
        }
      });

      // Log the access
      await this.log({
        action: 'RECENT_ACTIVITIES_VIEWED',
        userId: requestingUser.id,
        resourceType: 'system',
        details: {
          requestedLimit: limit,
          filterUserId: userId,
          filterDepartment: department,
          resultCount: activities.length
        }
      });

      return {
        success: true,
        data: activities
      };
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, null, {
          operation: 'AuditService.getRecentActivities',
          options
        });
      } else {
        appLogger.error('Failed to get recent activities AND logError is not a function', {
          error: error.message, options
        });
      }
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  static async getAuditLogs(filters = {}) {
    try {
      const {
        userId,
        action,
        resourceType,
        resourceId,
        dateFrom,
        dateTo,
        ipAddress,
        sessionId,
        search,
        page = 1,
        limit = 20
      } = filters;

      let whereConditions = [];
      let params = [];

      if (userId) { whereConditions.push('al.user_id = ?'); params.push(userId); }
      if (action) { whereConditions.push('al.action = ?'); params.push(action.toUpperCase()); }
      if (resourceType) { whereConditions.push('al.resource_type = ?'); params.push(resourceType.toLowerCase()); }
      if (resourceId) { whereConditions.push('al.resource_id = ?'); params.push(resourceId); }
      if (dateFrom) { whereConditions.push('al.timestamp >= ?'); params.push(dateFrom); }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        whereConditions.push('al.timestamp < ?');
        params.push(endDate.toISOString().split('T')[0]);
      }
      if (ipAddress) { whereConditions.push('al.ip_address = ?'); params.push(ipAddress); }
      if (sessionId) { whereConditions.push('al.session_id = ?'); params.push(sessionId); }
      if (search && search.trim() !== "") {
        whereConditions.push('(al.action LIKE ? OR al.details LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
        const searchTerm = `%${search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const countResult = await dbManager.get(
        `SELECT COUNT(*) as total FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause}`,
        params
      );

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const logs = await dbManager.all(
        `SELECT al.*, u.name as user_name, u.email as user_email, u.department as user_department
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${whereClause}
         ORDER BY al.timestamp DESC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit, 10), offset]
      );

      logs.forEach(log => {
        if (log.details) {
          try { log.details = JSON.parse(log.details); }
          catch (e) { log.details = { raw_details: log.details, parse_error: e.message }; }
        }
      });

      const total = countResult.total;
      const totalPages = Math.ceil(total / parseInt(limit, 10));

      return {
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page, 10), limit: parseInt(limit, 10),
          total, totalPages,
          hasNextPage: parseInt(page, 10) < totalPages,
          hasPrevPage: parseInt(page, 10) > 1,
        }
      };
    } catch (error) {
      if (typeof logError === 'function') {
        logError(error, null, {
          operation: 'AuditService.getAuditLogs',
          filters
        });
      } else {
        appLogger.error('Failed to get audit logs AND logError is not a function', {
            error: error.message, filters
        });
      }
      return {
        success: false, error: error.message, data: [],
        pagination: { page: filters.page || 1, limit: filters.limit || 20, total: 0, totalPages: 0 }
      };
    }
  }

  static isHighPriorityEvent(action) {
    const highPriorityEvents = [
      'LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'DOCUMENT_DELETED',
      'USER_LOCKED', 'PERMISSION_DENIED', 'SYSTEM_ERROR'
    ];
    return highPriorityEvents.includes(action);
  }

  static isCriticalAuditEvent(action) {
    const criticalEvents = [
      'SYSTEM_BACKUP_FAILED', 'DATABASE_ERROR', 'SECURITY_BREACH',
      'AUDIT_LOG_TAMPERING', 'UNAUTHORIZED_ADMIN_ACCESS'
    ];
    return criticalEvents.includes(action);
  }
}

module.exports = AuditService;

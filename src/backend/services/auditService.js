// src/backend/services/auditService.js
/**
 * =================================================================
 * EDMS 1CAR - Audit Service
 * Comprehensive audit logging for compliance with IATF 16949
 * Based on C-PR-AR-001 and C-PR-MG-003 requirements
 * =================================================================
 */

const { dbManager } = require('../config/database');
const { logError, appLogger } = require('../utils/logger');
const config = require('../config');
// Giả sử AuditLog model được export như thế này
const AuditLogModel = require('../models/AuditLog'); // Đảm bảo đường dẫn chính xác

class AuditService {
  /**
   * Valid audit actions for the system.
   * Nguồn đáng tin cậy từ AuditLogModel để đảm bảo tính nhất quán.
   */
  static get VALID_ACTIONS() {
    return AuditLogModel.VALID_ACTIONS;
  }

  /**
   * Valid resource types.
   * Nguồn đáng tin cậy từ AuditLogModel.
   */
  static get VALID_RESOURCE_TYPES() {
    // Cần cập nhật AuditLogModel.VALID_RESOURCE_TYPES để bao gồm 'workflow', 'permission', 'system'
    // Tạm thời hardcode ở đây dựa trên schema, nhưng lý tưởng là lấy từ Model
    return ['user', 'document', 'version', 'file', 'workflow', 'permission', 'system'];
  }

  /**
   * Log audit event with enhanced validation and error handling
   * @param {Object} auditData - Audit event data
   * @param {string} auditData.action - Action performed
   * @param {number} [auditData.userId=null] - User performing action
   * @param {string} [auditData.resourceType='system'] - Type of resource
   * @param {number} [auditData.resourceId=null] - ID of resource
   * @param {Object} [auditData.details={}] - Additional details
   * @param {string} [auditData.ipAddress=null] - IP address from request context
   * @param {string} [auditData.userAgent=null] - User agent from request context
   * @param {string} [auditData.sessionId=null] - Session ID from request context
   */
  static async log(auditData) {
    try {
      const {
        action,
        userId = null,
        resourceType = 'system',
        resourceId = null,
        details = {},
        ipAddress = null, // Nhận từ context
        userAgent = null, // Nhận từ context
        sessionId = null  // Nhận từ context
      } = auditData;

      // Enhanced validation
      if (!this.VALID_ACTIONS.includes(action)) {
        // Ghi log lỗi nhưng không dừng hẳn nếu action không quá nghiêm trọng
        logError(new Error(`Invalid audit action: ${action}`), null, {
          operation: 'AuditService.log.validation',
          attemptedAction: action,
          allowedActions: this.VALID_ACTIONS.join(', ')
        });
        // Quyết định có throw error hay không tùy thuộc vào độ nghiêm trọng
        // Hiện tại, chỉ log và tiếp tục nếu action không có trong list nhưng vẫn muốn ghi lại
      }

      if (!this.VALID_RESOURCE_TYPES.includes(resourceType)) {
         logError(new Error(`Invalid resource type: ${resourceType}`), null, {
          operation: 'AuditService.log.validation',
          attemptedResourceType: resourceType,
          allowedResourceTypes: this.VALID_RESOURCE_TYPES.join(', ')
        });
        // Tương tự như action, có thể quyết định throw error hoặc chỉ log
      }

      // Serialize details as JSON if it's an object
      const detailsJson = typeof details === 'object' ? JSON.stringify(details) : details;


      // Insert audit log with proper error handling
      const result = await dbManager.run(
        `INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id,
          details, ip_address, user_agent, session_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          userId,
          action,
          resourceType,
          resourceId,
          detailsJson, // Sử dụng details đã được JSON hóa
          ipAddress,
          userAgent,
          sessionId
        ]
      );

      // Log high-priority events to application logger
      if (this.isHighPriorityEvent(action)) {
        appLogger.info(`[AUDIT_HIGH_PRIORITY] ${action}`, {
          userId,
          resourceType,
          resourceId,
          details,
          ipAddress
        });
      }

      return {
        success: true,
        auditId: result.lastID,
        timestamp: new Date().toISOString() // Trả về ISO string cho nhất quán
      };
    } catch (error) {
      logError(error, null, {
        operation: 'AuditService.log',
        auditData, // Log toàn bộ auditData khi có lỗi
        message: 'Failed to log audit event'
      });

      // Don't throw error to prevent disrupting main application flow
      // but ensure critical audit failures are logged
      if (this.isCriticalAuditEvent(auditData.action)) {
        appLogger.error('CRITICAL AUDIT FAILURE', {
          error: error.message,
          auditData
        });
      }

      return {
        success: false,
        error: error.message
        // Không nên throw error từ đây để tránh dừng các nghiệp vụ khác
      };
    }
  }

  /**
   * Get audit logs with enhanced filtering and pagination
   */
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
        search, // Thêm bộ lọc search
        page = 1,
        limit = 100 // Giữ nguyên limit mặc định
      } = filters;

      let whereConditions = [];
      let params = [];

      // Build WHERE clause with all supported filters
      if (userId) {
        whereConditions.push('al.user_id = ?');
        params.push(userId);
      }
      if (action) {
        whereConditions.push('al.action = ?');
        params.push(action.toUpperCase()); // Đảm bảo action được chuẩn hóa
      }
      if (resourceType) {
        whereConditions.push('al.resource_type = ?');
        params.push(resourceType.toLowerCase()); // Đảm bảo resourceType được chuẩn hóa
      }
      if (resourceId) {
        whereConditions.push('al.resource_id = ?');
        params.push(resourceId);
      }
      if (dateFrom) {
        whereConditions.push('al.timestamp >= ?');
        params.push(dateFrom);
      }
      if (dateTo) {
        // Thêm 1 ngày để bao gồm cả ngày kết thúc
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        whereConditions.push('al.timestamp < ?');
        params.push(endDate.toISOString().split('T')[0]);
      }
      if (ipAddress) {
        whereConditions.push('al.ip_address = ?');
        params.push(ipAddress);
      }
      if (sessionId) {
        whereConditions.push('al.session_id = ?');
        params.push(sessionId);
      }
      if (search) {
        // Tìm kiếm trong action và details
        whereConditions.push('(al.action LIKE ? OR al.details LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }


      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Get total count
      const countResult = await dbManager.get(
        `SELECT COUNT(*) as total 
         FROM audit_logs al 
         LEFT JOIN users u ON al.user_id = u.id -- Join để có thể filter theo department nếu cần
         ${whereClause}`,
        params
      );

      // Get paginated data with user information
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

      // Parse details JSON safely
      logs.forEach(log => {
        if (log.details) {
          try {
            log.details = JSON.parse(log.details);
          } catch (e) {
            log.details = { raw_details: log.details, parse_error: e.message }; // Giữ lại raw data nếu parse lỗi
          }
        }
      });

      // Calculate pagination metadata
      const total = countResult.total;
      const totalPages = Math.ceil(total / parseInt(limit, 10));

      return {
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages,
          hasNextPage: parseInt(page, 10) < totalPages,
          hasPrevPage: parseInt(page, 10) > 1,
        }
      };
    } catch (error) {
      logError(error, null, {
        operation: 'AuditService.getAuditLogs',
        filters
      });
      // Không throw error mà trả về cấu trúc lỗi nhất quán
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: { page: filters.page || 1, limit: filters.limit || 100, total: 0, totalPages: 0 }
      };
    }
  }

  /**
   * Get comprehensive audit statistics
   */
  static async getAuditStatistics(filters = {}) {
    try {
      const { dateFrom, dateTo, userId, department } = filters;
      let whereConditions = ['1=1']; // Bắt đầu với điều kiện luôn đúng
      let params = [];

      if (dateFrom) {
        whereConditions.push('al.timestamp >= ?');
        params.push(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        whereConditions.push('al.timestamp < ?');
        params.push(endDate.toISOString().split('T')[0]);
      }
      if (userId) {
        whereConditions.push('al.user_id = ?');
        params.push(userId);
      }
      if (department) {
        // Cần join với bảng users để lọc theo department của user thực hiện action
        whereConditions.push('u.department = ?');
        params.push(department);
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');
      const joinClause = department ? 'LEFT JOIN users u ON al.user_id = u.id' : '';


      // Get comprehensive statistics
      const stats = await dbManager.get(
        `SELECT
          COUNT(*) as total_events,
          COUNT(DISTINCT al.user_id) as unique_users,
          COUNT(CASE WHEN al.action LIKE '%LOGIN%' THEN 1 END) as login_events,
          COUNT(CASE WHEN al.action LIKE '%DOCUMENT%' THEN 1 END) as document_events,
          COUNT(CASE WHEN al.action LIKE '%USER%' THEN 1 END) as user_events,
          COUNT(CASE WHEN al.action LIKE '%FAILED%' OR al.action LIKE '%ERROR%' THEN 1 END) as error_events,
          COUNT(CASE WHEN al.timestamp >= datetime('now', '-24 hours') THEN 1 END) as events_last_24h,
          COUNT(CASE WHEN al.timestamp >= datetime('now', '-7 days') THEN 1 END) as events_last_week,
          COUNT(CASE WHEN al.timestamp >= datetime('now', '-30 days') THEN 1 END) as events_last_month
         FROM audit_logs al
         ${joinClause}
         ${whereClause}`,
        params
      );

      // Get top actions
      const topActions = await dbManager.all(
        `SELECT
          al.action,
          COUNT(*) as count,
          COUNT(DISTINCT al.user_id) as unique_users
         FROM audit_logs al
         ${joinClause}
         ${whereClause}
         GROUP BY al.action
         ORDER BY count DESC
         LIMIT 10`,
        params
      );

      // Get top users by activity
      const topUsers = await dbManager.all(
        `SELECT
          al.user_id,
          COALESCE(u.name, 'System/Unknown') as user_name, -- Hiển thị 'System/Unknown' nếu user_id NULL hoặc không tìm thấy user
          u.department,
          COUNT(*) as event_count,
          MAX(al.timestamp) as last_activity
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id -- Luôn join để lấy thông tin user
         ${whereClause}
         -- Bỏ điều kiện al.user_id IS NOT NULL để bao gồm cả system actions nếu user_id là NULL
         GROUP BY al.user_id, user_name, u.department
         ORDER BY event_count DESC
         LIMIT 10`,
        params
      );

      // Get department activity (chỉ các action do user thực hiện)
      const departmentActivity = await dbManager.all(
        `SELECT
          u.department,
          COUNT(*) as event_count,
          COUNT(DISTINCT al.user_id) as active_users
         FROM audit_logs al
         INNER JOIN users u ON al.user_id = u.id -- INNER JOIN để chỉ lấy các action có user_id
         ${whereClause.replace('1=1 AND', '')} -- Loại bỏ điều kiện 1=1 nếu có
         AND u.department IS NOT NULL
         GROUP BY u.department
         ORDER BY event_count DESC`,
        params.filter((p, i) => !(department && whereConditions[i+1].includes('u.department'))) // Loại bỏ param department nếu đã có
      );


      return {
        success: true,
        data: {
          summary: stats,
          topActions,
          topUsers,
          departmentActivity
        }
      };
    } catch (error) {
      logError(error, null, {
        operation: 'AuditService.getAuditStatistics',
        filters
      });
      return { success: false, error: error.message, data: {} };
    }
  }

  /**
   * Get security events with enhanced filtering
   */
  static async getSecurityEvents(hours = 24, severity = 'all', limit = 100) {
    try {
      const allSecurityActions = [
        'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'PERMISSION_DENIED', // High severity
        'PASSWORD_CHANGE_FAILED', // Giả sử có action này, hoặc tương tự
        'UNAUTHORIZED_ACCESS', // Giả sử có action này
        'USER_DEACTIVATED', // Medium-High
        'PASSWORD_RESET' // Potentially medium
        // Thêm các actions bảo mật khác nếu cần
      ];

      let targetActions = [...allSecurityActions];

      if (severity === 'high') {
        targetActions = ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'PERMISSION_DENIED', 'UNAUTHORIZED_ACCESS'];
      } else if (severity === 'medium') {
        targetActions = ['PASSWORD_CHANGE_FAILED', 'USER_DEACTIVATED', 'PASSWORD_RESET'];
      }
      // 'all' sẽ dùng allSecurityActions

      let whereClause = `WHERE al.action IN (${targetActions.map(() => '?').join(',')})
                        AND al.timestamp >= datetime('now', '-${parseInt(hours, 10)} hours')`;
      let params = [...targetActions];

      const events = await dbManager.all(
        `SELECT al.*, u.name as user_name, u.email as user_email, u.department as user_department
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${whereClause}
         ORDER BY al.timestamp DESC
         LIMIT ?`, // Thêm LIMIT
        [...params, parseInt(limit, 10)] // Thêm tham số cho LIMIT
      );

      // Parse details and categorize by severity
      events.forEach(event => {
        if (event.details) {
          try {
            event.details = JSON.parse(event.details);
          } catch (e) {
            event.details = { raw_details: event.details, parse_error: e.message };
          }
        }
        // Add severity classification
        event.severity = this.classifyEventSeverity(event.action);
      });

      return {
        success: true,
        data: events,
        summary: {
          total: events.length,
          high: events.filter(e => e.severity === 'high').length,
          medium: events.filter(e => e.severity === 'medium').length,
          low: events.filter(e => e.severity === 'low').length
        }
      };
    } catch (error) {
      logError(error, null, {
        operation: 'AuditService.getSecurityEvents',
        hours,
        severity
      });
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Clean old audit logs based on retention policy
   */
  static async cleanOldLogs(retentionDays = null) {
    try {
      // Use config default if not specified
      const retention = retentionDays || config.logging?.audit?.retentionDays || 365; // Sử dụng giá trị từ config

      const result = await dbManager.run(
        `DELETE FROM audit_logs WHERE timestamp < datetime('now', '-${retention} days')`
      );

      appLogger.info(`Cleaned ${result.changes} old audit log entries older than ${retention} days`, {
        retentionDays: retention,
        deletedCount: result.changes
      });

      // Log the cleanup operation
      // Không await kết quả của this.log ở đây để tránh vòng lặp vô hạn nếu log này lại thất bại
      this.log({
        action: 'SYSTEM_MAINTENANCE', // Đảm bảo action này có trong VALID_ACTIONS
        userId: null, // System action
        resourceType: 'system',
        details: {
          operation: 'audit_log_cleanup',
          deleted_records: result.changes,
          retention_days: retention
        },
        // ipAddress, userAgent, sessionId có thể là null cho system action
      }).catch(err => { // Bắt lỗi riêng cho việc log hành động cleanup
          logError(err, null, { operation: 'AuditService.logCleanupAction', message: 'Failed to log cleanup action itself' });
      });


      return {
        success: true,
        deletedRecords: result.changes,
        retentionDays: retention
      };
    } catch (error) {
      logError(error, null, {
        operation: 'AuditService.cleanOldLogs',
        retentionDays
      });
       return { success: false, error: error.message, deletedRecords: 0 };
    }
  }

  /**
   * Export audit logs for compliance reporting
   */
  static async exportAuditLogs(filters = {}, format = 'csv') {
    try {
      // Lấy tất cả log phù hợp (không phân trang cho export, hoặc giới hạn lớn)
      const { data: logsToExport, success: fetchSuccess, error: fetchError } = await this.getAuditLogs({ ...filters, limit: 50000 }); // Giới hạn lớn cho export

      if (!fetchSuccess) {
        throw new Error(fetchError || 'Failed to fetch logs for export');
      }

      if (format === 'csv') {
        return {
          success: true,
          data: this.convertToCSV(logsToExport),
          filename: `audit_logs_export_${new Date().toISOString().split('T')[0]}.csv`,
          contentType: 'text/csv'
        };
      } else if (format === 'json') {
        return {
          success: true,
          data: JSON.stringify(logsToExport, null, 2),
          filename: `audit_logs_export_${new Date().toISOString().split('T')[0]}.json`,
          contentType: 'application/json'
        };
      } else {
        throw new Error(`Unsupported export format: ${format}. Supported formats: csv, json.`);
      }
    } catch (error) {
      logError(error, null, {
        operation: 'AuditService.exportAuditLogs',
        filters,
        format
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert audit logs to CSV format
   * @private
   */
  static convertToCSV(logs) {
    if (!logs || logs.length === 0) return "";

    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'User Name',
      'User Email',
      'User Department',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Session ID',
      'Details (JSON)' // Ghi rõ là JSON
    ];

    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.user_id || '',
      log.user_name || '',
      log.user_email || '',
      log.user_department || '',
      log.action,
      log.resource_type,
      log.resource_id || '',
      log.ip_address || '',
      log.user_agent || '',
      log.session_id || '',
      log.details ? JSON.stringify(log.details) : '{}' // Xuất details dạng JSON string
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => {
        const strField = String(field === null || field === undefined ? '' : field);
        // Escape double quotes and handle commas/newlines within fields
        return `"${strField.replace(/"/g, '""')}"`;
      }).join(','))
      .join('\n');
  }


  /**
   * Check if event is high priority
   * @private
   */
  static isHighPriorityEvent(action) {
    const highPriorityActions = [
      'LOGIN_FAILED',
      'ACCOUNT_LOCKED',
      'USER_DELETED',
      'DOCUMENT_DELETED',
      'PERMISSION_GRANTED', // Granting permission is high priority
      'PERMISSION_REVOKED',
      'PERMISSION_DENIED',
      'SYSTEM_ERROR',
      'DOCUMENT_DISPOSED'
    ];
    return highPriorityActions.includes(action);
  }

  /**
   * Check if event is critical for audit
   * @private
   */
  static isCriticalAuditEvent(action) {
    const criticalActions = [
      'USER_DELETED', // Deleting user is critical
      'DOCUMENT_DELETED', // Deleting document is critical
      'DOCUMENT_DISPOSED',
      'SYSTEM_BACKUP', // Backup success/failure can be critical
      'SYSTEM_RESTORE', // Restore success/failure is critical
      'PERMISSION_REVOKED', // Revoking critical permissions
      'ROLE_CHANGE_TO_ADMIN' // Example: A user's role changed to admin
    ];
    return criticalActions.includes(action);
  }

  /**
   * Classify event severity
   * @private
   */
  static classifyEventSeverity(action) {
    // Ví dụ phân loại, có thể mở rộng
    const highSeverity = [
      'ACCOUNT_LOCKED', 'PERMISSION_DENIED', 'SYSTEM_ERROR',
      'LOGIN_FAILED', // Coi là high
      'USER_DELETED', 'DOCUMENT_DELETED', 'DOCUMENT_DISPOSED',
      'SYSTEM_RESTORE_FAILED' // Ví dụ
    ];
    const mediumSeverity = [
      'PASSWORD_CHANGE', // Có thể là medium nếu thành công, high nếu thất bại
      'PASSWORD_RESET',
      'USER_DEACTIVATED',
      'DOCUMENT_ARCHIVED',
      'PERMISSION_GRANTED',
      'PERMISSION_REVOKED',
      'SYSTEM_BACKUP_FAILED' // Ví dụ
    ];

    if (highSeverity.includes(action)) return 'high';
    if (mediumSeverity.includes(action)) return 'medium';
    // Mặc định là low cho các action khác
    return 'low';
  }
}

module.exports = AuditService;

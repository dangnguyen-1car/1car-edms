// src/backend/services/auditService.js
/**
 * =================================================================
 * EDMS 1CAR - Audit Service
 * Comprehensive audit logging for compliance with IATF 16949
 * Based on C-PR-AR-001 and C-PR-MG-003 requirements
 * =================================================================
 */

const { dbManager } = require('../config/database');
const { logError } = require('../utils/logger');

class AuditService {
  /**
   * Valid audit actions for the system
   */
  static get VALID_ACTIONS() {
    return [
      // Authentication actions
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'PASSWORD_CHANGED',
      'PASSWORD_RESET',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      
      // User management actions
      'USER_CREATED',
      'USER_UPDATED',
      'USER_ACTIVATED',
      'USER_DEACTIVATED',
      'USER_DELETED',
      'USER_VIEWED',
      'USERS_LISTED',
      
      // Document management actions
      'DOCUMENT_CREATED',
      'DOCUMENT_UPDATED',
      'DOCUMENT_DELETED',
      'DOCUMENT_VIEWED',
      'DOCUMENT_DOWNLOADED',
      'DOCUMENT_UPLOADED',
      'DOCUMENT_SEARCHED',
      'DOCUMENT_APPROVED',
      'DOCUMENT_REJECTED',
      'DOCUMENT_PUBLISHED',
      'DOCUMENT_ARCHIVED',
      
      // Version management actions
      'VERSION_CREATED',
      'VERSION_COMPARED',
      'VERSION_RESTORED',
      
      // Workflow actions
      'WORKFLOW_TRANSITION',
      'WORKFLOW_APPROVED',
      'WORKFLOW_REJECTED',
      'WORKFLOW_RETURNED',
      
      // File management actions
      'FILE_UPLOADED',
      'FILE_DOWNLOADED',
      'FILE_DELETED',
      'FILE_ATTACHED',
      
      // Permission actions
      'PERMISSION_GRANTED',
      'PERMISSION_REVOKED',
      'PERMISSION_CHECKED',
      
      // System actions
      'SYSTEM_BACKUP',
      'SYSTEM_RESTORE',
      'SYSTEM_MAINTENANCE',
      'SYSTEM_ERROR',
      'SYSTEM_STARTUP',
      'SYSTEM_SHUTDOWN'
    ];
  }

  /**
   * Valid resource types
   */
  static get VALID_RESOURCE_TYPES() {
    return [
      'user',
      'document',
      'version',
      'file',
      'workflow',
      'permission',
      'system'
    ];
  }

  /**
   * Log audit event
   * @param {Object} auditData - Audit event data
   * @param {string} auditData.action - Action performed
   * @param {number} auditData.userId - User performing action
   * @param {string} auditData.resourceType - Type of resource
   * @param {number} auditData.resourceId - ID of resource
   * @param {Object} auditData.details - Additional details
   * @param {string} auditData.ipAddress - IP address
   * @param {string} auditData.userAgent - User agent
   * @param {string} auditData.sessionId - Session ID
   */
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

      // Validate action
      if (!this.VALID_ACTIONS.includes(action)) {
        throw new Error(`Invalid audit action: ${action}`);
      }

      // Validate resource type
      if (!this.VALID_RESOURCE_TYPES.includes(resourceType)) {
        throw new Error(`Invalid resource type: ${resourceType}`);
      }

      // Insert audit log
      await dbManager.run(`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, details,
          ip_address, user_agent, session_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        userId,
        action,
        resourceType,
        resourceId,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
        sessionId
      ]);

      // Log high-priority events to system log
      if (this.isHighPriorityEvent(action)) {
        console.log(`[AUDIT] ${action}: User ${userId}, Resource ${resourceType}:${resourceId}`);
      }

    } catch (error) {
      logError(error, null, { 
        operation: 'AuditService.log', 
        auditData,
        message: 'Failed to log audit event'
      });
      
      // Don't throw error to prevent disrupting main application flow
      // but ensure critical audit failures are logged
      if (this.isCriticalAuditEvent(auditData.action)) {
        console.error('CRITICAL AUDIT FAILURE:', error.message);
      }
    }
  }

  /**
   * Get audit logs with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {number} filters.userId - Filter by user ID
   * @param {string} filters.action - Filter by action
   * @param {string} filters.resourceType - Filter by resource type
   * @param {number} filters.resourceId - Filter by resource ID
   * @param {string} filters.dateFrom - Start date filter
   * @param {string} filters.dateTo - End date filter
   * @param {number} filters.page - Page number
   * @param {number} filters.limit - Items per page
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
        page = 1,
        limit = 50
      } = filters;

      let whereConditions = [];
      let params = [];

      // Build WHERE clause
      if (userId) {
        whereConditions.push('al.user_id = ?');
        params.push(userId);
      }

      if (action) {
        whereConditions.push('al.action = ?');
        params.push(action);
      }

      if (resourceType) {
        whereConditions.push('al.resource_type = ?');
        params.push(resourceType);
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
        whereConditions.push('al.timestamp <= ?');
        params.push(dateTo);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ') 
        : '';

      // Get total count
      const countResult = await dbManager.get(`
        SELECT COUNT(*) as total 
        FROM audit_logs al 
        ${whereClause}
      `, params);

      // Get paginated data
      const offset = (page - 1) * limit;
      const logs = await dbManager.all(`
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

      // Parse details JSON
      logs.forEach(log => {
        if (log.details) {
          try {
            log.details = JSON.parse(log.details);
          } catch (e) {
            log.details = {};
          }
        }
      });

      // Calculate pagination metadata
      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      return {
        data: logs,
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
      logError(error, null, { 
        operation: 'AuditService.getAuditLogs', 
        filters 
      });
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Filter criteria
   */
  static async getAuditStats(filters = {}) {
    try {
      const { dateFrom, dateTo, userId } = filters;

      let whereConditions = ['1=1'];
      let params = [];

      if (dateFrom) {
        whereConditions.push('timestamp >= ?');
        params.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push('timestamp <= ?');
        params.push(dateTo);
      }

      if (userId) {
        whereConditions.push('user_id = ?');
        params.push(userId);
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      const stats = await dbManager.get(`
        SELECT
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(CASE WHEN action LIKE '%LOGIN%' THEN 1 END) as login_events,
          COUNT(CASE WHEN action LIKE '%DOCUMENT%' THEN 1 END) as document_events,
          COUNT(CASE WHEN action LIKE '%USER%' THEN 1 END) as user_events,
          COUNT(CASE WHEN action LIKE '%FAILED%' OR action LIKE '%ERROR%' THEN 1 END) as error_events,
          COUNT(CASE WHEN timestamp >= date('now', '-24 hours') THEN 1 END) as events_last_24h,
          COUNT(CASE WHEN timestamp >= date('now', '-7 days') THEN 1 END) as events_last_week
        FROM audit_logs
        ${whereClause}
      `, params);

      // Get top actions
      const topActions = await dbManager.all(`
        SELECT 
          action,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM audit_logs
        ${whereClause}
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `, params);

      // Get top users
      const topUsers = await dbManager.all(`
        SELECT 
          al.user_id,
          u.name,
          u.department,
          COUNT(*) as event_count
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        GROUP BY al.user_id, u.name, u.department
        ORDER BY event_count DESC
        LIMIT 10
      `, params);

      return {
        summary: stats,
        topActions,
        topUsers
      };

    } catch (error) {
      logError(error, null, { 
        operation: 'AuditService.getAuditStats', 
        filters 
      });
      throw error;
    }
  }

  /**
   * Get security events (failed logins, permission violations, etc.)
   */
  static async getSecurityEvents(hours = 24) {
    try {
      const securityActions = [
        'LOGIN_FAILED',
        'ACCOUNT_LOCKED',
        'PERMISSION_DENIED',
        'UNAUTHORIZED_ACCESS',
        'SYSTEM_ERROR'
      ];

      const events = await dbManager.all(`
        SELECT 
          al.*,
          u.name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action IN (${securityActions.map(() => '?').join(',')})
          AND al.timestamp >= datetime('now', '-${hours} hours')
        ORDER BY al.timestamp DESC
      `, securityActions);

      // Parse details
      events.forEach(event => {
        if (event.details) {
          try {
            event.details = JSON.parse(event.details);
          } catch (e) {
            event.details = {};
          }
        }
      });

      return events;

    } catch (error) {
      logError(error, null, { 
        operation: 'AuditService.getSecurityEvents', 
        hours 
      });
      throw error;
    }
  }

  /**
   * Clean old audit logs based on retention policy
   * @param {number} retentionDays - Number of days to retain logs
   */
  static async cleanOldLogs(retentionDays = 365) {
    try {
      const result = await dbManager.run(`
        DELETE FROM audit_logs 
        WHERE timestamp < date('now', '-${retentionDays} days')
      `);

      console.log(`Cleaned ${result.changes} old audit log entries`);
      
      // Log the cleanup operation
      await this.log({
        action: 'SYSTEM_MAINTENANCE',
        resourceType: 'system',
        details: {
          operation: 'audit_log_cleanup',
          deleted_records: result.changes,
          retention_days: retentionDays
        }
      });

      return result.changes;

    } catch (error) {
      logError(error, null, { 
        operation: 'AuditService.cleanOldLogs', 
        retentionDays 
      });
      throw error;
    }
  }

  /**
   * Export audit logs for compliance reporting
   * @param {Object} filters - Export filters
   * @param {string} format - Export format ('csv', 'json')
   */
  static async exportAuditLogs(filters = {}, format = 'csv') {
    try {
      const { data } = await this.getAuditLogs({
        ...filters,
        limit: 10000 // Large limit for export
      });

      if (format === 'csv') {
        return this.convertToCSV(data);
      } else if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }

    } catch (error) {
      logError(error, null, { 
        operation: 'AuditService.exportAuditLogs', 
        filters, 
        format 
      });
      throw error;
    }
  }

  /**
   * Convert audit logs to CSV format
   * @private
   */
  static convertToCSV(logs) {
    const headers = [
      'Timestamp',
      'User Name',
      'User Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'Details'
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.user_name || '',
      log.user_email || '',
      log.action,
      log.resource_type,
      log.resource_id || '',
      log.ip_address || '',
      log.details ? JSON.stringify(log.details) : ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
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
      'PERMISSION_GRANTED',
      'PERMISSION_REVOKED',
      'SYSTEM_ERROR'
    ];
    return highPriorityActions.includes(action);
  }

  /**
   * Check if event is critical for audit
   * @private
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
}

module.exports = AuditService;

// src/backend/services/auditService.js
/**
 * =================================================================
 * EDMS 1CAR - Audit Service
 * Comprehensive audit logging for compliance with IATF 16949
 * Based on C-PR-AR-001 and C-PR-MG-003 requirements
 * =================================================================
 */

const { dbManager } = require('../config/database');
// Đảm bảo import đúng và logger.js export đúng các hàm này
const { logError, appLogger } = require('../utils/logger');
const config = require('../config');
const AuditLogModel = require('../models/AuditLog');

class AuditService {
  static get VALID_ACTIONS() {
    return AuditLogModel.VALID_ACTIONS;
  }

  static get VALID_RESOURCE_TYPES() {
    // Sử dụng danh sách từ AuditLogModel đã được cập nhật
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

      if (AuditService.isHighPriorityEvent(action)) { // Gọi qua AuditService
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
      // Sử dụng logError đã được import
      if (typeof logError === 'function') {
        logError(error, null, {
          operation: 'AuditService.log',
          auditData,
          message: 'Failed to log audit event'
        });
      } else {
        // Fallback nếu logError không tồn tại
        appLogger.error('Failed to log audit event AND logError is not a function', {
            error: error.message, auditData
        });
      }


      if (AuditService.isCriticalAuditEvent(auditData.action)) { // Gọi qua AuditService
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
        search, // search term từ ActivityPage (qua auditLogRoutes)
        page = 1,
        limit = 20 // Khớp với ActivityPage
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
        data: logs, // Trả về mảng logs trực tiếp
        pagination: {
          page: parseInt(page, 10), limit: parseInt(limit, 10),
          total, totalPages,
          hasNextPage: parseInt(page, 10) < totalPages,
          hasPrevPage: parseInt(page, 10) > 1,
        }
      };
    } catch (error) {
      // Sử dụng logError đã được import
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

  static async getAuditStatistics(filters = {}) { /* ... Giữ nguyên implementation ... */ }
  static async getSecurityEvents(hours = 24, severity = 'all', limit = 100) { /* ... Giữ nguyên implementation ... */ }
  static async cleanOldLogs(retentionDays = null) { /* ... Giữ nguyên implementation, đảm bảo this.log() được gọi đúng ... */ }
  static convertToCSV(logs) { /* ... Giữ nguyên implementation ... */ }
  static isHighPriorityEvent(action) { /* ... Giữ nguyên implementation ... */ }
  static isCriticalAuditEvent(action) { /* ... Giữ nguyên implementation ... */ }
  static classifyEventSeverity(action) { /* ... Giữ nguyên implementation ... */ }
   static async exportAuditLogs(filters = {}, format = 'csv') { // Giữ nguyên
    try {
      const { data: logsToExport, success: fetchSuccess, error: fetchError } = await this.getAuditLogs({ ...filters, limit: 50000 }); 
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
        if (typeof logError === 'function') {
            logError(error, null, { operation: 'AuditService.exportAuditLogs', filters, format });
        } else {
            appLogger.error('Failed to export audit logs AND logError is not a function', { error: error.message, filters, format});
        }
      return { success: false, error: error.message };
    }
  }
}

module.exports = AuditService;
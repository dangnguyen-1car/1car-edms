// src/backend/routes/auditLogRoutes.js
const express = require('express');
const router = express.Router();
const AuditService = require('../services/auditService');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { auditMiddleware, autoAudit } = require('../middleware/auditMiddleware');

router.use(auditMiddleware);

router.get(
  '/',
  authenticateToken,
  checkPermission('VIEW_AUDIT_LOGS', 'audit_log'),
  autoAudit(
    'VIEW_AUDIT_LOGS', // Action này đã được chuẩn hóa trong AuditLogModel
    'audit_log',
    (req, res, data) => null,
    (req, res, data) => ({
      filtersApplied: req.query,
      resultsCount: data?.data?.logs?.length || 0,
      totalAvailable: data?.data?.pagination?.total || 0,
      requestedPage: req.query.page || 1
    })
  ),
  async (req, res, next) => {
    try {
      const filters = {
        userId: req.query.userId,
        action: req.query.action,
        resourceType: req.query.resourceType,
        resourceId: req.query.resourceId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        ipAddress: req.query.ipAddress,
        sessionId: req.query.sessionId,
        search: req.query.searchDetails,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      };

      const result = await AuditService.getAuditLogs(filters);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: { // Frontend ActivityPage.js mong đợi data.logs và data.pagination
            logs: result.data,
            pagination: result.pagination
          },
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      } else {
        res.status(result.statusCode || 500).json({
          success: false,
          message: result.error || 'Không thể lấy nhật ký hoạt động.',
          code: result.code || 'AUDIT_LOG_FETCH_FAILED',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
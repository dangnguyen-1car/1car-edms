// src/backend/routes/system.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { auditMiddleware, setAuditDetails } = require('../middleware/auditMiddleware');
const { dbManager } = require('../config/database');

router.use(auditMiddleware);

/**
 * GET /api/system/stats
 * Lấy thống kê hệ thống (chỉ admin)
 */
router.get('/stats',
  authenticateToken,
  checkPermission('VIEW_SYSTEM_STATS', 'system'),
  async (req, res, next) => {
    try {
      // Chỉ admin mới có quyền xem thống kê hệ thống
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập thống kê hệ thống',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Get system statistics
      const userStatsQuery = `
        SELECT 
          COUNT(*) as totalUsers,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeUsers,
          COUNT(CASE WHEN last_login >= date('now', '-7 days') THEN 1 END) as recentActiveUsers
        FROM users
      `;

      const documentStatsQuery = `
        SELECT 
          COUNT(*) as totalDocuments,
          COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as documentsThisMonth,
          COUNT(DISTINCT author_id) as activeAuthors
        FROM documents
      `;

      const systemStatsQuery = `
        SELECT 
          COUNT(*) as totalAuditLogs,
          COUNT(CASE WHEN timestamp >= date('now', '-24 hours') THEN 1 END) as logsLast24Hours
        FROM audit_logs
      `;

      const [userStats, documentStats, systemStats] = await Promise.all([
        dbManager.get(userStatsQuery),
        dbManager.get(documentStatsQuery),
        dbManager.get(systemStatsQuery)
      ]);

      // Department activity
      const deptActivityQuery = `
        SELECT 
          u.department,
          COUNT(DISTINCT u.id) as userCount,
          COUNT(d.id) as documentCount
        FROM users u
        LEFT JOIN documents d ON u.id = d.author_id
        WHERE u.is_active = 1
        GROUP BY u.department
        ORDER BY documentCount DESC
      `;

      const departmentActivity = await dbManager.all(deptActivityQuery);

      const stats = {
        users: userStats,
        documents: documentStats,
        system: systemStats,
        departmentActivity,
        serverInfo: {
          nodeVersion: process.version,
          uptime: Math.floor(process.uptime()),
          memoryUsage: process.memoryUsage(),
          environment: process.env.NODE_ENV || 'development'
        }
      };

      setAuditDetails(res, 'SYSTEM_STATS_VIEWED', 'system', null, {
        adminId: req.user.id
      });

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

// src/backend/routes/system.js
const express = require('express')
const router = express.Router()

const { authenticateToken } = require('../middleware/auth')
const { checkPermission } = require('../middleware/permissionMiddleware')
const { auditMiddleware, setAuditDetails } = require('../middleware/auditMiddleware')
const { dbManager } = require('../config/database')

// Apply audit middleware to all routes
router.use(auditMiddleware)

// --- Routes ---

/**
 * GET /api/system/stats
 * Lấy thống kê hệ thống (chỉ admin)
 */
router.get(
  '/stats',
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
        })
      }

      // Get system statistics
      const userStatsQuery = 'SELECT COUNT(*) as totalUsers, COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeUsers, COUNT(CASE WHEN last_login >= date(\'now\', \'-7 days\') THEN 1 END) as recentActiveUsers FROM users'
      const documentStatsQuery = 'SELECT COUNT(*) as totalDocuments, COUNT(CASE WHEN created_at >= date(\'now\', \'-30 days\') THEN 1 END) as documentsThisMonth, COUNT(DISTINCT author_id) as activeAuthors FROM documents'
      const systemStatsQuery = 'SELECT COUNT(*) as totalAuditLogs, COUNT(CASE WHEN timestamp >= date(\'now\', \'-24 hours\') THEN 1 END) as logsLast24Hours FROM audit_logs'

      const [userStats, documentStats, systemStats] = await Promise.all([
        dbManager.get(userStatsQuery),
        dbManager.get(documentStatsQuery),
        dbManager.get(systemStatsQuery)
      ])

      // Department activity
      const deptActivityQuery = 'SELECT u.department, COUNT(DISTINCT u.id) as userCount, COUNT(d.id) as documentCount FROM users u LEFT JOIN documents d ON u.id = d.author_id WHERE u.is_active = 1 GROUP BY u.department ORDER BY documentCount DESC'
      const departmentActivity = await dbManager.all(deptActivityQuery)

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
      }

      setAuditDetails(res, 'SYSTEM_STATS_VIEWED', 'system', null, {
        adminId: req.user.id
      })

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /api/system/health
 * Kiểm tra tình trạng sức khỏe hệ thống
 */
router.get(
  '/health',
  authenticateToken,
  async (req, res, next) => {
    try {
      const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'unknown' },
          memory: { status: 'unknown' },
          disk: { status: 'unknown' }
        }
      }

      // Check database
      try {
        await dbManager.get('SELECT 1')
        healthCheck.checks.database = { status: 'healthy' }
      } catch (error) {
        healthCheck.checks.database = { status: 'unhealthy', error: error.message }
        healthCheck.status = 'unhealthy'
      }

      // Check memory usage
      const memUsage = process.memoryUsage()
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
      if (memUsagePercent > 90) {
        healthCheck.checks.memory = { status: 'critical', usage: `${memUsagePercent.toFixed(1)}%` }
        healthCheck.status = 'critical'
      } else if (memUsagePercent > 75) {
        healthCheck.checks.memory = { status: 'warning', usage: `${memUsagePercent.toFixed(1)}%` }
        if (healthCheck.status === 'healthy') healthCheck.status = 'warning'
      } else {
        healthCheck.checks.memory = { status: 'healthy', usage: `${memUsagePercent.toFixed(1)}%` }
      }

      // Check disk space (simplified)
      healthCheck.checks.disk = { status: 'healthy', note: 'Disk check not implemented' }

      res.json({
        success: true,
        data: healthCheck,
        requestId: req.requestId
      })
    } catch (error) {
      next(error)
    }
  }
)

module.exports = router

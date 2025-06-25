// src/backend/routes/reports.js
const express = require('express')
const router = express.Router()
const { authenticateToken, requirePermission } = require('../middleware/auth')
require('../middleware/validation') // This middleware is imported but not used in the provided code snippet
const db = require('../config/database')
const xlsx = require('xlsx')
const path = require('path')
const fs = require('fs')

// Cache configuration
const NodeCache = require('node-cache')
const cache = new NodeCache({ stdTTL: 900 }) // 15 minutes cache

// ================================================================
// AUDIT LOGS SUMMARY & EXPORT
// ================================================================

// GET /api/audit-logs/summary - Tổng hợp dữ liệu audit logs
router.get('/audit-logs/summary', authenticateToken, requirePermission('view_audit_logs'), async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query
    const cacheKey = `audit-summary-${dateFrom}-${dateTo}`

    // Check cache first
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return res.json({ success: true, data: cachedData })
    }

    // Date range validation
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = dateTo ? new Date(dateTo) : new Date()

    // Actions by day
    const actionsByDay = await db.all(`
            SELECT
                DATE(timestamp) as date,
                COUNT(*) as count
            FROM audit_logs
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
            LIMIT 30
        `, [startDate.toISOString(), endDate.toISOString()])

    // Top 5 actions
    const topActions = await db.all(`
            SELECT
                action,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM audit_logs WHERE timestamp BETWEEN ? AND ?), 2) as percentage
            FROM audit_logs
            WHERE timestamp BETWEEN ? AND ?
            GROUP BY action
            ORDER BY count DESC
            LIMIT 5
        `, [startDate.toISOString(), endDate.toISOString(), startDate.toISOString(), endDate.toISOString()])

    // Top 5 active users
    const topUsers = await db.all(`
            SELECT
                u.name,
                u.department,
                COUNT(al.id) as activity_count
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.timestamp BETWEEN ? AND ?
                AND al.user_id IS NOT NULL
            GROUP BY al.user_id, u.name, u.department
            ORDER BY activity_count DESC
            LIMIT 5
        `, [startDate.toISOString(), endDate.toISOString()])

    // Resource type distribution
    const resourceTypes = await db.all(`
            SELECT
                resource_type,
                COUNT(*) as count
            FROM audit_logs
            WHERE timestamp BETWEEN ? AND ?
                AND resource_type IS NOT NULL
            GROUP BY resource_type
            ORDER BY count DESC
        `, [startDate.toISOString(), endDate.toISOString()])

    // Total statistics
    const totalStats = await db.get(`
            SELECT
                COUNT(*) as total_actions,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT DATE(timestamp)) as active_days
            FROM audit_logs
            WHERE timestamp BETWEEN ? AND ?
        `, [startDate.toISOString(), endDate.toISOString()])

    const summaryData = {
      dateRange: { from: startDate, to: endDate },
      totalStats,
      actionsByDay,
      topActions,
      topUsers,
      resourceTypes
    }

    // Cache the result
    cache.set(cacheKey, summaryData)
    res.json({ success: true, data: summaryData })
  } catch (error) {
    next(error)
  }
})

// GET /api/audit-logs/export - Xuất Excel
router.get('/audit-logs/export', authenticateToken, requirePermission('view_audit_logs'), async (req, res, next) => {
  try {
    const { dateFrom, dateTo, userId, action, resourceType, format = 'xlsx' } = req.query

    // Build query conditions
    const whereConditions = ['1=1']
    const params = []
    if (dateFrom) {
      whereConditions.push('timestamp >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      whereConditions.push('timestamp <= ?')
      params.push(dateTo)
    }
    if (userId) {
      whereConditions.push('user_id = ?')
      params.push(userId)
    }
    if (action) {
      whereConditions.push('action = ?')
      params.push(action)
    }
    if (resourceType) {
      whereConditions.push('resource_type = ?')
      params.push(resourceType)
    }

    const query = `
            SELECT
                al.timestamp,
                COALESCE(u.name, u.email, 'System') as user_name,
                u.department,
                al.action,
                al.resource_type,
                al.resource_id,
                al.ip_address,
                al.details
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY al.timestamp DESC
            LIMIT 10000`

    const logs = await db.all(query, params)

    if (format === 'xlsx') {
      // Create Excel workbook
      const wb = xlsx.utils.book_new()

      // Format data for Excel
      const excelData = logs.map(log => ({
        'Thời gian': new Date(log.timestamp).toLocaleString('vi-VN'),
        'Người dùng': log.user_name,
        'Phòng ban': log.department || '',
        'Hành động': log.action,
        'Đối tượng': log.resource_type || '',
        ID: log.resource_id || '',
        IP: log.ip_address || '',
        'Chi tiết': typeof log.details === 'string' ? log.details : JSON.stringify(log.details)
      }))

      const ws = xlsx.utils.json_to_sheet(excelData)
      xlsx.utils.book_append_sheet(wb, ws, 'Audit Logs')

      // Generate filename
      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`
      const filepath = path.join(__dirname, '../temp', filename)

      // Ensure temp directory exists
      const tempDir = path.dirname(filepath)
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Write file
      xlsx.writeFile(wb, filepath)

      // Send file
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Download error:', err)
        }
        // Clean up temp file
        fs.unlink(filepath, (unlinkErr) => {
          if (unlinkErr) console.error('Cleanup error:', unlinkErr)
        })
      })
    } else {
      res.json({ success: true, data: logs })
    }
  } catch (error) {
    next(error)
  }
})

// ================================================================
// COMPLIANCE REPORTS
// ================================================================

// GET /api/reports/compliance/overdue-review
router.get('/compliance/overdue-review', authenticateToken, requirePermission('view_reports'), async (req, res, next) => {
  try {
    const { department } = req.query
    const cacheKey = `compliance-overdue-${department || 'all'}`

    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return res.json({ success: true, data: cachedData })
    }

    let whereClause = ''
    const params = []
    if (department) {
      whereClause = 'AND d.department = ?'
      params.push(department)
    }

    const overdueDocuments = await db.all(`
            SELECT
                d.id,
                d.document_code,
                d.title,
                d.department,
                d.type,
                d.review_period_days,
                d.last_reviewed_at,
                d.next_review_date,
                u.name as author_name,
                JULIANDAY('now') - JULIANDAY(d.next_review_date) as days_overdue
            FROM documents d
            LEFT JOIN users u ON d.author_id = u.id
            WHERE d.status = 'published'
                AND d.next_review_date < DATE('now')
                ${whereClause}
            ORDER BY days_overdue DESC
        `, params)

    // Summary statistics
    const summary = await db.get(`
            SELECT
                COUNT(*) as total_overdue,
                AVG(JULIANDAY('now') - JULIANDAY(next_review_date)) as avg_days_overdue,
                MAX(JULIANDAY('now') - JULIANDAY(next_review_date)) as max_days_overdue
            FROM documents
            WHERE status = 'published'
                AND next_review_date < DATE('now')
                ${whereClause}
        `, params)

    // Overdue by department
    const overdueByDept = await db.all(`
            SELECT
                department,
                COUNT(*) as count,
                AVG(JULIANDAY('now') - JULIANDAY(next_review_date)) as avg_days_overdue
            FROM documents
            WHERE status = 'published'
                AND next_review_date < DATE('now')
                ${whereClause}
            GROUP BY department
            ORDER BY count DESC
        `, params)

    const complianceData = {
      overdueDocuments,
      summary,
      overdueByDept
    }

    cache.set(cacheKey, complianceData)
    res.json({ success: true, data: complianceData })
  } catch (error) {
    next(error)
  }
})

// GET /api/reports/compliance/workflow-adherence
router.get('/compliance/workflow-adherence', authenticateToken, requirePermission('view_reports'), async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query
    const cacheKey = `workflow-adherence-${dateFrom}-${dateTo}`

    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return res.json({ success: true, data: cachedData })
    }

    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = dateTo ? new Date(dateTo) : new Date()

    // Workflow completion rates
    const workflowStats = await db.all(`
            SELECT
                d.type,
                COUNT(*) as total_documents,
                SUM(CASE WHEN d.status = 'published' THEN 1 ELSE 0 END) as published_count,
                SUM(CASE WHEN d.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                SUM(CASE WHEN d.status = 'draft' THEN 1 ELSE 0 END) as draft_count,
                ROUND(SUM(CASE WHEN d.status = 'published' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as approval_rate
            FROM documents d
            WHERE d.created_at BETWEEN ? AND ?
            GROUP BY d.type
            ORDER BY total_documents DESC
        `, [startDate.toISOString(), endDate.toISOString()])

    // Average approval time
    const approvalTimes = await db.all(`
            SELECT
                d.type,
                AVG(JULIANDAY(d.published_at) - JULIANDAY(d.created_at)) as avg_approval_days
            FROM documents d
            WHERE d.status = 'published'
                AND d.published_at IS NOT NULL
                AND d.created_at BETWEEN ? AND ?
            GROUP BY d.type
        `, [startDate.toISOString(), endDate.toISOString()])

    // Workflow bottlenecks
    const bottlenecks = await db.all(`
            SELECT
                from_status,
                to_status,
                COUNT(*) as transition_count,
                AVG(JULIANDAY(transitioned_at) - JULIANDAY(LAG(transitioned_at) OVER (PARTITION BY document_id ORDER BY transitioned_at))) as avg_duration_days
            FROM workflow_history
            WHERE transitioned_at BETWEEN ? AND ?
            GROUP BY from_status, to_status
            HAVING COUNT(*) > 5
            ORDER BY avg_duration_days DESC
        `, [startDate.toISOString(), endDate.toISOString()])

    const adherenceData = {
      dateRange: { from: startDate, to: endDate },
      workflowStats,
      approvalTimes,
      bottlenecks
    }

    cache.set(cacheKey, adherenceData)
    res.json({ success: true, data: adherenceData })
  } catch (error) {
    next(error)
  }
})

// ================================================================
// USAGE STATISTICS
// ================================================================

// GET /api/stats/document-views
router.get('/stats/document-views', authenticateToken, requirePermission('view_reports'), async (req, res, next) => {
  try {
    const { dateFrom, dateTo, limit = 10 } = req.query
    const cacheKey = `doc-views-${dateFrom}-${dateTo}-${limit}`

    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return res.json({ success: true, data: cachedData })
    }

    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = dateTo ? new Date(dateTo) : new Date()

    const topDocuments = await db.all(`
            SELECT
                d.id,
                d.document_code,
                d.title,
                d.type,
                d.department,
                COUNT(al.id) as view_count,
                u.name as author_name
            FROM documents d
            LEFT JOIN audit_logs al ON d.id = al.resource_id
                AND al.resource_type = 'document'
                AND al.action = 'DOCUMENT_VIEWED'
                AND al.timestamp BETWEEN ? AND ?
            LEFT JOIN users u ON d.author_id = u.id
            WHERE d.status = 'published'
            GROUP BY d.id, d.document_code, d.title, d.type, d.department, u.name
            ORDER BY view_count DESC
            LIMIT ?
        `, [startDate.toISOString(), endDate.toISOString(), parseInt(limit)])

    cache.set(cacheKey, topDocuments)
    res.json({ success: true, data: topDocuments })
  } catch (error) {
    next(error)
  }
})

// GET /api/stats/user-activity
router.get('/stats/user-activity', authenticateToken, requirePermission('view_reports'), async (req, res, next) => {
  try {
    const { dateFrom, dateTo, limit = 10 } = req.query
    const cacheKey = `user-activity-${dateFrom}-${dateTo}-${limit}`

    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return res.json({ success: true, data: cachedData })
    }

    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = dateTo ? new Date(dateTo) : new Date()

    // Use existing view if available
    const topUsers = await db.all(`
            SELECT
                u.id,
                u.name,
                u.department,
                u.role,
                COUNT(al.id) as total_actions,
                COUNT(DISTINCT DATE(al.timestamp)) as active_days,
                COUNT(CASE WHEN al.action LIKE 'DOCUMENT_%' THEN 1 END) as document_actions,
                MAX(al.timestamp) as last_activity
            FROM users u
            LEFT JOIN audit_logs al ON u.id = al.user_id
                AND al.timestamp BETWEEN ? AND ?
            WHERE u.is_active = 1
            GROUP BY u.id, u.name, u.department, u.role
            ORDER BY total_actions DESC
            LIMIT ?
        `, [startDate.toISOString(), endDate.toISOString(), parseInt(limit)])

    cache.set(cacheKey, topUsers)
    res.json({ success: true, data: topUsers })
  } catch (error) {
    next(error)
  }
})

// GET /api/stats/storage
router.get('/stats/storage', authenticateToken, requirePermission('view_reports'), async (req, res, next) => {
  try {
    const cacheKey = 'storage-stats'

    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return res.json({ success: true, data: cachedData })
    }

    // Storage by department
    const storageByDept = await db.all(`
            SELECT
                department,
                COUNT(*) as document_count,
                SUM(COALESCE(file_size, 0)) as total_size_bytes,
                ROUND(SUM(COALESCE(file_size, 0)) / 1024.0 / 1024.0, 2) as total_size_mb
            FROM documents
            WHERE status != 'deleted'
            GROUP BY department
            ORDER BY total_size_bytes DESC
        `)

    // Storage by document type
    const storageByType = await db.all(`
            SELECT
                type,
                COUNT(*) as document_count,
                SUM(COALESCE(file_size, 0)) as total_size_bytes,
                ROUND(SUM(COALESCE(file_size, 0)) / 1024.0 / 1024.0, 2) as total_size_mb
            FROM documents
            WHERE status != 'deleted'
            GROUP BY type
            ORDER BY total_size_bytes DESC
        `)

    // Total storage stats
    const totalStats = await db.get(`
            SELECT
                COUNT(*) as total_documents,
                SUM(COALESCE(file_size, 0)) as total_size_bytes,
                ROUND(SUM(COALESCE(file_size, 0)) / 1024.0 / 1024.0, 2) as total_size_mb,
                ROUND(SUM(COALESCE(file_size, 0)) / 1024.0 / 1024.0 / 1024.0, 2) as total_size_gb
            FROM documents
            WHERE status != 'deleted'
        `)

    const storageData = {
      storageByDept,
      storageByType,
      totalStats
    }

    cache.set(cacheKey, storageData)
    res.json({ success: true, data: storageData })
  } catch (error) {
    next(error)
  }
})

module.exports = router

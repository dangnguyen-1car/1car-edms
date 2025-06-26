// src/backend/routes/backup.js
const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
require('../middleware/permissionMiddleware') // Although imported, checkPermission is not explicitly used in the provided code. It can be removed if not needed.
// Although imported, checkPermission is not explicitly used in the provided code. It can be removed if not needed.
const { auditMiddleware, setAuditDetails } = require('../middleware/auditMiddleware')

const BackupService = require('../services/backupService')
const { appLogger } = require('../utils/logger')

// Apply audit middleware to all routes
router.use(auditMiddleware)

// Initialize backup service
const backupService = new BackupService()

// --- Middleware ---

/**
 * Middleware to ensure only admin can access backup operations
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ quản trị viên mới có quyền truy cập chức năng backup',
      code: 'ADMIN_REQUIRED'
    })
  }
  next()
}

// --- Routes ---

/**
 * GET /api/backups
 * Lấy danh sách các bản backup
 */
router.get(
  '/',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { reason, status } = req.query
      const filters = {}
      if (reason) filters.reason = reason
      if (status) filters.status = status

      const result = await backupService.listBackups(filters)

      setAuditDetails(res, 'BACKUP_LIST_VIEWED', 'system', null, {
        adminId: req.user.id,
        filtersApplied: filters
      })

      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/backups
 * Tạo bản backup mới
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { reason = 'manual' } = req.body

      // Validate reason
      const validReasons = ['manual', 'scheduled', 'pre_restore_safety', 'maintenance']
      if (!validReasons.includes(reason)) {
        return res.status(400).json({
          success: false,
          message: 'Lý do backup không hợp lệ',
          code: 'INVALID_REASON',
          validReasons
        })
      }

      const requestContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId
      }

      appLogger.info('Admin initiated backup creation', {
        userId: req.user.id,
        reason,
        requestContext
      })

      const result = await backupService.createBackup(reason, req.user.id, requestContext)

      setAuditDetails(res, 'BACKUP_CREATED', 'system', null, {
        adminId: req.user.id,
        backupId: result.data.id,
        fileName: result.data.fileName,
        reason
      })

      res.status(201).json({
        success: true,
        message: 'Tạo backup thành công',
        data: result.data,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      })
    } catch (error) {
      appLogger.error('Backup creation failed', {
        userId: req.user.id,
        error: error.message,
        stack: error.stack
      })
      next(error)
    }
  }
)

/**
 * POST /api/backups/:fileName/restore
 * Phục hồi dữ liệu từ bản backup
 */
router.post(
  '/:fileName/restore',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { fileName } = req.params
      if (!fileName) {
        return res.status(400).json({
          success: false,
          message: 'Tên file backup không được để trống',
          code: 'MISSING_FILENAME'
        })
      }

      const requestContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId
      }

      appLogger.warn('Admin initiated database restore', {
        userId: req.user.id,
        fileName,
        requestContext
      })

      const result = await backupService.restoreBackupByFileName(fileName, req.user.id, requestContext)

      setAuditDetails(res, 'DATABASE_RESTORED', 'system', null, {
        adminId: req.user.id,
        fileName,
        restoredAt: result.data.restoredAt,
        safetyBackupCreated: result.data.safetyBackupCreated
      })

      res.json({
        success: true,
        message: result.message,
        data: result.data,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      })
    } catch (error) {
      appLogger.error('Database restore failed', {
        userId: req.user.id,
        fileName: req.params.fileName,
        error: error.message,
        stack: error.stack
      })
      next(error)
    }
  }
)

/**
 * GET /api/backups/:fileName/download
 * Tải file backup về máy
 */
router.get(
  '/:fileName/download',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { fileName } = req.params
      if (!fileName) {
        return res.status(400).json({
          success: false,
          message: 'Tên file backup không được để trống',
          code: 'MISSING_FILENAME'
        })
      }

      const result = await backupService.getBackupFile(fileName)

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: 'File backup không tồn tại',
          code: 'FILE_NOT_FOUND'
        })
      }

      const { filePath, size, mimeType } = result.data

      setAuditDetails(res, 'BACKUP_DOWNLOADED', 'system', null, {
        adminId: req.user.id,
        fileName,
        fileSize: size
      })

      // Set headers for file download
      res.setHeader('Content-Type', mimeType)
      res.setHeader('Content-Length', size)
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.setHeader('Cache-Control', 'no-cache')

      // Stream file to response
      const fs = require('fs') // This import should ideally be at the top with other requires.
      const fileStream = fs.createReadStream(filePath)

      fileStream.on('error', (error) => {
        appLogger.error('Error streaming backup file', {
          fileName,
          filePath,
          error: error.message
        })
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Lỗi khi tải file backup',
            code: 'DOWNLOAD_ERROR'
          })
        }
      })

      fileStream.pipe(res)
    } catch (error) {
      next(error)
    }
  }
)

/**
 * DELETE /api/backups/:fileName
 * Xóa file backup
 */
router.delete(
  '/:fileName',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { fileName } = req.params
      if (!fileName) {
        return res.status(400).json({
          success: false,
          message: 'Tên file backup không được để trống',
          code: 'MISSING_FILENAME'
        })
      }

      const requestContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId
      }

      appLogger.warn('Admin initiated backup deletion', {
        userId: req.user.id,
        fileName,
        requestContext
      })

      const result = await backupService.deleteBackup(fileName, req.user.id, requestContext)

      setAuditDetails(res, 'BACKUP_DELETED', 'system', null, {
        adminId: req.user.id,
        fileName
      })

      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      })
    } catch (error) {
      appLogger.error('Backup deletion failed', {
        userId: req.user.id,
        fileName: req.params.fileName,
        error: error.message
      })
      next(error)
    }
  }
)

/**
 * POST /api/backups/cleanup
 * Dọn dẹp các backup cũ theo chính sách retention
 */
router.post(
  '/cleanup',
  authenticateToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const requestContext = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId
      }

      appLogger.info('Admin initiated backup cleanup', {
        userId: req.user.id,
        requestContext
      })

      const result = await backupService.cleanupOldBackups(req.user.id, requestContext)

      setAuditDetails(res, 'BACKUP_CLEANUP', 'system', null, {
        adminId: req.user.id,
        deletedCount: result.deletedCount,
        totalFreedSpace: result.totalFreedSpace
      })

      res.json({
        success: true,
        message: `Đã dọn dẹp ${result.deletedCount} backup cũ, giải phóng ${Math.round(result.totalFreedSpace / 1024 / 1024)} MB`,
        data: {
          deletedCount: result.deletedCount,
          totalFreedSpace: result.totalFreedSpace
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      })
    } catch (error) {
      next(error)
    }
  }
)

module.exports = router

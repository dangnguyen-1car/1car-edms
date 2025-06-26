// src/backend/routes/documents.js
const express = require('express')
const router = express.Router()

// Import middleware và services
const { authenticateToken } = require('../middleware/auth')
const { checkPermission } = require('../middleware/permissionMiddleware')
const { auditMiddleware, auditCRUD, setAuditDetails } = require('../middleware/auditMiddleware')
const serviceFactory = require('../services/serviceFactory')
const { createError } = require('../middleware/errorHandler')
const SearchService = require('../services/searchService')
const DocumentCodeGenerator = require('../utils/documentCodeGenerator')
const PermissionService = require('../services/permissionService')
const favoritesService = require('../services/favoritesService')

// Áp dụng audit middleware cho tất cả routes
router.use(auditMiddleware)

// =================================================================
// CÁC ROUTE LẤY DANH SÁCH VÀ TẠO MỚI
// =================================================================

/**
 * GET /api/documents
 * Lấy danh sách tài liệu với chức năng tìm kiếm, phân trang, lọc và sắp xếp.
 */
router.get('/', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20, ...filters } = req.query
    const context = { ipAddress: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID }
    const result = await SearchService.searchDocuments(search, filters, parseInt(page), parseInt(limit), req.user.id, context)
    res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/documents
 * Tạo tài liệu mới.
 */
router.post('/', authenticateToken, checkPermission('CREATE_DOCUMENT', 'document'), auditCRUD.create('document'), async (req, res, next) => {
  try {
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.createDocument(req.body, req.user)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

// =================================================================
// ROUTES CHO PENDING APPROVAL & STATS (Được đưa lên trước route /:id)
// =================================================================

/**
 * GET /api/documents/pending-approval
 * Lấy danh sách tài liệu chờ phê duyệt cho người dùng hiện tại.
 */
router.get('/pending-approval', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, department, author, priority, sortBy = 'updated_at', sortOrder = 'desc' } = req.query
    const documentService = serviceFactory.getDocumentService()
    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      department,
      author,
      priority,
      sortBy,
      sortOrder
    }
    const result = await documentService.getPendingApprovalsForUser(req.user, filters)

    if (result && result.data) {
      setAuditDetails(res, 'WORKFLOW_HISTORY_VIEWED', 'document', null, {
        count: result.data.length || 0,
        context: 'PendingApprovalPage',
        filters
      })
    }
    res.json({
      ...result,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/pending-approval/stats
 * Lấy thống kê tài liệu chờ phê duyệt cho Dashboard Widget.
 */
router.get('/pending-approval/stats', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.getPendingApprovalStats(req.user)
    if (result && result.data) {
      setAuditDetails(res, 'VIEW_WORKFLOW_STATS', 'document', null, {
        totalPending: result.data.total_pending || 0,
        context: 'PendingApprovalsWidget'
      })
    }
    res.json({
      ...result,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/stats
 * Lấy thống kê tài liệu.
 */
router.get('/stats', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const { department, dateFrom, dateTo } = req.query
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.getDocumentStatistics(req.user, { department, dateFrom, dateTo })
    setAuditDetails(res, 'DOCUMENT_STATISTICS_VIEWED', 'document', null, { filtersApplied: { department, dateFrom, dateTo } })
    res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/due-for-review
 * Lấy danh sách tài liệu sắp đến hạn xem xét.
 */
router.get('/due-for-review', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const { daysBefore = 30 } = req.query
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.getDocumentsDueForReview(req.user, parseInt(daysBefore))
    if (result) {
      setAuditDetails(res, 'DOCUMENTS_DUE_REVIEW_VIEWED', 'document', null, { daysBefore: parseInt(daysBefore), count: result.count })
    }
    res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId })
  } catch (error) {
    next(error)
  }
})

// =================================================================
// CÁC ROUTE TIỆN ÍCH VÀ METADATA (Được đưa lên trước route /:id)
// =================================================================

/**
 * GET /api/documents/suggest-code
 * Gợi ý mã tài liệu.
 */
router.get('/suggest-code', authenticateToken, checkPermission('CREATE_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const { type, department: deptCode } = req.query
    if (!type || !deptCode) {
      throw createError('Thiếu thông tin bắt buộc: type hoặc department', 400, 'MISSING_PARAMETERS')
    }
    const suggestedCode = await DocumentCodeGenerator.generateCode(type, deptCode)
    setAuditDetails(res, 'DOCUMENT_CODE_SUGGESTED', 'system', null, { type, deptCode, suggestedCode })
    res.json({ success: true, data: { suggestedCode }, timestamp: new Date().toISOString(), requestId: req.requestId })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/documents/check-code
 * Kiểm tra mã tài liệu có tồn tại hay không.
 */
router.post('/check-code', authenticateToken, checkPermission('CREATE_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const { code } = req.body
    if (!code) {
      throw createError('Mã tài liệu là bắt buộc để kiểm tra.', 400, 'MISSING_CODE')
    }
    const codeExists = await DocumentCodeGenerator.codeExists(code)
    res.status(200).json({ success: true, data: { available: !codeExists }, timestamp: new Date().toISOString(), requestId: req.requestId })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/types
 * Lấy danh sách các loại tài liệu.
 */
router.get('/types', authenticateToken, (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        documentTypes: [
          { code: 'PL', name: 'Chính sách' },
          { code: 'PR', name: 'Quy trình' },
          { code: 'WI', name: 'Hướng dẫn' },
          { code: 'FM', name: 'Biểu mẫu' },
          { code: 'TD', name: 'Tài liệu kỹ thuật' },
          { code: 'TR', name: 'Tài liệu đào tạo' },
          { code: 'RC', name: 'Hồ sơ' }
        ]
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/departments
 * Lấy danh sách các phòng ban.
 */
router.get('/departments', authenticateToken, (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        departments: [
          'Ban Giám đốc',
          'Phòng Phát triển Nhượng quyền',
          'Phòng Đào tạo Tiêu chuẩn',
          'Phòng Marketing',
          'Phòng Kỹ thuật QC',
          'Phòng Tài chính',
          'Phòng Công nghệ Hệ thống',
          'Phòng Pháp lý',
          'Bộ phận Tiếp nhận CSKH',
          'Bộ phận Kỹ thuật Garage',
          'Bộ phận QC Garage',
          'Bộ phận Kho/Kế toán Garage',
          'Bộ phận Marketing Garage',
          'Quản lý Garage'
        ]
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/workflow-states
 * Lấy danh sách các trạng thái workflow.
 */
router.get('/workflow-states', authenticateToken, (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        workflowStates: [
          { code: 'draft', name: 'Bản nháp' },
          { code: 'review', name: 'Đang xem xét' },
          { code: 'published', name: 'Đã phê duyệt' },
          { code: 'archived', name: 'Đã lưu trữ' }
        ]
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/search-suggestions
 * Lấy các gợi ý tìm kiếm.
 */
router.get('/search-suggestions', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const { query, limit = 10 } = req.query
    if (!query || query.trim().length < 2) {
      return res.json({ success: true, data: { suggestions: [] } })
    }
    const result = await SearchService.getSearchSuggestions(query, req.user.id, parseInt(limit), { ipAddress: req.ip, userAgent: req.get('user-agent') })
    res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId })
  } catch (error) {
    next(error)
  }
})

// =================================================================
// DOCUMENT PERMISSIONS API ENDPOINTS
// =================================================================
/**
 * GET /api/documents/:id/permissions
 * Lấy danh sách tất cả các quyền đã được gán cho tài liệu.
 */
router.get('/:id/permissions',
  authenticateToken,
  checkPermission('MANAGE_PERMISSIONS', 'document'), // Hoặc 'VIEW_DOCUMENT_PERMISSIONS' nếu có quyền riêng
  async (req, res, next) => {
    try {
      const documentId = parseInt(req.params.id)
      const context = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      }
      const result = await PermissionService.getDocumentPermissions(documentId, context)

      if (result && result.data && result.data.permissions && result.data.document) {
        setAuditDetails(res, 'VIEW_DOCUMENT_PERMISSIONS', 'document_permissions', documentId, {
          permissionCount: result.data.permissions.length,
          documentCode: result.data.document.code
        })
      }
      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/documents/:id/permissions
 * Gán một quyền mới cho User hoặc Department.
 * Body: { type: 'user' | 'department', targetId: number|string, permission: 'read' | 'write' | 'approve' | 'admin' }
 */
router.post('/:id/permissions',
  authenticateToken,
  checkPermission('MANAGE_PERMISSIONS', 'document'),
  async (req, res, next) => {
    try {
      const documentId = parseInt(req.params.id)
      const { type, targetId, permission } = req.body
      const context = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      }

      // Validation
      if (!type || !targetId || !permission) {
        throw createError('Thiếu thông tin bắt buộc: type, targetId, permission', 400, 'MISSING_REQUIRED_FIELDS')
      }
      if (!['user', 'department'].includes(type)) {
        throw createError('Loại đối tượng không hợp lệ. Phải là "user" hoặc "department"', 400, 'INVALID_TARGET_TYPE')
      }
      if (!['read', 'write', 'approve', 'admin'].includes(permission)) {
        throw createError('Loại quyền không hợp lệ. Phải là "read", "write", "approve" hoặc "admin"', 400, 'INVALID_PERMISSION_TYPE')
      }

      const result = await PermissionService.grantDocumentPermission(
        documentId,
        type,
        targetId,
        permission,
        req.user.id,
        context
      )

      if (result && result.data) {
        setAuditDetails(res, 'PERMISSION_GRANTED', 'document_permissions', documentId, {
          targetType: type,
          targetId,
          permissionType: permission,
          permissionId: result.data.id
        })
      }
      res.status(201).json({
        ...result,
        message: `Đã gán quyền "${permission}" cho ${type === 'user' ? 'người dùng' : 'phòng ban'} thành công`,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * DELETE /api/documents/:id/permissions/:permissionId
 * Thu hồi một quyền đã được gán.
 */
router.delete('/:id/permissions/:permissionId',
  authenticateToken,
  checkPermission('MANAGE_PERMISSIONS', 'document'),
  async (req, res, next) => {
    try {
      const documentId = parseInt(req.params.id)
      const permissionId = parseInt(req.params.permissionId)
      const context = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      }

      const result = await PermissionService.revokeDocumentPermission(
        documentId,
        permissionId,
        req.user.id,
        context
      )

      setAuditDetails(res, 'PERMISSION_REVOKED', 'document_permissions', documentId, {
        permissionId,
        revokedBy: req.user.id
      })
      res.json({
        ...result,
        message: 'Đã thu hồi quyền thành công',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      })
    } catch (error) {
      next(error)
    }
  }
)

// =================================================================
// CÁC ROUTE ĐỘNG VỚI /:id ĐƯỢC CHUYỂN XUỐNG CUỐI CÙNG
// =================================================================

/**
 * GET /api/documents/:id
 * Lấy thông tin chi tiết một tài liệu theo ID.
 */
router.get('/:id', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), auditCRUD.read('document'), async (req, res, next) => {
  try {
    const documentService = serviceFactory.getDocumentService()
    const context = { ip: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID }
    const result = await documentService.getDocument(parseInt(req.params.id), req.user, context)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/documents/:id
 * Cập nhật thông tin một tài liệu theo ID.
 */
router.put('/:id', authenticateToken, checkPermission('EDIT_DOCUMENT', 'document'), auditCRUD.update('document'), async (req, res, next) => {
  try {
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.updateDocument(parseInt(req.params.id), req.body, req.user)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/documents/:id
 * Xóa một tài liệu theo ID.
 */
router.delete('/:id', authenticateToken, checkPermission('DELETE_DOCUMENT', 'document'), auditCRUD.delete('document'), async (req, res, next) => {
  try {
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.deleteDocument(parseInt(req.params.id), req.user)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/documents/:id/workflow
 * Xử lý workflow action (approve, reject, request_changes).
 */
router.post('/:id/workflow', authenticateToken, checkPermission('APPROVE_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id)
    const { action, comment } = req.body
    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      throw createError('Hành động không hợp lệ', 400, 'INVALID_ACTION')
    }
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.processWorkflowAction(documentId, action, comment, req.user)
    if (result) {
      setAuditDetails(res, 'WORKFLOW_TRANSITION', 'document', documentId, {
        action,
        comment: comment || null,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus
      })
    }
    res.json({
      success: true,
      data: result,
      message: `Tài liệu đã được ${action === 'approve' ? 'phê duyệt' : action === 'reject' ? 'từ chối' : 'yêu cầu chỉnh sửa'}`,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/documents/:id/status
 * Cập nhật trạng thái của tài liệu.
 */
router.put('/:id/status', authenticateToken, checkPermission('APPROVE_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const documentService = serviceFactory.getDocumentService()
    const { newStatus, comment } = req.body
    const result = await documentService.updateDocumentStatus(parseInt(req.params.id), newStatus, comment, req.user)
    setAuditDetails(res, 'DOCUMENT_STATUS_CHANGED', 'document', parseInt(req.params.id), { newStatus, comment })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/:id/versions
 * Lấy lịch sử phiên bản của tài liệu.
 */
router.get('/:id/versions', authenticateToken, checkPermission('VIEW_VERSION_HISTORY', 'document'), async (req, res, next) => {
  try {
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.getVersionHistory(parseInt(req.params.id), req.user)
    // Thêm kiểm tra
    if (result && result.data) {
      setAuditDetails(res, 'VERSION_HISTORY_VIEWED', 'document', parseInt(req.params.id), { versionCount: result.data.length })
    }
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/documents/:id/versions
 * Tạo phiên bản mới cho tài liệu.
 */
router.post('/:id/versions', authenticateToken, checkPermission('CREATE_VERSION', 'document'), async (req, res, next) => {
  try {
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.createDocumentVersion(parseInt(req.params.id), req.body, req.user)
    if (result && result.data) {
      setAuditDetails(res, 'VERSION_CREATED', 'document', parseInt(req.params.id), { newVersionNumber: result.data.version_number })
    }
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/:id/workflow
 * Lấy lịch sử workflow của tài liệu.
 */
router.get('/:id/workflow', authenticateToken, checkPermission('VIEW_WORKFLOW_HISTORY', 'document'), async (req, res, next) => {
  try {
    const documentService = serviceFactory.getDocumentService()
    const result = await documentService.getWorkflowHistory(parseInt(req.params.id), req.user)
    // Thêm kiểm tra
    if (result && result.data) {
      setAuditDetails(res, 'WORKFLOW_HISTORY_VIEWED', 'document', parseInt(req.params.id), { workflowEntryCount: result.data.length })
    }
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/documents/:id/download
 * Tải xuống tài liệu.
 */
router.get('/:id/download', authenticateToken, checkPermission('DOWNLOAD_DOCUMENT', 'document'), async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id)
    const documentService = serviceFactory.getDocumentService()
    const context = { ip: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID }
    const result = await documentService.downloadDocument(documentId, req.user, context)
    if (result) {
      res.setHeader('Content-Type', result.mimeType)
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`)
      res.setHeader('Content-Length', result.fileSize)
      setAuditDetails(res, 'DOCUMENT_DOWNLOADED', 'document', documentId, { fileName: result.fileName, fileSize: result.fileSize })
      res.status(200).send(result.fileContent)
    } else {
      throw createError('Không tìm thấy tài liệu để tải xuống hoặc không có quyền.', 404, 'DOCUMENT_NOT_FOUND_OR_UNAUTHORIZED')
    }
  } catch (error) {
    next(error)
  }
})

/**
 * @route POST /api/documents/:id/favorite
 * @desc Thêm tài liệu vào danh sách yêu thích
 * @access Private
 */
router.post('/:id/favorite', authenticateToken, async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id)
    const result = await favoritesService.addToFavorites(req.user.id, documentId)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @route DELETE /api/documents/:id/favorite
 * @desc Xóa tài liệu khỏi danh sách yêu thích
 * @access Private
 */
router.delete('/:id/favorite', authenticateToken, async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id)
    const result = await favoritesService.removeFromFavorites(req.user.id, documentId)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @route GET /api/documents/:id/favorite
 * @desc Kiểm tra tài liệu có trong danh sách yêu thích không
 * @access Private
 */
router.get('/:id/favorite', authenticateToken, async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id)
    const isFavorite = await favoritesService.isFavorite(req.user.id, documentId)
    res.json({
      success: true,
      data: { is_favorite: isFavorite }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router

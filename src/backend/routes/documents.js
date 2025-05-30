// src/backend/routes/documents.js
/**
EDMS 1CAR - Document Routes (Complete Integration Version)
Tích hợp đầy đủ SearchService và auditCRUD middleware
Loại bỏ hoàn toàn mock data và fallback logic
*/

const express = require('express');
const router = express.Router();

// Import middleware và services
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');
const serviceFactory = require('../services/serviceFactory');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { auditMiddleware, auditCRUD, setAuditDetails } = require('../middleware/auditMiddleware');
const SearchService = require('../services/searchService');

// Áp dụng audit middleware cho tất cả routes
router.use(auditMiddleware);

/**
GET /api/documents/types
Lấy danh sách loại tài liệu
*/
router.get('/types',
  authenticateToken,
  auditCRUD.read('system'),
  async (req, res, next) => {
    try {
      const documentTypes = [
        { code: 'PL', name: 'Chính sách' },
        { code: 'PR', name: 'Quy trình' },
        { code: 'WI', name: 'Hướng dẫn' },
        { code: 'FM', name: 'Biểu mẫu' },
        { code: 'TD', name: 'Tài liệu kỹ thuật' },
        { code: 'TR', name: 'Tài liệu đào tạo' },
        { code: 'RC', name: 'Hồ sơ' }
      ];

      res.status(200).json({
        success: true,
        data: { documentTypes },
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/departments
Lấy danh sách phòng ban
*/
router.get('/departments',
  authenticateToken,
  auditCRUD.read('system'),
  async (req, res, next) => {
    try {
      const departments = [
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
      ];

      res.status(200).json({
        success: true,
        data: { departments },
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/workflow-states
Lấy trạng thái workflow
*/
router.get('/workflow-states',
  authenticateToken,
  auditCRUD.read('system'),
  async (req, res, next) => {
    try {
      const workflowStates = [
        { code: 'draft', name: 'Bản nháp' },
        { code: 'review', name: 'Đang xem xét' },
        { code: 'published', name: 'Đã phê duyệt' },
        { code: 'archived', name: 'Đã lưu trữ' }
      ];

      res.status(200).json({
        success: true,
        data: { workflowStates },
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/statistics
Thống kê tài liệu
*/
router.get('/statistics',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const documentService = serviceFactory.getDocumentService();
      const result = await documentService.getDocumentStatistics(req.user);

      setAuditDetails(res, 'DOCUMENT_STATISTICS_VIEWED', 'document', null, {
        userRole: req.user.role,
        userDepartment: req.user.department
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/due-for-review
Tài liệu cần review
*/
router.get('/due-for-review',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const { daysBefore = 30 } = req.query;
      const documentService = serviceFactory.getDocumentService();
      const result = await documentService.getDocumentsDueForReview(req.user, parseInt(daysBefore));

      setAuditDetails(res, 'DOCUMENTS_DUE_REVIEW_VIEWED', 'document', null, {
        daysBefore: parseInt(daysBefore),
        documentsCount: result.count
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/search-filters
Lấy metadata cho bộ lọc tìm kiếm
*/
router.get('/search-filters',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const context = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await SearchService.getSearchFilters(req.user.id, context);

      setAuditDetails(res, 'SEARCH_FILTERS_VIEWED', 'system', null, {
        userRole: req.user.role
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/search-suggestions
Gợi ý tìm kiếm
*/
router.get('/search-suggestions',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const { query, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.json({
          success: true,
          data: { suggestions: [], query, count: 0 },
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }

      const context = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await SearchService.getSearchSuggestions(
        query,
        req.user.id,
        parseInt(limit),
        context
      );

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents
Tìm kiếm và lọc tài liệu - Tích hợp SearchService
*/
router.get('/',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const {
        search = '',
        page = 1,
        limit = 20,
        sort = 'relevance',
        ...filters
      } = req.query;

      const context = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      // Sử dụng SearchService thay vì mock data
      const result = await SearchService.searchDocuments(
        search,
        filters,
        parseInt(page),
        parseInt(limit),
        req.user.id,
        context
      );

      // SearchService đã tự động log audit, không cần setAuditDetails

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/:id
Lấy chi tiết tài liệu
*/
router.get('/:id',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  auditCRUD.read('document'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw createError('ID tài liệu không hợp lệ', 400, 'INVALID_DOCUMENT_ID');
      }

      const documentService = serviceFactory.getDocumentService();
      const documentId = parseInt(id);
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await documentService.getDocument(documentId, req.user, context);

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
POST /api/documents
Tạo tài liệu mới
*/
router.post('/',
  authenticateToken,
  checkPermission('CREATE_DOCUMENT', 'document'),
  auditCRUD.create('document'),
  async (req, res, next) => {
    try {
      const {
        title,
        document_code,
        type,
        department,
        description,
        scope_of_application,
        recipients
      } = req.body;

      // Validate required fields
      if (!title || !document_code || !type || !department) {
        throw createError('Thiếu thông tin bắt buộc', 400, 'MISSING_REQUIRED_FIELDS');
      }

      const documentService = serviceFactory.getDocumentService();
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await documentService.createDocument(
        req.body,
        req.user.id,
        context
      );

      res.status(201).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
PUT /api/documents/:id
Cập nhật tài liệu
*/
router.put('/:id',
  authenticateToken,
  checkPermission('EDIT_DOCUMENT', 'document'),
  auditCRUD.update('document'),
  async (req, res, next) => {
    try {
      const documentService = serviceFactory.getDocumentService();
      const documentId = parseInt(req.params.id);
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await documentService.updateDocument(
        documentId,
        req.body,
        req.user,
        context
      );

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
PUT /api/documents/:id/status
Cập nhật trạng thái tài liệu
*/
router.put('/:id/status',
  authenticateToken,
  checkPermission('APPROVE_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const documentService = serviceFactory.getDocumentService();
      const documentId = parseInt(req.params.id);
      const { newStatus, comment } = req.body;
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await documentService.updateDocumentStatus(
        documentId,
        newStatus,
        comment,
        req.user,
        context
      );

      setAuditDetails(res, 'DOCUMENT_STATUS_CHANGED', 'document', documentId, {
        newStatus,
        comment,
        documentCode: result.document?.document_code
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
POST /api/documents/:id/versions
Tạo phiên bản mới
*/
router.post('/:id/versions',
  authenticateToken,
  checkPermission('CREATE_VERSION', 'document'),
  async (req, res, next) => {
    try {
      const documentService = serviceFactory.getDocumentService();
      const documentId = parseInt(req.params.id);
      const { newVersion, changeReason, changeSummary } = req.body;
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await documentService.createDocumentVersion(
        documentId,
        newVersion,
        changeReason,
        changeSummary,
        req.user,
        context
      );

      setAuditDetails(res, 'DOCUMENT_VERSION_CREATED', 'document', documentId, {
        newVersion,
        changeReason,
        changeSummary
      });

      res.status(201).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/:id/versions
Lấy lịch sử phiên bản
*/
router.get('/:id/versions',
  authenticateToken,
  checkPermission('VIEW_VERSION_HISTORY', 'document'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const documentService = serviceFactory.getDocumentService();
      const documentId = parseInt(id);
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await documentService.getVersionHistory(documentId, req.user, context);

      setAuditDetails(res, 'VERSION_HISTORY_VIEWED', 'document', documentId, {
        versionsCount: result.data?.versionHistory?.length || 0
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/:id/workflow
Lấy lịch sử workflow
*/
router.get('/:id/workflow',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const documentService = serviceFactory.getDocumentService();
      const documentId = parseInt(id);
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await documentService.getWorkflowHistory(documentId, req.user, context);

      setAuditDetails(res, 'WORKFLOW_HISTORY_VIEWED', 'document', documentId, {
        documentCode: result.workflowHistory?.document_code
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
POST /api/documents/:id/files
Đính kèm file
*/
router.post('/:id/files',
  authenticateToken,
  checkPermission('EDIT_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const documentService = serviceFactory.getDocumentService();
      const documentId = parseInt(req.params.id);
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const fileInfo = req.file;
      if (!fileInfo) {
        throw createError('Không có file được upload', 400, 'NO_FILE_UPLOADED');
      }

      const result = await documentService.attachFile(documentId, fileInfo, req.user, context);

      setAuditDetails(res, 'DOCUMENT_FILE_ATTACHED', 'document', documentId, {
        fileName: fileInfo.filename,
        fileSize: fileInfo.size,
        mimeType: fileInfo.mimetype
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
DELETE /api/documents/:id
Xóa tài liệu
*/
router.delete('/:id',
  authenticateToken,
  checkPermission('DELETE_DOCUMENT', 'document'),
  auditCRUD.delete('document'),
  async (req, res, next) => {
    try {
      const documentService = serviceFactory.getDocumentService();
      const documentId = parseInt(req.params.id);
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await documentService.deleteDocument(documentId, req.user, context);

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/documents/:id/download
Download tài liệu
*/
router.get('/:id/download',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const documentService = serviceFactory.getDocumentService();
      const documentId = parseInt(id);
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      const result = await documentService.downloadDocument(documentId, req.user, context);

      setAuditDetails(res, 'DOCUMENT_DOWNLOADED', 'document', documentId, {
        fileName: result.fileName,
        downloadTime: new Date().toISOString()
      });

      // Set headers for file download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.fileSize);

      // Stream file content
      res.status(200).send(result.fileContent);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
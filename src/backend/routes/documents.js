// src/backend/routes/documents.js
/**

=================================================================

EDMS 1CAR - Document Routes (Unified Version)

Kết hợp tính năng từ file cũ (ổn định) và file mới (middleware hiện đại)

=================================================================
*/

const express = require('express');
const router = express.Router();

// Import từ file cũ (đã hoạt động ổn định)
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');
const { loggerUtils } = require('../utils/logger');

// Import từ file mới (kiến trúc hiện đại)
const serviceFactory = require('../services/serviceFactory');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { auditMiddleware, auditCRUD, setAuditDetails } = require('../middleware/auditMiddleware');

// Áp dụng audit middleware cho tất cả routes (tính năng mới)
router.use(auditMiddleware);

/**

GET /api/documents/types

Lấy danh sách loại tài liệu - GIỮ NGUYÊN từ file cũ
*/
router.get('/types', authenticateToken, async (req, res, next) => {
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

    // Thêm audit details (tính năng mới)
    setAuditDetails(res, 'DOCUMENT_TYPES_VIEWED', 'system', null, {
      typesCount: documentTypes.length
    });

    res.status(200).json({
      success: true,
      data: { documentTypes },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
});

/**

GET /api/documents/departments

Lấy danh sách phòng ban - GIỮ NGUYÊN từ file cũ
*/
router.get('/departments', authenticateToken, async (req, res, next) => {
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

    // Thêm audit details (tính năng mới)
    setAuditDetails(res, 'DEPARTMENTS_VIEWED', 'system', null, {
      departmentsCount: departments.length
    });

    res.status(200).json({
      success: true,
      data: { departments },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
});

/**

GET /api/documents/workflow-states

Lấy trạng thái workflow - GIỮ NGUYÊN từ file cũ
*/
router.get('/workflow-states', authenticateToken, async (req, res, next) => {
  try {
    const workflowStates = [
      { code: 'draft', name: 'Bản nháp' },
      { code: 'review', name: 'Đang xem xét' },
      { code: 'published', name: 'Đã phê duyệt' },
      { code: 'archived', name: 'Đã lưu trữ' }
    ];

    setAuditDetails(res, 'WORKFLOW_STATES_VIEWED', 'system', null, {
      statesCount: workflowStates.length
    });

    res.status(200).json({
      success: true,
      data: { workflowStates },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
});

/**

GET /api/documents/statistics

Thống kê tài liệu - TÍNH NĂNG MỚI với fallback
*/
router.get('/statistics',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      // Thử sử dụng service mới trước
      if (serviceFactory && serviceFactory.getDocumentService) {
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.getDocumentStatistics(req.user);

        setAuditDetails(res, 'DOCUMENT_STATISTICS_VIEWED', 'document', null, {
          userRole: req.user.role,
          userDepartment: req.user.department
        });

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        // Fallback với mock data nếu service chưa sẵn sàng
        const mockStats = {
          totalDocuments: 150,
          publishedCount: 120,
          draftCount: 25,
          recentCount: 15
        };

        setAuditDetails(res, 'DOCUMENT_STATISTICS_VIEWED', 'document', null, {
          userRole: req.user.role,
          userDepartment: req.user.department,
          source: 'mock'
        });

        res.json({
          success: true,
          data: mockStats,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

GET /api/documents/due-for-review

Tài liệu cần review - TÍNH NĂNG MỚI với fallback
*/
router.get('/due-for-review',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const { daysBefore = 30 } = req.query;

      if (serviceFactory && serviceFactory.getDocumentService) {
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.getDocumentsDueForReview(req.user, parseInt(daysBefore));

        setAuditDetails(res, 'DOCUMENTS_DUE_REVIEW_VIEWED', 'document', null, {
          daysBefore: parseInt(daysBefore),
          documentsCount: result.count
        });

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        // Fallback với mock data
        const mockDueDocuments = [];

        setAuditDetails(res, 'DOCUMENTS_DUE_REVIEW_VIEWED', 'document', null, {
          daysBefore: parseInt(daysBefore),
          documentsCount: mockDueDocuments.length,
          source: 'mock'
        });

        res.json({
          success: true,
          documents: mockDueDocuments,
          count: mockDueDocuments.length,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

GET /api/documents

Tìm kiếm và lọc tài liệu - KẾT HỢP cả hai phiên bản
*/
router.get('/',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const {
        search = '',
        type = '',
        department = '',
        status = '',
        author_id = '',
        date_from = '',
        date_to = '',
        page = 1,
        limit = 20
      } = req.query;

      // Thử sử dụng service mới trước
      if (serviceFactory && serviceFactory.getDocumentService) {
        const documentService = serviceFactory.getDocumentService();
        const { page: pageNum = 1, limit: limitNum = 20, ...filters } = req.query;

        const context = {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: req.sessionID
        };

        const result = await documentService.searchDocuments(
          filters,
          req.user,
          parseInt(pageNum),
          parseInt(limitNum),
          context
        );

        setAuditDetails(res, 'DOCUMENTS_SEARCHED', 'document', null, {
          filters,
          resultsCount: result.data.length,
          page: parseInt(pageNum),
          limit: parseInt(limitNum)
        });

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        // Fallback với mock data từ file cũ
        const mockDocuments = [
          {
            id: 1,
            document_code: 'C-PR-VM-001',
            title: 'Quy trình quản lý phiên bản',
            type: 'PR',
            department: 'Ban Giám đốc',
            status: 'published',
            version: '01.00',
            author_name: 'System Administrator',
            author_id: 1,
            created_at: '2025-05-24T00:00:00Z',
            updated_at: '2025-05-24T00:00:00Z',
            published_at: '2025-05-24T01:00:00Z',
            description: 'Quy trình quản lý phiên bản tài liệu theo IATF 16949',
            scope_of_application: 'Toàn bộ hệ thống 1CAR',
            recipients: ['Ban Giám đốc', 'Phòng Công nghệ Hệ thống'],
            file_path: '/uploads/C-PR-VM-001.pdf',
            file_name: 'C-PR-VM-001.pdf',
            file_size: 1024000,
            review_cycle: 365,
            retention_period: 2555
          },
          {
            id: 2,
            document_code: 'C-WI-AR-001',
            title: 'Hướng dẫn truy xuất tài liệu lưu trữ',
            type: 'WI',
            department: 'Phòng Công nghệ Hệ thống',
            status: 'published',
            version: '01.00',
            author_name: 'System Administrator',
            author_id: 1,
            created_at: '2025-05-24T00:00:00Z',
            updated_at: '2025-05-24T00:00:00Z',
            published_at: '2025-05-24T01:00:00Z',
            description: 'Hướng dẫn truy xuất tài liệu trong EDMS',
            scope_of_application: 'Toàn bộ hệ thống 1CAR',
            recipients: ['Phòng Công nghệ Hệ thống'],
            file_path: '/uploads/C-WI-AR-001.pdf',
            file_name: 'C-WI-AR-001.pdf',
            file_size: 512000,
            review_cycle: 365,
            retention_period: 2555
          },
          {
            id: 3,
            document_code: 'C-PR-MG-003',
            title: 'Quy trình quản lý truy cập',
            type: 'PR',
            department: 'Ban Giám đốc',
            status: 'published',
            version: '01.00',
            author_name: 'System Administrator',
            author_id: 1,
            created_at: '2025-05-24T00:00:00Z',
            updated_at: '2025-05-24T00:00:00Z',
            published_at: '2025-05-24T01:00:00Z',
            description: 'Quy trình quản lý truy cập dữ liệu, tài liệu, hệ thống số hóa',
            scope_of_application: 'Toàn bộ hệ thống 1CAR',
            recipients: ['Ban Giám đốc', 'Phòng Công nghệ Hệ thống'],
            file_path: '/uploads/C-PR-MG-003.pdf',
            file_name: 'C-PR-MG-003.pdf',
            file_size: 768000,
            review_cycle: 365,
            retention_period: 2555
          }
        ];

        // Áp dụng filters từ file cũ
        let filteredDocuments = mockDocuments;

        if (search) {
          const searchLower = search.toLowerCase();
          filteredDocuments = filteredDocuments.filter(doc =>
            doc.title.toLowerCase().includes(searchLower) ||
            doc.document_code.toLowerCase().includes(searchLower) ||
            doc.description.toLowerCase().includes(searchLower)
          );
        }

        if (type) {
          filteredDocuments = filteredDocuments.filter(doc => doc.type === type);
        }

        if (department) {
          filteredDocuments = filteredDocuments.filter(doc => doc.department === department);
        }

        if (status) {
          filteredDocuments = filteredDocuments.filter(doc => doc.status === status);
        }

        if (author_id) {
          filteredDocuments = filteredDocuments.filter(doc => doc.author_id.toString() === author_id);
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

        setAuditDetails(res, 'DOCUMENTS_SEARCHED', 'document', null, {
          filters: { search, type, department, status, author_id, date_from, date_to },
          resultsCount: paginatedDocuments.length,
          page: pageNum,
          limit: limitNum,
          source: 'mock'
        });

        res.status(200).json({
          success: true,
          message: 'Lấy danh sách tài liệu thành công',
          data: paginatedDocuments,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: filteredDocuments.length,
            totalPages: Math.ceil(filteredDocuments.length / limitNum)
          },
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

GET /api/documents/:id

Lấy chi tiết tài liệu - KẾT HỢP cả hai phiên bản
*/
router.get('/:id',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        throw createError('ID tài liệu không hợp lệ', 400, 'INVALID_DOCUMENT_ID');
      }

      // Thử sử dụng service mới trước
      if (serviceFactory && serviceFactory.getDocumentService) {
        const documentService = serviceFactory.getDocumentService();
        const documentId = parseInt(id);

        const context = {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: req.sessionID
        };

        const result = await documentService.getDocument(documentId, req.user, context);

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        // Fallback với mock data từ file cũ
        const mockDocument = {
          id: parseInt(id),
          document_code: 'C-PR-VM-001',
          title: 'Quy trình quản lý phiên bản',
          type: 'PR',
          department: 'Ban Giám đốc',
          status: 'published',
          version: '01.00',
          author_name: 'System Administrator',
          author_id: 1,
          reviewer_name: 'Quality Manager',
          approver_name: 'General Director',
          created_at: '2025-05-24T00:00:00Z',
          updated_at: '2025-05-24T00:00:00Z',
          published_at: '2025-05-24T01:00:00Z',
          description: 'Quy trình quản lý phiên bản tài liệu theo IATF 16949',
          scope_of_application: 'Toàn bộ hệ thống 1CAR',
          recipients: ['Ban Giám đốc', 'Phòng Công nghệ Hệ thống'],
          review_cycle: 365,
          retention_period: 2555,
          file_path: '/uploads/C-PR-VM-001.pdf',
          file_name: 'C-PR-VM-001.pdf',
          file_size: 1024000,
          mime_type: 'application/pdf',
          change_reason: 'Phiên bản ban đầu',
          change_summary: 'Tạo tài liệu mới theo quy trình C-PR-VM-001'
        };

        setAuditDetails(res, 'DOCUMENT_VIEWED', 'document', parseInt(id), {
          documentCode: mockDocument.document_code,
          title: mockDocument.title,
          source: 'mock'
        });

        res.status(200).json({
          success: true,
          message: 'Lấy thông tin tài liệu thành công',
          data: mockDocument,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

POST /api/documents

Tạo tài liệu mới - KẾT HỢP cả hai phiên bản
*/
router.post('/',
  authenticateToken,
  checkPermission('CREATE_DOCUMENT', 'document'),
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

      // Validate required fields (giữ từ file cũ)
      if (!title || !document_code || !type || !department) {
        throw createError('Thiếu thông tin bắt buộc', 400, 'MISSING_REQUIRED_FIELDS');
      }

      // Thử sử dụng service mới trước
      if (serviceFactory && serviceFactory.getDocumentService) {
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

        return res.status(201).json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        // Fallback với logic từ file cũ
        const newDocument = {
          id: Date.now(),
          title,
          document_code,
          type,
          department,
          description,
          scope_of_application,
          recipients,
          author_id: req.user.id,
          author_name: req.user.name,
          status: 'draft',
          version: '01.00',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Log document creation (giữ từ file cũ)
        await loggerUtils.logAudit('DOCUMENT_CREATED', {
          documentId: newDocument.id,
          documentCode: document_code,
          title: title
        }, {
          userId: req.user.id,
          resourceType: 'document',
          resourceId: newDocument.id,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        setAuditDetails(res, 'DOCUMENT_CREATED', 'document', newDocument.id, {
          documentCode: document_code,
          title: title,
          type: type,
          department: department,
          source: 'mock'
        });

        res.status(201).json({
          success: true,
          message: 'Tạo tài liệu thành công',
          data: newDocument,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

PUT /api/documents/:id

Cập nhật tài liệu - TÍNH NĂNG MỚI với fallback
*/
router.put('/:id',
  authenticateToken,
  checkPermission('EDIT_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      if (serviceFactory && serviceFactory.getDocumentService) {
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

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        // Fallback - trả về thông báo chưa hỗ trợ
        res.status(501).json({
          success: false,
          message: 'Chức năng cập nhật tài liệu đang được phát triển',
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

PUT /api/documents/:id/status

Cập nhật trạng thái tài liệu - TÍNH NĂNG MỚI với fallback
*/
router.put('/:id/status',
  authenticateToken,
  checkPermission('APPROVE_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      if (serviceFactory && serviceFactory.getDocumentService) {
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

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        res.status(501).json({
          success: false,
          message: 'Chức năng cập nhật trạng thái đang được phát triển',
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

POST /api/documents/:id/versions

Tạo phiên bản mới - TÍNH NĂNG MỚI với fallback
*/
router.post('/:id/versions',
  authenticateToken,
  checkPermission('CREATE_VERSION', 'document'),
  async (req, res, next) => {
    try {
      if (serviceFactory && serviceFactory.getDocumentService) {
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

        return res.status(201).json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        res.status(501).json({
          success: false,
          message: 'Chức năng tạo phiên bản đang được phát triển',
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

GET /api/documents/:id/versions

Lấy lịch sử phiên bản - GIỮ NGUYÊN từ file cũ với audit mới
*/
router.get('/:id/versions',
  authenticateToken,
  checkPermission('VIEW_VERSION_HISTORY', 'document'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (serviceFactory && serviceFactory.getDocumentService) {
        const documentService = serviceFactory.getDocumentService();
        const documentId = parseInt(id);

        const context = {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: req.sessionID
        };

        const result = await documentService.getVersionHistory(documentId, req.user, context);

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        // Fallback với mock data từ file cũ
        const mockVersions = [
          {
            id: 1,
            document_id: parseInt(id),
            version: '01.00',
            created_at: '2025-05-24T00:00:00Z',
            created_by_name: 'System Administrator',
            change_reason: 'Phiên bản ban đầu',
            change_summary: 'Tạo tài liệu mới theo quy trình C-PR-VM-001',
            status: 'current',
            file_name: 'C-PR-VM-001-01.pdf',
            file_size: 1024000,
            file_path: '/uploads/versions/C-PR-VM-001-01.pdf'
          }
        ];

        setAuditDetails(res, 'VERSION_HISTORY_VIEWED', 'document', parseInt(id), {
          versionsCount: mockVersions.length,
          source: 'mock'
        });

        res.status(200).json({
          success: true,
          data: { versionHistory: mockVersions },
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

GET /api/documents/:id/workflow

Lấy lịch sử workflow - KẾT HỢP cả hai phiên bản
*/
router.get('/:id/workflow',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (serviceFactory && serviceFactory.getDocumentService) {
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

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        // Fallback với mock data từ file cũ
        const mockWorkflow = [
          {
            id: 1,
            document_id: parseInt(id),
            from_status: null,
            to_status: 'draft',
            transitioned_at: '2025-05-24T00:00:00Z',
            transitioned_by_name: 'System Administrator',
            transitioned_by_department: 'Ban Giám đốc',
            comment: 'Tạo tài liệu mới',
            ip_address: '127.0.0.1',
            user_agent: 'Mozilla/5.0'
          },
          {
            id: 2,
            document_id: parseInt(id),
            from_status: 'draft',
            to_status: 'published',
            transitioned_at: '2025-05-24T01:00:00Z',
            transitioned_by_name: 'System Administrator',
            transitioned_by_department: 'Ban Giám đốc',
            comment: 'Phê duyệt tài liệu',
            ip_address: '127.0.0.1',
            user_agent: 'Mozilla/5.0'
          }
        ];

        setAuditDetails(res, 'WORKFLOW_HISTORY_VIEWED', 'document', parseInt(id), {
          workflowSteps: mockWorkflow.length,
          source: 'mock'
        });

        res.status(200).json({
          success: true,
          data: { workflowHistory: mockWorkflow },
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

POST /api/documents/:id/files

Đính kèm file - TÍNH NĂNG MỚI với fallback
*/
router.post('/:id/files',
  authenticateToken,
  checkPermission('EDIT_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      if (serviceFactory && serviceFactory.getDocumentService) {
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

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        res.status(501).json({
          success: false,
          message: 'Chức năng đính kèm file đang được phát triển',
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

DELETE /api/documents/:id

Xóa tài liệu - TÍNH NĂNG MỚI với fallback
*/
router.delete('/:id',
  authenticateToken,
  checkPermission('DELETE_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      if (serviceFactory && serviceFactory.getDocumentService) {
        const documentService = serviceFactory.getDocumentService();
        const documentId = parseInt(req.params.id);

        const context = {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: req.sessionID
        };

        const result = await documentService.deleteDocument(documentId, req.user, context);

        setAuditDetails(res, 'DOCUMENT_DELETED', 'document', documentId, {
          reason: 'Deleted by user'
        });

        return res.json({
          ...result,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      } else {
        res.status(501).json({
          success: false,
          message: 'Chức năng xóa tài liệu đang được phát triển',
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**

GET /api/documents/:id/download

Download tài liệu - GIỮ NGUYÊN từ file cũ với audit mới
*/
router.get('/:id/download',
  authenticateToken,
  checkPermission('VIEW_DOCUMENT', 'document'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      setAuditDetails(res, 'DOCUMENT_DOWNLOADED', 'document', parseInt(id), {
        downloadTime: new Date().toISOString()
      });

      // Mock file download từ file cũ
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="document-${id}.pdf"`);
      res.setHeader('Content-Length', '1024');

      const mockPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n178\n%%EOF');

      res.status(200).send(mockPdfContent);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
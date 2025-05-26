/**
 * =================================================================
 * EDMS 1CAR - Documents Routes (Fixed API Endpoints)
 * Handle document management endpoints with proper route ordering
 * Based on C-PR-VM-001, C-TD-VM-001, C-WI-AR-001 requirements
 * =================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');
const { loggerUtils } = require('../utils/logger');

/**
 * GET /api/documents/types
 * Get document types based on C-TD-MG-005 - MUST BE BEFORE /:id route
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

    res.status(200).json({
      success: true,
      data: {
        documentTypes
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/departments
 * Get departments list based on C-FM-MG-004 - MUST BE BEFORE /:id route
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

    res.status(200).json({
      success: true,
      data: {
        departments
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/workflow-states
 * Get workflow states based on C-PR-VM-001 - MUST BE BEFORE /:id route
 */
router.get('/workflow-states', authenticateToken, async (req, res, next) => {
  try {
    const workflowStates = [
      { code: 'draft', name: 'Bản nháp' },
      { code: 'review', name: 'Đang xem xét' },
      { code: 'published', name: 'Đã phê duyệt' },
      { code: 'archived', name: 'Đã lưu trữ' }
    ];

    res.status(200).json({
      success: true,
      data: {
        workflowStates
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents
 * Search and filter documents with mock data
 */
router.get('/', authenticateToken, async (req, res, next) => {
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

    // Mock documents data based on C-TD-MG-005 document codes
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

    // Apply filters
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

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id
 * Get document by ID - MUST BE AFTER specific routes
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw createError('ID tài liệu không hợp lệ', 400, 'INVALID_DOCUMENT_ID');
    }

    // Mock document data
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

    res.status(200).json({
      success: true,
      message: 'Lấy thông tin tài liệu thành công',
      data: mockDocument,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/documents
 * Create new document
 */
router.post('/', authenticateToken, requirePermission('create_documents'), async (req, res, next) => {
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

    // Log document creation
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

    res.status(201).json({
      success: true,
      message: 'Tạo tài liệu thành công',
      data: newDocument,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id/versions
 * Get document versions based on C-TD-VM-001
 */
router.get('/:id/versions', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

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

    res.status(200).json({
      success: true,
      data: {
        versionHistory: mockVersions
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id/workflow
 * Get workflow history based on C-PR-VM-001
 */
router.get('/:id/workflow', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

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

    res.status(200).json({
      success: true,
      data: {
        workflowHistory: mockWorkflow
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/documents/:id/download
 * Download document based on C-WI-AR-001
 */
router.get('/:id/download', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Mock file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="document-${id}.pdf"`);
    res.setHeader('Content-Length', '1024');
    
    // Send mock PDF content
    const mockPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n178\n%%EOF');
    res.status(200).send(mockPdfContent);

  } catch (error) {
    next(error);
  }
});

module.exports = router;

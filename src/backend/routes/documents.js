// src/backend/routes/documents.js
/**
 * =================================================================
 * EDMS 1CAR - Document Routes (REVISED AND FIXED)
 * Tích hợp đầy đủ SearchService, auditCRUD middleware, và các API cho Dashboard.
 * ĐÃ BỔ SUNG ROUTE /check-code ĐỂ SỬA LỖI 404.
 * =================================================================
 */

const express = require('express');
const router = express.Router();

// Import middleware và services
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { auditMiddleware, auditCRUD, setAuditDetails } = require('../middleware/auditMiddleware');
const serviceFactory = require('../services/serviceFactory');
const { createError } = require('../middleware/errorHandler');
const SearchService = require('../services/searchService');
const Document = require('../models/Document');
const DocumentCodeGenerator = require('../utils/documentCodeGenerator'); // Đảm bảo import

// Áp dụng audit middleware cho tất cả routes
router.use(auditMiddleware);

// =================================================================
// ROUTES CHO DASHBOARD WIDGETS
// =================================================================

/**
 * GET /api/documents/stats
 * Lấy thống kê tài liệu theo trạng thái cho Dashboard Widget
 */
router.get('/stats', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const { department, dateFrom, dateTo } = req.query;
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.getDocumentStatistics(req.user, { department, dateFrom, dateTo });
        setAuditDetails(res, 'DOCUMENT_STATISTICS_VIEWED', 'document', null, { filtersApplied: { department, dateFrom, dateTo } });
        res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/pending-approval
 * Lấy tài liệu cần phê duyệt theo vai trò cho Dashboard Widget
 */
router.get('/pending-approval', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.getPendingApprovalsForUser(req.user, parseInt(limit));
        setAuditDetails(res, 'PENDING_APPROVALS_VIEWED', 'document', null, { count: result.data?.length || 0 });
        res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/due-for-review
 * Lấy tài liệu sắp hết hạn review cho Dashboard Widget
 */
router.get('/due-for-review', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const { daysBefore = 30 } = req.query;
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.getDocumentsDueForReview(req.user, parseInt(daysBefore));
        setAuditDetails(res, 'DOCUMENTS_DUE_REVIEW_VIEWED', 'document', null, { daysBefore: parseInt(daysBefore), count: result.count });
        res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId });
    } catch (error) {
        next(error);
    }
});


// =================================================================
// CÁC ROUTE TIỆN ÍCH VÀ METADATA CHO TÌM KIẾM
// =================================================================

/**
 * GET /api/documents/suggest-code
 * Gợi ý mã tài liệu dựa trên loại và phòng ban
 */
router.get('/suggest-code', authenticateToken, checkPermission('CREATE_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const { type, department } = req.query;
        if (!type || !department) {
            throw createError('Thiếu thông tin loại tài liệu hoặc phòng ban', 400, 'MISSING_PARAMETERS');
        }
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.suggestDocumentCode(type, department, req.user, { ip: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID });
        setAuditDetails(res, 'DOCUMENT_CODE_SUGGESTED', 'system', null, { type, department, suggestedCode: result.data?.suggestedCode });
        res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId });
    } catch (error) {
        next(error);
    }
});

// THÊM MỚI: Endpoint kiểm tra mã tài liệu để sửa lỗi 404
/**
 * POST /api/documents/check-code
 * Kiểm tra xem mã tài liệu đã tồn tại hay chưa
 */
router.post('/check-code', authenticateToken, checkPermission('CREATE_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) {
            throw createError('Mã tài liệu là bắt buộc để kiểm tra.', 400, 'MISSING_CODE');
        }
        const codeExists = await DocumentCodeGenerator.codeExists(code);
        res.status(200).json({
            success: true,
            data: { available: !codeExists },
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/types, /departments, /workflow-states
 * Cung cấp metadata cho frontend
 */
router.get('/types', authenticateToken, (req, res) => res.status(200).json({ success: true, data: { documentTypes: [ { code: 'PL', name: 'Chính sách' }, { code: 'PR', name: 'Quy trình' }, { code: 'WI', name: 'Hướng dẫn' }, { code: 'FM', name: 'Biểu mẫu' }, { code: 'TD', name: 'Tài liệu kỹ thuật' }, { code: 'TR', name: 'Tài liệu đào tạo' }, { code: 'RC', name: 'Hồ sơ' } ] } }));
router.get('/departments', authenticateToken, (req, res) => res.status(200).json({ success: true, data: { departments: [ 'Ban Giám đốc', 'Phòng Phát triển Nhượng quyền', 'Phòng Đào tạo Tiêu chuẩn', 'Phòng Marketing', 'Phòng Kỹ thuật QC', 'Phòng Tài chính', 'Phòng Công nghệ Hệ thống', 'Phòng Pháp lý', 'Bộ phận Tiếp nhận CSKH', 'Bộ phận Kỹ thuật Garage', 'Bộ phận QC Garage', 'Bộ phận Kho/Kế toán Garage', 'Bộ phận Marketing Garage', 'Quản lý Garage' ] } }));
router.get('/workflow-states', authenticateToken, (req, res) => res.status(200).json({ success: true, data: { workflowStates: [ { code: 'draft', name: 'Bản nháp' }, { code: 'review', name: 'Đang xem xét' }, { code: 'published', name: 'Đã phê duyệt' }, { code: 'archived', name: 'Đã lưu trữ' } ] } }));

/**
 * GET /api/documents/search-suggestions
 * Gợi ý tìm kiếm nhanh
 */
router.get('/search-suggestions', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const { query, limit = 10 } = req.query;
        if (!query || query.trim().length < 2) {
            return res.json({ success: true, data: { suggestions: [] } });
        }
        const result = await SearchService.getSearchSuggestions(query, req.user.id, parseInt(limit), { ipAddress: req.ip, userAgent: req.get('user-agent') });
        res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId });
    } catch (error) {
        next(error);
    }
});


// =================================================================
// CÁC ROUTE CHÍNH CRUD VÀ TÌM KIẾM TÀI LIỆU
// =================================================================

/**
 * GET /api/documents
 * Tìm kiếm và lọc tài liệu - Tích hợp SearchService
 */
router.get('/', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const { search = '', page = 1, limit = 20, sort = 'relevance', ...filters } = req.query;
        const context = { ipAddress: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID };
        const result = await SearchService.searchDocuments(search, filters, parseInt(page), parseInt(limit), req.user.id, context);
        res.json({ ...result, timestamp: new Date().toISOString(), requestId: req.requestId });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/documents
 * Tạo tài liệu mới
 */
router.post('/', authenticateToken, checkPermission('CREATE_DOCUMENT', 'document'), auditCRUD.create('document'), async (req, res, next) => {
    try {
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.createDocument(req.body, req.user);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/:id
 * Lấy chi tiết tài liệu
 */
router.get('/:id', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), auditCRUD.read('document'), async (req, res, next) => {
    try {
        const documentService = serviceFactory.getDocumentService();
        const context = { ip: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID };
        const result = await documentService.getDocument(parseInt(req.params.id), req.user, context);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/documents/:id
 * Cập nhật tài liệu
 */
router.put('/:id', authenticateToken, checkPermission('EDIT_DOCUMENT', 'document'), auditCRUD.update('document'), async (req, res, next) => {
    try {
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.updateDocument(parseInt(req.params.id), req.body, req.user);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/documents/:id
 * Xóa tài liệu
 */
router.delete('/:id', authenticateToken, checkPermission('DELETE_DOCUMENT', 'document'), auditCRUD.delete('document'), async (req, res, next) => {
    try {
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.deleteDocument(parseInt(req.params.id), req.user);
        res.json(result);
    } catch (error) {
        next(error);
    }
});


// =================================================================
// CÁC ROUTE QUẢN LÝ WORKFLOW, VERSION, FILE, YÊU THÍCH
// =================================================================

/**
 * PUT /api/documents/:id/status
 * Cập nhật trạng thái tài liệu (phê duyệt, từ chối,...)
 */
router.put('/:id/status', authenticateToken, checkPermission('APPROVE_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const documentService = serviceFactory.getDocumentService();
        const { newStatus, comment } = req.body;
        const result = await documentService.updateDocumentStatus(parseInt(req.params.id), newStatus, comment, req.user);
        setAuditDetails(res, 'DOCUMENT_STATUS_CHANGED', 'document', parseInt(req.params.id), { newStatus, comment });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/:id/versions
 * Lấy lịch sử phiên bản
 */
router.get('/:id/versions', authenticateToken, checkPermission('VIEW_VERSION_HISTORY', 'document'), async (req, res, next) => {
    try {
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.getVersionHistory(parseInt(req.params.id), req.user);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/documents/:id/versions
 * Tạo phiên bản mới cho tài liệu
 */
router.post('/:id/versions', authenticateToken, checkPermission('CREATE_VERSION', 'document'), async (req, res, next) => {
    try {
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.createDocumentVersion(parseInt(req.params.id), req.body, req.user);
        setAuditDetails(res, 'DOCUMENT_VERSION_CREATED', 'document', parseInt(req.params.id), { newVersion: req.body.newVersion });
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});


/**
 * GET /api/documents/:id/workflow
 * Lấy lịch sử workflow
 */
router.get('/:id/workflow', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const documentService = serviceFactory.getDocumentService();
        const result = await documentService.getWorkflowHistory(parseInt(req.params.id), req.user);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/documents/:id/download
 * Download file của tài liệu
 */
router.get('/:id/download', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const documentId = parseInt(req.params.id);
        const documentService = serviceFactory.getDocumentService();
        const context = { ip: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID };
        const result = await documentService.downloadDocument(documentId, req.user, context);

        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
        res.setHeader('Content-Length', result.fileSize);
        
        setAuditDetails(res, 'DOCUMENT_DOWNLOADED', 'document', documentId, { fileName: result.fileName });

        res.status(200).send(result.fileContent);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/documents/:id/favorite
 * Thêm một tài liệu vào danh sách yêu thích của người dùng
 */
router.post('/:id/favorite', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const documentId = parseInt(req.params.id);
        const userId = req.user.id;
        const result = await Document.addToFavorites(documentId, userId);
        setAuditDetails(res, 'DOCUMENT_FAVORITED', 'document', documentId, { favorited: true });
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/documents/:id/favorite
 * Xóa một tài liệu khỏi danh sách yêu thích của người dùng
 */
router.delete('/:id/favorite', authenticateToken, checkPermission('VIEW_DOCUMENT', 'document'), async (req, res, next) => {
    try {
        const documentId = parseInt(req.params.id);
        const userId = req.user.id;
        const result = await Document.removeFromFavorites(documentId, userId);
        setAuditDetails(res, 'DOCUMENT_UNFAVORITED', 'document', documentId, { favorited: false });
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});


module.exports = router;

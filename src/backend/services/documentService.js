// src/backend/services/documentService.js - Cập nhật với logic vai trò đầy đủ
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const WorkflowHistory = require('../models/WorkflowHistory');
const AuditService = require('./auditService');
const { createError } = require('../middleware/errorHandler');
const db = require('../config/database');

class DocumentService {
    // ===============================================================
    // CHỨC NĂNG PENDING APPROVAL - ĐÃ CẬP NHẬT VỚI LOGIC VAI TRÒ
    // ============================================================
    /**
     * Lấy danh sách tài liệu chờ phê duyệt cho người dùng hiện tại
     * @param {Object} user - Thông tin người dùng hiện tại
     * @param {Object} filters - Bộ lọc tìm kiếm
     * @returns {Promise} Dữ liệu tài liệu với vai trò của user
     */
    static async getPendingApprovalsForUser(user, filters = {}) {
        try {
            const { page = 1, limit = 20, department, author, priority, sortBy = 'updated_at', sortOrder = 'desc' } = filters;

            // Xây dựng câu truy vấn cơ bản
            let whereClause = "WHERE d.status = 'review'";
            let params = [];

            // Áp dụng phân quyền dựa trên vai trò
            if (user.role !== 'admin') {
                whereClause += " AND (d.reviewer_id = ? OR d.approver_id = ?)";
                params.push(user.id, user.id);
            }

            // Áp dụng các bộ lọc bổ sung
            if (department) {
                whereClause += " AND d.department = ?";
                params.push(department);
            }
            if (author) {
                whereClause += " AND d.author_id = ?";
                params.push(author);
            }
            if (priority) {
                whereClause += " AND d.priority = ?";
                params.push(priority);
            }

            // Xây dựng câu lệnh ORDER BY
            const validSortColumns = ['updated_at', 'created_at', 'priority', 'title', 'document_code'];
            const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'updated_at';
            const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

            // Câu truy vấn chính
            const query = `
                SELECT d.*, u_author.name as author_name, u_author.department as author_department, 
                       u_reviewer.name as reviewer_name, u_approver.name as approver_name,
                       JULIANDAY('now') - JULIANDAY(d.updated_at) as days_pending
                FROM documents d
                LEFT JOIN users u_author ON d.author_id = u_author.id
                LEFT JOIN users u_reviewer ON d.reviewer_id = u_reviewer.id
                LEFT JOIN users u_approver ON d.approver_id = u_approver.id
                ${whereClause}
                ORDER BY d.${sortColumn} ${sortDirection}
                LIMIT ? OFFSET ?
            `;
            params.push(limit, (page - 1) * limit);

            // Thực hiện truy vấn
            const documents = await db.all(query, params);

            // THÊM LOGIC VAI TRÒ CHO TỪNG TÀI LIỆU
            const documentsWithRole = documents.map(document => {
                let userRoleInWorkflow = null;
                // Xác định vai trò của user hiện tại đối với tài liệu này
                if (user.role === 'admin') {
                    userRoleInWorkflow = 'admin';
                } else if (document.reviewer_id === user.id) {
                    userRoleInWorkflow = 'reviewer';
                } else if (document.approver_id === user.id) {
                    userRoleInWorkflow = 'approver';
                }
                return {
                    ...document,
                    user_role_in_workflow: userRoleInWorkflow
                };
            });

            // Đếm tổng số bản ghi
            const countQuery = `SELECT COUNT(*) as count FROM documents d ${whereClause}`;
            const countParams = params.slice(0, -2); // Loại bỏ LIMIT và OFFSET
            const totalResult = await db.get(countQuery, countParams);
            const total = totalResult.count;

            return {
                success: true,
                data: documentsWithRole,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error in getPendingApprovalsForUser:', error);
            throw createError('Không thể lấy danh sách tài liệu chờ phê duyệt', 500, 'FETCH_PENDING_APPROVALS_FAILED');
        }
    }

    /**
     * Lấy thống kê tài liệu chờ phê duyệt cho Dashboard Widget
     * @param {Object} user - Thông tin người dùng hiện tại
     * @returns {Promise} Thống kê tài liệu chờ phê duyệt
     */
    static async getPendingApprovalStats(user) {
        try {
            let whereClause = "WHERE d.status = 'review'";
            let params = [];

            // Áp dụng phân quyền dựa trên vai trò
            if (user.role !== 'admin') {
                whereClause += " AND (d.reviewer_id = ? OR d.approver_id = ?)";
                params.push(user.id, user.id);
            }

            const statsQuery = `
                SELECT COUNT(*) as total_pending,
                       COUNT(CASE WHEN d.reviewer_id = ? THEN 1 END) as pending_review,
                       COUNT(CASE WHEN d.approver_id = ? THEN 1 END) as pending_approval,
                       COUNT(CASE WHEN d.priority = 'urgent' THEN 1 END) as urgent_count,
                       COUNT(CASE WHEN d.priority = 'high' THEN 1 END) as high_priority_count,
                       AVG(JULIANDAY('now') - JULIANDAY(d.updated_at)) as avg_days_pending,
                       COUNT(CASE WHEN d.updated_at > datetime('now', '-7 days') THEN 1 END) as recent_submissions
                FROM documents d
                ${whereClause}
            `;
            const statsParams = [user.id, user.id, ...params];
            const stats = await db.get(statsQuery, statsParams);

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('Error in getPendingApprovalStats:', error);
            throw createError('Không thể lấy thống kê tài liệu chờ phê duyệt', 500, 'FETCH_STATS_FAILED');
        }
    }

    /**
     * Xử lý workflow action (approve, reject, request_changes)
     * @param {number} documentId - ID của tài liệu
     * @param {string} action - Hành động (approve, reject, request_changes)
     * @param {string} comment - Nhận xét
     * @param {Object} user - Thông tin người dùng thực hiện hành động
     * @returns {Promise} Kết quả xử lý
     */
    static async processWorkflowAction(documentId, action, comment, user) {
        try {
            // Validate action
            const validActions = ['approve', 'reject', 'request_changes'];
            if (!validActions.includes(action)) {
                throw createError('Hành động không hợp lệ', 400, 'INVALID_ACTION');
            }

            // Lấy thông tin tài liệu hiện tại
            const document = await db.get('SELECT * FROM documents WHERE id = ?', [documentId]);
            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Kiểm tra quyền thực hiện hành động
            const canPerformAction = user.role === 'admin' ||
                document.reviewer_id === user.id ||
                document.approver_id === user.id;

            if (!canPerformAction) {
                throw createError('Bạn không có quyền thực hiện hành động này', 403, 'INSUFFICIENT_PERMISSION');
            }

            // Kiểm tra trạng thái tài liệu
            if (document.status !== 'review') {
                throw createError('Tài liệu không ở trạng thái chờ phê duyệt', 400, 'INVALID_DOCUMENT_STATUS');
            }

            const previousStatus = document.status;
            let newStatus;
            let decision;

            // Xác định trạng thái mới và quyết định
            switch (action) {
                case 'approve':
                    newStatus = 'published';
                    decision = 'approved';
                    break;
                case 'reject':
                    newStatus = 'draft';
                    decision = 'rejected';
                    break;
                case 'request_changes':
                    newStatus = 'draft'; // Hoặc một trạng thái khác phù hợp, ví dụ 'pending_changes'
                    decision = 'requested_changes';
                    break;
                default:
                    throw createError('Hành động không xác định', 400, 'UNKNOWN_ACTION');
            }

            // Bắt đầu transaction
            await db.run('BEGIN TRANSACTION');
            try {
                // Cập nhật trạng thái tài liệu
                await db.run(
                    'UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [newStatus, documentId]
                );

                // Ghi lại lịch sử workflow
                await db.run(
                    `INSERT INTO workflow_history (
                        document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [documentId, previousStatus, newStatus, comment, decision, user.id]
                );

                // Commit transaction
                await db.run('COMMIT');

                // Ghi audit log
                await AuditService.log({
                    userId: user.id,
                    action: 'DOCUMENT_WORKFLOW_ACTION',
                    resourceType: 'document',
                    resourceId: documentId,
                    details: { action, previousStatus, newStatus, decision, comment }
                });

                return {
                    success: true,
                    previousStatus,
                    newStatus,
                    action,
                    decision,
                    comment,
                    documentId
                };
            } catch (error) {
                // Rollback transaction
                await db.run('ROLLBACK');
                throw error; // Re-throw to be caught by outer catch
            }
        } catch (error) {
            console.error('Error in processWorkflowAction:', error);
            if (error.statusCode) {
                throw error; // Re-throw custom errors
            }
            throw createError('Không thể xử lý hành động workflow', 500, 'WORKFLOW_ACTION_FAILED');
        }
    }

    // =================================================================
    // CÁC PHƯƠNG THỨC KHÁC CỦA DOCUMENT SERVICE (GIỮ NGUYÊN)
    // =============================================================

    static async getDocument(id, user, context = {}) {
        try {
            const document = await db.get(`
                SELECT d.*, u_author.name as author_name, u_author.department as author_department,
                       u_reviewer.name as reviewer_name, u_approver.name as approver_name
                FROM documents d
                LEFT JOIN users u_author ON d.author_id = u_author.id
                LEFT JOIN users u_reviewer ON d.reviewer_id = u_reviewer.id
                LEFT JOIN users u_approver ON d.approver_id = u_approver.id
                WHERE d.id = ?
            `, [id]);

            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Kiểm tra quyền truy cập
            const hasAccess = await this.checkDocumentAccess(document, user);
            if (!hasAccess) {
                throw createError('Bạn không có quyền truy cập tài liệu này', 403, 'ACCESS_DENIED');
            }

            // Ghi audit log
            await AuditService.log({
                userId: user.id,
                action: 'DOCUMENT_VIEWED',
                resourceType: 'document',
                resourceId: id,
                details: { context }
            });

            return {
                success: true,
                data: document
            };
        } catch (error) {
            console.error('Error in getDocument:', error);
            if (error.statusCode) {
                throw error;
            }
            throw createError('Không thể lấy thông tin tài liệu', 500, 'FETCH_DOCUMENT_FAILED');
        }
    }

    static async checkDocumentAccess(document, user) {
        // Admin có quyền truy cập tất cả
        if (user.role === 'admin') {
            return true;
        }

        // Tác giả có quyền truy cập tài liệu của mình
        if (document.author_id === user.id) {
            return true;
        }

        // Reviewer và approver có quyền truy cập
        if (document.reviewer_id === user.id || document.approver_id === user.id) {
            return true;
        }

        // Tài liệu published có thể được xem bởi cùng phòng ban
        if (document.status === 'published' && document.department === user.department) {
            return true;
        }

        // Tài liệu public có thể được xem bởi tất cả
        if (document.security_level === 'public' && document.status === 'published') {
            return true;
        }

        return false;
    }

    // Các phương thức khác của DocumentService...
    static async createDocument(documentData, user) {
        // Implementation giữ nguyên
    }

    static async updateDocument(id, documentData, user) {
        // Implementation giữ nguyên
    }

    static async deleteDocument(id, user) {
        // Implementation giữ nguyên
    }

    static async getVersionHistory(id, user) {
        // Implementation giữ nguyên
    }

    static async createDocumentVersion(id, versionData, user) {
        // Implementation giữ nguyên
    }

    static async getWorkflowHistory(id, user) {
        // Implementation giữ nguyên
    }

    static async getDocumentStatistics(user, filters) {
        // Implementation giữ nguyên
    }

    static async getDocumentsDueForReview(user, daysBefore) {
        // Implementation giữ nguyên
    }

    static async updateDocumentStatus(id, newStatus, comment, user) {
        // Implementation giữ nguyên
    }
}

module.exports = DocumentService;
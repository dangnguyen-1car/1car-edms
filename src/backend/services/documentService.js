// src/backend/services/documentService.js - ĐÃ SỬA LỖI

// Các module require ở cấp cao nhất - chỉ những module an toàn, không gây phụ thuộc vòng
const { createError } = require('../middleware/errorHandler')
const { dbManager } = require('../config/database')
const fs = require('fs-extra') // SỬA LỖI: Thêm thư viện xử lý file
const path = require('path') // SỬA LỖI: Thêm thư viện xử lý đường dẫn
const PROJECT_ROOT = path.join(__dirname, '..')

class DocumentService {
  // ===============================================================
  // CÁC HÀM XỬ LÝ LẤY DANH SÁCH (ĐÃ SỬA LỖI LOGIC)
  // ===============================================================

  /**
     * Lấy danh sách tài liệu chờ phê duyệt cho người dùng hiện tại
     * @param {Object} user - Thông tin người dùng hiện tại
     * @param {Object} filters - Bộ lọc tìm kiếm
     * @returns {Promise} Dữ liệu tài liệu với vai trò của user
     */
  async getPendingApprovalsForUser (user, filters = {}) {
    try {
      const { page = 1, limit = 20, department, author, priority, sortBy = 'updated_at', sortOrder = 'desc' } = filters

      let whereClause = "WHERE d.status = 'review'"
      const params = []

      // Nếu không phải admin, chỉ lấy tài liệu họ được gán là reviewer hoặc approver
      if (user.role !== 'admin') {
        whereClause += ' AND (d.reviewer_id = ? OR d.approver_id = ?)'
        params.push(user.id, user.id)
      }
      // Nếu là admin, không thêm điều kiện này để họ thấy tất cả.

      if (department) {
        whereClause += ' AND d.department = ?'
        params.push(department)
      }
      if (author) {
        whereClause += ' AND d.author_id = ?'
        params.push(author)
      }
      if (priority) {
        whereClause += ' AND d.priority = ?'
        params.push(priority)
      }

      const validSortColumns = ['updated_at', 'created_at', 'priority', 'title', 'document_code']
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'updated_at'
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

      // *** SỬA LỖI TẠI ĐÂY: Cập nhật câu lệnh SQL để gán vai trò chính xác cho admin ***
      const query = `
                SELECT d.*, u_author.name as author_name, u_author.department as author_department,
                       u_reviewer.name as reviewer_name, u_approver.name as approver_name,
                       JULIANDAY('now') - JULIANDAY(d.updated_at) as days_pending,
                       (CASE
                          WHEN ? = 'admin' THEN 'approver'
                          WHEN d.reviewer_id = ? THEN 'reviewer'
                          WHEN d.approver_id = ? THEN 'approver'
                          ELSE 'observer'
                        END) as user_role_in_workflow
                FROM documents d
                LEFT JOIN users u_author ON d.author_id = u_author.id
                LEFT JOIN users u_reviewer ON d.reviewer_id = u_reviewer.id
                LEFT JOIN users u_approver ON d.approver_id = u_approver.id
                ${whereClause}
                ORDER BY d.${sortColumn} ${sortDirection}
                LIMIT ? OFFSET ?
            `
      // Cập nhật tham số cho câu lệnh query
      const queryParams = [user.role, user.id, user.id, ...params, limit, (page - 1) * limit]
      // *** KẾT THÚC PHẦN SỬA LỖI ***

      const documents = await dbManager.all(query, queryParams)
      const countQuery = `SELECT COUNT(*) as count FROM documents d ${whereClause}`
      // Tham số cho countQuery không cần user.role và user.id lặp lại
      const countParams = [...params]

      const totalResult = await dbManager.get(countQuery, countParams)
      const total = totalResult.count

      return {
        success: true,
        data: documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('Error in getPendingApprovalsForUser:', error)
      throw createError('Không thể lấy danh sách tài liệu chờ phê duyệt', 500, 'FETCH_PENDING_APPROVALS_FAILED')
    }
  }

  /**
     * Lấy thống kê tài liệu chờ phê duyệt cho Dashboard Widget
     */
  async getPendingApprovalStats (user) {
    try {
      let whereClause = "WHERE d.status = 'review'"
      const params = []

      if (user.role !== 'admin') {
        whereClause += ' AND (d.reviewer_id = ? OR d.approver_id = ?)'
        params.push(user.id, user.id)
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
            `
      const statsParams = [user.id, user.id, ...params]
      const stats = await dbManager.get(statsQuery, statsParams)

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('Error in getPendingApprovalStats:', error)
      throw createError('Không thể lấy thống kê tài liệu chờ phê duyệt', 500, 'FETCH_STATS_FAILED')
    }
  }

  // ===============================================================
  // CÁC HÀM XỬ LÝ WORKFLOW VÀ THAO TÁC CRUD
  // ===============================================================

  /**
     * Xử lý workflow action (approve, reject, request_changes)
     */
  async processWorkflowAction (documentId, action, comment, user) {
    const AuditService = require('./auditService')
    try {
      const validActions = ['approve', 'reject', 'request_changes']
      if (!validActions.includes(action)) {
        throw createError('Hành động không hợp lệ', 400, 'INVALID_ACTION')
      }
      const document = await dbManager.get('SELECT * FROM documents WHERE id = ?', [documentId])
      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND')
      }
      const canPerformAction = user.role === 'admin' ||
                document.reviewer_id === user.id ||
                document.approver_id === user.id
      if (!canPerformAction) {
        throw createError('Bạn không có quyền thực hiện hành động này', 403, 'INSUFFICIENT_PERMISSION')
      }
      if (document.status !== 'review') {
        throw createError('Tài liệu không ở trạng thái chờ phê duyệt', 400, 'INVALID_DOCUMENT_STATUS')
      }
      const previousStatus = document.status
      let newStatus, decision
      switch (action) {
        case 'approve': newStatus = 'published'; decision = 'approved'; break
        case 'reject': newStatus = 'draft'; decision = 'rejected'; break
        case 'request_changes': newStatus = 'draft'; decision = 'requested_changes'; break
        default: throw createError('Hành động không xác định', 400, 'UNKNOWN_ACTION')
      }

      await dbManager.run('BEGIN TRANSACTION')
      try {
        await dbManager.run('UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, documentId])
        await dbManager.run('INSERT INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by) VALUES (?, ?, ?, ?, ?, ?)', [documentId, previousStatus, newStatus, comment, decision, user.id])
        await dbManager.run('COMMIT')
        await AuditService.log({
          userId: user.id,
          action: 'DOCUMENT_WORKFLOW_ACTION',
          resourceType: 'document',
          resourceId: documentId,
          details: { action, previousStatus, newStatus, decision, comment }
        })
        return { success: true, previousStatus, newStatus, action, decision, comment, documentId }
      } catch (error) {
        await dbManager.run('ROLLBACK')
        throw error
      }
    } catch (error) {
      console.error('Error in processWorkflowAction:', error)
      if (error.statusCode) throw error
      throw createError('Không thể xử lý hành động workflow', 500, 'WORKFLOW_ACTION_FAILED')
    }
  }

  /**
     * Lấy chi tiết tài liệu
     */
  async getDocument (id, user, context = {}) {
    const AuditService = require('./auditService')
    try {
      const document = await dbManager.get(`
                SELECT d.*, u_author.name as author_name, u_author.department as author_department,
                       u_reviewer.name as reviewer_name, u_approver.name as approver_name
                FROM documents d
                LEFT JOIN users u_author ON d.author_id = u_author.id
                LEFT JOIN users u_reviewer ON d.reviewer_id = u_reviewer.id
                LEFT JOIN users u_approver ON d.approver_id = u_approver.id
                WHERE d.id = ?
            `, [id])

      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND')
      }

      const hasAccess = await this.checkDocumentAccess(document, user)
      if (!hasAccess) {
        throw createError('Bạn không có quyền truy cập tài liệu này', 403, 'ACCESS_DENIED')
      }

      await AuditService.log({
        userId: user.id,
        action: 'DOCUMENT_VIEWED',
        resourceType: 'document',
        resourceId: id,
        details: { context }
      })

      return {
        success: true,
        data: document
      }
    } catch (error) {
      console.error('Error in getDocument:', error)
      if (error.statusCode) {
        throw error
      }
      throw createError('Không thể lấy thông tin tài liệu', 500, 'FETCH_DOCUMENT_FAILED')
    }
  }

  /**
     * Lấy nội dung file để download
     */
  async downloadDocument (id, user, context = {}) {
    const AuditService = require('./auditService')
    try {
      const documentResult = await this.getDocument(id, user, context)
      const document = documentResult.data

      if (!document.file_path) {
        throw createError('Tài liệu này không có file đính kèm.', 404, 'FILE_NOT_FOUND')
      }

      const relativePath = document.file_path.startsWith('/') ? document.file_path.substring(1) : document.file_path
      const absolutePath = path.join(PROJECT_ROOT, relativePath)

      if (!await fs.pathExists(absolutePath)) {
        console.error(`File not found on disk at path: ${absolutePath}`)
        throw createError('File không tồn tại trên server.', 500, 'FILE_NOT_FOUND_ON_DISK')
      }

      const fileContent = await fs.readFile(absolutePath)

      await AuditService.log({
        userId: user.id,
        action: 'DOCUMENT_DOWNLOADED',
        resourceType: 'document',
        resourceId: id,
        details: {
          document_code: document.document_code,
          file_name: document.file_name,
          file_size: document.file_size,
          context
        }
      })

      return {
        fileContent,
        fileName: document.file_name,
        fileSize: document.file_size,
        mimeType: document.mime_type || 'application/octet-stream'
      }
    } catch (error) {
      console.error(`Error in downloadDocument for ID ${id}:`, error)
      throw error
    }
  }

  async checkDocumentAccess (document, user) {
    if (user.role === 'admin') return true
    if (document.author_id === user.id) return true
    if (document.reviewer_id === user.id || document.approver_id === user.id) return true
    if (document.status === 'published' && document.department === user.department) return true
    if (document.security_level === 'public' && document.status === 'published') return true
    return false
  }

  async createDocument (documentData, user) { /* Implementation giữ nguyên */ }
  async updateDocument (id, documentData, user) { /* Implementation giữ nguyên */ }
  async deleteDocument (id, user) { /* Implementation giữ nguyên */ }

  /**
   * Lấy lịch sử phiên bản của tài liệu.
   */
  async getVersionHistory (id, user) {
    try {
      const document = await dbManager.get('SELECT id, author_id, reviewer_id, approver_id, department, status, security_level FROM documents WHERE id = ?', [id])

      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND')
      }

      const hasAccess = await this.checkDocumentAccess(document, user)
      if (!hasAccess) {
        throw createError('Bạn không có quyền truy cập lịch sử phiên bản của tài liệu này', 403, 'ACCESS_DENIED')
      }

      const versions = await dbManager.all('SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC', [id])

      return {
        success: true,
        data: versions
      }
    } catch (error) {
      console.error('Error in getVersionHistory:', error)
      if (error.statusCode) {
        throw error
      }
      throw createError('Không thể lấy lịch sử phiên bản tài liệu', 500, 'FETCH_VERSION_HISTORY_FAILED')
    }
  }

  /**
   * Tạo một phiên bản mới cho tài liệu.
   */
  async createDocumentVersion (id, versionData, user) {
    const AuditService = require('./auditService')
    try {
      const { file_path, file_name, file_size, mime_type, version_number, changes_summary } = versionData

      const document = await dbManager.get('SELECT id, author_id, reviewer_id, approver_id, department, status, security_level FROM documents WHERE id = ?', [id])

      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND')
      }

      if (document.author_id !== user.id && user.role !== 'admin') {
        throw createError('Bạn không có quyền tạo phiên bản mới cho tài liệu này', 403, 'INSUFFICIENT_PERMISSION')
      }

      await dbManager.run('BEGIN TRANSACTION')

      try {
        const result = await dbManager.run(
          `INSERT INTO document_versions (document_id, version_number, file_path, file_name, file_size, mime_type, changes_summary, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, version_number, file_path, file_name, file_size, mime_type, changes_summary, user.id]
        )

        await dbManager.run(
          'UPDATE documents SET file_path = ?, file_name = ?, file_size = ?, mime_type = ?, version_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [file_path, file_name, file_size, mime_type, version_number, id]
        )

        await dbManager.run('COMMIT')

        await AuditService.log({
          userId: user.id,
          action: 'DOCUMENT_VERSION_CREATED',
          resourceType: 'document_version',
          resourceId: result.lastID,
          details: { documentId: id, version_number, changes_summary }
        })

        return {
          success: true,
          message: 'Phiên bản tài liệu đã được tạo thành công.',
          versionId: result.lastID
        }
      } catch (innerError) {
        await dbManager.run('ROLLBACK')
        throw innerError
      }
    } catch (error) {
      console.error('Error in createDocumentVersion:', error)
      if (error.statusCode) {
        throw error
      }
      throw createError('Không thể tạo phiên bản tài liệu mới', 500, 'CREATE_VERSION_FAILED')
    }
  }

  /**
   * Lấy lịch sử workflow của tài liệu.
   */
  async getWorkflowHistory (id, user) {
    try {
      const document = await dbManager.get('SELECT id, author_id, reviewer_id, approver_id, department, status, security_level FROM documents WHERE id = ?', [id])

      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND')
      }

      const hasAccess = await this.checkDocumentAccess(document, user)
      if (!hasAccess) {
        throw createError('Bạn không có quyền truy cập lịch sử workflow của tài liệu này', 403, 'ACCESS_DENIED')
      }

      const history = await dbManager.all(`
                SELECT wt.*, u.name as transitioned_by_name
                FROM workflow_transitions wt
                JOIN users u ON wt.transitioned_by = u.id
                WHERE wt.document_id = ?
                ORDER BY wt.created_at DESC
            `, [id])

      return {
        success: true,
        data: history
      }
    } catch (error) {
      console.error('Error in getWorkflowHistory:', error)
      if (error.statusCode) {
        throw error
      }
      throw createError('Không thể lấy lịch sử workflow tài liệu', 500, 'FETCH_WORKFLOW_HISTORY_FAILED')
    }
  }

  async getDocumentStatistics (user, filters) { /* Implementation giữ nguyên */ }
  async getDocumentsDueForReview (user, daysBefore) { /* Implementation giữ nguyên */ }
  async updateDocumentStatus (id, newStatus, comment, user) { /* Implementation giữ nguyên */ }
}

module.exports = DocumentService

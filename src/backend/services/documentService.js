// src/backend/services/documentService.js - PHIÊN BẢN SỬA LỖI ĐƯỜNG DẪN
const { createError } = require('../middleware/errorHandler')
const { dbManager } = require('../config/database')
const fs = require('fs-extra')
const path = require('path')
const recentDocumentsService = require('./recentDocumentsService')
const favoritesService = require('./favoritesService')
const AuditService = require('./auditService')
const DocumentCodeGenerator = require('../utils/documentCodeGenerator')
// SỬA LỖI: Định nghĩa lại PROJECT_ROOT để trỏ ra thư mục gốc của dự án
const PROJECT_ROOT = path.join(__dirname, '..', '..') // Trỏ ra 2 cấp: từ 'services' -> 'backend' -> thư mục gốc

class DocumentService {
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

      const query = `
                SELECT d.*, u_author.name as author_name, u_author.department as author_department,
                       u_reviewer.name as reviewer_name, u_approver.name as approver_name,
                       JULIANDAY('now', 'localtime') - JULIANDAY(d.updated_at) as days_pending,
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
      const queryParams = [user.role, user.id, user.id, ...params, limit, (page - 1) * limit]

      const documents = await dbManager.all(query, queryParams)
      const countQuery = `SELECT COUNT(*) as count FROM documents d ${whereClause}`
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
     * *** ĐÃ TÁI CẤU TRÚC HOÀN TOÀN ĐỂ ĐẢM BẢO CHÍNH XÁC ***
     */
  async getPendingApprovalStats (user) {
    try {
      let totalPendingQuery = "SELECT COUNT(*) as count FROM documents WHERE status = 'review'"
      const reviewCountQuery = "SELECT COUNT(*) as count FROM documents WHERE status = 'review' AND reviewer_id = ?"
      const approvalCountQuery = "SELECT COUNT(*) as count FROM documents WHERE status = 'review' AND approver_id = ?"

      const params = []

      if (user.role !== 'admin') {
        totalPendingQuery += ' AND (reviewer_id = ? OR approver_id = ?)'
        params.push(user.id, user.id)
      }

      const [
        totalResult,
        reviewResult,
        approvalResult
      ] = await Promise.all([
        dbManager.get(totalPendingQuery, params),
        dbManager.get(reviewCountQuery, [user.id]),
        dbManager.get(approvalCountQuery, [user.id])
      ])

      const responseData = {
        success: true,
        data: {
          total_pending: totalResult.count || 0,
          pending_review: reviewResult.count || 0,
          pending_approval: approvalResult.count || 0
        }
      }

      return responseData
    } catch (error) {
      throw createError('Không thể lấy thống kê tài liệu chờ phê duyệt', 500, 'FETCH_STATS_FAILED')
    }
  }

  /**
     * TẠO TÀI LIỆU MỚI - ĐÂY LÀ HÀM CẦN SỬA
     * Sửa đổi để xử lý file_id và đảm bảo tính toàn vẹn dữ liệu
     */
  async createDocument (documentData, user) {
    // Bọc toàn bộ logic trong một giao dịch (transaction) của database
    return dbManager.transaction(async (db) => {
      try {
        const {
          title,
          type,
          department,
          file_id, // Nhận file_id từ frontend
          author_id,
          description,
          priority = 'normal',
          security_level = 'internal',
          scope_of_application,
          recipients,
          review_cycle,
          retention_period,
          change_reason,
          change_summary,
          keywords,
          status // Nhận trạng thái từ frontend ('draft' hoặc 'review')
        } = documentData

        // 1. **VALIDATE DỮ LIỆU ĐẦU VÀO**
        if (!title || !type || !department || !author_id) {
          throw createError('Thiếu các trường bắt buộc: title, type, department, author_id.', 400)
        }

        // -> Quan trọng: Kiểm tra file_id. Nếu tạo tài liệu mới thì phải có file.
        if (!file_id) {
          throw createError('Không có file nào được đính kèm. Vui lòng tải file lên trước.', 400)
        }

        // 2. **LẤY THÔNG TIN FILE TỪ BẢNG file_uploads**
        // (Giả sử file_id đã được tạo ở một bước upload riêng biệt và lưu trong bảng file_uploads)
        const fileInfo = await db.get('SELECT * FROM file_uploads WHERE id = ?', [file_id])
        if (!fileInfo) {
          throw createError(`File với ID ${file_id} không tồn tại trong hệ thống.`, 404)
        }

        // 3. **TẠO MÃ TÀI LIỆU**
        const document_code = await DocumentCodeGenerator.generateCode(type, department)
        const codeExists = await db.get('SELECT id FROM documents WHERE document_code = ?', [document_code])
        if (codeExists) {
          throw createError(`Mã tài liệu được tạo ra (${document_code}) đã tồn tại. Vui lòng thử lại.`, 500)
        }

        // ... (logic tính toán next_review_date, disposal_date, recipientsJson giữ nguyên)
        let next_review_date = null
        if (review_cycle) {
          const reviewDate = new Date()
          reviewDate.setDate(reviewDate.getDate() + parseInt(review_cycle))
          next_review_date = reviewDate.toISOString().split('T')[0]
        }

        let disposal_date = null
        if (retention_period) {
          const disposalDate = new Date()
          disposalDate.setDate(disposalDate.getDate() + parseInt(retention_period))
          disposal_date = disposalDate.toISOString().split('T')[0]
        }

        const recipientsJson = Array.isArray(recipients) ? JSON.stringify(recipients) : null

        // 4. **INSERT DỮ LIỆU VÀO BẢNG documents**
        const result = await db.run(`
                    INSERT INTO documents (
                        document_code, title, description, type, department, 
                        status, author_id, file_path, file_name, file_size, mime_type,
                        priority, security_level, scope_of_application,
                        recipients, review_cycle, retention_period, next_review_date,
                        disposal_date, change_reason, change_summary, keywords,
                        version, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '01.00', datetime('now', 'localtime'), datetime('now', 'localtime'))
                `, [
          document_code, title, description, type, department,
          status || 'draft', // Dùng trạng thái gửi từ frontend
          author_id,
          fileInfo.file_path, // Lấy thông tin từ bảng file_uploads
          fileInfo.original_name,
          fileInfo.file_size,
          fileInfo.mime_type,
          priority, security_level, scope_of_application,
          recipientsJson, review_cycle, retention_period, next_review_date,
          disposal_date, change_reason, change_summary, keywords
        ])

        const newDocumentId = result.lastID

        // 5. **CẬP NHẬT LẠI BẢNG file_uploads**
        // Liên kết ngược lại file upload với document vừa được tạo
        await db.run('UPDATE file_uploads SET document_id = ? WHERE id = ?', [newDocumentId, file_id])

        // 6. **GHI LOG AUDIT**
        await AuditService.log({
          action: 'DOCUMENT_CREATED',
          userId: user.id,
          resourceType: 'document',
          resourceId: newDocumentId,
          details: { document_code, title, type, department, status: status || 'draft' }
        })

        // Trả về tài liệu vừa tạo
        const newDocument = await db.get('SELECT * FROM documents WHERE id = ?', [newDocumentId])
        return { success: true, data: newDocument }
      } catch (error) {
        console.error('Error in DocumentService.createDocument:', error)
        // Vì đang ở trong transaction, lỗi sẽ tự động được rollback
        throw error // Ném lỗi ra để transaction xử lý
      }
    })
  }

  /**
     * Xử lý workflow action (approve, reject, request_changes)
     */
  async processWorkflowAction (documentId, action, comment, user) {
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
        await dbManager.run('UPDATE documents SET status = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?', [newStatus, documentId])
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
     * Lấy chi tiết tài liệu - CẬP NHẬT để ghi lại lượt xem
     */
  async getDocument (id, user, context = {}) {
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

      // Kiểm tra xem tài liệu có trong danh sách yêu thích không
      const isFavorite = await favoritesService.isFavorite(user.id, id)

      // GHI LẠI LƯỢT XEM - Fire-and-forget operation
      if (user && user.id) {
        recentDocumentsService.recordDocumentView(user.id, id)
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
        data: {
          ...document,
          is_favorite: isFavorite
        }
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
    try {
      const documentResult = await this.getDocument(id, user, context)
      const document = documentResult.data

      if (!document.file_path) {
        throw createError('Tài liệu này không có file đính kèm.', 404, 'FILE_NOT_FOUND')
      }

      // SỬA LỖI: Xây dựng đường dẫn tuyệt đối chính xác
      // Đường dẫn trong DB đã là đường dẫn tương đối từ gốc dự án (ví dụ: 'uploads/documents/file.pdf')
      // Chỉ cần nối nó với PROJECT_ROOT là đủ.
      const absolutePath = path.join(PROJECT_ROOT, document.file_path)

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
          'UPDATE documents SET file_path = ?, file_name = ?, file_size = ?, mime_type = ?, version = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?',
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

  /**
     * Lấy thống kê tài liệu.
     * *** PHIÊN BẢN SỬA LỖI HOÀN CHỈNH ***
     */
  async getDocumentStatistics (user, filters = {}) {
    try {
      const { department, authorId, dateFrom, dateTo } = filters
      let whereClause = 'WHERE 1=1'
      const params = []

      // Logic phân quyền: Nếu không phải admin, chỉ thống kê trong phòng ban của họ
      // trừ khi có một bộ lọc phòng ban khác được áp dụng (cho phép manager xem phòng ban khác nếu có quyền)
      if (user.role !== 'admin' && !department) {
        whereClause += ' AND department = ?'
        params.push(user.department)
      }

      if (department) {
        whereClause += ' AND department = ?'
        params.push(department)
      }

      if (authorId) {
        whereClause += ' AND author_id = ?'
        params.push(authorId)
      }
      if (dateFrom) {
        whereClause += ' AND created_at >= ?'
        params.push(dateFrom)
      }
      if (dateTo) {
        whereClause += ' AND created_at <= ?'
        params.push(dateTo)
      }

      // Câu lệnh SQL đúng để thống kê theo từng trạng thái
      const statsQuery = `
                SELECT
                    COUNT(*) as total_documents,
                    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
                    COUNT(CASE WHEN status = 'review' THEN 1 END) as review_count,
                    COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count,
                    COUNT(CASE WHEN created_at >= datetime('now', '-30 days', 'localtime') THEN 1 END) as recent_count
                FROM documents
                ${whereClause}
            `

      const stats = await dbManager.get(statsQuery, params)

      return { success: true, data: stats }
    } catch (error) {
      console.error('Error in getDocumentStatistics:', error)
      throw createError('Không thể lấy thống kê tài liệu', 500, 'FETCH_DOCS_STATS_FAILED')
    }
  }

  async getDocumentsDueForReview (user, daysBefore) { /* Implementation giữ nguyên */ }
  async updateDocumentStatus (id, newStatus, comment, user) { /* Implementation giữ nguyên */ }
}

module.exports = DocumentService

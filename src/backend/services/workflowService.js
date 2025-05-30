// src/backend/services/workflowService.js (Hoàn thiện)

/**
 * EDMS 1CAR - Workflow Service
 * Document lifecycle and approval workflow management
 * Based on C-PR-VM-001 requirements
 */

const { dbManager } = require('../config/database');
const { logError, appLogger } = require('../utils/logger');
const AuditService = require('./auditService');
const PermissionService = require('./permissionService');
const config = require('../config'); //
const DocumentModel = require('../models/Document'); // Để lấy VALID_STATUSES

class WorkflowService {
  /**
   * Valid workflow states based on C-PR-VM-001 and DocumentModel
   */
  static get WORKFLOW_STATES() {
    return DocumentModel.VALID_STATUSES; // ['draft', 'review', 'published', 'archived', 'disposed'];
  }

  /**
   * Valid workflow decisions
   */
  static get WORKFLOW_DECISIONS() {
    return ['approved', 'rejected', 'returned']; //
  }

  /**
   * Valid state transitions matrix
   * Cần rà soát kỹ để phù hợp với yêu cầu nghiệp vụ.
   * Ví dụ: Từ 'published' có thể cho phép 'review' lại (tạo phiên bản mới rồi review)
   */
  static get STATE_TRANSITIONS() {
    return {
      'draft': ['review', 'archived'], // Từ draft có thể gửi review hoặc tự archive
      'review': ['published', 'draft', 'archived'], // Từ review có thể publish, trả về draft, hoặc archive (nếu quy trình bị hủy)
      'published': ['archived', 'review'], // Từ published có thể archive, hoặc gửi review lại (tạo version mới)
      'archived': ['disposed', 'published'], // Từ archived có thể hủy bỏ, hoặc khôi phục lại (un-archive, chuyển về published hoặc review)
      'disposed': [] // Không có transition từ disposed
    };
  }

  /**
   * Get available transitions for a document based on current state and user permissions
   * @param {number} documentId
   * @param {number} userId
   * @param {Object} [context={}] - Request context (ipAddress, userAgent, sessionId)
   */
  static async getAvailableTransitions(documentId, userId, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
      const document = await dbManager.get(
        'SELECT id, document_code, title, status, author_id, reviewer_id, approver_id, department FROM documents WHERE id = ?',
        [documentId]
      );

      if (!document) {
        throw new Error('Document not found');
      }

      const user = await dbManager.get(
        'SELECT id, name, role, department FROM users WHERE id = ? AND is_active = 1',
        [userId]
      );

      if (!user) {
        throw new Error('User not found or inactive');
      }

      const currentStatus = document.status;
      const possibleNextStates = this.STATE_TRANSITIONS[currentStatus] || [];
      const availableTransitions = [];

      for (const targetState of possibleNextStates) {
        const canTransitionResult = await this.canUserTransitionTo(document, user, targetState);
        if (canTransitionResult.allowed) {
          availableTransitions.push({
            from: currentStatus,
            to: targetState,
            actionLabel: this.getTransitionActionLabel(currentStatus, targetState), // Action label for UI
            reason: canTransitionResult.reason,
            requiresComment: this.isCommentRequiredForTransition(currentStatus, targetState),
            requiresDecision: this.isDecisionRequiredForTransition(currentStatus, targetState)
          });
        }
      }
      
      // Log check available transitions
      await AuditService.log({
          action: 'PERMISSION_CHECKED', // Hoặc một action cụ thể 'WORKFLOW_TRANSITIONS_QUERIED'
          userId,
          resourceType: 'workflow',
          resourceId: documentId,
          details: { document_status: currentStatus, available_count: availableTransitions.length },
          ipAddress, userAgent, sessionId
      });

      return {
        success: true,
        data: {
          documentId,
          currentStatus,
          documentCode: document.document_code,
          documentTitle: document.title,
          availableTransitions,
          user: { id: userId, name: user.name, role: user.role }
        }
      };
    } catch (error) {
      logError(error, null, { operation: 'WorkflowService.getAvailableTransitions', documentId, userId });
      return { success: false, error: error.message, data: { availableTransitions: [] } };
    }
  }

  /**
   * Transition document status with full validation and audit trail
   * @param {number} documentId
   * @param {string} newStatus
   * @param {number} userId
   * @param {string} [comment=null]
   * @param {string} [decision=null] - 'approved', 'rejected', 'returned'
   * @param {Object} [context={}] - Request context (ipAddress, userAgent, sessionId)
   */
  static async transitionStatus(documentId, newStatus, userId, comment = null, decision = null, context = {}) {
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
      if (!this.WORKFLOW_STATES.includes(newStatus)) {
        throw new Error(`Invalid target workflow state: ${newStatus}`);
      }

      if (decision && !this.WORKFLOW_DECISIONS.includes(decision)) {
        throw new Error(`Invalid workflow decision: ${decision}`);
      }

      const document = await dbManager.get(
        'SELECT * FROM documents WHERE id = ?', // Lấy tất cả các trường để kiểm tra quyền
        [documentId]
      );
      if (!document) { throw new Error('Document not found'); }

      const user = await dbManager.get(
        'SELECT id, name, role, department FROM users WHERE id = ? AND is_active = 1',
        [userId]
      );
      if (!user) { throw new Error('User not found or inactive'); }

      const currentStatus = document.status;

      const canTransitionResult = await this.canUserTransitionTo(document, user, newStatus);
      if (!canTransitionResult.allowed) {
        await AuditService.log({
            action: 'PERMISSION_DENIED', userId, resourceType: 'workflow_transition', resourceId: documentId,
            details: { reason: canTransitionResult.reason, from: currentStatus, to: newStatus, decision },
            ipAddress, userAgent, sessionId
        });
        throw new Error(`Transition not allowed: ${canTransitionResult.reason}`);
      }

      if (this.isCommentRequiredForTransition(currentStatus, newStatus) && (!comment || comment.trim() === '')) {
        throw new Error('Comment is required for this transition.');
      }
      if (this.isDecisionRequiredForTransition(currentStatus, newStatus) && !decision) {
         throw new Error('Decision (approved/rejected/returned) is required for this transition.');
      }


      await dbManager.run('BEGIN TRANSACTION');
      try {
        const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
        const updateParams = [newStatus];

        if (newStatus === 'published') {
          updateFields.push('published_at = CURRENT_TIMESTAMP');
          // Gán approver_id nếu chưa có hoặc nếu người thực hiện là người có quyền approve
          if (!document.approver_id || user.id === document.approver_id || user.role === 'admin') {
            updateFields.push('approver_id = ?');
            updateParams.push(userId);
          }
        } else if (newStatus === 'archived') {
          updateFields.push('archived_at = CURRENT_TIMESTAMP');
        } else if (newStatus === 'disposed') {
          // Schema documents không có cột disposed_at, nếu cần thì phải thêm
          // updateFields.push('disposed_at = CURRENT_TIMESTAMP');
        }
        // Nếu trả về draft từ review, có thể xóa reviewer_id, approver_id
        if (currentStatus === 'review' && newStatus === 'draft') {
            // updateFields.push('reviewer_id = NULL', 'approver_id = NULL');
        }


        updateParams.push(documentId);
        await dbManager.run(`UPDATE documents SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);

        const transitionResult = await dbManager.run(
          `INSERT INTO workflow_transitions (
            document_id, from_status, to_status, comment, decision,
            transitioned_by, transitioned_at, ip_address, user_agent, session_id
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
          [documentId, currentStatus, newStatus, comment, decision, userId, ipAddress, userAgent, sessionId]
        );

        await AuditService.log({
          action: 'WORKFLOW_TRANSITION', userId, resourceType: 'document', resourceId: documentId,
          details: { fromStatus: currentStatus, toStatus: newStatus, comment, decision, transition_id: transitionResult.lastID },
          ipAddress, userAgent, sessionId
        });

        await this.handlePostTransitionActions(document, currentStatus, newStatus, userId, comment, context);

        await dbManager.run('COMMIT');

        appLogger.info('Document status transitioned successfully', { documentId, documentCode: document.document_code, fromStatus: currentStatus, toStatus: newStatus, userId });
        return { success: true, data: { documentId, fromStatus: currentStatus, toStatus: newStatus, transitionId: transitionResult.lastID } };

      } catch (error) {
        await dbManager.run('ROLLBACK');
        throw error; // Ném lại lỗi để được bắt ở khối catch bên ngoài
      }
    } catch (error) {
      logError(error, null, { operation: 'WorkflowService.transitionStatus', documentId, newStatus, userId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get workflow history for a document
   * @param {number} documentId
   * @param {Object} [context={}] - Request context
   */
  static async getWorkflowHistory(documentId, context = {}) {
    const { userId = null, ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
      const document = await dbManager.get(
        'SELECT id, document_code, title, status FROM documents WHERE id = ?',
        [documentId]
      );
      if (!document) { throw new Error('Document not found'); }

      // Kiểm tra quyền xem lịch sử workflow
      const canViewHistory = await PermissionService.checkPermission(userId, 'VIEW_DOCUMENT', 'document', documentId, context);
      if (!canViewHistory.allowed) {
          await AuditService.log({
            action: 'PERMISSION_DENIED', userId, resourceType: 'workflow_history', resourceId: documentId,
            details: { reason: 'User lacks permission to view workflow history for this document' },
            ipAddress, userAgent, sessionId
          });
          throw new Error('Permission denied to view workflow history.');
      }


      const history = await dbManager.all(
        `SELECT wt.*, u.name as transitioned_by_name, u.email as transitioned_by_email,
         u.department as transitioned_by_department
         FROM workflow_transitions wt
         LEFT JOIN users u ON wt.transitioned_by = u.id
         WHERE wt.document_id = ?
         ORDER BY wt.transitioned_at DESC`,
        [documentId]
      );
      
      await AuditService.log({
            action: 'PERMISSION_CHECKED', // Hoặc 'WORKFLOW_HISTORY_VIEWED'
            userId, resourceType: 'workflow_history', resourceId: documentId,
            details: { document_code: document.document_code, history_count: history.length },
            ipAddress, userAgent, sessionId
      });

      return { success: true, data: { documentId, document, history } };
    } catch (error) {
      logError(error, null, { operation: 'WorkflowService.getWorkflowHistory', documentId });
      return { success: false, error: error.message, data: { history: [] } };
    }
  }

  /**
   * Check if user can perform a specific workflow action on a document
   * @param {number} documentId
   * @param {number} userId
   * @param {string} workflowAction - e.g., 'SUBMIT', 'APPROVE', 'REJECT', 'PUBLISH', 'ARCHIVE'
   * @param {Object} [context={}] - Request context
   */
  static async canUserPerformWorkflowAction(documentId, userId, workflowAction, context = {}) {
    // Ánh xạ workflowAction sang targetState hoặc permission action
    // Ví dụ: 'APPROVE' có thể tương ứng với việc chuyển sang 'published'
    // và yêu cầu quyền 'APPROVE_DOCUMENT'
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
        const document = await dbManager.get('SELECT * FROM documents WHERE id = ?', [documentId]);
        if (!document) return { allowed: false, reason: 'Document not found' };

        const user = await dbManager.get('SELECT * FROM users WHERE id = ? AND is_active = 1', [userId]);
        if (!user) return { allowed: false, reason: 'User not found or inactive' };

        let targetState = null;
        let requiredPermissionAction = null;

        switch (workflowAction.toUpperCase()) {
            case 'SUBMIT_FOR_REVIEW':
                targetState = 'review';
                requiredPermissionAction = 'SUBMIT_FOR_REVIEW';
                break;
            case 'APPROVE': // Approve and move to published
                targetState = 'published';
                requiredPermissionAction = 'APPROVE_DOCUMENT'; // Hoặc APPROVE_WORKFLOW
                break;
            case 'REJECT': // Reject and move back to draft
                targetState = 'draft';
                requiredPermissionAction = 'APPROVE_DOCUMENT'; // Hoặc REJECT_WORKFLOW
                break;
            case 'RETURN_FOR_REVISION':
                targetState = 'draft';
                requiredPermissionAction = 'REVIEW_DOCUMENT'; // Người review có thể trả lại
                break;
            case 'PUBLISH': // Direct publish (có thể chỉ admin)
                targetState = 'published';
                requiredPermissionAction = 'PUBLISH_DOCUMENT';
                break;
            case 'ARCHIVE':
                targetState = 'archived';
                requiredPermissionAction = 'ARCHIVE_DOCUMENT';
                break;
            case 'DISPOSE':
                targetState = 'disposed';
                requiredPermissionAction = 'DISPOSE_DOCUMENT';
                break;
            default:
                return { allowed: false, reason: `Unknown workflow action: ${workflowAction}` };
        }

        if (!targetState) return { allowed: false, reason: 'Could not determine target state for action.' };

        const generalPermission = await PermissionService.checkPermission(userId, requiredPermissionAction, 'document', documentId, context);
        if (!generalPermission.allowed) {
            return generalPermission;
        }

        return this.canUserTransitionTo(document, user, targetState);

    } catch (error) {
        logError(error, null, { operation: 'canUserPerformWorkflowAction', documentId, userId, workflowAction });
        return { allowed: false, reason: error.message };
    }
  }


  /**
   * Get workflow statistics for reporting
   */
  static async getWorkflowStatistics(filters = {}, context = {}) {
    const { userId = null, ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
      const { dateFrom, dateTo, department, specificStatus } = filters; // Đổi tên 'status' thành 'specificStatus' để tránh nhầm lẫn
      let whereConditions = ['1=1'];
      let params = [];

      if (dateFrom) {
        whereConditions.push('d.created_at >= ?');
        params.push(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        whereConditions.push('d.created_at < ?');
        params.push(endDate.toISOString().split('T')[0]);
      }
      if (department) {
        whereConditions.push('d.department = ?');
        params.push(department);
      }
      if (specificStatus) {
        whereConditions.push('d.status = ?');
        params.push(specificStatus);
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      const statusStats = await dbManager.all(
        `SELECT d.status,
         COUNT(*) as count,
         COUNT(*) * 100.0 / (SELECT COUNT(*) FROM documents d ${whereClause.replace('d.status = ? AND', '1=1 AND').replace('AND d.status = ?', '')}) as percentage
         FROM documents d
         ${whereClause}
         GROUP BY d.status
         ORDER BY count DESC`,
        params
      );
      // Cần điều chỉnh lại params cho truy vấn con (SELECT COUNT(*)) nếu có specificStatus

      const processingTimes = await dbManager.all( // Tính thời gian từ created_at đến trạng thái cuối cùng (published hoặc archived)
        `SELECT d.status,
         AVG(
            CASE
                WHEN d.status = 'published' AND d.published_at IS NOT NULL THEN julianday(d.published_at) - julianday(d.created_at)
                WHEN d.status = 'archived' AND d.archived_at IS NOT NULL THEN julianday(d.archived_at) - julianday(d.created_at)
                ELSE NULL
            END
         ) as avg_processing_days
         FROM documents d
         ${whereClause}
         AND d.status IN ('published', 'archived')
         GROUP BY d.status`,
        params
      );

      const bottlenecks = await dbManager.all(
        `SELECT d.status,
         COUNT(*) as pending_count,
         AVG(julianday('now') - julianday(d.updated_at)) as avg_pending_days
         FROM documents d
         ${whereClause}
         AND d.status IN ('draft', 'review')
         GROUP BY d.status
         ORDER BY avg_pending_days DESC`,
        params
      );
      
      await AuditService.log({
            action: 'PERMISSION_CHECKED', // Hoặc 'WORKFLOW_STATS_VIEWED'
            userId, resourceType: 'workflow_statistics',
            details: { filters_applied: filters },
            ipAddress, userAgent, sessionId
      });


      return { success: true, data: { statusDistribution: statusStats, processingTimes, bottlenecks } };
    } catch (error) {
      logError(error, null, { operation: 'WorkflowService.getWorkflowStatistics', filters });
      return { success: false, error: error.message, data: {} };
    }
  }

  /**
   * Check if user can transition document to target state
   * @private
   */
  static async canUserTransitionTo(document, user, targetState) { //
    const currentStatus = document.status;
    const possibleTransitions = this.STATE_TRANSITIONS[currentStatus] || [];

    if (!possibleTransitions.includes(targetState)) {
      return { allowed: false, reason: `Invalid transition from ${currentStatus} to ${targetState}` };
    }

    if (user.role === 'admin') {
      return { allowed: true, reason: 'Admin privileges' };
    }

    // Logic kiểm tra quyền cụ thể cho từng transition
    switch (`${currentStatus}->${targetState}`) {
      case 'draft->review':
        return (document.author_id === user.id || document.department === user.department)
          ? { allowed: true, reason: 'Author or same department can submit draft for review' }
          : { allowed: false, reason: 'Only author or same department can submit draft for review' };
      case 'review->published':
        return (user.id === document.approver_id || (user.id === document.reviewer_id && !document.approver_id) ) // Reviewer có thể approve nếu không có approver cụ thể
          ? { allowed: true, reason: 'Designated approver/reviewer can publish' }
          : { allowed: false, reason: 'Only designated approver/reviewer can publish' };
      case 'review->draft': // Người review hoặc tác giả có thể trả về draft
        return (user.id === document.reviewer_id || user.id === document.author_id)
          ? { allowed: true, reason: 'Reviewer or author can return to draft' }
          : { allowed: false, reason: 'Only reviewer or author can return to draft' };
      case 'published->archived': // Tác giả hoặc người quản lý phòng ban của tài liệu có thể archive
        return (document.author_id === user.id || (user.department === document.department /* && user is manager of dept - Cần thêm logic kiểm tra vai trò manager phòng ban */))
          ? { allowed: true, reason: 'Author or department manager can archive published document' }
          : { allowed: false, reason: 'Only author or department manager can archive published document' };
      case 'published->review': // Gửi review lại (thường là sau khi tạo version mới)
         return (document.author_id === user.id || document.department === user.department)
          ? { allowed: true, reason: 'Author or same department can resubmit published document for review (new version implied)' }
          : { allowed: false, reason: 'Only author or same department can resubmit published document for review' };
      case 'archived->disposed': // Chỉ admin mới được dispose hoàn toàn
        // Quyền admin đã được check ở trên
        return { allowed: false, reason: 'Admin role checked earlier, this path implies non-admin trying to dispose.' };
      case 'archived->published': // Khôi phục từ archive
        return (document.author_id === user.id || (user.department === document.department)) // Logic tương tự archive
          ? { allowed: true, reason: 'Author or department manager can un-archive document' }
          : { allowed: false, reason: 'Only author or department manager can un-archive document' };
      case 'draft->archived': // Tác giả tự archive bản nháp
      case 'review->archived': // Người review/tác giả archive khi quy trình bị hủy
        return (document.author_id === user.id || user.id === document.reviewer_id)
          ? { allowed: true, reason: 'Author or reviewer can archive from draft/review' }
          : { allowed: false, reason: 'Only author or reviewer can archive from draft/review' };

      default:
        // Kiểm tra quyền chung cho các action không cụ thể ở trên
        const genericPermissionAction = `TRANSITION_${currentStatus.toUpperCase()}_TO_${targetState.toUpperCase()}`;
        const genericPermCheck = await PermissionService.checkPermission(user.id, genericPermissionAction, 'workflow', document.id);
        return genericPermCheck;
    }
  }

  /**
   * Get transition action label for UI
   * @private
   */
  static getTransitionActionLabel(fromStatus, toStatus) { //
    const actionMap = {
      'draft->review': 'Gửi Xem Xét',
      'review->published': 'Phê Duyệt & Phát Hành',
      'review->draft': 'Trả Lại (Yêu cầu sửa)',
      'published->archived': 'Lưu Trữ Tài Liệu',
      'published->review': 'Yêu Cầu Xem Xét Lại',
      'archived->disposed': 'Hủy Bỏ Tài Liệu',
      'archived->published': 'Khôi Phục (Phát Hành Lại)',
      'draft->archived': 'Lưu Trữ Bản Nháp',
      'review->archived': 'Hủy & Lưu Trữ (Đang Xem Xét)'
    };
    return actionMap[`${fromStatus}->${toStatus}`] || `Chuyển sang ${toStatus}`;
  }

  /**
   * Check if comment is required for transition
   * @private
   */
  static isCommentRequiredForTransition(fromStatus, toStatus) { //
    const requireCommentTransitions = [
      'review->draft',        // Trả lại cần lý do
      'review->published',    // Phê duyệt có thể kèm ghi chú
      'published->review',    // Yêu cầu xem xét lại cần lý do
      'archived->disposed',   // Hủy bỏ cần lý do
      'review->archived'      // Hủy quy trình đang review cần lý do
    ];
    return requireCommentTransitions.includes(`${fromStatus}->${toStatus}`);
  }

   /**
   * Check if a decision ('approved', 'rejected', 'returned') is required for a transition.
   * @private
   */
  static isDecisionRequiredForTransition(fromStatus, toStatus) {
    // Ví dụ: khi chuyển từ 'review' sang 'published' thì decision là 'approved'
    // Khi chuyển từ 'review' sang 'draft' thì decision là 'rejected' hoặc 'returned'
    const decisionTransitions = {
        'review->published': ['approved'],
        'review->draft': ['rejected', 'returned']
    };
    return decisionTransitions[`${fromStatus}->${toStatus}`] !== undefined;
  }


  /**
   * Handle post-transition actions (notifications, etc.)
   * @param {Object} document - The document object *before* status update in DB (để biết reviewer_id, approver_id cũ nếu cần)
   * @param {string} fromStatus
   * @param {string} toStatus
   * @param {number} userId - User who performed the transition
   * @param {string} [comment=null]
   * @param {Object} [context={}] - Request context
   * @private
   */
  static async handlePostTransitionActions(document, fromStatus, toStatus, userId, comment, context = {}) { //
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
      appLogger.info(`Handling post-transition for doc ${document.id}: ${fromStatus} -> ${toStatus}`, { userId });

      // Ví dụ: Gửi thông báo
      if (toStatus === 'review' && document.reviewer_id) {
        appLogger.info(`TODO: Notify reviewer (User ID: ${document.reviewer_id}) for document ${document.id}`, { submittedBy: userId });
        // Gọi NotificationService.send(...)
      } else if (toStatus === 'published') {
        appLogger.info(`TODO: Notify relevant stakeholders about publication of document ${document.id}`, { publishedBy: userId });
        // Cập nhật next_review_date nếu cần
        if (document.review_cycle) {
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + document.review_cycle);
            await dbManager.run('UPDATE documents SET next_review_date = ? WHERE id = ?', [nextReview.toISOString().split('T')[0], document.id]);
        }
      } else if (toStatus === 'archived' && document.retention_period) {
         // Cập nhật disposal_date dựa trên retention_period từ ngày archived_at
         const disposalDate = new Date(); // Lấy ngày hiện tại (ngày archive)
         disposalDate.setDate(disposalDate.getDate() + document.retention_period);
         await dbManager.run('UPDATE documents SET disposal_date = ? WHERE id = ?', [disposalDate.toISOString().split('T')[0], document.id]);
      }

      // Có thể có các hành động khác: cập nhật search index, trigger các hệ thống khác...

    } catch (error) {
      logError(error, null, { operation: 'WorkflowService.handlePostTransitionActions', documentId: document.id, fromStatus, toStatus });
      // Không re-throw để không làm hỏng transaction chính
    }
  }

  // Các phương thức getMyDocuments, getRecentWorkflowActivity, getDepartmentWorkflowStats đã được chuyển vào getWorkflowDashboard
  // hoặc có thể được gọi riêng nếu cần thiết cho các API endpoints khác.

  /**
   * Get pending approvals for a user (documents in 'review' status they can act on)
   * @param {number} userId
   * @param {Object} [context={}] - Request context
   */
  static async getPendingApprovals(userId, context = {}) { //
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
      const user = await dbManager.get('SELECT id, name, role, department FROM users WHERE id = ? AND is_active = 1', [userId]);
      if (!user) { throw new Error('User not found or inactive'); }

      // Lấy các tài liệu đang ở trạng thái 'review' mà user này là reviewer, approver, hoặc admin
      // Hoặc nếu user thuộc phòng ban của tài liệu và có quyền review (cần logic PermissionService phức tạp hơn ở đây nếu muốn chính xác)
      // Tạm thời: reviewer_id, approver_id hoặc admin
      let query = `
        SELECT d.id, d.document_code, d.title, d.version, d.status, d.department,
               u_author.name as author_name, d.updated_at as last_action_date
        FROM documents d
        JOIN users u_author ON d.author_id = u_author.id
        WHERE d.status = 'review' AND (
            d.reviewer_id = ? OR
            d.approver_id = ? OR
            ? = 'admin'
        )
        ORDER BY d.updated_at ASC
      `;
      const params = [userId, userId, user.role];

      const pendingDocs = await dbManager.all(query, params);
      
      await AuditService.log({
            action: 'PERMISSION_CHECKED', // Hoặc 'PENDING_APPROVALS_VIEWED'
            userId, resourceType: 'workflow_tasks',
            details: { pending_count: pendingDocs.length },
            ipAddress, userAgent, sessionId
      });

      return { success: true, data: { pendingApprovals: pendingDocs, count: pendingDocs.length } };
    } catch (error) {
      logError(error, null, { operation: 'WorkflowService.getPendingApprovals', userId });
      return { success: false, error: error.message, data: { pendingApprovals: [], count: 0 } };
    }
  }

  /**
   * Get workflow dashboard data for a user
   * @param {number} userId
   * @param {Object} [context={}] - Request context
   */
  static async getWorkflowDashboard(userId, context = {}) { //
    const { ipAddress = null, userAgent = null, sessionId = null } = context;
    try {
      const user = await dbManager.get('SELECT id, name, role, department FROM users WHERE id = ? AND is_active = 1', [userId]);
      if (!user) { throw new Error('User not found or inactive'); }

      const pendingApprovalsResult = await this.getPendingApprovals(userId, context);

      const myDocumentsInWorkflow = await dbManager.all(`
        SELECT d.id, d.document_code, d.title, d.version, d.status, d.updated_at
        FROM documents d
        WHERE d.author_id = ? AND d.status IN ('draft', 'review')
        ORDER BY d.updated_at DESC
        LIMIT 10
      `, [userId]);

      const recentUserTransitions = await dbManager.all(`
        SELECT wt.id, wt.document_id, d.document_code, d.title, wt.from_status, wt.to_status, wt.comment, wt.decision, wt.transitioned_at
        FROM workflow_transitions wt
        JOIN documents d ON wt.document_id = d.id
        WHERE wt.transitioned_by = ?
        ORDER BY wt.transitioned_at DESC
        LIMIT 10
      `, [userId]);
      
      await AuditService.log({
            action: 'PERMISSION_CHECKED', // Hoặc 'WORKFLOW_DASHBOARD_VIEWED'
            userId, resourceType: 'workflow_dashboard',
            details: { user_department: user.department },
            ipAddress, userAgent, sessionId
      });


      return {
        success: true,
        data: {
          user: { id: user.id, name: user.name, role: user.role, department: user.department },
          pendingApprovals: pendingApprovalsResult.success ? pendingApprovalsResult.data.pendingApprovals : [],
          myDocumentsInWorkflow,
          recentUserTransitions
          // departmentStats có thể được thêm ở đây nếu cần
        }
      };
    } catch (error) {
      logError(error, null, { operation: 'WorkflowService.getWorkflowDashboard', userId });
      return { success: false, error: error.message, data: {} };
    }
  }
}

module.exports = WorkflowService;
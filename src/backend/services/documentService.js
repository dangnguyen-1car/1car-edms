// src/backend/services/documentService.js
/**
=================================================================
EDMS 1CAR - Document Service (Refactored & Fixed)
=================================================================
*/

const Document = require('../models/Document');
const User = require('../models/User');
const { logDocumentOperation, logError } = require('../utils/logger');
const { createError } = require('../middleware/errorHandler');
const { dbManager } = require('../config/database'); // Import dbManager

class DocumentService {
  constructor(permissionService, workflowService, auditService) {
    this.permissionService = permissionService;
    this.workflowService = workflowService;
    this.auditService = auditService;
  }

  // ... (Các hàm khác như createDocument, getDocument, etc. giữ nguyên)

  /**
   * Get documents pending approval for a specific user.
   * Lấy tài liệu đang chờ phê duyệt cho người dùng cụ thể.
   * @param {Object} user - The user object from the request.
   * @param {number} limit - The maximum number of documents to return.
   * @returns {Promise<Object>} - A list of documents pending approval.
   */
  async getPendingApprovalsForUser(user, limit = 10) {
    try {
      if (!user || !user.role) {
        throw createError('Thông tin người dùng không hợp lệ', 400, 'INVALID_USER_OBJECT');
      }

      let query = `
        SELECT
          d.id,
          d.document_code,
          d.title,
          d.type,
          d.department,
          d.version,
          u.name as author_name,
          d.updated_at
        FROM documents d
        JOIN users u ON d.author_id = u.id
        WHERE d.status = 'review'
      `;
      const params = [];

      // If the user is a manager, only show documents from their department.
      // Admin can see all. User role should not see this widget by default.
      if (user.role === 'manager') {
        query += ` AND d.department = ?`;
        params.push(user.department);
      } else if (user.role !== 'admin') {
        // Regular users should not have access to this, return empty.
        // Or apply more specific logic if a user can be a designated reviewer.
        // For now, we return an empty array for 'user' role.
        return { success: true, data: [] };
      }

      query += ` ORDER BY d.updated_at DESC LIMIT ?`;
      params.push(limit);
      
      const documents = await dbManager.all(query, params);

      return {
        success: true,
        data: documents
      };

    } catch (error) {
      logError(error, null, {
        operation: 'DocumentService.getPendingApprovalsForUser',
        userId: user ? user.id : null
      });
      // Re-throw the error to be caught by the global error handler
      throw error;
    }
  }


  // ... (Các hàm còn lại của DocumentService)


  /**
   * Get document statistics
   * @param {Object} user - Current user
   * @returns {Promise} - Document statistics
   */
  async getDocumentStatistics(user) {
    try {
      const stats = await Document.getStatistics(); // This function needs to be defined in Document model

      // Add user-specific statistics
      if (user.role !== 'admin') {
        // This part needs a correct implementation based on what Document.getStatistics() returns.
        // Assuming it returns an object with a 'byDepartment' array.
        // stats.userDepartmentStats = stats.byDepartment.find(dept => dept.id === user.department);
      }

      return {
        success: true,
        statistics: stats
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.getDocumentStatistics', userId: user.id });
      throw error;
    }
  }

  // ... (Phần còn lại của file giữ nguyên)
  
  /**
   * Delete document (soft delete by archiving)
   * Ủy thác cho WorkflowService để chuyển sang archived
   * @param {number} documentId - Document ID
   * @param {Object} user - Current user
   * @param {Object} context - Request context
   * @returns {Promise} - Delete result
   */
  async deleteDocument(documentId, user, context = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Ủy thác cho WorkflowService để chuyển sang archived
      const transitionResult = await this.workflowService.transitionStatus(documentId, 'archived', user.id);

      if (!transitionResult.success) {
        throw createError(transitionResult.error, 403, 'DELETE_PERMISSION_DENIED');
      }

      return {
        success: true,
        message: 'Tài liệu đã được xóa thành công'
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.deleteDocument', documentId, userId: user.id });
      throw error;
    }
  }
}

module.exports = DocumentService;

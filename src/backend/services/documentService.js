// src/backend/services/documentService.js
/**

=================================================================

EDMS 1CAR - Document Service (Refactored)

Business logic for document management with service-oriented architecture

Based on C-PR-VM-001, C-TD-VM-001, C-PR-AR-001 requirements

=================================================================
*/

const Document = require('../models/Document');
const User = require('../models/User');
const { logDocumentOperation, logError } = require('../utils/logger');
const { generateDocumentCode } = require('../utils/db');
const { createError } = require('../middleware/errorHandler');
const path = require('path');
const fs = require('fs-extra');

class DocumentService {
  /**
   * Constructor với Dependency Injection
   * @param {Object} permissionService - Instance của PermissionService
   * @param {Object} workflowService - Instance của WorkflowService
   * @param {Object} auditService - Instance của AuditService
   */
  constructor(permissionService, workflowService, auditService) {
    this.permissionService = permissionService;
    this.workflowService = workflowService;
    this.auditService = auditService;
  }

  /**
   * Create new document
   * @param {Object} documentData - Document data
   * @param {number} authorId - Author user ID
   * @param {Object} context - Request context
   * @returns {Promise} - Created document
   */
  async createDocument(documentData, authorId, context = {}) {
    try {
      // Validate author exists
      const author = await User.findById(authorId);
      if (!author) {
        throw createError('Người tạo tài liệu không tồn tại', 404, 'USER_NOT_FOUND');
      }

      // Validate document data
      const { title, type, department, description } = documentData;
      if (!title || !type || !department) {
        throw createError('Thiếu thông tin bắt buộc: tiêu đề, loại tài liệu, phòng ban', 400, 'MISSING_REQUIRED_FIELDS');
      }

      // Create document
      const document = await Document.create(documentData, author);

      // Log document creation through AuditService
      await this.auditService.log({
        action: 'DOCUMENT_CREATED',
        userId: authorId,
        resourceType: 'document',
        resourceId: document.id,
        details: {
          documentCode: document.document_code,
          title: document.title,
          type: document.type,
          department: document.department
        }
      });

      logDocumentOperation('CREATED', document, author, context);

      return {
        success: true,
        message: 'Tài liệu đã được tạo thành công',
        document: document.toJSON()
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.createDocument', authorId });
      throw error;
    }
  }

  /**
   * Get document by ID
   * @param {number} documentId - Document ID
   * @param {Object} user - Current user
   * @param {Object} context - Request context
   * @returns {Promise} - Document data
   */
  async getDocument(documentId, user, context = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Log document view through AuditService
      await this.auditService.log({
        action: 'DOCUMENT_VIEWED',
        userId: user.id,
        resourceType: 'document',
        resourceId: documentId,
        details: {
          documentCode: document.document_code,
          title: document.title
        },
        ipAddress: context.ip
      });

      return {
        success: true,
        document: document.toJSON()
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.getDocument', documentId, userId: user.id });
      throw error;
    }
  }

  /**
   * Search documents with filters
   * @param {Object} filters - Search filters
   * @param {Object} user - Current user
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} context - Request context
   * @returns {Promise} - Search results
   */
  async searchDocuments(filters, user, page = 1, limit = 20, context = {}) {
    try {
      // Apply user-specific filters based on permissions
      const userFilters = { ...filters };
      // Non-admin users can only see documents they have access to
      if (user.role !== 'admin') {
        userFilters.department = user.department;
      }

      const results = await Document.search(userFilters, page, limit);

      // Filter results based on user access (additional security layer)
      const accessibleDocuments = results.data.filter(doc => doc.canUserAccess(user));

      // Log search activity through AuditService
      await this.auditService.log({
        action: 'DOCUMENTS_SEARCHED',
        userId: user.id,
        resourceType: 'document',
        details: {
          filters: userFilters,
          resultsCount: accessibleDocuments.length,
          page: page,
          limit: limit
        }
      });

      return {
        success: true,
        data: accessibleDocuments,
        pagination: {
          ...results.pagination,
          total: accessibleDocuments.length
        }
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.searchDocuments', userId: user.id });
      throw error;
    }
  }

  /**
   * Update document
   * @param {number} documentId - Document ID
   * @param {Object} updateData - Update data
   * @param {Object} user - Current user
   * @param {Object} context - Request context
   * @returns {Promise} - Updated document
   */
  async updateDocument(documentId, updateData, user, context = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Prevent updating published documents without version change
      if (document.status === 'published' && !updateData.createNewVersion) {
        throw createError('Không thể chỉnh sửa tài liệu đã được phê duyệt. Vui lòng tạo phiên bản mới.', 400, 'PUBLISHED_DOCUMENT');
      }

      // Store original data for audit
      const originalData = {
        title: document.title,
        description: document.description
      };

      // Update document
      const updatedDocument = await document.update(updateData, user);

      // Log document update through AuditService
      await this.auditService.log({
        action: 'DOCUMENT_UPDATED',
        userId: user.id,
        resourceType: 'document',
        resourceId: documentId,
        details: {
          documentCode: document.document_code,
          originalData: originalData,
          updateData: updateData
        }
      });

      logDocumentOperation('UPDATED', updatedDocument, user, context);

      return {
        success: true,
        message: 'Tài liệu đã được cập nhật thành công',
        document: updatedDocument.toJSON()
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.updateDocument', documentId, userId: user.id });
      throw error;
    }
  }

  /**
   * Update document status (workflow transition)
   * Ủy thác hoàn toàn cho WorkflowService
   * @param {number} documentId - Document ID
   * @param {string} newStatus - New status
   * @param {string} comment - Transition comment
   * @param {Object} user - Current user
   * @param {Object} context - Request context
   * @returns {Promise} - Updated document
   */
  async updateDocumentStatus(documentId, newStatus, comment, user, context = {}) {
    try {
      // Ủy thác hoàn toàn cho WorkflowService
      const transitionResult = await this.workflowService.transitionStatus(documentId, newStatus, user.id, comment);

      if (!transitionResult.success) {
        throw createError(transitionResult.error, 400, 'WORKFLOW_TRANSITION_FAILED');
      }

      // Lấy lại document đã cập nhật nếu cần
      const updatedDocument = await Document.findById(documentId);

      return {
        success: true,
        message: 'Trạng thái tài liệu đã được thay đổi thành công',
        document: updatedDocument.toJSON()
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.updateDocumentStatus', documentId, userId: user.id });
      throw error;
    }
  }

  /**
   * Create new version of document
   * @param {number} documentId - Document ID
   * @param {string} newVersion - New version number
   * @param {string} changeReason - Reason for version change
   * @param {string} changeSummary - Summary of changes
   * @param {Object} user - Current user
   * @param {Object} context - Request context
   * @returns {Promise} - Updated document
   */
  async createDocumentVersion(documentId, newVersion, changeReason, changeSummary, user, context = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
      }

      const oldVersion = document.version;

      // Create new version
      const updatedDocument = await document.createNewVersion(newVersion, changeReason, changeSummary, user);

      // Log version creation through AuditService
      await this.auditService.log({
        action: 'DOCUMENT_VERSION_CREATED',
        userId: user.id,
        resourceType: 'document',
        resourceId: documentId,
        details: {
          documentCode: document.document_code,
          oldVersion: oldVersion,
          newVersion: newVersion,
          changeReason: changeReason,
          changeSummary: changeSummary
        }
      });

      return {
        success: true,
        message: `Phiên bản ${newVersion} đã được tạo thành công`,
        document: updatedDocument.toJSON()
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.createDocumentVersion', documentId, userId: user.id });
      throw error;
    }
  }

  /**
   * Attach file to document
   * @param {number} documentId - Document ID
   * @param {Object} fileInfo - File information
   * @param {Object} user - Current user
   * @param {Object} context - Request context
   * @returns {Promise} - Updated document
   */
  async attachFile(documentId, fileInfo, user, context = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileInfo.size > maxSize) {
        throw createError('Kích thước tệp vượt quá giới hạn 10MB', 400, 'FILE_SIZE_EXCEEDED');
      }

      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(fileInfo.mimetype)) {
        throw createError('Chỉ chấp nhận tệp PDF, DOC, DOCX', 400, 'INVALID_FILE_TYPE');
      }

      // Attach file to document
      const updatedDocument = await document.attachFile(fileInfo, user);

      // Log file attachment through AuditService
      await this.auditService.log({
        action: 'DOCUMENT_FILE_ATTACHED',
        userId: user.id,
        resourceType: 'document',
        resourceId: documentId,
        details: {
          documentCode: document.document_code,
          fileName: fileInfo.filename,
          fileSize: fileInfo.size,
          mimeType: fileInfo.mimetype
        }
      });

      return {
        success: true,
        message: 'Tệp đã được đính kèm thành công',
        document: updatedDocument.toJSON()
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.attachFile', documentId, userId: user.id });
      throw error;
    }
  }

  /**
   * Get document version history
   * @param {number} documentId - Document ID
   * @param {Object} user - Current user
   * @param {Object} context - Request context
   * @returns {Promise} - Version history
   */
  async getVersionHistory(documentId, user, context = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
      }

      const versionHistory = await document.getVersionHistory();

      // Log version history access through AuditService
      await this.auditService.log({
        action: 'VERSION_HISTORY_VIEWED',
        userId: user.id,
        resourceType: 'document',
        resourceId: documentId,
        details: {
          documentCode: document.document_code,
          versionsCount: versionHistory.length
        },
        ipAddress: context.ip
      });

      return {
        success: true,
        versionHistory: versionHistory
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.getVersionHistory', documentId, userId: user.id });
      throw error;
    }
  }

  /**
   * Get document workflow history
   * Ủy thác cho WorkflowService
   * @param {number} documentId - Document ID
   * @param {Object} user - Current user
   * @param {Object} context - Request context
   * @returns {Promise} - Workflow history
   */
  async getWorkflowHistory(documentId, user, context = {}) {
    try {
      // Ủy thác cho WorkflowService
      const workflowResult = await this.workflowService.getWorkflowHistory(documentId, { user });

      if (!workflowResult.success) {
        throw createError(workflowResult.error, 403, 'WORKFLOW_HISTORY_ACCESS_DENIED');
      }

      return {
        success: true,
        workflowHistory: workflowResult.data.history
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.getWorkflowHistory', documentId, userId: user.id });
      throw error;
    }
  }

  /**
   * Get documents due for review
   * @param {Object} user - Current user
   * @param {number} daysBefore - Days before review date
   * @returns {Promise} - Documents due for review
   */
  async getDocumentsDueForReview(user, daysBefore = 30) {
    try {
      let documents = await Document.getDueForReview(daysBefore);

      // Filter by user permissions
      if (user.role !== 'admin') {
        documents = documents.filter(doc => doc.canUserAccess(user));
      }

      return {
        success: true,
        documents: documents.map(doc => doc.toJSON()),
        count: documents.length
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.getDocumentsDueForReview', userId: user.id });
      throw error;
    }
  }

  /**
   * Get document statistics
   * @param {Object} user - Current user
   * @returns {Promise} - Document statistics
   */
  async getDocumentStatistics(user) {
    try {
      const stats = await Document.getStatistics();

      // Add user-specific statistics
      if (user.role !== 'admin') {
        // Filter statistics by user's department
        stats.userDepartmentStats = stats.byDepartment.find(dept => dept.id === user.department);
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
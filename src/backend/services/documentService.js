// src/backend/services/documentService.js
/**
 * =================================================================
 * EDMS 1CAR - Document Service (Phiên bản cuối cùng, đã sửa tất cả lỗi)
 * Bổ sung đầy đủ các hàm getVersionHistory và getWorkflowHistory.
 * =================================================================
 */

// Import các module cần thiết của Node.js và của dự án
const fs = require('fs').promises;
const path = require('path');
const Document = require('../models/Document');
const User = require('../models/User'); // Not directly used in the provided snippet but usually part of DocumentService
const { logError } = require('../utils/logger');
const { createError } = require('../middleware/errorHandler');
const { dbManager } = require('../config/database');

class DocumentService {
  constructor(permissionService, workflowService, auditService) {
    this.permissionService = permissionService;
    this.workflowService = workflowService;
    this.auditService = auditService;
  }

  /**
   * Lấy chi tiết một tài liệu theo ID, có kiểm tra quyền truy cập.
   */
  async getDocument(documentId, user, context = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
      }

      const permissionResult = await this.permissionService.checkPermission(
        user.id, 'VIEW_DOCUMENT', 'document', document.id, context
      );
      
      if (!permissionResult.allowed) {
        await this.auditService.log({
            action: 'PERMISSION_DENIED',
            userId: user.id,
            resourceType: 'document',
            resourceId: documentId,
            details: { reason: permissionResult.reason, documentCode: document.document_code },
            ipAddress: context.ip,
            userAgent: context.userAgent,
            sessionId: context.sessionId
        });
        throw createError('Bạn không có quyền xem tài liệu này.', 403, 'PERMISSION_DENIED');
      }

      await this.auditService.log({
        action: 'DOCUMENT_VIEWED',
        userId: user.id,
        resourceType: 'document',
        resourceId: documentId,
        details: { documentCode: document.document_code, title: document.title },
        ipAddress: context.ip,
        userAgent: context.userAgent,
        sessionId: context.sessionId
      });

      return { success: true, data: document.toJSON() };
    } catch (error) {
      logError(error, null, {
        operation: 'DocumentService.getDocument',
        documentId: documentId,
        userId: user ? user.id : null,
      });
      throw error;
    }
  }

  /**
   * Xử lý yêu cầu tải xuống một file tài liệu.
   */
  async downloadDocument(documentId, user, context = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw createError('Tài liệu không tồn tại.', 404, 'DOCUMENT_NOT_FOUND');
      }
      const permissionResult = await this.permissionService.checkPermission(
        user.id, 'VIEW_DOCUMENT', 'document', documentId, context
      );
      if (!permissionResult.allowed) {
        throw createError('Bạn không có quyền tải xuống tài liệu này.', 403, 'PERMISSION_DENIED');
      }
      if (!document.file_path || !document.file_name) {
        throw createError('Tài liệu này không có file đính kèm.', 404, 'FILE_NOT_ATTACHED');
      }
      
      // FIX START: Correctly construct the absolute path to the uploads directory
      // __dirname is src/backend/services
      // We need to go up two directories to src/backend/ and then into uploads
      const projectRoot = path.join(__dirname, '..', '..'); // This leads to 'src/backend'
      const uploadsBaseDir = path.join(projectRoot, 'uploads'); // This leads to 'src/backend/uploads'
      
      // Ensure document.file_path is relative to the uploadsBaseDir or adjust accordingly.
      // Assuming document.file_path stores paths like 'documents/user_dept/year-month/filename.pdf'
      // or simply 'documents/filename.pdf' from the base of the `uploads` directory.
      // If it stores the full path from the project root (e.g., '/uploads/documents/...') then this line might be simpler:
      const filePath = path.join(uploadsBaseDir, document.file_path);
      // If document.file_path already includes '/uploads', then it would be:
      // const filePath = path.join(projectRoot, document.file_path); // This would be the correct line if document.file_path is already like /uploads/...
      // Based on .gitignore, `uploads/documents/*` is stored. So `document.file_path` might be `/uploads/default/C-PL-MG-001_Chinh_sach_chat_luong_v1.0.pdf`
      // or similar. Let's assume it starts from the 'uploads' folder for robustness.
      // So, if document.file_path starts with `/uploads`, we need to strip it or ensure correct joining.
      // The snippet in documentService.js uses `projectRoot` which is good, but `document.file_path`
      // comes from the database and needs to be handled.
      // From the `documents.sql` seed file, `file_path` is `/uploads/default/...`.
      // So, we need to go `projectRoot` (`src/backend`), then up one `..` to project root, then `uploads`
      // The variable `projectRoot` defined as `path.join(__dirname, '..', '..', '..')` in the original
      // snippet (before this response) would go too far up.
      // Let's ensure it's `D:\Project\1CAR-EDMS\uploads` for the `file_path`.
      
      // Corrected `filePath` calculation:
      // Current file: `src/backend/services/documentService.js`
      // Target: `D:\Project\1CAR-EDMS\uploads\...`
      // Relative path: `../../uploads/` from `src/backend/services/`
      const absoluteUploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
      const actualFilePath = path.join(absoluteUploadsDir, document.file_path.replace(/^\/uploads\//, '')); 
      // The `.replace(/^\/uploads\//, '')` ensures that if document.file_path
      // starts with `/uploads/`, we remove it to prevent double joining.
      
      // Let's use `actualFilePath` for the file access.
      const filePathToServe = actualFilePath;
      // FIX END
      
      try {
        await fs.access(filePathToServe);
      } catch (fileAccessError) {
        logError(new Error(`File not found at path: ${filePathToServe}`), null, {
          operation: 'downloadDocument',
          documentId: documentId,
        });
        throw createError('File đính kèm không tìm thấy trên máy chủ.', 404, 'FILE_NOT_FOUND_ON_DISK');
      }
      
      const fileContent = await fs.readFile(filePathToServe);
      const fileStats = await fs.stat(filePathToServe);
      
      return {
        fileContent,
        fileName: document.file_name,
        mimeType: document.mime_type || 'application/octet-stream',
        fileSize: fileStats.size
      };
    } catch (error) {
      logError(error, null, {
        operation: 'DocumentService.downloadDocument',
        documentId,
        userId: user.id
      });
      throw error;
    }
  }

  // ===== BỔ SUNG HÀM BỊ THIẾU GÂY LỖI 500 CHO /versions =====
  async getVersionHistory(documentId, user, context = {}) {
    try {
      const permissionResult = await this.permissionService.checkPermission(
        user.id, 'VIEW_VERSION_HISTORY', 'document', documentId, context
      );
      if (!permissionResult.allowed) {
        throw createError('Bạn không có quyền xem lịch sử phiên bản.', 403, 'PERMISSION_DENIED');
      }
      const versions = await dbManager.all(
        `SELECT dv.*, u.name as created_by_name
         FROM document_versions dv
         LEFT JOIN users u ON dv.created_by = u.id
         WHERE dv.document_id = ?
         ORDER BY dv.created_at DESC`,
        [documentId]
      );
      return { success: true, data: { versions: versions } };
    } catch (error) {
      logError(error, null, { operation: 'getVersionHistory', documentId });
      throw error;
    }
  }

  // ===== BỔ SUNG HÀM BỊ THIẾU GÂY LỖI 500 CHO /workflow =====
  async getWorkflowHistory(documentId, user, context = {}) {
    try {
        const permissionResult = await this.permissionService.checkPermission(
          user.id, 'VIEW_DOCUMENT', 'document', documentId, context
        );
        if (!permissionResult.allowed) {
          throw createError('Bạn không có quyền xem lịch sử workflow.', 403, 'PERMISSION_DENIED');
        }
        const history = await dbManager.all(
          `SELECT wt.*, u.name as transitioned_by_name
           FROM workflow_transitions wt
           LEFT JOIN users u ON wt.transitioned_by = u.id
           WHERE wt.document_id = ?
           ORDER BY wt.transitioned_at DESC`,
          [documentId]
        );
        return { success: true, data: { workflowHistory: { history } } };
    } catch (error) {
        logError(error, null, { operation: 'getWorkflowHistory', documentId });
        throw error;
    }
  }

  async suggestDocumentCode(type, department, user, context = {}) {
    // ... Giữ nguyên logic hàm này
    try {
      if (!type || !department) {
        throw createError('Loại tài liệu và phòng ban là bắt buộc', 400, 'MISSING_REQUIRED_FIELDS');
      }
      const validTypes = ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC'];
      if (!validTypes.includes(type)) {
        throw createError('Loại tài liệu không hợp lệ', 400, 'INVALID_DOCUMENT_TYPE');
      }
      const deptWords = department.split(' ');
      let deptCode = '';
      if (deptWords.length > 1 && deptWords[0].length > 1 && deptWords[1].length > 0) {
        deptCode = (deptWords[0][0] + deptWords[1][0]).toUpperCase();
      } else {
        deptCode = deptWords[0].substring(0, Math.min(deptWords[0].length, 3)).toUpperCase();
      }
      let sequenceNumber = 1;
      let suggestedCode = '';
      let isAvailable = false;
      let attempts = 0;
      const maxAttempts = 999;
      while (!isAvailable && attempts < maxAttempts) {
        const paddedSequence = sequenceNumber.toString().padStart(3, '0');
        suggestedCode = `C-${type}-${deptCode}-${paddedSequence}`;
        const existing = await dbManager.get('SELECT id FROM documents WHERE document_code = ?', [suggestedCode]);
        if (!existing) isAvailable = true;
        else { sequenceNumber++; attempts++; }
      }
      if (!isAvailable) {
        throw createError('Không thể tạo mã tài liệu duy nhất', 500, 'CODE_GENERATION_FAILED');
      }
      return {
        success: true,
        data: { suggestedCode, type, department, deptCode, sequenceNumber, attempts: attempts + 1 }
      };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.suggestDocumentCode', type, department, userId: user ? user.id : null });
      throw error;
    }
  }

  async getPendingApprovalsForUser(user, limit = 10) {
    // ... Giữ nguyên logic hàm này
    try {
      if (!user || !user.role) {
        throw createError('Thông tin người dùng không hợp lệ', 400, 'INVALID_USER_OBJECT');
      }
      let query = `SELECT d.id, d.document_code, d.title, d.type, d.department, d.version, u.name as author_name, d.updated_at
        FROM documents d JOIN users u ON d.author_id = u.id WHERE d.status = 'review'`;
      const params = [];
      if (user.role === 'manager') {
        query += ` AND d.department = ?`;
        params.push(user.department);
      } else if (user.role !== 'admin') {
        return { success: true, data: [] };
      }
      query += ` ORDER BY d.updated_at DESC LIMIT ?`;
      params.push(limit);
      const documents = await dbManager.all(query, params);
      return { success: true, data: documents };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.getPendingApprovalsForUser', userId: user ? user.id : null });
      throw error;
    }
  }

  async getDocumentStatistics(user) {
    // ... Giữ nguyên logic hàm này
    try {
      const stats = await Document.getStatistics();
      return { success: true, statistics: stats };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.getDocumentStatistics', userId: user.id });
      throw error;
    }
  }

  async deleteDocument(documentId, user, context = {}) {
    // ... Giữ nguyên logic hàm này
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
      }
      const transitionResult = await this.workflowService.transitionStatus(documentId, 'archived', user.id);
      if (!transitionResult.success) {
        throw createError(transitionResult.error, 403, 'DELETE_PERMISSION_DENIED');
      }
      return { success: true, message: 'Tài liệu đã được xóa thành công' };
    } catch (error) {
      logError(error, null, { operation: 'DocumentService.deleteDocument', documentId, userId: user.id });
      throw error;
    }
  }
}

module.exports = DocumentService;
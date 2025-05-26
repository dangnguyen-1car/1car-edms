/**
 * =================================================================
 * EDMS 1CAR - Document Service
 * Business logic for document management with version control
 * Based on C-PR-VM-001, C-TD-VM-001, C-PR-AR-001 requirements
 * =================================================================
 */

const Document = require('../models/Document');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logDocumentOperation, logError } = require('../utils/logger');
const { generateDocumentCode } = require('../utils/db');
const { createError } = require('../middleware/errorHandler');
const path = require('path');
const fs = require('fs-extra');

class DocumentService {
    /**
     * Create new document
     * @param {Object} documentData - Document data
     * @param {number} authorId - Author user ID
     * @param {Object} context - Request context
     * @returns {Promise<Object>} - Created document
     */
    static async createDocument(documentData, authorId, context = {}) {
        try {
            // Validate author exists
            const author = await User.findById(authorId);
            if (!author) {
                throw createError('Người tạo tài liệu không tồn tại', 404, 'AUTHOR_NOT_FOUND');
            }

            // Validate document data
            const { title, type, department, description } = documentData;
            
            if (!title || !type || !department) {
                throw createError('Thiếu thông tin bắt buộc: tiêu đề, loại tài liệu, phòng ban', 400, 'MISSING_REQUIRED_FIELDS');
            }

            // Check if user can create document in this department
            if (author.role !== 'admin' && author.department !== department) {
                throw createError('Bạn chỉ có thể tạo tài liệu cho phòng ban của mình', 403, 'DEPARTMENT_PERMISSION_DENIED');
            }

            // Create document
            const document = await Document.create(documentData, authorId);

            // Log document creation
            await AuditLog.create({
                user_id: authorId,
                action: 'DOCUMENT_CREATED',
                resource_type: 'document',
                resource_id: document.id,
                details: {
                    documentCode: document.document_code,
                    title: document.title,
                    type: document.type,
                    department: document.department,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
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
     * @returns {Promise<Object>} - Document data
     */
    static async getDocument(documentId, user, context = {}) {
        try {
            const document = await Document.findById(documentId);
            
            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Check access permission
            if (!document.canUserAccess(user)) {
                await AuditLog.create({
                    user_id: user.id,
                    action: 'DOCUMENT_ACCESS_DENIED',
                    resource_type: 'document',
                    resource_id: documentId,
                    details: {
                        documentCode: document.document_code,
                        userDepartment: user.department,
                        documentDepartment: document.department,
                        ip: context.ip
                    },
                    ip_address: context.ip,
                    user_agent: context.userAgent
                });

                throw createError('Bạn không có quyền truy cập tài liệu này', 403, 'DOCUMENT_ACCESS_DENIED');
            }

            // Log document view
            await AuditLog.create({
                user_id: user.id,
                action: 'DOCUMENT_VIEWED',
                resource_type: 'document',
                resource_id: documentId,
                details: {
                    documentCode: document.document_code,
                    title: document.title,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
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
     * @returns {Promise<Object>} - Search results
     */
    static async searchDocuments(filters, user, page = 1, limit = 20, context = {}) {
        try {
            // Apply user-specific filters based on permissions
            const userFilters = { ...filters };

            // Non-admin users can only see documents they have access to
            if (user.role !== 'admin') {
                // This would be enhanced with more sophisticated permission logic
                userFilters.department = user.department;
            }

            const results = await Document.search(userFilters, page, limit);

            // Filter results based on user access (additional security layer)
            const accessibleDocuments = results.data.filter(doc => doc.canUserAccess(user));

            // Log search activity
            await AuditLog.create({
                user_id: user.id,
                action: 'DOCUMENTS_SEARCHED',
                resource_type: 'document',
                details: {
                    filters: userFilters,
                    resultsCount: accessibleDocuments.length,
                    page: page,
                    limit: limit,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
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
     * @returns {Promise<Object>} - Updated document
     */
    static async updateDocument(documentId, updateData, user, context = {}) {
        try {
            const document = await Document.findById(documentId);
            
            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Check update permission
            const canUpdate = user.role === 'admin' || 
                            document.author_id === user.id || 
                            (user.department === document.department && document.status === 'draft');

            if (!canUpdate) {
                await AuditLog.create({
                    user_id: user.id,
                    action: 'DOCUMENT_UPDATE_DENIED',
                    resource_type: 'document',
                    resource_id: documentId,
                    details: {
                        documentCode: document.document_code,
                        reason: 'Insufficient permissions',
                        ip: context.ip
                    },
                    ip_address: context.ip,
                    user_agent: context.userAgent
                });

                throw createError('Bạn không có quyền chỉnh sửa tài liệu này', 403, 'UPDATE_PERMISSION_DENIED');
            }

            // Prevent updating published documents without version change
            if (document.status === 'published' && !updateData.createNewVersion) {
                throw createError('Không thể chỉnh sửa tài liệu đã được phê duyệt. Vui lòng tạo phiên bản mới.', 400, 'PUBLISHED_DOCUMENT_READONLY');
            }

            // Store original data for audit
            const originalData = {
                title: document.title,
                description: document.description,
                status: document.status
            };

            // Update document
            const updatedDocument = await document.update(updateData, user.id);

            // Log document update
            await AuditLog.create({
                user_id: user.id,
                action: 'DOCUMENT_UPDATED',
                resource_type: 'document',
                resource_id: documentId,
                details: {
                    documentCode: document.document_code,
                    originalData: originalData,
                    updateData: updateData,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
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
     * @param {number} documentId - Document ID
     * @param {string} newStatus - New status
     * @param {string} comment - Transition comment
     * @param {Object} user - Current user
     * @param {Object} context - Request context
     * @returns {Promise<Object>} - Updated document
     */
    static async updateDocumentStatus(documentId, newStatus, comment, user, context = {}) {
        try {
            const document = await Document.findById(documentId);
            
            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Check status transition permission
            const canTransition = this.canUserTransitionStatus(user, document, newStatus);
            
            if (!canTransition) {
                await AuditLog.create({
                    user_id: user.id,
                    action: 'STATUS_TRANSITION_DENIED',
                    resource_type: 'document',
                    resource_id: documentId,
                    details: {
                        documentCode: document.document_code,
                        fromStatus: document.status,
                        toStatus: newStatus,
                        reason: 'Insufficient permissions',
                        ip: context.ip
                    },
                    ip_address: context.ip,
                    user_agent: context.userAgent
                });

                throw createError('Bạn không có quyền thay đổi trạng thái tài liệu này', 403, 'STATUS_TRANSITION_DENIED');
            }

            const oldStatus = document.status;

            // Update document status
            const updatedDocument = await document.updateStatus(newStatus, user.id, comment);

            // Log status change
            await AuditLog.create({
                user_id: user.id,
                action: 'DOCUMENT_STATUS_CHANGED',
                resource_type: 'document',
                resource_id: documentId,
                details: {
                    documentCode: document.document_code,
                    fromStatus: oldStatus,
                    toStatus: newStatus,
                    comment: comment,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

            return {
                success: true,
                message: `Trạng thái tài liệu đã được thay đổi từ "${oldStatus}" thành "${newStatus}"`,
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
     * @returns {Promise<Object>} - Updated document
     */
    static async createDocumentVersion(documentId, newVersion, changeReason, changeSummary, user, context = {}) {
        try {
            const document = await Document.findById(documentId);
            
            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Check version creation permission
            const canCreateVersion = user.role === 'admin' || 
                                   document.author_id === user.id || 
                                   user.department === document.department;

            if (!canCreateVersion) {
                throw createError('Bạn không có quyền tạo phiên bản mới cho tài liệu này', 403, 'VERSION_CREATION_DENIED');
            }

            const oldVersion = document.version;

            // Create new version
            const updatedDocument = await document.createNewVersion(newVersion, changeReason, changeSummary, user.id);

            // Log version creation
            await AuditLog.create({
                user_id: user.id,
                action: 'DOCUMENT_VERSION_CREATED',
                resource_type: 'document',
                resource_id: documentId,
                details: {
                    documentCode: document.document_code,
                    oldVersion: oldVersion,
                    newVersion: newVersion,
                    changeReason: changeReason,
                    changeSummary: changeSummary,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
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
     * @returns {Promise<Object>} - Updated document
     */
    static async attachFile(documentId, fileInfo, user, context = {}) {
        try {
            const document = await Document.findById(documentId);
            
            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Check file attachment permission
            const canAttach = user.role === 'admin' || 
                            document.author_id === user.id || 
                            (user.department === document.department && document.status === 'draft');

            if (!canAttach) {
                throw createError('Bạn không có quyền đính kèm tệp cho tài liệu này', 403, 'FILE_ATTACH_DENIED');
            }

            // Validate file
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (fileInfo.size > maxSize) {
                throw createError('Kích thước tệp vượt quá giới hạn 10MB', 400, 'FILE_TOO_LARGE');
            }

            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(fileInfo.mimetype)) {
                throw createError('Chỉ chấp nhận tệp PDF, DOC, DOCX', 400, 'INVALID_FILE_TYPE');
            }

            // Attach file to document
            const updatedDocument = await document.attachFile(fileInfo, user.id);

            // Log file attachment
            await AuditLog.create({
                user_id: user.id,
                action: 'DOCUMENT_FILE_ATTACHED',
                resource_type: 'document',
                resource_id: documentId,
                details: {
                    documentCode: document.document_code,
                    fileName: fileInfo.filename,
                    fileSize: fileInfo.size,
                    mimeType: fileInfo.mimetype,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
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
     * @returns {Promise<Object>} - Version history
     */
    static async getVersionHistory(documentId, user, context = {}) {
        try {
            const document = await Document.findById(documentId);
            
            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Check access permission
            if (!document.canUserAccess(user)) {
                throw createError('Bạn không có quyền xem lịch sử phiên bản của tài liệu này', 403, 'VERSION_HISTORY_ACCESS_DENIED');
            }

            const versionHistory = await document.getVersionHistory();

            // Log version history access
            await AuditLog.create({
                user_id: user.id,
                action: 'VERSION_HISTORY_VIEWED',
                resource_type: 'document',
                resource_id: documentId,
                details: {
                    documentCode: document.document_code,
                    versionsCount: versionHistory.length,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
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
     * @param {number} documentId - Document ID
     * @param {Object} user - Current user
     * @param {Object} context - Request context
     * @returns {Promise<Object>} - Workflow history
     */
    static async getWorkflowHistory(documentId, user, context = {}) {
        try {
            const document = await Document.findById(documentId);
            
            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Check access permission
            if (!document.canUserAccess(user)) {
                throw createError('Bạn không có quyền xem lịch sử workflow của tài liệu này', 403, 'WORKFLOW_HISTORY_ACCESS_DENIED');
            }

            const workflowHistory = await document.getWorkflowHistory();

            return {
                success: true,
                workflowHistory: workflowHistory
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
     * @returns {Promise<Object>} - Documents due for review
     */
    static async getDocumentsDueForReview(user, daysBefore = 30) {
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
     * @returns {Promise<Object>} - Document statistics
     */
    static async getDocumentStatistics(user) {
        try {
            const stats = await Document.getStatistics();

            // Add user-specific statistics
            if (user.role !== 'admin') {
                // Filter statistics by user's department
                stats.userDepartmentStats = stats.byDepartment.find(dept => 
                    dept.department === user.department
                );
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
     * Check if user can transition document status
     * @param {Object} user - User object
     * @param {Object} document - Document object
     * @param {string} newStatus - New status
     * @returns {boolean} - Permission result
     */
    static canUserTransitionStatus(user, document, newStatus) {
        // Admin can perform any transition
        if (user.role === 'admin') {
            return true;
        }

        // Status transition rules based on current status and user role
        switch (document.status) {
            case 'draft':
                // Author can submit for review
                if (newStatus === 'review' && document.author_id === user.id) {
                    return true;
                }
                // Author can archive their own drafts
                if (newStatus === 'archived' && document.author_id === user.id) {
                    return true;
                }
                break;

            case 'review':
                // Reviewer/Approver can approve or reject
                if (newStatus === 'published' && 
                    (document.reviewer_id === user.id || document.approver_id === user.id)) {
                    return true;
                }
                // Reviewer can send back to draft
                if (newStatus === 'draft' && 
                    (document.reviewer_id === user.id || document.approver_id === user.id)) {
                    return true;
                }
                break;

            case 'published':
                // Only admin or department manager can archive published documents
                if (newStatus === 'archived' && user.department === document.department) {
                    return true;
                }
                break;

            case 'archived':
                // Archived documents cannot be changed by regular users
                break;
        }

        return false;
    }

    /**
     * Delete document (soft delete by archiving)
     * @param {number} documentId - Document ID
     * @param {Object} user - Current user
     * @param {Object} context - Request context
     * @returns {Promise<Object>} - Delete result
     */
    static async deleteDocument(documentId, user, context = {}) {
        try {
            const document = await Document.findById(documentId);
            
            if (!document) {
                throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
            }

            // Check delete permission (only admin or author of draft documents)
            const canDelete = user.role === 'admin' || 
                            (document.author_id === user.id && document.status === 'draft');

            if (!canDelete) {
                throw createError('Bạn không có quyền xóa tài liệu này', 403, 'DELETE_PERMISSION_DENIED');
            }

            // Archive document instead of hard delete
            const updatedDocument = await document.updateStatus('archived', user.id, 'Tài liệu đã bị xóa');

            // Log document deletion
            await AuditLog.create({
                user_id: user.id,
                action: 'DOCUMENT_DELETED',
                resource_type: 'document',
                resource_id: documentId,
                details: {
                    documentCode: document.document_code,
                    title: document.title,
                    originalStatus: document.status,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

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

// src/frontend/src/components/documents/DocumentApprovalModal.js - Phiên bản hợp nhất tối ưu
import React, { useState, useEffect } from 'react';
import { FiX, FiAlertTriangle, FiMessageSquare, FiCheck, FiXCircle, FiLoader } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { documentService } from '../../services/documentService';
import DocumentStatusBadge from '../common/DocumentStatusBadge';

/**
 * Modal chung cho tất cả hành động workflow cần comment
 * Component "dumb" - không chứa logic nghiệp vụ, chỉ UI và state management
 * Tuân thủ nguyên tắc DRY - tái sử dụng cho tất cả workflow actions
 * Hợp nhất tối ưu giữa phiên bản cũ và mới
 */
function DocumentApprovalModal({
    isOpen,
    onClose,
    document,
    action,
    onConfirm,
    onSuccess, // Giữ từ code cũ để tương thích
    isLoading = false
}) {
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // =================================================================
    // Effect Hooks
    // =================================================================

    // Reset comment khi modal mở/đóng hoặc action thay đổi
    useEffect(() => {
        if (isOpen) {
            setComment('');
            setIsSubmitting(false);
            setErrors({});
        }
    }, [isOpen, action]);

    // =================================================================
    // Helper Functions
    // =================================================================

    // Lấy thông tin hiển thị dựa trên action
    const getActionInfo = () => {
        switch (action) {
            case 'reject':
                return {
                    title: 'Từ chối tài liệu',
                    description: 'Vui lòng cho biết lý do từ chối tài liệu này:',
                    buttonText: 'Từ chối',
                    buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                    icon: <FiXCircle className="w-5 h-5 text-red-500" />,
                    placeholder: 'Nhập lý do từ chối chi tiết...',
                    warningMessage: 'Việc từ chối sẽ chuyển tài liệu về trạng thái bản nháp. Tác giả sẽ nhận được thông báo và có thể chỉnh sửa lại.'
                };
            case 'request_changes':
                return {
                    title: 'Yêu cầu chỉnh sửa',
                    description: 'Vui lòng cho biết những thay đổi cần thực hiện:',
                    buttonText: 'Yêu cầu chỉnh sửa',
                    buttonColor: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
                    icon: <FiMessageSquare className="w-5 h-5 text-orange-500" />,
                    placeholder: 'Nhập chi tiết những thay đổi cần thực hiện...',
                    warningMessage: 'Tài liệu sẽ được chuyển về trạng thái bản nháp để tác giả có thể chỉnh sửa theo yêu cầu.'
                };
            case 'approve':
                return {
                    title: 'Phê duyệt tài liệu',
                    description: 'Bình luận / Góp ý về tài liệu:',
                    buttonText: 'Phê duyệt',
                    buttonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
                    icon: <FiCheck className="w-5 h-5 text-green-500" />,
                    placeholder: 'Nhập bình luận hoặc góp ý về tài liệu...',
                    warningMessage: 'Sau khi phê duyệt, tài liệu sẽ chuyển trạng thái và không thể hoàn tác. Vui lòng kiểm tra kỹ nội dung trước khi quyết định.'
                };
            default:
                return {
                    title: 'Xác nhận hành động',
                    description: 'Vui lòng nhập nhận xét:',
                    buttonText: 'Xác nhận',
                    buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
                    icon: <FiMessageSquare className="w-5 h-5 text-blue-500" />,
                    placeholder: 'Nhập nhận xét...',
                    warningMessage: ''
                };
        }
    };

    // =================================================================
    // Event Handlers
    // =================================================================

    // Xử lý submit với logic từ cả hai phiên bản
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!comment.trim()) {
            const errorMessage = action === 'approve' ?
                'Bình luận là bắt buộc khi phê duyệt' :
                'Vui lòng nhập lý do hoặc nhận xét';
            setErrors({ comment: errorMessage });
            return;
        }
        if (comment.trim().length < 10) {
            setErrors({ comment: 'Nhận xét phải có ít nhất 10 ký tự' });
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            // Nếu có onConfirm (phiên bản mới), sử dụng callback pattern
            if (onConfirm) {
                await onConfirm(comment.trim());
            } else {
                // Fallback cho phiên bản cũ - gọi trực tiếp API
                let response;
                if (action === 'approve') {
                    response = await documentService.approveDocument(document.id, {
                        comment: comment.trim()
                    });
                } else if (action === 'reject') {
                    response = await documentService.rejectDocument(document.id, {
                        comment: comment.trim()
                    });
                }
                if (response?.success) {
                    const actionText = action === 'approve' ? 'phê duyệt' : 'từ chối';
                    toast.success(`Tài liệu đã được ${actionText} thành công!`);

                    if (onSuccess) {
                        onSuccess(response.data, action === 'approve' ? 'approved' : 'rejected');
                    }
                } else {
                    throw new Error(response?.message || 'Lỗi xử lý tài liệu');
                }
            }
            // Đóng modal sau khi thành công
            handleClose();
        } catch (error) {
            console.error('Error in modal submit:', error);
            const errorMessage = error.message || 'Có lỗi xảy ra khi xử lý tài liệu';
            toast.error(errorMessage);
            setErrors({ general: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting && !isLoading) {
            onClose();
            setComment('');
            setErrors({});
        }
    };

    const handleKeyDown = (e) => {
        // Đóng modal khi nhấn Escape
        if (e.key === 'Escape' && !isSubmitting && !isLoading) {
            handleClose();
        }
    };

    // =================================================================
    // Render
    // =================================================================

    if (!isOpen || !document) return null;

    const actionInfo = getActionInfo();
    const isProcessing = isSubmitting || isLoading;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        {actionInfo.icon}
                        <h2 className="ml-3 text-xl font-semibold text-gray-900">
                            {actionInfo.title}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-md p-1"
                        aria-label="Đóng modal"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Document Info - Giữ từ phiên bản cũ với cải tiến */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Mã tài liệu</p>
                                <p className="font-mono font-medium">{document.document_code}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Trạng thái hiện tại</p>
                                <DocumentStatusBadge status={document.status} />
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-sm text-gray-600">Tiêu đề</p>
                                <p className="font-medium">{document.title}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Loại tài liệu</p>
                                <p>{document.type}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Phòng ban</p>
                                <p>{document.department}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Tác giả</p>
                                <p>{document.author_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Phiên bản</p>
                                <p className="font-mono">{document.version}</p>
                            </div>
                            {document.description && (
                                <div className="md:col-span-2">
                                    <p className="text-sm text-gray-600">Mô tả</p>
                                    <p className="text-gray-900">{document.description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <p className="text-sm text-gray-700">{actionInfo.description}</p>
                    </div>

                    {/* Comment Input */}
                    <div>
                        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                            {action === 'approve' ? 'Bình luận / Góp ý' : 'Lý do'}
                            <span className="text-red-500 ml-1">*</span>
                        </label>
                        <textarea
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            disabled={isProcessing}
                            rows="4"
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.comment ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                                }`}
                            placeholder={actionInfo.placeholder}
                            maxLength={1000}
                            required
                            autoFocus
                        />
                        {errors.comment && (
                            <p className="text-red-500 text-sm mt-1">{errors.comment}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                            {comment.length}/1000 ký tự
                        </p>
                    </div>

                    {/* General Error */}
                    {errors.general && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-red-600 text-sm">{errors.general}</p>
                        </div>
                    )}

                    {/* Warning */}
                    {actionInfo.warningMessage && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <div className="flex items-start">
                                <FiAlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                                <div className="text-xs text-yellow-800">
                                    <strong>Lưu ý:</strong> {actionInfo.warningMessage}
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Hủy
                    </button>

                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isProcessing || !comment.trim() || comment.trim().length < 10}
                        className={`px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${actionInfo.buttonColor}`}
                    >
                        {isProcessing ? (
                            <>
                                <FiLoader className="animate-spin" size={16} />
                                <span>Đang xử lý...</span>
                            </>
                        ) : (
                            <>
                                {actionInfo.icon}
                                <span>{actionInfo.buttonText}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DocumentApprovalModal;
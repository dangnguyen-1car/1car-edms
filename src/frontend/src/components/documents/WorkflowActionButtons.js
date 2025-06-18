// src/frontend/src/components/documents/WorkflowActionButtons.js - Cập nhật sử dụng Modal chung

import React, { useState } from 'react';
import { FiEye, FiCheck, FiX, FiEdit3 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import DocumentApprovalModal from './DocumentApprovalModal';

/**
 * Component tái sử dụng cho các nút hành động workflow
 * Tuân thủ nguyên tắc DRY - logic chung được tập trung tại đây
 * Sử dụng Modal chung để tránh trùng lặp code
 */
function WorkflowActionButtons({ document, currentUser }) {
  const { processWorkflowAction, isLoading } = useWorkflowActions();
  const [showCommentModal, setShowCommentModal] = useState(null);

  // =================================================================
  // Logic kiểm tra quyền hành động
  // =================================================================

  // Kiểm tra quyền hành động của user hiện tại
  const canPerformActions = (document.user_role_in_workflow === 'reviewer' || 
                            document.user_role_in_workflow === 'approver') &&
                           !isLoading;

  // =================================================================
  // Event Handlers
  // =================================================================

  // Xử lý hành động phê duyệt (không cần comment)
  const handleApprove = () => {
    processWorkflowAction({
      documentId: document.id,
      action: 'approve'
    });
  };

  // Xử lý hành động cần comment (reject, request_changes)
  const handleActionWithComment = (action) => {
    setShowCommentModal({ action, documentId: document.id });
  };

  // Submit comment và thực hiện hành động - CẬP NHẬT để nhận comment từ Modal
  const handleSubmitComment = (comment) => {
    const { action, documentId } = showCommentModal;
    
    processWorkflowAction({
      documentId,
      action,
      comment: comment.trim()
    });

    // Đóng modal
    setShowCommentModal(null);
  };

  // Đóng modal
  const handleCloseModal = () => {
    setShowCommentModal(null);
  };

  // =================================================================
  // Render Component
  // =================================================================

  return (
    <>
      <div className="flex items-center justify-end space-x-2">
        {/* Nút Xem chi tiết - luôn hiển thị */}
        <Link 
          to={`/documents/${document.id}`}
          className="text-blue-600 hover:text-blue-900 p-1.5 rounded-md hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Xem chi tiết"
        >
          <FiEye className="w-4 h-4" />
        </Link>
        
        {/* Các nút hành động workflow - chỉ hiển thị khi có quyền */}
        {canPerformActions && (
          <>
            {/* Nút Phê duyệt */}
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="text-green-600 hover:text-green-900 p-1.5 rounded-md hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              title="Phê duyệt"
            >
              <FiCheck className="w-4 h-4" />
            </button>
            
            {/* Nút Từ chối */}
            <button
              onClick={() => handleActionWithComment('reject')}
              disabled={isLoading}
              className="text-red-600 hover:text-red-900 p-1.5 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              title="Từ chối"
            >
              <FiX className="w-4 h-4" />
            </button>
            
            {/* Nút Yêu cầu chỉnh sửa */}
            <button
              onClick={() => handleActionWithComment('request_changes')}
              disabled={isLoading}
              className="text-orange-600 hover:text-orange-900 p-1.5 rounded-md hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              title="Yêu cầu chỉnh sửa"
            >
              <FiEdit3 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Modal chung cho tất cả hành động cần comment */}
      <DocumentApprovalModal
        isOpen={showCommentModal !== null}
        onClose={handleCloseModal}
        document={document}
        action={showCommentModal?.action}
        onConfirm={handleSubmitComment}
        isLoading={isLoading}
      />
    </>
  );
}

export default WorkflowActionButtons;
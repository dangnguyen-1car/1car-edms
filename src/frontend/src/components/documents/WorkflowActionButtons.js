// src/frontend/src/components/documents/WorkflowActionButtons.js - Cập nhật sử dụng Modal chung

import React, { useState } from 'react';
import { FiEye, FiCheck, FiX, FiEdit3 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useWorkflowActions } from '../../hooks/useWorkflowActions';
import WorkflowActionModal from './WorkflowActionModal'; // Thay thế DocumentApprovalModal bằng WorkflowActionModal

/**
 * Component tái sử dụng cho các nút hành động workflow
 * Tuân thủ nguyên tắc DRY - logic chung được tập trung tại đây
 * Sử dụng Modal chung để tránh trùng lặp code
 */
function WorkflowActionButtons({ document, currentUser }) {
  const { processWorkflowAction, isLoading } = useWorkflowActions();
  // Cập nhật state để quản lý trạng thái modal chung
  const [modalState, setModalState] = useState({ isOpen: false, action: '', document: null });

  // =================================================================
  // Logic kiểm tra quyền hành động
  // =================================================================

  // *** SỬA LỖI TẠI ĐÂY: Thêm điều kiện kiểm tra vai trò 'admin' của currentUser ***
  // Kiểm tra quyền hành động của user hiện tại, cho phép admin thực hiện mọi hành động
  const canPerformActions = (
    currentUser?.role === 'admin' || // Admin luôn có quyền
    document.user_role_in_workflow === 'reviewer' || 
    document.user_role_in_workflow === 'approver'
  ) && !isLoading;
  // *** KẾT THÚC PHẦN SỬA LỖI ***

  // =================================================================
  // Event Handlers
  // =================================================================

  // Mở modal với hành động và tài liệu cụ thể
  const openModal = (action, doc) => {
    setModalState({ isOpen: true, action, document: doc });
  };

  // Đóng modal
  const closeModal = () => {
    setModalState({ isOpen: false, action: '', document: null });
  };

  // Xử lý hành động phê duyệt (không cần comment, nhưng vẫn mở modal để thống nhất)
  const handleApprove = () => {
    openModal('approve', document);
  };

  // Xử lý hành động cần comment (reject, request_changes)
  const handleActionWithComment = (action) => {
    openModal(action, document);
  };

  // Submit comment và thực hiện hành động - CẬP NHẬT để nhận comment từ Modal
  const handleSubmitAction = (comment) => {
    const { action, document: docToProcess } = modalState;
    
    processWorkflowAction({
      documentId: docToProcess.id,
      action,
      comment: comment.trim()
    });

    // Đóng modal sau khi xử lý
    closeModal();
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
      <WorkflowActionModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        action={modalState.action}
        document={modalState.document}
        onConfirm={handleSubmitAction} // Sử dụng handleSubmitAction để xử lý từ modal
        isLoading={isLoading}
      />
    </>
  );
}

export default WorkflowActionButtons;
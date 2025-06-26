// src/frontend/src/components/documents/WorkflowActionModal.js
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  FiCheckCircle, FiXCircle, FiEdit, FiRefreshCw, 
  FiMessageSquare, FiCalendar 
} from 'react-icons/fi';
import { documentAPI } from '../../api/documentApi';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../common/Modal';

const WORKFLOW_ACTIONS = {
  approve: {
    icon: FiCheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    btnClass: 'btn-success',
    title: 'Phê duyệt Tài liệu',
    label: 'Phê duyệt',
    description: 'Tài liệu sẽ được ban hành và có hiệu lực.',
    requireComment: false,
    showEffectiveDate: true
  },
  reject: {
    icon: FiXCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    btnClass: 'btn-danger',
    title: 'Từ chối Tài liệu',
    label: 'Từ chối',
    description: 'Tài liệu sẽ bị hủy và trả về trạng thái nháp.',
    requireComment: true,
    showEffectiveDate: false
  },
  request_changes: {
    icon: FiEdit,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    btnClass: 'btn-warning',
    title: 'Yêu cầu Chỉnh sửa',
    label: 'Yêu cầu Chỉnh sửa',
    description: 'Tài liệu sẽ được trả về cho tác giả để chỉnh sửa.',
    requireComment: true,
    showEffectiveDate: false
  },
  change_status: {
    icon: FiRefreshCw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    btnClass: 'btn-primary',
    title: 'Thay đổi Trạng thái',
    label: 'Thay đổi',
    description: 'Thay đổi trạng thái tài liệu.',
    requireComment: true,
    showEffectiveDate: false
  }
};

function WorkflowActionModal({ 
  isOpen, 
  onClose, 
  document, 
  action, 
  onSuccess,
  additionalProps = {} // Cho các props đặc biệt như newStatus
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    comment: '',
    effectiveDate: '',
    notifyStakeholders: true,
    ...additionalProps
  });
  const [errors, setErrors] = useState({});

  // Lấy thông tin action
  const actionInfo = useMemo(() => 
    WORKFLOW_ACTIONS[action] || WORKFLOW_ACTIONS.approve, 
    [action]
  );

  // Mutation chung cho tất cả workflow actions
  const workflowMutation = useMutation({
    mutationFn: async (actionData) => {
      switch (action) {
        case 'approve':
        case 'reject':
        case 'request_changes':
          return documentAPI.updateDocumentStatus(document.id, actionData);
        case 'change_status':
          return documentAPI.changeDocumentStatus(document.id, actionData);
        default:
          throw new Error('Invalid action');
      }
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      
      const successMessages = {
        approve: 'Tài liệu đã được phê duyệt thành công.',
        reject: 'Tài liệu đã bị từ chối.',
        request_changes: 'Đã gửi yêu cầu chỉnh sửa đến tác giả.',
        change_status: 'Trạng thái tài liệu đã được thay đổi thành công.'
      };
      
      toast.success(successMessages[action] || 'Cập nhật thành công.');
      onSuccess?.(data);
      handleClose(true);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Lỗi khi thực hiện hành động.');
    }
  });

  // Validation
  const validateForm = () => {
    const newErrors = {};
    
    if (actionInfo.requireComment && !formData.comment.trim()) {
      newErrors.comment = 'Vui lòng nhập lý do.';
    } else if (formData.comment.trim().length > 0 && formData.comment.trim().length < 10) {
      newErrors.comment = 'Lý do phải có ít nhất 10 ký tự.';
    }
    
    if (actionInfo.showEffectiveDate && formData.effectiveDate) {
      const effective = new Date(formData.effectiveDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (effective < today) {
        newErrors.effectiveDate = 'Ngày hiệu lực không được nằm trong quá khứ.';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const actionData = {
      action,
      comment: formData.comment.trim(),
      effectiveDate: formData.effectiveDate || null,
      notifyStakeholders: formData.notifyStakeholders,
      userId: user.id,
      ...additionalProps // Bao gồm newStatus cho change_status
    };

    workflowMutation.mutate(actionData);
  };

  const handleClose = (force = false) => {
    if (workflowMutation.isLoading && !force) return;
    setFormData({ comment: '', effectiveDate: '', notifyStakeholders: true });
    setErrors({});
    onClose();
  };

  const ActionIcon = actionInfo.icon;

  return (
    <Modal isOpen={isOpen} onClose={() => handleClose()} title={actionInfo.title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Thông tin tài liệu</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">Tài liệu:</span> {document?.title}</div>
            <div><span className="font-medium">Mã:</span> {document?.document_code}</div>
            <div><span className="font-medium">Phiên bản:</span> {document?.version}</div>
            <div><span className="font-medium">Tác giả:</span> {document?.author_name || 'N/A'}</div>
          </div>
        </div>

        {/* Action Preview */}
        <div className={`p-4 rounded-lg border ${actionInfo.bgColor}`}>
          <div className="flex items-center space-x-3">
            <ActionIcon className={`w-6 h-6 ${actionInfo.color}`} />
            <div>
              <div className={`font-medium ${actionInfo.color}`}>{actionInfo.label}</div>
              <div className="text-sm text-gray-600">{actionInfo.description}</div>
            </div>
          </div>
        </div>

        {/* Effective Date (conditional) */}
        {actionInfo.showEffectiveDate && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Ngày hiệu lực (tùy chọn)
            </label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className={`pl-10 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  errors.effectiveDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.effectiveDate ? (
              <p className="text-red-600 text-sm">{errors.effectiveDate}</p>
            ) : (
              <p className="text-gray-500 text-sm">Để trống nếu muốn tài liệu có hiệu lực ngay lập tức.</p>
            )}
          </div>
        )}

        {/* Comment */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Lý do {actionInfo.requireComment && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <FiMessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <textarea
              rows={4}
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              className={`pl-10 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                errors.comment ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={actionInfo.requireComment ? 
                'Lý do chi tiết cho hành động này...' : 
                'Ghi chú (tùy chọn)...'
              }
              maxLength={1000}
            />
          </div>
          {errors.comment ? (
            <p className="text-red-600 text-sm">{errors.comment}</p>
          ) : (
            <p className="text-gray-500 text-sm">
              {actionInfo.requireComment ? 'Tối thiểu 10 ký tự.' : 'Tùy chọn.'}
            </p>
          )}
          <div className="text-right text-xs text-gray-500">
            {formData.comment.length}/1000
          </div>
        </div>

        {/* Notification Option */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="notifyStakeholders"
            checked={formData.notifyStakeholders}
            onChange={(e) => setFormData(prev => ({ ...prev, notifyStakeholders: e.target.checked }))}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="notifyStakeholders" className="text-sm text-gray-700">
            Thông báo cho các bên liên quan
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => handleClose()}
            disabled={workflowMutation.isLoading}
            className="btn btn-outline"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={workflowMutation.isLoading}
            className={`btn ${actionInfo.btnClass}`}
          >
            {workflowMutation.isLoading ? (
              <>
                <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <ActionIcon className="w-4 h-4 mr-2" />
                {actionInfo.label}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default WorkflowActionModal;

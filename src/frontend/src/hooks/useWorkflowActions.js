// src/frontend/src/hooks/useWorkflowActions.js

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { documentService } from '../services/documentService';

/**
 * Custom hook để xử lý các hành động workflow (approve, reject, request_changes)
 * Tuân thủ nguyên tắc DRY - tái sử dụng logic chung cho tất cả components
 */
export function useWorkflowActions() {
  const queryClient = useQueryClient();

  const workflowMutation = useMutation({
    mutationFn: ({ documentId, action, comment = '' }) => 
      documentService.processWorkflowAction(documentId, action, comment),
    
    onSuccess: (data, variables) => {
      // Hiển thị thông báo thành công với message phù hợp
      const actionMessages = {
        'approve': 'phê duyệt',
        'reject': 'từ chối', 
        'request_changes': 'yêu cầu chỉnh sửa'
      };
      
      const actionText = actionMessages[variables.action] || 'xử lý';
      toast.success(`Đã ${actionText} tài liệu thành công`);
      
      // Invalidate tất cả các queries liên quan để đảm bảo dữ liệu được làm mới
      queryClient.invalidateQueries(['pendingApproval']);
      queryClient.invalidateQueries(['pendingApprovalStats']);
      queryClient.invalidateQueries(['documents']);
      queryClient.invalidateQueries(['documentDetail', variables.documentId]);
      queryClient.invalidateQueries(['recentPendingApprovals']);
    },
    
    onError: (error) => {
      // Hiển thị thông báo lỗi
      const errorMessage = error.message || 'Có lỗi xảy ra khi xử lý tài liệu';
      toast.error(errorMessage);  
            
    }
  });

  return {
    processWorkflowAction: workflowMutation.mutate,
    processWorkflowActionAsync: workflowMutation.mutateAsync,
    isLoading: workflowMutation.isLoading,
    error: workflowMutation.error,
    isSuccess: workflowMutation.isSuccess
  };
}

export default useWorkflowActions;
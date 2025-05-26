/**
 * =================================================================
 * EDMS 1CAR - Workflow History Component
 * Display document workflow transitions based on C-PR-VM-001
 * Support for approval workflow tracking
 * =================================================================
 */

import React from 'react';
import { 
  FiClock, 
  FiUser, 
  FiArrowRight,
  FiEdit,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiArchive,
  FiRefreshCw,
  FiMessageSquare
} from 'react-icons/fi';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';

function WorkflowHistory({ document, workflowHistory = [], onRefresh }) {
  
  // Get workflow status info
  const getWorkflowStatusInfo = (fromStatus, toStatus) => {
    const statusMap = {
      'draft': { 
        icon: FiEdit, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-100',
        label: 'Bản nháp' 
      },
      'review': { 
        icon: FiEye, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100',
        label: 'Đang xem xét' 
      },
      'published': { 
        icon: FiCheckCircle, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100',
        label: 'Đã phê duyệt' 
      },
      'archived': { 
        icon: FiArchive, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100',
        label: 'Đã lưu trữ' 
      },
      'rejected': { 
        icon: FiXCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-100',
        label: 'Bị từ chối' 
      }
    };

    return statusMap[toStatus] || statusMap.draft;
  };

  // Get workflow action description
  const getWorkflowActionDescription = (transition) => {
    const { from_status, to_status, transitioned_by_name } = transition;
    
    const actions = {
      'draft_to_review': `${transitioned_by_name} đã gửi tài liệu để xem xét`,
      'review_to_published': `${transitioned_by_name} đã phê duyệt tài liệu`,
      'review_to_draft': `${transitioned_by_name} đã từ chối và yêu cầu chỉnh sửa`,
      'published_to_archived': `${transitioned_by_name} đã lưu trữ tài liệu`,
      'draft_to_draft': `${transitioned_by_name} đã cập nhật tài liệu`,
      'published_to_draft': `${transitioned_by_name} đã rút lại tài liệu để chỉnh sửa`
    };

    const actionKey = `${from_status || 'new'}_to_${to_status}`;
    return actions[actionKey] || `${transitioned_by_name} đã thay đổi trạng thái từ ${from_status || 'mới'} sang ${to_status}`;
  };

  if (!workflowHistory || workflowHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <FiRefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Chưa có lịch sử workflow
        </h3>
        <p className="text-gray-500">
          Lịch sử workflow sẽ được hiển thị khi có thay đổi trạng thái tài liệu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Trạng thái hiện tại</h4>
        <div className="flex items-center">
          {(() => {
            const statusInfo = getWorkflowStatusInfo(null, document.status);
            const StatusIcon = statusInfo.icon;
            return (
              <>
                <span className={`${statusInfo.bgColor} h-8 w-8 rounded-full flex items-center justify-center mr-3`}>
                  <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{statusInfo.label}</p>
                  <p className="text-xs text-gray-500">
                    Cập nhật lần cuối: {formatRelativeTime(document.updated_at)}
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Workflow Timeline */}
      <div className="flow-root">
        <ul className="-mb-8">
          {workflowHistory.map((transition, index) => {
            const statusInfo = getWorkflowStatusInfo(transition.from_status, transition.to_status);
            const StatusIcon = statusInfo.icon;
            const isLast = index === workflowHistory.length - 1;

            return (
              <li key={transition.id}>
                <div className="relative pb-8">
                  {!isLast && (
                    <span 
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" 
                      aria-hidden="true" 
                    />
                  )}
                  
                  <div className="relative flex space-x-3">
                    {/* Status Icon */}
                    <div>
                      <span className={`${statusInfo.bgColor} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white`}>
                        <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                      </span>
                    </div>

                    {/* Transition Details */}
                    <div className="min-w-0 flex-1">
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        {/* Transition Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {transition.from_status && (
                              <>
                                <span className="text-sm text-gray-600 capitalize">
                                  {transition.from_status}
                                </span>
                                <FiArrowRight className="h-4 w-4 text-gray-400" />
                              </>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>

                          <div className="text-xs text-gray-500">
                            {formatDateTime(transition.transitioned_at)}
                          </div>
                        </div>

                        {/* Action Description */}
                        <div className="mb-3">
                          <p className="text-sm text-gray-900">
                            {getWorkflowActionDescription(transition)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(transition.transitioned_at)}
                          </p>
                        </div>

                        {/* User Information */}
                        <div className="flex items-center text-sm text-gray-600 mb-3">
                          <FiUser className="h-4 w-4 mr-2" />
                          <span>{transition.transitioned_by_name || 'N/A'}</span>
                          {transition.transitioned_by_department && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({transition.transitioned_by_department})
                            </span>
                          )}
                        </div>

                        {/* Comment */}
                        {transition.comment && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start">
                              <FiMessageSquare className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 mb-1">Ghi chú:</p>
                                <p className="text-sm text-gray-700">{transition.comment}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Additional Metadata */}
                        {(transition.ip_address || transition.user_agent) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <details className="text-xs text-gray-500">
                              <summary className="cursor-pointer hover:text-gray-700">
                                Thông tin kỹ thuật
                              </summary>
                              <div className="mt-2 space-y-1">
                                {transition.ip_address && (
                                  <p>IP: {transition.ip_address}</p>
                                )}
                                {transition.user_agent && (
                                  <p>User Agent: {transition.user_agent}</p>
                                )}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Workflow Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Thống kê workflow</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Tổng thay đổi:</span>
            <p className="text-gray-900">{workflowHistory.length}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Lần đầu tạo:</span>
            <p className="text-gray-900">
              {formatRelativeTime(workflowHistory[workflowHistory.length - 1]?.transitioned_at || document.created_at)}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Thay đổi gần nhất:</span>
            <p className="text-gray-900">
              {formatRelativeTime(workflowHistory[0]?.transitioned_at || document.updated_at)}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Người thay đổi cuối:</span>
            <p className="text-gray-900">
              {workflowHistory[0]?.transitioned_by_name || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Hành động có thể thực hiện</h4>
        <p className="text-sm text-blue-700">
          Dựa trên trạng thái hiện tại <strong>{document.status}</strong>, bạn có thể thực hiện các hành động workflow từ giao diện chỉnh sửa tài liệu.
        </p>
      </div>
    </div>
  );
}

export default WorkflowHistory;

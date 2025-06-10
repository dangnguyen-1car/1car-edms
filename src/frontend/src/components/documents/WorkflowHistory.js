// src/components/documents/WorkflowHistory.js
/**
 * =================================================================
 * EDMS 1CAR - Workflow History Component (Optimized)
 * Receives data via props instead of fetching to avoid duplicate API calls
 * Display document workflow transitions based on C-PR-VM-001
 * =================================================================
 */
import React from 'react';
import {
    FiClock, FiUser, FiArrowRight, FiEdit, FiEye, FiCheckCircle,
    FiXCircle, FiArchive, FiRefreshCw, FiMessageSquare, FiAlertCircle
} from 'react-icons/fi';
import { dateTime } from '../../utils/formatters'; // Bỏ `numeric` vì không dùng
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

// --- Helper Functions ---

const getWorkflowStatusInfo = (toStatus) => {
    const statusMap = {
        'draft': { icon: FiEdit, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Bản nháp' },
        'review': { icon: FiEye, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Đang xem xét' },
        'published': { icon: FiCheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Đã xuất bản' },
        'archived': { icon: FiArchive, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Đã lưu trữ' },
        'rejected': { icon: FiXCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Bị từ chối' }
    };
    return statusMap[toStatus] || { icon: FiAlertCircle, color: 'text-gray-600', bgColor: 'bg-gray-100', label: toStatus || 'Không xác định' };
};

const getWorkflowActionDescription = (transition) => {
    const { from_status, to_status, transitioned_by_name } = transition;
    const actions = {
        'draft_to_review': `${transitioned_by_name} đã gửi tài liệu để xem xét`,
        'review_to_published': `${transitioned_by_name} đã phê duyệt và xuất bản tài liệu`,
        'review_to_draft': `${transitioned_by_name} đã từ chối và yêu cầu chỉnh sửa`,
        'published_to_archived': `${transitioned_by_name} đã lưu trữ tài liệu`,
        'draft_to_draft': `${transitioned_by_name} đã cập nhật tài liệu nháp`,
        'published_to_draft': `${transitioned_by_name} đã rút lại tài liệu để chỉnh sửa`
    };
    const actionKey = `${from_status || 'new'}_to_${to_status}`;
    return actions[actionKey] || `${transitioned_by_name} đã thay đổi trạng thái từ "${from_status || 'Mới'}" sang "${to_status}"`;
};

// --- UI State Sub-components ---

const WorkflowLoading = () => (
    <div className="flex items-center justify-center h-64">
        <LoadingSpinner message="Đang tải lịch sử workflow..." />
    </div>
);

const WorkflowError = ({ error, onRetry }) => (
    <div className="text-center py-8">
        <ErrorMessage title="Không thể tải lịch sử workflow" message={error.message} onRetry={onRetry} />
    </div>
);

const WorkflowEmpty = () => (
    <div className="text-center py-8">
        <FiRefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có lịch sử workflow</h3>
        <p className="text-gray-500">Lịch sử workflow sẽ được hiển thị khi có thay đổi trạng thái tài liệu.</p>
    </div>
);

// --- UI Block Sub-components ---

const CurrentStatusPanel = ({ document }) => {
    const statusInfo = getWorkflowStatusInfo(document.status);
    const StatusIcon = statusInfo.icon;
    return (
        <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Trạng thái hiện tại</h4>
            <div className="flex items-center">
                <span className={`${statusInfo.bgColor} h-8 w-8 rounded-full flex items-center justify-center mr-3`}>
                    <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                </span>
                <div>
                    <p className="text-sm font-medium text-gray-900">{statusInfo.label}</p>
                    {/* SỬA LỖI: Loại bỏ cú pháp ** không hợp lệ */}
                    <p className="text-xs text-gray-500">Cập nhật lần cuối: {dateTime.formatRelativeTime(document.updated_at)}</p>
                </div>
            </div>
        </div>
    );
};

const TransitionItem = ({ transition, isLast }) => {
    const statusInfo = getWorkflowStatusInfo(transition.to_status);
    const StatusIcon = statusInfo.icon;
    return (
        <li>
            <div className="relative pb-8">
                {!isLast && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />}
                <div className="relative flex space-x-3">
                    <div>
                        <span className={`${statusInfo.bgColor} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white`}>
                            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="flex items-start justify-between mb-3 gap-2">
                                <div className="flex items-center space-x-3 flex-wrap">
                                    {transition.from_status && (
                                        <>
                                            <span className="text-sm text-gray-600 capitalize">{transition.from_status}</span>
                                            <FiArrowRight className="h-4 w-4 text-gray-400" />
                                        </>
                                    )}
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>{statusInfo.label}</span>
                                </div>
                                {/* SỬA LỖI: Loại bỏ cú pháp ** không hợp lệ */}
                                <div className="text-xs text-gray-500 flex-shrink-0" title={dateTime.formatDateTime(transition.transitioned_at)}>{dateTime.formatRelativeTime(transition.transitioned_at)}</div>
                            </div>
                            <div className="mb-3">
                                <p className="text-sm text-gray-900">{getWorkflowActionDescription(transition)}</p>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 mb-3">
                                <FiUser className="h-4 w-4 mr-2" />
                                <span>{transition.transitioned_by_name || 'N/A'}</span>
                                {transition.transitioned_by_department && <span className="ml-2 text-xs text-gray-500">({transition.transitioned_by_department})</span>}
                            </div>
                            {transition.comment && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-start">
                                        <FiMessageSquare className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900 mb-1">Ghi chú:</p>
                                            <p className="text-sm text-gray-700 break-words">{transition.comment}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {(transition.ip_address || transition.user_agent) && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <details className="text-xs text-gray-500"><summary className="cursor-pointer hover:text-gray-700">Thông tin kỹ thuật</summary><div className="mt-2 space-y-1 break-all"><p><strong>IP:</strong> {transition.ip_address || 'N/A'}</p><p><strong>User Agent:</strong> {transition.user_agent || 'N/A'}</p></div></details>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
};

const WorkflowStatistics = ({ history, document }) => (
    <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Thống kê workflow</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="font-medium text-gray-700">Tổng thay đổi:</span><p className="text-gray-900">{history.length}</p></div>
            <div>
                <span className="font-medium text-gray-700">Lần đầu tạo:</span>
                {/* SỬA LỖI: Loại bỏ cú pháp ** không hợp lệ */}
                <p className="text-gray-900">{dateTime.formatRelativeTime(history[history.length - 1]?.transitioned_at || document.created_at)}</p>
            </div>
            <div>
                <span className="font-medium text-gray-700">Thay đổi gần nhất:</span>
                {/* SỬA LỖI: Loại bỏ cú pháp ** và dấu } thừa */}
                <p className="text-gray-900">{dateTime.formatRelativeTime(history[0]?.transitioned_at || document.updated_at)}</p>
            </div>
            <div><span className="font-medium text-gray-700">Người thay đổi cuối:</span><p className="text-gray-900">{history[0]?.transitioned_by_name || 'N/A'}</p></div>
        </div>
    </div>
);

const WorkflowActionsInfo = ({ document }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Hành động có thể thực hiện</h4>
        <p className="text-sm text-blue-700">Dựa trên trạng thái hiện tại <strong className='font-semibold'>{getWorkflowStatusInfo(document.status).label}</strong>, bạn có thể thực hiện các hành động workflow từ giao diện chính của tài liệu.</p>
    </div>
);

// --- Main Component ---

function WorkflowHistory({ document, workflowHistory = [], isLoading = false, error = null, onRefresh }) {
    if (isLoading) return <WorkflowLoading />;
    if (error) return <WorkflowError error={error} onRetry={onRefresh} />;
    // Thêm kiểm tra `document` để tăng tính an toàn
    if (!document || !workflowHistory || workflowHistory.length === 0) return <WorkflowEmpty />;

    return (
        <div className="space-y-6">
            <CurrentStatusPanel document={document} />

            <div className="flow-root">
                <ul className="-mb-8">
                    {workflowHistory.map((transition, index) => (
                        <TransitionItem
                            key={transition.id}
                            transition={transition}
                            isLast={index === workflowHistory.length - 1}
                        />
                    ))}
                </ul>
            </div>
            
            <WorkflowStatistics history={workflowHistory} document={document} />
            <WorkflowActionsInfo document={document} />
        </div>
    );
}

export default WorkflowHistory;
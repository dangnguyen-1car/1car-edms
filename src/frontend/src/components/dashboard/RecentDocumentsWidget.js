// src/frontend/src/components/dashboard/RecentDocumentsWidget.js
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiClock, FiFileText, FiEye, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import { favoritesService } from '../../services/favoritesService';
import { getDocumentTypeDisplay, getStatusBadgeColor } from '../../utils/documentUtils';
import SkeletonLoader from '../common/SkeletonLoader';

function RecentDocumentsWidget() {
const queryClient = useQueryClient();

// Query để lấy tài liệu gần đây
const {
    data: recentData,
    isLoading,
    error,
    refetch
} = useQuery({
    queryKey: ['recent-documents'],
    queryFn: () => favoritesService.getRecentDocuments(5),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
});

// Mutation để xóa lịch sử
const clearHistoryMutation = useMutation({
    mutationFn: () => favoritesService.clearRecentHistory(),
    onSuccess: () => {
        toast.success('Đã xóa lịch sử xem tài liệu');
        queryClient.invalidateQueries(['recent-documents']);
    },
    onError: (error) => {
        toast.error(error.response?.data?.message || 'Không thể xóa lịch sử');
    }
});

const recentDocuments = recentData?.data || [];

const handleClearHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem tài liệu?')) {
        clearHistoryMutation.mutate();
    }
};

const formatTimeAgo = (dateString) => {
    const now = new Date();
    const viewedAt = new Date(dateString);
    const diffInMinutes = Math.floor((now - viewedAt) / (1000 * 60));

    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return viewedAt.toLocaleDateString('vi-VN');
};

if (isLoading) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiClock className="text-blue-600" />
                    Tài liệu gần đây
                </h3>
            </div>
            <SkeletonLoader count={3} height="60px" />
        </div>
    );
}

if (error) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiClock className="text-blue-600" />
                    Tài liệu gần đây
                </h3>
                <button
                    onClick={() => refetch()}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Làm mới"
                >
                    <FiRefreshCw className="w-4 h-4" />
                </button>
            </div>
            <div className="text-center py-4">
                <p className="text-gray-500 text-sm">Không thể tải dữ liệu</p>
                <button
                    onClick={() => refetch()}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                    Thử lại
                </button>
            </div>
        </div>
    );
}

return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiClock className="text-blue-600" />
                Tài liệu gần đây
            </h3>
            <div className="flex items-center gap-2">
                {recentDocuments.length > 0 && (
                    <button
                        onClick={handleClearHistory}
                        disabled={clearHistoryMutation.isLoading}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Xóa lịch sử"
                    >
                        <FiTrash2 className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={() => refetch()}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Làm mới"
                >
                    <FiRefreshCw className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Content */}
        {recentDocuments.length === 0 ? (
            <div className="text-center py-8">
                <FiClock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Chưa có tài liệu nào được xem gần đây</p>
                <Link
                    to="/documents"
                    className="inline-block mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                    Khám phá tài liệu
                </Link>
            </div>
        ) : (
            <div className="space-y-3">
                {recentDocuments.map((document) => (
                    <Link
                        key={document.id}
                        to={`/documents/${document.id}`}
                        className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <FiFileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-500 truncate">
                                        {document.document_code}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(document.status)}`}>
                                        {document.status}
                                    </span>
                                </div>
                                <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                                    {document.title}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>{getDocumentTypeDisplay(document.type)}</span>
                                    <span>- </span>
                                    <span>{document.department}</span>
                                    <span>- </span>
                                    <span>v{document.version}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end ml-3">
                                <FiEye className="w-4 h-4 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">
                                    {formatTimeAgo(document.last_viewed_at)}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        )}

        {/* Footer */}
        {recentDocuments.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
                <Link
                    to="/recent"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    Xem tất cả tài liệu gần đây →
                </Link>
            </div>
        )}
    </div>
);
}

export default RecentDocumentsWidget;
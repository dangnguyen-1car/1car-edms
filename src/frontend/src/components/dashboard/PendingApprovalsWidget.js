// src/frontend/src/components/dashboard/PendingApprovalsWidget.js
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiClock, FiUser, FiExternalLink, FiAlertCircle } from 'react-icons/fi';
import { dashboardService } from '../../services/dashboardService';
import LoadingSpinner from '../common/LoadingSpinner';

function PendingApprovalsWidget({ className = '' }) {
    // --- BẮT ĐẦU SỬA ĐỔI ---
    // 1. Cập nhật cú pháp useQuery sang dạng object được khuyến nghị.
    // 2. Sử dụng `isPending` thay cho `isLoading` cho trạng thái tải lần đầu.
    // 3. Đổi tên `data` thành `response` để xử lý dữ liệu trả về một cách tường minh hơn.
    const {
        data: response,
        isPending, // Sửa từ isLoading sang isPending
        error
    } = useQuery({
        queryKey: ['pendingApprovals'], // queryKey nên là một mảng
        queryFn: () => dashboardService.getPendingApprovals(8), // queryFn là hàm bất đồng bộ
        refetchInterval: 3 * 60 * 1000,
        staleTime: 1 * 60 * 1000,
    });

    // 4. Sửa lỗi logic: Trích xuất mảng `data` từ `response` một cách an toàn.
    //    `response` là toàn bộ object trả về từ axios, còn `response.data` mới là mảng tài liệu.
    //    Cung cấp một mảng rỗng `[]` làm giá trị mặc định để tránh lỗi nếu `response` hoặc `response.data` không tồn tại.
    const pendingDocs = response?.data || [];
    // --- KẾT THÚC SỬA ĐỔI ---

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Không xác định';
        const now = new Date();
        const docTime = new Date(timestamp);
        const diffMs = now - docTime;
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffHours < 1) return 'Vừa xong';
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return `${Math.floor(diffHours / 24)} ngày trước`;
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'text-red-600 bg-red-100';
            case 'high':
                return 'text-orange-600 bg-orange-100';
            case 'normal':
                return 'text-blue-600 bg-blue-100';
            case 'low':
                return 'text-gray-600 bg-gray-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getPriorityLabel = (priority) => {
        // ... (hàm này không thay đổi)
        switch (priority) {
            case 'urgent': return 'Khẩn cấp';
            case 'high': return 'Cao';
            case 'normal': return 'Bình thường';
            case 'low': return 'Thấp';
            default: return 'Bình thường';
        }
    };

    // Thay `isLoading` bằng `isPending`
    if (isPending) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="flex items-center justify-center h-48">
                    <LoadingSpinner message="Đang tải tài liệu..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="text-center text-red-600">
                    <p>Không thể tải tài liệu cần phê duyệt</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Tài liệu Cần Phê duyệt</h3>
                    <Link
                        to="/documents?status=review"
                        className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
                    >
                        Xem tất cả
                        <FiExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                </div>

                <div className="space-y-3">
                    {/* Sửa lỗi logic: Kiểm tra `pendingDocs.length` thay vì `pendingDocs` */}
                    {pendingDocs.length > 0 ? (
                        pendingDocs.map((doc) => (
                            <div key={doc.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors duration-150">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            to={`/documents/${doc.id}`}
                                            className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate"
                                            title={doc.title}
                                        >
                                            {doc.title}
                                        </Link>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Mã: {doc.document_code}
                                        </p>
                                        <div className="flex items-center mt-2 space-x-3">
                                            <div className="flex items-center text-xs text-gray-500">
                                                <FiUser className="h-3 w-3 mr-1" />
                                                {doc.author_name}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-500">
                                                <FiClock className="h-3 w-3 mr-1" />
                                                {/* Giả sử API trả về `updated_at` hoặc tương tự */}
                                                {formatTimeAgo(doc.updated_at || doc.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-3 flex flex-col items-end space-y-1">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(doc.priority)}`}>
                                            {getPriorityLabel(doc.priority)}
                                        </span>
                                        <Link
                                            to={`/documents/${doc.id}`}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            <FiExternalLink className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            <FiAlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>Không có tài liệu nào cần phê duyệt</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PendingApprovalsWidget;
// src/frontend/src/components/dashboard/DocumentStatsWidget.js
import React from 'react';
import { useQuery } from '@tanstack/react-query'; // Đảm bảo import từ @tanstack/react-query
import { Link } from 'react-router-dom';
import { FiFileText, FiEdit, FiCheck, FiArchive, FiTrendingUp } from 'react-icons/fi';
import { dashboardService } from '../../services/dashboardService';
import LoadingSpinner from '../common/LoadingSpinner';

function DocumentStatsWidget({ className = '' }) {
    // --- BẮT ĐẦU SỬA ĐỔI ---
    // Thay đổi cú pháp của useQuery để tương thích hoàn toàn với @tanstack/react-query v4/v5.
    // 1. Sử dụng cú pháp object: useQuery({ queryKey: [...], queryFn: ... }).
    // 2. Đổi tên `data` thành `statsResponse` để code rõ ràng hơn.
    // 3. Sử dụng `isPending` thay cho `isLoading` để chỉ trạng thái tải lần đầu (best practice cho v5).
    const {
        data: statsResponse,
        isPending, // Sửa từ isLoading sang isPending
        error,
    } = useQuery({
        queryKey: ['documentStats'], // key được đặt trong một mảng
        queryFn: () => dashboardService.getDocumentStats(), // queryFn là hàm thực thi
        refetchInterval: 5 * 60 * 1000, // 5 phút
        staleTime: 2 * 60 * 1000, // 2 phút
    });
    // --- KẾT THÚC SỬA ĐỔI ---

    // Lấy dữ liệu thực tế từ response
    const stats = statsResponse?.data;

    // Sửa điều kiện kiểm tra loading
    if (isPending) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="flex items-center justify-center h-48">
                    <LoadingSpinner message="Đang tải thống kê..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="text-center text-red-600">
                    <p>Không thể tải thống kê tài liệu</p>
                    <p className="text-xs mt-1">{(error).message}</p>
                </div>
            </div>
        );
    }

    const statItems = [
        {
            label: 'Nháp',
            // Truy cập vào `stats` thay vì `stats.data`
            value: stats?.draft_count || 0,
            icon: FiEdit,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100',
            link: '/documents?status=draft'
        },
        {
            label: 'Đang duyệt',
            value: stats?.review_count || 0,
            icon: FiFileText,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            link: '/documents?status=review'
        },
        {
            label: 'Đã phê duyệt',
            value: stats?.published_count || 0,
            icon: FiCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            link: '/documents?status=published'
        },
        {
            label: 'Lưu trữ',
            value: stats?.archived_count || 0,
            icon: FiArchive,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
            link: '/documents?status=archived'
        }
    ];

    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Thống kê Tài liệu</h3>
                    <FiTrendingUp className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {statItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={index}
                                to={item.link}
                                className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-150"
                            >
                                <div className="flex items-center">
                                    <div className={`p-2 rounded-lg ${item.bgColor}`}>
                                        <Icon className={`h-5 w-5 ${item.color}`} />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-600">{item.label}</p>
                                        <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {stats?.total_documents && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Tổng số tài liệu:</span>
                            <span className="font-semibold text-gray-900">{stats.total_documents}</span>
                        </div>
                        {stats.recent_count && (
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-gray-600">Tạo trong 30 ngày:</span>
                                <span className="font-semibold text-green-600">{stats.recent_count}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentStatsWidget;
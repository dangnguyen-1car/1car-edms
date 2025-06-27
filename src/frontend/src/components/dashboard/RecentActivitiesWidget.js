// src/frontend/src/components/dashboard/RecentActivitiesWidget.js

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiActivity, FiUser, FiFileText, FiClock, FiExternalLink, FiRefreshCw } from 'react-icons/fi';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

function RecentActivitiesWidget({ className = '' }) {
    const { user } = useAuth();
    
    // --- BẮT ĐẦU GIẢI PHÁP TRIỆT ĐỂ ---
    const { data: activities, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['recentActivitiesForDashboard', user?.id], 
        queryFn: () => {
            let params = { limit: 10 };
            
            if (user?.role === 'manager') {
                params.department = user.department;
            } else if (user?.role === 'user') {
                params.userId = user.id;
            }
            
            return dashboardService.getRecentActivities(
                params.limit, 
                params.userId, 
                params.department
            );
        },
        // ** GIẢI PHÁP "PHÁ VỠ" CACHE **
        // 1. staleTime = 0: Coi dữ liệu là "cũ" ngay sau khi được lấy về.
        // Điều này buộc React Query phải gọi lại API mỗi khi component được render
        // hoặc khi focus lại vào cửa sổ.
        staleTime: 0,
        
        // 2. cacheTime = 0: Hủy dữ liệu khỏi cache ngay khi không còn component nào sử dụng nó.
        // Điều này ngăn việc dữ liệu cũ được phục vụ lại từ bộ nhớ.
        cacheTime: 0,
        
        // 3. Vẫn giữ các cấu hình này để có trải nghiệm tốt.
        refetchOnWindowFocus: true,
        enabled: !!user,
    });
    // --- KẾT THÚC GIẢI PHÁP TRIỆT ĐỂ ---

    const getActivityIcon = (action) => {
        switch (action) {
            case 'DOCUMENT_CREATED':
                return FiFileText;
            case 'DOCUMENT_UPDATED':
                return FiFileText;
            case 'DOCUMENT_VIEWED':
                return FiFileText;
            case 'DOCUMENT_DOWNLOADED':
                return FiFileText;
            case 'DOCUMENT_VERSION_CREATED':
                return FiFileText;
            case 'WORKFLOW_TRANSITION':
                return FiFileText;
            case 'LOGIN':
                return FiUser;
            default:
                return FiActivity;
        }
    };

    const getActivityColor = (action) => {
        switch (action) {
            case 'DOCUMENT_CREATED':
                return 'text-green-600 bg-green-100';
            case 'DOCUMENT_UPDATED':
                return 'text-blue-600 bg-blue-100';
            case 'DOCUMENT_VERSION_CREATED':
                return 'text-purple-600 bg-purple-100';
            case 'WORKFLOW_TRANSITION':
                return 'text-orange-600 bg-orange-100';
            case 'DOCUMENT_VIEWED':
                return 'text-indigo-600 bg-indigo-100';
            case 'DOCUMENT_DOWNLOADED':
                return 'text-teal-600 bg-teal-100';
            case 'LOGIN':
                return 'text-gray-600 bg-gray-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const formatActivityMessage = (activity) => {
        const userName = activity.user_name || 'Người dùng';
        const documentTitle = activity.document_title || activity.document_code || 'tài liệu';
        
        switch (activity.action) {
            case 'DOCUMENT_CREATED':
                return `${userName} đã tạo tài liệu "${documentTitle}"`;
            case 'DOCUMENT_UPDATED':
                return `${userName} đã cập nhật tài liệu "${documentTitle}"`;
            case 'DOCUMENT_VERSION_CREATED':
                return `${userName} đã tạo phiên bản mới cho "${documentTitle}"`;
            case 'WORKFLOW_TRANSITION':
                return `${userName} đã thay đổi trạng thái tài liệu "${documentTitle}"`;
            case 'DOCUMENT_VIEWED':
                return `${userName} đã xem tài liệu "${documentTitle}"`;
            case 'DOCUMENT_DOWNLOADED':
                return `${userName} đã tải xuống tài liệu "${documentTitle}"`;
            case 'LOGIN':
                return `${userName} đã đăng nhập hệ thống`;
            default:
                return activity.details?.message || `${userName} đã thực hiện hành động ${activity.action}`;
        }
    };

    const formatTimeAgo = (timestamp) => {
        // --- BẮT ĐẦU SỬA ĐỔI ---
        const activityTime = new Date(timestamp);
        // Kiểm tra xem timestamp có hợp lệ không
        if (isNaN(activityTime.getTime())) {
            return 'Thời gian không xác định';
        }
        
        // Lấy thời gian hiện tại theo giờ UTC
        const now = new Date();
        
        // Tính toán chênh lệch thời gian bằng mili-giây
        const diffMs = now.getTime() - activityTime.getTime();
        
        // Chuyển đổi sang giây, phút, giờ, ngày
        const diffSeconds = Math.round(diffMs / 1000);
        const diffMins = Math.round(diffSeconds / 60);
        const diffHours = Math.round(diffMins / 60);
        const diffDays = Math.round(diffHours / 24);

        if (diffSeconds < 60) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 30) return `${diffDays} ngày trước`;

        // Nếu hơn 30 ngày, hiển thị ngày cụ thể
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(activityTime);
        // --- KẾT THÚC SỬA ĐỔI ---
    };

    const getActivityLink = (activity) => {
        if (activity.resource_type === 'document' && activity.resource_id) {
            return `/documents/${activity.resource_id}`;
        }
        return null;
    };

    const getWidgetTitle = () => {
        switch (user?.role) {
            case 'admin':
                return 'Hoạt động Hệ thống';
            case 'manager':
                return `Hoạt động ${user.department}`;
            case 'user':
                return 'Hoạt động của tôi';
            default:
                return 'Hoạt động Gần đây';
        }
    };
    
    if (isLoading) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="flex items-center justify-center h-48">
                    <LoadingSpinner message="Đang tải hoạt động..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="text-center text-red-600">
                    <p>Không thể tải hoạt động gần đây</p>
                    <p className="text-sm text-gray-500 mt-1">{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{getWidgetTitle()}</h3>
                    
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => refetch()} 
                            disabled={isFetching}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Làm mới"
                        >
                            <FiRefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </button>
                        {user?.role === 'admin' && (
                            <Link 
                                to="/reports/activity" 
                                className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
                            >
                                Xem tất cả
                                <FiExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {activities && activities.data && activities.data.length > 0 ? (
                        activities.data.map((activity, index) => {
                            const Icon = getActivityIcon(activity.action);
                            const colorClass = getActivityColor(activity.action);
                            const activityLink = getActivityLink(activity);
                            
                            return (
                                <div key={index} className="flex items-start space-x-3">
                                    <div className={`p-2 rounded-full ${colorClass}`}>
                                        <Icon className="h-3 w-3" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900">
                                            {formatActivityMessage(activity)}
                                        </p>
                                        <div className="flex items-center mt-1 text-xs text-gray-500">
                                            <FiClock className="h-3 w-3 mr-1" />
                                            {formatTimeAgo(activity.timestamp)}
                                            {activity.user_department && user?.role === 'admin' && (
                                                <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-xs">
                                                    {activity.user_department}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {activityLink && (
                                        <Link
                                            to={activityLink}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            <FiExternalLink className="h-4 w-4" />
                                        </Link>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            <FiActivity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>Chưa có hoạt động nào</p>
                            {user?.role === 'manager' && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Hiển thị hoạt động của phòng {user.department}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RecentActivitiesWidget;
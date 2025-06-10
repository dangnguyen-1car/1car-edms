// src/frontend/src/components/dashboard/RecentActivitiesWidget.js
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiActivity, FiUser, FiFileText, FiClock, FiExternalLink } from 'react-icons/fi';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

function RecentActivitiesWidget({ className = '' }) {
    const { user } = useAuth();
    
    const { data: activities, isLoading, error } = useQuery(
        // Key bao gồm cả department để React Query cache đúng cho Manager
        ['recentActivities', user?.role, user?.department],
        () => {
            // Xác định parameters dựa trên vai trò
            let params = { limit: 10 };
            
            if (user?.role === 'manager') {
                // Manager xem hoạt động của phòng ban
                params.department = user.department;
            } else if (user?.role === 'user') {
                // User chỉ xem hoạt động của mình
                params.userId = user.id;
            }
            // Admin không cần truyền gì thêm, sẽ lấy toàn bộ
            
            return dashboardService.getRecentActivities(
                params.limit, 
                params.userId, 
                params.department
            );
        },
        {
            refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
            staleTime: 1 * 60 * 1000, // Consider data stale after 1 minute
            enabled: !!user, // Only run query when user is available
        }
    );

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
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffMs = now - activityTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return `${diffDays} ngày trước`;
    };

    const getActivityLink = (activity) => {
        if (activity.resource_type === 'document' && activity.resource_id) {
            return `/documents/${activity.resource_id}`;
        }
        return null;
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

    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{getWidgetTitle()}</h3>
                    {user?.role === 'admin' && (
                        <Link 
                            to="/activity" 
                            className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
                        >
                            Xem tất cả
                            <FiExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                    )}
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

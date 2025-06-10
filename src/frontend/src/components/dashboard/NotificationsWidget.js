// src/frontend/src/components/dashboard/NotificationsWidget.js
import React from 'react';
// Sửa đổi 1: Đảm bảo các hook được import từ @tanstack/react-query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiBell, FiCheck, FiExternalLink, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { dashboardService } from '../../services/dashboardService';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-hot-toast';

function NotificationsWidget({ className = '' }) {
    const queryClient = useQueryClient();

    // --- BẮT ĐẦU SỬA ĐỔI ---
    // 2. Thay đổi cú pháp của useQuery sang dạng object được khuyến nghị.
    // 3. Sử dụng `isPending` thay cho `isLoading` cho trạng thái tải lần đầu.
    const {
        data: response,
        isPending, // Thay 'isLoading' bằng 'isPending'
        error
    } = useQuery({
        queryKey: ['notifications'], // Chuyển key vào một mảng
        queryFn: () => dashboardService.getNotifications(8, false),
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
        staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    });
    // --- KẾT THÚC SỬA ĐỔI ---

    // Chú ý: `useMutation` của bạn đã được viết theo cú pháp tương thích với v4/v5 nên không cần sửa.
    const markAsReadMutation = useMutation({
        mutationFn: (notificationId) => dashboardService.markNotificationAsRead(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Đã đánh dấu đã đọc');
        },
        onError: () => {
            toast.error('Không thể cập nhật thông báo');
        }
    });
    
    // Logic trích xuất dữ liệu này đã đúng, không cần sửa.
    const notifications = response?.data || [];
    
    const getNotificationIcon = (type) => {
        // ... (hàm này không thay đổi)
        switch (type) {
            case 'document_approval': return FiCheck;
            case 'document_review': return FiBell;
            case 'system_alert': return FiAlertCircle;
            default: return FiInfo;
        }
    };

    const getNotificationColor = (type, isRead) => {
        // ... (hàm này không thay đổi)
        const baseColor = isRead ? 'text-gray-400 bg-gray-100' : '';
        switch (type) {
            case 'document_approval': return isRead ? baseColor : 'text-green-600 bg-green-100';
            case 'document_review': return isRead ? baseColor : 'text-blue-600 bg-blue-100';
            case 'system_alert': return isRead ? baseColor : 'text-red-600 bg-red-100';
            default: return isRead ? baseColor : 'text-gray-600 bg-gray-100';
        }
    };

    const formatTimeAgo = (timestamp) => {
        // ... (hàm này không thay đổi)
        const now = new Date();
        const notifTime = new Date(timestamp);
        const diffMs = now - notifTime;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return `${Math.floor(diffHours / 24)} ngày trước`;
    };

    const handleMarkAsRead = (notificationId, e) => {
        e.preventDefault();
        e.stopPropagation();
        markAsReadMutation.mutate(notificationId);
    };
    
    // Thay `isLoading` bằng `isPending` để kiểm tra trạng thái tải lần đầu
    if (isPending) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="flex items-center justify-center h-48">
                    <LoadingSpinner message="Đang tải thông báo..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="text-center text-red-600">
                    <p>Không thể tải thông báo</p>
                </div>
            </div>
        );
    }
    
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-gray-900">Thông báo</h3>
                        {unreadCount > 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {unreadCount} mới
                            </span>
                        )}
                    </div>
                    <Link 
                        to="/notifications" 
                        className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
                    >
                        Xem tất cả
                        <FiExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                </div>

                <div className="space-y-3">
                    {notifications.length > 0 ? (
                        notifications.map((notification) => {
                            const Icon = getNotificationIcon(notification.type);
                            const colorClass = getNotificationColor(notification.type, notification.is_read);
                            
                            return (
                                <div 
                                    key={notification.id} 
                                    className={`flex items-start space-x-3 p-3 rounded-lg border ${
                                        notification.is_read ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'
                                    }`}
                                >
                                    <div className={`p-2 rounded-full ${colorClass}`}>
                                        <Icon className="h-3 w-3" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${notification.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {formatTimeAgo(notification.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        {!notification.is_read && (
                                            <button
                                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                className="text-blue-600 hover:text-blue-700 p-1"
                                                title="Đánh dấu đã đọc"
                                                disabled={markAsReadMutation.isPending}
                                            >
                                                <FiCheck className="h-4 w-4" />
                                            </button>
                                        )}
                                        {notification.link && (
                                            <Link
                                                to={notification.link}
                                                className="text-blue-600 hover:text-blue-700 p-1"
                                            >
                                                <FiExternalLink className="h-4 w-4" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            <FiBell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>Không có thông báo nào</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NotificationsWidget;
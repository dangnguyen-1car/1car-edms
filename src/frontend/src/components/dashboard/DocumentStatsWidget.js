// src/frontend/src/components/dashboard/DocumentStatsWidget.js
import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { FiFileText, FiEdit, FiCheck, FiArchive, FiTrendingUp } from 'react-icons/fi';
import { dashboardService } from '../../services/dashboardService';
import LoadingSpinner from '../common/LoadingSpinner';

function DocumentStatsWidget({ className = '' }) {
    const { data: stats, isLoading, error } = useQuery(
        'documentStats',
        () => dashboardService.getDocumentStats(),
        {
            refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
            staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
        }
    );

    if (isLoading) {
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
                </div>
            </div>
        );
    }

    const statItems = [
        {
            label: 'Nháp',
            value: stats?.draftCount || 0,
            icon: FiEdit,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100',
            link: '/documents?status=draft'
        },
        {
            label: 'Đang duyệt',
            value: stats?.reviewCount || 0,
            icon: FiFileText,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            link: '/documents?status=review'
        },
        {
            label: 'Đã phê duyệt',
            value: stats?.publishedCount || 0,
            icon: FiCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            link: '/documents?status=published'
        },
        {
            label: 'Lưu trữ',
            value: stats?.archivedCount || 0,
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

                {stats?.totalCount && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Tổng số tài liệu:</span>
                            <span className="font-semibold text-gray-900">{stats.totalCount}</span>
                        </div>
                        {stats.recentCount && (
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-gray-600">Tạo trong 30 ngày:</span>
                                <span className="font-semibold text-green-600">{stats.recentCount}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentStatsWidget;

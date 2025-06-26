// src/frontend/src/pages/RecentDocumentsPage.js
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiClock, FiSearch, FiRefreshCw, FiHome, FiTrash2, FiFilter } from 'react-icons/fi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
// Component imports
import DocumentCard from '../components/documents/DocumentCard';
import { PageLoader } from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import Breadcrumb from '../components/common/Breadcrumb';
// Service imports
import { favoritesService } from '../services/favoritesService';
import { useAuth } from '../contexts/AuthContext';

function RecentDocumentsPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [timeRange, setTimeRange] = useState('all'); // 'all', 'today', 'week', 'month'

    // Query để lấy danh sách tài liệu gần đây
    const {
        data: recentData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['recent-documents-full'],
        queryFn: () => favoritesService.getRecentDocuments(50), // Lấy nhiều hơn cho trang chính
        enabled: !!user,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Query để lấy thống kê
    const { data: statsData } = useQuery({
        queryKey: ['recent-documents-stats'],
        queryFn: () => favoritesService.getRecentDocumentsStats(),
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Mutation để xóa lịch sử
    const clearHistoryMutation = useMutation({
        mutationFn: () => favoritesService.clearRecentHistory(),
        onSuccess: () => {
            toast.success('Đã xóa lịch sử xem tài liệu');
            queryClient.invalidateQueries(['recent-documents-full']);
            queryClient.invalidateQueries(['recent-documents']);
            queryClient.invalidateQueries(['recent-documents-stats']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Không thể xóa lịch sử');
        }
    });

    const recentDocuments = recentData?.data || [];
    const stats = statsData?.data || {};

    const breadcrumbItems = [
        { label: 'Trang chủ', href: '/', icon: FiHome },
        { label: 'Tài liệu gần đây', icon: FiClock }
    ];

    // Filter documents based on search and filters
    const filteredDocuments = recentDocuments.filter(document => {
        // Search filter
        if (searchTerm && !document.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !document.document_code.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        // Type filter
        if (filterType && document.type !== filterType) {
            return false;
        }

        // Department filter
        if (filterDepartment && document.department !== filterDepartment) {
            return false;
        }

        // Time range filter
        if (timeRange !== 'all') {
            const viewedAt = new Date(document.last_viewed_at);
            const now = new Date();
            const diffInDays = Math.floor((now - viewedAt) / (1000 * 60 * 60 * 24));
            switch (timeRange) {
                case 'today':
                    if (diffInDays > 0) return false;
                    break;
                case 'week':
                    if (diffInDays > 7) return false;
                    break;
                case 'month':
                    if (diffInDays > 30) return false;
                    break;
                default:
                    break;
            }
        }
        return true;
    });

    const handleClearHistory = () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem tài liệu?')) {
            clearHistoryMutation.mutate();
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterType('');
        setFilterDepartment('');
        setTimeRange('all');
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <FiClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Vui lòng đăng nhập
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Bạn cần đăng nhập để xem lịch sử tài liệu gần đây.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Đăng nhập
                    </Link>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <PageLoader />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <Breadcrumb items={breadcrumbItems} />
                    <ErrorMessage
                        message="Không thể tải danh sách tài liệu gần đây"
                        onRetry={refetch}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Breadcrumb */}
                <Breadcrumb items={breadcrumbItems} />

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <FiClock className="text-blue-600" />
                                Tài liệu gần đây
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Lịch sử các tài liệu bạn đã xem gần đây
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {recentDocuments.length > 0 && (
                                <button
                                    onClick={handleClearHistory}
                                    disabled={clearHistoryMutation.isLoading}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                    Xóa lịch sử
                                </button>
                            )}
                            <button
                                onClick={() => refetch()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <FiRefreshCw className="w-4 h-4" />
                                Làm mới
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="text-2xl font-bold text-blue-600">{stats.total_viewed || 0}</div>
                                <div className="text-sm text-gray-600">Tổng số đã xem</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="text-2xl font-bold text-green-600">{stats.viewed_today || 0}</div>
                                <div className="text-sm text-gray-600">Xem hôm nay</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="text-2xl font-bold text-orange-600">{stats.viewed_this_week || 0}</div>
                                <div className="text-sm text-gray-600">Xem tuần này</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="text-2xl font-bold text-purple-600">
                                    {stats.last_activity ? new Date(stats.last_activity).toLocaleDateString('vi-VN') : 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">Hoạt động cuối</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search and Filter */}
                <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm trong tài liệu gần đây..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Tất cả loại tài liệu</option>
                                <option value="PL">Chính sách (PL)</option>
                                <option value="PR">Quy trình (PR)</option>
                                <option value="WI">Hướng dẫn (WI)</option>
                                <option value="FM">Biểu mẫu (FM)</option>
                                <option value="TD">Tài liệu kỹ thuật (TD)</option>
                                <option value="TR">Tài liệu đào tạo (TR)</option>
                                <option value="RC">Hồ sơ (RC)</option>
                            </select>
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">Tất cả thời gian</option>
                                <option value="today">Hôm nay</option>
                                <option value="week">Tuần này</option>
                                <option value="month">Tháng này</option>
                            </select>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <FiFilter className="w-4 h-4 inline mr-2" />
                                Xóa bộ lọc
                            </button>
                        </div>
                    </form>
                </div>

                {/* Content */}
                {filteredDocuments.length === 0 ? (
                    <div className="text-center py-12">
                        <FiClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {recentDocuments.length === 0
                                ? 'Chưa có tài liệu nào được xem gần đây'
                                : 'Không tìm thấy tài liệu phù hợp'
                            }
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {recentDocuments.length === 0
                                ? 'Hãy bắt đầu khám phá các tài liệu trong hệ thống.'
                                : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                            }
                        </p>
                        {recentDocuments.length === 0 && (
                            <Link
                                to="/documents"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Khám phá tài liệu
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Results count */}
                        <div className="mb-4 text-sm text-gray-600">
                            Hiển thị {filteredDocuments.length} trong tổng số {recentDocuments.length} tài liệu gần đây
                        </div>
                        {/* Document Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDocuments.map((document) => (
                                <DocumentCard
                                    key={document.id}
                                    document={document}
                                    onViewClick={(id) => window.location.href = `/documents/${id}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default RecentDocumentsPage;
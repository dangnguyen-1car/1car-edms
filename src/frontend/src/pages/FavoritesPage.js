// src/frontend/src/pages/FavoritesPage.js
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiStar, FiSearch, FiFilter, FiRefreshCw, FiHome } from 'react-icons/fi';
// Component imports
import DocumentCard from '../components/documents/DocumentCard';
import { PageLoader } from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import Breadcrumb from '../components/common/Breadcrumb';
// Service imports
import { favoritesService } from '../services/favoritesService';
import { useAuth } from '../contexts/AuthContext';

function FavoritesPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    // Query để lấy danh sách favorites
    const {
        data: favoritesData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['favorites', currentPage, pageSize, sortBy, sortOrder, searchTerm],
        queryFn: () => favoritesService.getFavorites({
            page: currentPage,
            limit: pageSize,
            sortBy,
            sortOrder,
            search: searchTerm
        }),
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Query để lấy thống kê
    const { data: statsData } = useQuery({
        queryKey: ['favorites-stats'],
        queryFn: () => favoritesService.getFavoritesStats(),
        enabled: !!user,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    const favorites = favoritesData?.data || [];
    const pagination = favoritesData?.pagination || {};
    const stats = statsData?.data || {};

    const breadcrumbItems = [
        { label: 'Trang chủ', href: '/', icon: FiHome },
        { label: 'Tài liệu yêu thích', icon: FiStar }
    ];

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1); // Reset về trang đầu khi search
    };


    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <FiStar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Vui lòng đăng nhập
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Bạn cần đăng nhập để xem danh sách tài liệu yêu thích.
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
                        message="Không thể tải danh sách tài liệu yêu thích"
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
                                <FiStar className="text-yellow-500" />
                                Tài liệu yêu thích
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Quản lý các tài liệu bạn đã đánh dấu yêu thích
                            </p>
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <FiRefreshCw className="w-4 h-4" />
                            Làm mới
                        </button>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="text-2xl font-bold text-blue-600">{stats.total_favorites || 0}</div>
                                <div className="text-sm text-gray-600">Tổng số yêu thích</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="text-2xl font-bold text-green-600">{stats.published_count || 0}</div>
                                <div className="text-sm text-gray-600">Đã xuất bản</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="text-2xl font-bold text-orange-600">{stats.draft_count || 0}</div>
                                <div className="text-sm text-gray-600">Bản nháp</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="text-2xl font-bold text-purple-600">{stats.recent_favorites || 0}</div>
                                <div className="text-sm text-gray-600">Mới trong tuần</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search and Filter */}
                <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm trong tài liệu yêu thích..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                                    setSortBy(newSortBy);
                                    setSortOrder(newSortOrder);
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="created_at-desc">Mới nhất</option>
                                <option value="created_at-asc">Cũ nhất</option>
                                <option value="title-asc">Tên A-Z</option>
                                <option value="title-desc">Tên Z-A</option>
                                <option value="updated_at-desc">Cập nhật mới nhất</option>
                            </select>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <FiFilter className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Content */}
                {favorites.length === 0 ? (
                    <div className="text-center py-12">
                        <FiStar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm ? 'Không tìm thấy tài liệu' : 'Chưa có tài liệu yêu thích'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm
                                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.'
                                : 'Hãy đánh dấu yêu thích các tài liệu quan trọng để truy cập nhanh chóng.'
                            }
                        </p>
                        {!searchTerm && (
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
                        {/* Document Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {favorites.map((document) => (
                                <DocumentCard
                                    key={document.id}
                                    document={document}
                                    onViewClick={(id) => window.location.href = `/documents/${id}`}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Hiển thị {((currentPage - 1) * pageSize) + 1} đến {Math.min(currentPage * pageSize, pagination.total)}
                                    trong tổng số {pagination.total} tài liệu
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Trước
                                    </button>
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        const page = i + 1;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`px-3 py-2 border rounded-lg ${
                                                    currentPage === page
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === pagination.totalPages}
                                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default FavoritesPage;
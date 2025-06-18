// src/frontend/src/components/documents/PendingDocumentTable.js - Đã tái cấu trúc loại bỏ code trùng lặp
import React from 'react';
import { FiAlertTriangle, FiClock, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { getStatusBadgeColor, getPriorityBadgeColor, getDocumentTypeDisplay } from '../../utils/documentUtils';
import WorkflowActionButtons from './WorkflowActionButtons';

function PendingDocumentTable({
    documents,
    onSort,
    currentSort,
    pagination,
    onPageChange,
    currentUser
}) {
    // =================================================================
    // Helper Functions for UI Logic
    // =================================================================

    const getPriorityIcon = (priority) => {
        if (priority === 'urgent') return <FiAlertTriangle className="text-red-500" />;
        if (priority === 'high') return <FiClock className="text-orange-500" />;
        return null;
    };

    const getDaysPendingColor = (days) => {
        if (days > 7) return 'text-red-600 font-semibold';
        if (days > 3) return 'text-orange-600 font-medium';
        return 'text-gray-600';
    };

    const getRoleDisplayName = (role) => {
        const roleNames = {
            'reviewer': 'Kiểm tra',
            'approver': 'Phê duyệt',
            'admin': 'Quản trị',
            'viewer': 'Xem'
        };
        return roleNames[role] || role;
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            'reviewer': 'bg-blue-100 text-blue-800',
            'approver': 'bg-green-100 text-green-800',
            'admin': 'bg-purple-100 text-purple-800',
            'viewer': 'bg-gray-100 text-gray-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    const getSortIcon = (column) => {
        if (currentSort?.column !== column) {
            return <FiChevronUp className="w-4 h-4 text-gray-400" />;
        }
        return currentSort.order === 'asc' ?
            <FiChevronUp className="w-4 h-4 text-blue-600" /> :
            <FiChevronDown className="w-4 h-4 text-blue-600" />;
    };

    return (
        <div className="pending-document-table">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => onSort('document_code')}
                            >
                                <div className="flex items-center">
                                    Mã tài liệu
                                    {getSortIcon('document_code')}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => onSort('title')}
                            >
                                <div className="flex items-center">
                                    Tiêu đề
                                    {getSortIcon('title')}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Người gửi
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Phòng ban
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => onSort('priority')}
                            >
                                <div className="flex items-center">
                                    Mức độ
                                    {getSortIcon('priority')}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => onSort('updated_at')}
                            >
                                <div className="flex items-center">
                                    Ngày gửi
                                    {getSortIcon('updated_at')}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Chờ (ngày)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Vai trò của bạn
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {documents.map((document) => (
                            <tr key={document.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                        {document.document_code}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 mr-2">
                                            {getPriorityIcon(document.priority)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                to={`/documents/${document.id}`}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                            >
                                                {document.title}
                                            </Link>
                                            {document.description && (
                                                <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                    {document.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{document.author_name}</div>
                                    <div className="text-sm text-gray-500">{document.author_department}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {document.department}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeColor(document.priority)}`}>
                                        {document.priority === 'urgent' && 'Khẩn cấp'}
                                        {document.priority === 'high' && 'Cao'}
                                        {document.priority === 'normal' && 'Bình thường'}
                                        {document.priority === 'low' && 'Thấp'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(document.updated_at).toLocaleDateString('vi-VN')}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getDaysPendingColor(document.days_pending)}`}>
                                    {Math.round(document.days_pending || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(document.user_role_in_workflow)}`}>
                                        {getRoleDisplayName(document.user_role_in_workflow)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {/* Sử dụng component WorkflowActionButtons đã tái cấu trúc */}
                                    <WorkflowActionButtons
                                        document={document}
                                        currentUser={currentUser}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            disabled={pagination.page === 1}
                            onClick={() => onPageChange(pagination.page - 1)}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Trước
                        </button>
                        <button
                            disabled={pagination.page === pagination.totalPages}
                            onClick={() => onPageChange(pagination.page + 1)}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Sau
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Hiển thị{' '}
                                <span className="font-medium">
                                    {(pagination.page - 1) * pagination.limit + 1}
                                </span>{' '}
                                đến{' '}
                                <span className="font-medium">
                                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                                </span>{' '}
                                trong{' '}
                                <span className="font-medium">{pagination.total}</span> kết quả
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    disabled={pagination.page === 1}
                                    onClick={() => onPageChange(pagination.page - 1)}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <span className="sr-only">Trang trước</span>
                                    <FiChevronUp className="h-5 w-5 transform -rotate-90" />
                                </button>

                                {/* Page numbers */}
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    const pageNum = Math.max(1, Math.min(
                                        pagination.totalPages - 4,
                                        pagination.page - 2
                                    )) + i;

                                    if (pageNum > pagination.totalPages) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => onPageChange(pageNum)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${pageNum === pagination.page
                                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    disabled={pagination.page === pagination.totalPages}
                                    onClick={() => onPageChange(pagination.page + 1)}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <span className="sr-only">Trang sau</span>
                                    <FiChevronDown className="h-5 w-5 transform -rotate-90" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PendingDocumentTable;
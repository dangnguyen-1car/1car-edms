// src/frontend/src/components/documents/DocumentCard.js
import React from 'react';
import { FiFileText, FiUser, FiCalendar, FiEye, FiDownload, FiEdit, FiTag, FiTrash2, FiStar } from 'react-icons/fi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { favoritesService } from '../../services/favoritesService';
import { toast } from 'react-hot-toast';
import { getDocumentTypeDisplay, getStatusDisplay, getStatusBadgeColor } from '../../utils/documentUtils';

function DocumentCard({ document, onViewClick, onEditClick, onDeleteClick }) {
    // TẤT CẢ HOOKS ĐƯỢC GỌI Ở CẤP CAO NHẤT
    const { user, hasPermission, canAccessDepartment } = useAuth();
    const queryClient = useQueryClient();

    // Mutation cho toggle favorite với Optimistic Update
    const toggleFavoriteMutation = useMutation({
        mutationFn: async ({ documentId, isFavorite }) => {
            if (isFavorite) {
                return await favoritesService.removeFromFavorites(documentId);
            } else {
                return await favoritesService.addToFavorites(documentId);
            }
        },
        onMutate: async ({ documentId, isFavorite }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries(['document', documentId]);
            await queryClient.cancelQueries(['favorites']);

            // Snapshot the previous value
            const previousDocument = queryClient.getQueryData(['document', documentId]);

            // Optimistically update to the new value
            queryClient.setQueryData(['document', documentId], old => ({
                ...old,
                data: {
                    ...old?.data,
                    is_favorite: !isFavorite
                }
            }));

            // Return a context object with the snapshotted value
            return { previousDocument, documentId };
        },
        onError: (err, variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousDocument) {
                queryClient.setQueryData(['document', context.documentId], context.previousDocument);
            }
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật yêu thích');
        },
        onSuccess: (data, { isFavorite }) => {
            toast.success(isFavorite ? 'Đã xóa khỏi yêu thích' : 'Đã thêm vào yêu thích');
            // Invalidate and refetch favorites list
            queryClient.invalidateQueries(['favorites']);
        },
        onSettled: (data, error, { documentId }) => {
            // Always refetch after error or success
            queryClient.invalidateQueries(['document', documentId]);
        }
    });

    // CÂU LỆNH RETURN CÓ ĐIỀU KIỆN ĐƯỢC ĐẶT SAU KHI TẤT CẢ HOOKS ĐÃ ĐƯỢC GỌI
    if (!document) return null;

    const canEdit = () => {
        if (!user) return false;
        if (hasPermission('manage_system')) return true;
        if (document.author_id === user.id && document.status === 'draft') return true;
        return false;
    };

    const canDelete = () => {
        if (!user) return false;
        if (hasPermission('manage_system')) return true;
        if (document.author_id === user.id && document.status === 'draft') return true;
        return false;
    };

    const canView = () => {
        if (!user) {
            return document.security_level === 'public';
        }
        if (hasPermission('view_all_documents') || document.author_id === user.id) return true;
        if (canAccessDepartment(document.department)) return true;
        if (document.recipients && Array.isArray(document.recipients) && document.recipients.includes(user.department)) return true;
        if (document.security_level === 'public') return true;
        return false;
    };

    const handleToggleFavorite = (e) => {
        e.stopPropagation();
        if (!user) {
            toast.error("Vui lòng đăng nhập để sử dụng tính năng này.");
            return;
        }
        toggleFavoriteMutation.mutate({
            documentId: document.id,
            isFavorite: document.is_favorite
        });
    };

    const handleDownload = async (e) => {
        e.stopPropagation();
        if (!canView()) {
            toast.error("Bạn không có quyền tải tài liệu này.");
            return;
        }
        toast.promise(
            documentService.downloadDocument(document.id, document.title),
            {
                loading: 'Đang xử lý tải xuống...',
                success: (response) => `Đã bắt đầu tải '${response.filename || document.title}'.`,
                error: (err) => err.response?.data?.message || err.message || 'Lỗi khi tải xuống.',
            }
        );
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (!canDelete()) {
            toast.error("Bạn không có quyền xóa tài liệu này.");
            return;
        }
        if (onDeleteClick) {
            onDeleteClick(document);
        }
    };

    const cardClickHandler = () => {
        if (canView()) {
            if (onViewClick) {
                onViewClick(document.id);
            } else {
                toast.info(`Xem chi tiết tài liệu ID: ${document.id} (onViewClick not provided)`);
            }
        } else {
            toast.error("Bạn không có quyền xem tài liệu này.");
        }
    };

    return (
        <div
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            onClick={cardClickHandler}
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <FiFileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-600 truncate">
                                Mã: {document.document_code || 'N/A'}
                            </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                            {document.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                            Loại: {getDocumentTypeDisplay(document.type)}
                        </p>
                        {document.description && (
                            <p className="text-sm text-gray-500 line-clamp-2">
                                {document.description}
                            </p>
                        )}
                    </div>

                    {/* Favorite Button */}
                    {user && (
                        <button
                            onClick={handleToggleFavorite}
                            disabled={toggleFavoriteMutation.isLoading}
                            className={`ml-2 p-2 rounded-full transition-colors duration-200 ${
                                document.is_favorite
                                    ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                                    : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                            } ${toggleFavoriteMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={document.is_favorite ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                        >
                            <FiStar
                                className={`w-5 h-5 ${document.is_favorite ? 'fill-current' : ''}`}
                            />
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(document.status)}`}>
                        {getStatusDisplay(document.status)}
                    </span>
                    <span className="text-xs text-gray-500">
                        v{document.version || '1.0'}
                    </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <FiUser className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{document.author_name || 'Không xác định'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FiTag className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{document.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FiCalendar className="w-4 h-4 flex-shrink-0" />
                        <span>{new Date(document.updated_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    {canView() && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                cardClickHandler();
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors duration-200"
                            title="Xem chi tiết"
                        >
                            <FiEye className="w-3 h-3" />
                            Xem
                        </button>
                    )}

                    {canView() && (
                        <button
                            onClick={handleDownload}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors duration-200"
                            title="Tải xuống"
                        >
                            <FiDownload className="w-3 h-3" />
                            Tải
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {canEdit() && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onEditClick) onEditClick(document);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors duration-200"
                            title="Chỉnh sửa"
                        >
                            <FiEdit className="w-3 h-3" />
                            Sửa
                        </button>
                    )}

                    {canDelete() && (
                        <button
                            onClick={handleDelete}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
                            title="Xóa"
                        >
                            <FiTrash2 className="w-3 h-3" />
                            Xóa
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DocumentCard;
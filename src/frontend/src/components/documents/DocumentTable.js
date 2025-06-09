// src/frontend/src/components/documents/DocumentTable.js

// 1. IMPORTS
import React from 'react';
import { FiEye, FiEdit, FiDownload, FiTrash2, FiChevronUp, FiChevronDown, FiExternalLink } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { getStatusBadgeColor, getTypeBadgeColor, getStatusDisplay } from '../../utils/documentUtils';

// 2. COMPONENT DEFINITION
function DocumentTable({
  documents,
  onViewClick,
  onEditClick,
  onDeleteClick,
  onSort,
  currentSort
}) {
  // 3. HOOKS
  const { user, hasPermission, canAccessDepartment } = useAuth();

  // 4. LOGIC & HELPER FUNCTIONS
  // 4.1. Permission Checkers
  const canView = (document) => {
    if (!user) {
      return document.security_level === 'public';
    }
    if (hasPermission('view_all_documents') || document.author_id === user.id) return true;
    if (canAccessDepartment(document.department)) return true;
    if (document.recipients && Array.isArray(document.recipients) &&
        document.recipients.includes(user.department)) return true;
    if (document.security_level === 'public') return true;
    return false;
  };

  const canEdit = (document) => {
    if (!user) return false;
    if (hasPermission('manage_system')) return true;
    if (document.author_id === user.id && document.status === 'draft') return true;
    return false;
  };

  const canDelete = (document) => {
    if (!user) return false;
    if (hasPermission('manage_system')) return true;
    if (document.author_id === user.id && document.status === 'draft') return true;
    return false;
  };

  // 4.2. Event Handlers
  const handleView = (e, documentId) => {
    e.stopPropagation();
    if (onViewClick) {
      onViewClick(documentId);
    }
  };

  const handleEdit = (e, documentId) => {
    e.stopPropagation();
    if (onEditClick) {
      onEditClick(documentId);
    }
  };
  
  const handleDelete = (e, document) => {
    e.stopPropagation();
    if (!canDelete(document)) {
      toast.error("Bạn không có quyền xóa tài liệu này.");
      return;
    }
    if (onDeleteClick) {
      onDeleteClick(document);
    }
  };

  const handleDownload = async (e, document) => {
    e.stopPropagation();
    if (!canView(document)) {
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

  // 5. LOCAL UI COMPONENTS & HELPERS
  const getSortIcon = (column) => {
    if (currentSort === `${column}_asc`) {
      return <FiChevronUp className="w-4 h-4" />;
    } else if (currentSort === `${column}_desc`) {
      return <FiChevronDown className="w-4 h-4" />;
    }
    return null;
  };

  const SortableHeader = ({ column, children, className = "" }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => onSort && onSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {getSortIcon(column)}
      </div>
    </th>
  );

  // 6. RENDER LOGIC
  // 6.1. Empty State (Guard Clause)
  if (!documents || documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-8 text-center">
          <p className="text-gray-500">Không có tài liệu nào để hiển thị</p>
        </div>
      </div>
    );
  }

  // 6.2. Main Render
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader column="document_code" className="w-36">Mã tài liệu</SortableHeader>
              <SortableHeader column="title" className="min-w-0">Tiêu đề</SortableHeader>
              <SortableHeader column="type" className="w-24">Loại</SortableHeader>
              <SortableHeader column="department" className="w-32">Phòng ban</SortableHeader>
              <SortableHeader column="status" className="w-28">Trạng thái</SortableHeader>
              <SortableHeader column="version" className="w-20">Phiên bản</SortableHeader>
              <SortableHeader column="created_at" className="w-24">Ngày tạo</SortableHeader>
              <SortableHeader column="author_name" className="w-32">Tác giả</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((document) => (
              <tr
                key={document.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => canView(document) && onViewClick && onViewClick(document.id)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <code className="text-sm font-mono text-blue-600 hover:text-blue-800">
                      {document.document_code}
                    </code>
                    {canView(document) && (
                      <FiExternalLink className="ml-1 w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    <div className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors" title={document.title}>
                      {document.title}
                    </div>
                    {document.description && (
                      <div className="text-xs text-gray-500 truncate mt-1" title={document.description}>
                        {document.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getTypeBadgeColor(document.type)}`}>
                    {document.type}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900 truncate max-w-32" title={document.department}>
                    {document.department}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadgeColor(document.status)}`}>
                    {getStatusDisplay(document.status)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <code className="text-sm font-mono text-gray-600">
                    {document.version}
                  </code>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {document.created_at ? new Date(document.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900 truncate max-w-32" title={document.author_name}>
                    {document.author_name || 'N/A'}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    {canView(document) && onViewClick && (
                      <button onClick={(e) => handleView(e, document.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Xem chi tiết">
                        <FiEye size={16} />
                      </button>
                    )}
                    {canEdit(document) && onEditClick && (
                      <button onClick={(e) => handleEdit(e, document.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Chỉnh sửa">
                        <FiEdit size={16} />
                      </button>
                    )}
                    {canView(document) && (
                      <button onClick={(e) => handleDownload(e, document)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Tải xuống">
                        <FiDownload size={16} />
                      </button>
                    )}
                    {canDelete(document) && onDeleteClick && (
                      <button onClick={(e) => handleDelete(e, document)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Xóa tài liệu">
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 7. EXPORT
export default DocumentTable;
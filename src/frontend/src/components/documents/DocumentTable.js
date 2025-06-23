// src/frontend/src/components/documents/DocumentTable.js
import React from 'react';
import { FiEye, FiEdit, FiDownload, FiTrash2, FiChevronUp, FiChevronDown, FiExternalLink } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { getStatusBadgeColor, getTypeBadgeColor, getStatusDisplay } from '../../utils/documentUtils';
import WorkflowActionButtons from './WorkflowActionButtons';

function DocumentTable({
  documents,
  onViewClick,
  onEditClick,
  onDeleteClick,
  onSort,
  currentSort,
  context = 'default',
}) {
  const { user, hasPermission, canAccessDepartment } = useAuth();

  const canView = (document) => {
    if (!user) return document.security_level === 'public';
    if (hasPermission('view_all_documents') || document.author_id === user.id) return true;
    if (canAccessDepartment(document.department)) return true;
    if (document.recipients && Array.isArray(document.recipients) && document.recipients.includes(user.department)) return true;
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

  const handleRowClick = (doc) => {
    if (canView(doc)) {
      if (onViewClick) {
        onViewClick(doc.id);
      }
    } else {
      toast.error("Bạn không có quyền xem chi tiết tài liệu này.");
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

  const getSortIcon = (column) => {
    const sortKey = currentSort || '';
    if (sortKey.startsWith(column)) {
      return sortKey.endsWith('asc') ? <FiChevronUp className="w-4 h-4 text-blue-600" /> : <FiChevronDown className="w-4 h-4 text-blue-600" />;
    }
    return <FiChevronUp className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />;
  };

  const SortableHeader = ({ column, children, className = "" }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group ${className}`}
      onClick={() => onSort && onSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {getSortIcon(column)}
      </div>
    </th>
  );

  const renderDefaultHeaders = () => (
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
  );

  const renderPendingApprovalHeaders = () => (
    <tr>
      <SortableHeader column="title" className="min-w-0">Tài liệu</SortableHeader>
      <SortableHeader column="author_name" className="w-36">Người Gửi</SortableHeader>
      <SortableHeader column="department" className="w-32">Phòng Ban</SortableHeader>
      <SortableHeader column="priority" className="w-28">Mức Độ</SortableHeader>
      <SortableHeader column="updated_at" className="w-32">Ngày Gửi</SortableHeader>
      <SortableHeader column="days_pending" className="w-24">Chờ (ngày)</SortableHeader>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Vai trò của bạn</th>
      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành Động</th>
    </tr>
  );

  const renderDefaultRow = (document) => (
    <>
      <td className="px-4 py-3 whitespace-nowrap"><div className="flex items-center"><code className="text-sm font-mono text-blue-600 hover:text-blue-800">{document.document_code}</code>{canView(document) && <FiExternalLink className="ml-1 w-3 h-3 text-gray-400" />}</div></td>
      <td className="px-4 py-3"><div className="max-w-xs"><div className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors" title={document.title}>{document.title}</div>{document.description && <div className="text-xs text-gray-500 truncate mt-1" title={document.description}>{document.description}</div>}</div></td>
      <td className="px-4 py-3 whitespace-nowrap"><span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getTypeBadgeColor(document.type)}`}>{document.type}</span></td>
      <td className="px-4 py-3 whitespace-nowrap"><div className="text-sm text-gray-900 truncate max-w-32" title={document.department}>{document.department}</div></td>
      <td className="px-4 py-3 whitespace-nowrap"><span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadgeColor(document.status)}`}>{getStatusDisplay(document.status)}</span></td>
      <td className="px-4 py-3 whitespace-nowrap"><code className="text-sm font-mono text-gray-600">{document.version}</code></td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{document.created_at ? new Date(document.created_at).toLocaleDateString('vi-VN') : 'N/A'}</td>
      <td className="px-4 py-3 whitespace-nowrap"><div className="text-sm text-gray-900 truncate max-w-32" title={document.author_name}>{document.author_name || 'N/A'}</div></td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center space-x-1">
          {canView(document) && 
            <button onClick={(e) => { e.stopPropagation(); if (onViewClick) onViewClick(document.id); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Xem chi tiết">
              <FiEye size={16} />
            </button>
          }
          {canEdit(document) && 
            <button onClick={(e) => { e.stopPropagation(); if (onEditClick) onEditClick(document.id); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Chỉnh sửa">
              <FiEdit size={16} />
            </button>
          }
          {canView(document) && 
            <button onClick={(e) => handleDownload(e, document)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Tải xuống">
              <FiDownload size={16} />
            </button>
          }
          {canDelete(document) && 
            <button onClick={(e) => { e.stopPropagation(); if (onDeleteClick) onDeleteClick(document); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Xóa tài liệu">
              <FiTrash2 size={16} />
            </button>
          }
        </div>
      </td>
    </>
  );

  const renderPendingApprovalRow = (document) => (
    <>
      <td className="px-4 py-3"><div className="max-w-xs"><div className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors" title={document.title}>{document.title}</div><div className="text-xs text-gray-500">{document.document_code}</div></div></td>
      <td className="px-4 py-3 whitespace-nowrap"><div className="text-sm text-gray-900" title={document.author_name}>{document.author_name || 'N/A'}</div></td>
      <td className="px-4 py-3 whitespace-nowrap"><div className="text-sm text-gray-900 truncate max-w-32" title={document.department}>{document.department}</div></td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">{document.priority}</td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{document.updated_at ? new Date(document.updated_at).toLocaleDateString('vi-VN') : 'N/A'}</td>
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center">{Math.round(document.days_pending || 0)}</td>
      <td className="px-4 py-3 whitespace-nowrap"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${document.user_role_in_workflow === 'approver' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{document.user_role_in_workflow === 'approver' ? 'Phê duyệt' : 'Xem xét'}</span></td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <WorkflowActionButtons document={document} currentUser={user} />
      </td>
    </>
  );

  if (!documents || documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200"><div className="p-8 text-center"><p className="text-gray-500">Không có tài liệu nào để hiển thị</p></div></div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {context === 'pending-approval' ? renderPendingApprovalHeaders() : renderDefaultHeaders()}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleRowClick(document)}>
                {context === 'pending-approval' ? renderPendingApprovalRow(document) : renderDefaultRow(document)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DocumentTable;
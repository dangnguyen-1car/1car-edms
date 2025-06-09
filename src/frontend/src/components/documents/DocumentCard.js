// src/frontend/src/components/documents/DocumentCard.js
import React from 'react';
import { 
  FiFileText, FiUser, FiCalendar, FiEye, FiDownload, FiEdit, FiTag, 
  FiUsers, FiTrash2 
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { toast } from 'react-hot-toast';
import { 
  getDocumentTypeDisplay, 
  getStatusDisplay, 
  getStatusBadgeColor 
} from '../../utils/documentUtils';

function DocumentCard({ document, onViewClick, onEditClick, onDeleteClick }) {
  const { user, hasPermission, canAccessDepartment } = useAuth();

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
    if (document.recipients && Array.isArray(document.recipients) && 
        document.recipients.includes(user.department)) return true;
    if (document.security_level === 'public') return true;
    return false;
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
      className="bg-white rounded-lg border border-gray-200 hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer flex flex-col justify-between min-h-[280px]"
      onClick={cardClickHandler}
    >
      <div className="p-4 flex-grow">
        <div className="flex items-start justify-between mb-2">
          <h3
            className="font-semibold text-base text-blue-700 hover:text-blue-800 line-clamp-2 flex-grow mr-2"
            title={document.title}
          >
            {document.title || 'Chưa có tiêu đề'}
          </h3>
          <span className={`flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(document.status)}`}>
            {getStatusDisplay(document.status)}
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-1">Mã: {document.document_code || 'N/A'}</p>
        <p className="text-xs text-gray-500 mb-3">Loại: {getDocumentTypeDisplay(document.type)}</p>

        {document.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-3" title={document.description}>
            {document.description}
          </p>
        )}

        <div className="text-xs text-gray-500 space-y-1.5 mt-auto">
          <div className="flex items-center">
            <FiUser className="mr-1.5 text-gray-400 flex-shrink-0" /> 
            <span className="truncate" title={document.author_name || 'N/A'}>
              Tác giả: {document.author_name || 'N/A'}
            </span>
          </div>
          {document.department && (
            <div className="flex items-center">
              <FiUsers className="mr-1.5 text-gray-400 flex-shrink-0"/> 
              <span className="truncate" title={document.department}>
                Phòng ban: {document.department}
              </span>
            </div>
          )}
          <div className="flex items-center">
            <FiCalendar className="mr-1.5 text-gray-400 flex-shrink-0" /> 
            Cập nhật: {document.updated_at ? 
              new Date(document.updated_at).toLocaleDateString('vi-VN') : 'N/A'}
          </div>
          <div className="flex items-center">
            <FiTag className="mr-1.5 text-gray-400 flex-shrink-0" /> 
            Phiên bản: {document.version || 'N/A'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-1 p-3 border-t border-gray-100 bg-slate-50 rounded-b-lg">
        {canView() && onViewClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewClick(document.id); }}
            className="btn-icon text-slate-600 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors"
            title="Xem chi tiết"
          >
            <FiEye size={18} />
          </button>
        )}
        
        {canEdit() && onEditClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onEditClick(document.id); }}
            className="btn-icon text-slate-600 hover:text-green-600 p-1.5 rounded-md hover:bg-green-50 transition-colors"
            title="Chỉnh sửa"
          >
            <FiEdit size={18} />
          </button>
        )}
        
        {canView() && (
          <button
            onClick={handleDownload}
            className="btn-icon text-slate-600 hover:text-purple-600 p-1.5 rounded-md hover:bg-purple-50 transition-colors"
            title="Tải xuống"
          >
            <FiDownload size={18} />
          </button>
        )}
        
        {canDelete() && onDeleteClick && (
          <button
            onClick={handleDelete}
            className="btn-icon text-slate-600 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
            title="Xóa tài liệu"
          >
            <FiTrash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

export default DocumentCard;

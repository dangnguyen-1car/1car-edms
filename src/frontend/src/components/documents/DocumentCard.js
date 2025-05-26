/**
 * =================================================================
 * EDMS 1CAR - Document Card Component (Fixed Console Warning)
 * Individual document card for grid view
 * =================================================================
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiFileText, 
  FiEye, 
  FiEdit, 
  FiDownload, 
  FiClock,
  FiUser,
  FiCalendar,
  FiTag
} from 'react-icons/fi';
import { documentService } from '../../services/documentService';

function DocumentCard({ document, canEdit, onRefresh }) {
  // Get document type display name
  const getDocumentTypeDisplay = (type) => {
    const types = {
      'PL': 'Chính sách',
      'PR': 'Quy trình', 
      'WI': 'Hướng dẫn',
      'FM': 'Biểu mẫu',
      'TD': 'Tài liệu kỹ thuật',
      'TR': 'Tài liệu đào tạo',
      'RC': 'Hồ sơ'
    };
    return types[type] || type;
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    const colors = {
      'draft': 'badge-warning',
      'review': 'badge-info',
      'published': 'badge-success',
      'archived': 'badge-danger'
    };
    return colors[status] || 'badge-info';
  };

  // Get status display name
  const getStatusDisplay = (status) => {
    const statuses = {
      'draft': 'Bản nháp',
      'review': 'Đang xem xét',
      'published': 'Đã phê duyệt',
      'archived': 'Đã lưu trữ'
    };
    return statuses[status] || status;
  };

  // Handle download
  const handleDownload = async () => {
    try {
      await documentService.downloadDocument(document.id);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <FiFileText className="h-6 w-6 text-primary-600 mr-2" />
            <span className={`badge ${getStatusBadgeColor(document.status)}`}>
              {getStatusDisplay(document.status)}
            </span>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            v{document.version}
          </span>
        </div>

        {/* Title and Code */}
        <div className="mb-3">
          <Link
            to={`/documents/${document.id}`}
            className="text-lg font-medium text-gray-900 hover:text-primary-600 line-clamp-2"
          >
            {document.title}
          </Link>
          <p className="text-sm text-gray-500 mt-1">
            {document.document_code}
          </p>
        </div>

        {/* Type and Department */}
        <div className="mb-3">
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <FiTag className="h-4 w-4 mr-1" />
            {getDocumentTypeDisplay(document.type)}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <FiTag className="h-4 w-4 mr-1" />
            {document.department}
          </div>
        </div>

        {/* Description */}
        {document.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {document.description}
          </p>
        )}

        {/* Metadata */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center text-xs text-gray-500">
            <FiUser className="h-3 w-3 mr-1" />
            {document.author_name || 'N/A'}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <FiCalendar className="h-3 w-3 mr-1" />
            {new Date(document.created_at).toLocaleDateString('vi-VN')}
          </div>
          {document.updated_at !== document.created_at && (
            <div className="flex items-center text-xs text-gray-500">
              <FiClock className="h-3 w-3 mr-1" />
              Cập nhật: {new Date(document.updated_at).toLocaleDateString('vi-VN')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Link
              to={`/documents/${document.id}`}
              className="btn btn-outline btn-sm flex items-center"
            >
              <FiEye className="h-3 w-3 mr-1" />
              Xem
            </Link>
            {canEdit && (
              <Link
                to={`/documents/${document.id}/edit`}
                className="btn btn-outline btn-sm flex items-center"
              >
                <FiEdit className="h-3 w-3 mr-1" />
                Sửa
              </Link>
            )}
          </div>
          
          {document.file_path && (
            <button
              onClick={handleDownload}
              className="btn btn-outline btn-sm flex items-center"
              title="Tải xuống tài liệu"
            >
              <FiDownload className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentCard;

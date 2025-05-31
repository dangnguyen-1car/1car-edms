// src/components/documents/DocumentCard.js
import React from 'react';
import { FiFileText, FiUser, FiCalendar, FiEye, FiDownload, FiEdit } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext'; // Giả định bạn có file này
import { documentAPI } from '../../api/documentApi';

function DocumentCard({ document, onView, onEdit, onDownload }) {
  const { user, hasPermission, canAccessDepartment } = useAuth();

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
      'draft': 'bg-yellow-100 text-yellow-800',
      'review': 'bg-blue-100 text-blue-800',
      'published': 'bg-green-100 text-green-800',
      'archived': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  // Check if user can edit document (từ file .new.js)
  const canEditDocument = () => {
    if (!document || !user) return false; // Thêm kiểm tra null
    if (hasPermission('manage_system')) return true;
    if (document.author_id === user.id) return true;
    // Giả định 'canAccessDepartment' kiểm tra user có quyền trên phòng ban của tài liệu
    if (canAccessDepartment(document.department) && document.status === 'draft') return true;
    return false;
  };

  // Check if user can view document (từ file .new.js)
  const canViewDocument = () => {
    if (!document || !user) return false; // Thêm kiểm tra null
    if (hasPermission('view_all_documents')) return true;
    if (document.author_id === user.id) return true;
    if (canAccessDepartment(document.department)) return true;
    if (document.recipients && Array.isArray(document.recipients) && document.recipients.includes(user.department)) return true;
    return false;
  };

  // Handle actions (từ file .new.js, logic rõ ràng hơn)
  const handleViewClick = (e) => {
    e.stopPropagation(); // Ngăn sự kiện click của card cha
    if (onView) {
      onView(document);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEdit && canEditDocument()) { // Chỉ cho phép edit nếu có quyền
      onEdit(document);
    }
  };

  const handleDownloadClick = async (e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(document);
    } else {
      try {
        await documentAPI.downloadDocument(document.id);
      } catch (error) {
        console.error('Download failed:', error);
        // Có thể hiển thị thông báo lỗi cho người dùng ở đây
      }
    }
  };

  // Handle card click (từ file cũ, nhưng giờ sẽ gọi handleViewClick nếu không có onCLick riêng)
  const handleCardOverallClick = () => {
     // Nếu có prop onClick riêng thì ưu tiên, nếu không thì mặc định là xem chi tiết
    if (onView) {
      onView(document);
    }
  };


  if (!document) return null; // Tránh lỗi nếu document không tồn tại

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardOverallClick} // Sử dụng hàm xử lý click chung cho card
    >
      <div className="p-4"> {/* Giảm padding từ p-6 xuống p-4 cho gọn hơn */}
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0"> {/* Thêm min-w-0 để truncate hoạt động tốt */}
            <h3
              className="font-medium text-gray-900 line-clamp-2 mb-1 hover:text-blue-600"
              title={document.title} // Thêm title attribute cho tooltip
              onClick={handleViewClick} // Cho phép click vào title để xem
            >
              {document.title}
            </h3>
            <p className="text-sm text-gray-500">
              {document.document_code} • {getDocumentTypeDisplay(document.type)}
            </p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusBadgeColor(document.status)}`}> {/* Thêm whitespace-nowrap */}
            {getStatusDisplay(document.status)}
          </span>
        </div>

        {/* Description (từ file .new.js) */}
        {document.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2" title={document.description}>
            {document.description}
          </p>
        )}

        {/* Metadata (từ file .new.js, chi tiết hơn) */}
        <div className="space-y-2 mb-3">
          {document.department && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium">Phòng ban:</span>
              <span>{document.department}</span>
            </div>
          )}

          {document.priority && document.priority !== 'normal' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-500">Ưu tiên:</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                document.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                document.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700' // Giả định 'normal' không hiển thị đặc biệt
              }`}>
                {document.priority === 'urgent' ? 'Khẩn cấp' :
                 document.priority === 'high' ? 'Cao' :
                 document.priority === 'low' ? 'Thấp' : 'Bình thường'}
              </span>
            </div>
          )}

          {document.security_level && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium">Bảo mật:</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                document.security_level === 'restricted' ? 'bg-red-100 text-red-700' :
                document.security_level === 'confidential' ? 'bg-yellow-100 text-yellow-700' :
                document.security_level === 'internal' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {document.security_level === 'restricted' ? 'Hạn chế (R)' :
                 document.security_level === 'confidential' ? 'Bảo mật (C)' :
                 document.security_level === 'internal' ? 'Nội bộ (I)' : 'Công khai (P)'}
              </span>
            </div>
          )}
        </div>

        {/* Footer (kết hợp từ cả hai file) */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1" title={`Tác giả: ${document.author_name || 'N/A'}`}>
              <FiUser size={14} />
              <span className="truncate max-w-[100px]">{document.author_name || 'N/A'}</span> {/* Truncate nếu tên quá dài */}
            </div>
            <div className="flex items-center gap-1" title={`Cập nhật: ${new Date(document.updated_at || document.created_at).toLocaleDateString('vi-VN')}`}>
              <FiCalendar size={14} />
              <span>{new Date(document.updated_at || document.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-1"> {/* Giảm gap giữa các nút */}
            {canViewDocument() && (
              <button
                onClick={handleViewClick}
                className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors rounded hover:bg-blue-50" // Tăng vùng click, thêm hover background
                title="Xem tài liệu"
              >
                <FiEye size={16} />
              </button>
            )}

            {canEditDocument() && (
              <button
                onClick={handleEditClick}
                className="p-1.5 text-gray-500 hover:text-green-600 transition-colors rounded hover:bg-green-50"
                title="Chỉnh sửa"
              >
                <FiEdit size={16} />
              </button>
            )}

            <button
              onClick={handleDownloadClick}
              className="p-1.5 text-gray-500 hover:text-purple-600 transition-colors rounded hover:bg-purple-50"
              title="Tải xuống"
            >
              <FiDownload size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentCard;
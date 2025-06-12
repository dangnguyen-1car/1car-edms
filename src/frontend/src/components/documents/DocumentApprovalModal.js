// src/frontend/src/components/documents/DocumentApprovalModal.js
import React, { useState } from 'react';
import { FiX, FiLoader, FiCheck, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { documentService } from '../../services/documentService';
import DocumentStatusBadge from '../common/DocumentStatusBadge';

function DocumentApprovalModal({ isOpen, onClose, document, onSuccess }) {
  // --- State Declarations ---
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // --- Event Handlers ---
  const handleApprove = async () => {
    if (!comment.trim()) {
      setErrors({ comment: 'Bình luận là bắt buộc khi phê duyệt' });
      return;
    }

    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
      const response = await documentService.approveDocument(document.id, {
        comment: comment.trim()
      });

      if (response.success) {
        toast.success('Tài liệu đã được phê duyệt thành công!');
        if (onSuccess) {
          onSuccess(response.data, 'approved');
        }
        handleClose();
      } else {
        throw new Error(response.message || 'Lỗi phê duyệt tài liệu');
      }
    } catch (error) {
      console.error('Error approving document:', error);
      toast.error(error.message || 'Lỗi phê duyệt tài liệu. Vui lòng thử lại.');
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      setErrors({ comment: 'Bình luận là bắt buộc khi từ chối' });
      return;
    }

    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
      const response = await documentService.rejectDocument(document.id, {
        comment: comment.trim()
      });

      if (response.success) {
        toast.success('Tài liệu đã được từ chối');
        if (onSuccess) {
          onSuccess(response.data, 'rejected');
        }
        handleClose();
      } else {
        throw new Error(response.message || 'Lỗi từ chối tài liệu');
      }
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error(error.message || 'Lỗi từ chối tài liệu. Vui lòng thử lại.');
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setComment('');
    setErrors({});
    onClose();
  };

  // --- Render Logic ---
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Phê duyệt tài liệu</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={loading} >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Mã tài liệu</p>
                <p className="font-mono font-medium">{document.document_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Trạng thái hiện tại</p>
                <DocumentStatusBadge status={document.status} />
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Tiêu đề</p>
                <p className="font-medium">{document.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Loại tài liệu</p>
                <p>{document.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phòng ban</p>
                <p>{document.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tác giả</p>
                <p>{document.author_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phiên bản</p>
                <p className="font-mono">{document.version}</p>
              </div>
              {document.description && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Mô tả</p>
                  <p className="text-gray-900">{document.description}</p>
                </div>
              )}
            </div>
          </div>
          {/* Comment Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bình luận / Góp ý *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={loading}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.comment ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nhập bình luận hoặc góp ý về tài liệu..."
              maxLength={1000}
            />
            {errors.comment && (
              <p className="text-red-500 text-sm mt-1">{errors.comment}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {comment.length}/1000 ký tự
            </p>
          </div>
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-yellow-800 text-sm">
              <strong>Lưu ý:</strong> Sau khi phê duyệt hoặc từ chối, tài liệu sẽ chuyển trạng thái và không thể hoàn tác.
              Vui lòng kiểm tra kỹ nội dung trước khi quyết định.
            </p>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={loading || !comment.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <FiLoader className="animate-spin" size={16} />
            ) : (
              <FiXCircle size={16} />
            )}
            <span>Từ chối</span>
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading || !comment.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <FiLoader className="animate-spin" size={16} />
            ) : (
              <FiCheck size={16} />
            )}
            <span>Phê duyệt</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentApprovalModal;
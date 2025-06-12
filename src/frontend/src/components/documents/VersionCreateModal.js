// src/frontend/src/components/documents/VersionCreateModal.js
import React, { useState } from 'react';
import { FiX, FiLoader, FiSave } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { documentService } from '../../services/documentService';

function VersionCreateModal({ isOpen, onClose, documentId, onSuccess }) {
  // --- State Declarations ---
  const [versionType, setVersionType] = useState('minor');
  const [reason, setReason] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // --- Event Handlers ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validation
    const newErrors = {};
    if (!reason.trim()) {
      newErrors.reason = 'Lý do thay đổi là bắt buộc';
    }
    if (!summary.trim()) {
      newErrors.summary = 'Tóm tắt thay đổi là bắt buộc';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await documentService.createVersion(documentId, {
        versionType,
        changeReason: reason.trim(),
        changeSummary: summary.trim()
      });

      if (response.success) {
        toast.success('Phiên bản mới đã được tạo thành công!');
        if (onSuccess) {
          onSuccess(response.data);
        }
        handleClose();
      } else {
        throw new Error(response.message || 'Lỗi tạo phiên bản mới');
      }
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error(error.message || 'Lỗi tạo phiên bản mới. Vui lòng thử lại.');
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVersionType('minor');
    setReason('');
    setSummary('');
    setErrors({});
    onClose();
  };

  // --- Render Logic ---
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Tạo phiên bản mới</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Version Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại phiên bản *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="versionType"
                  value="minor"
                  checked={versionType === 'minor'}
                  onChange={(e) => setVersionType(e.target.value)}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Thay đổi nhỏ (Minor)</strong> - Ví dụ: 01.00 → 01.01
                  <br />
                  <span className="text-gray-600">Cập nhật nội dung, sửa lỗi nhỏ, cải tiến quy trình</span>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="versionType"
                  value="major"
                  checked={versionType === 'major'}
                  onChange={(e) => setVersionType(e.target.value)}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Thay đổi lớn (Major)</strong> - Ví dụ: 01.00 → 02.00
                  <br />
                  <span className="text-gray-600">Thay đổi cấu trúc, quy trình hoàn toàn mới</span>
                </span>
              </label>
            </div>
          </div>

          {/* Change Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lý do thay đổi *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.reason ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Mô tả lý do tại sao cần tạo phiên bản mới..."
              maxLength={500}
            />
            {errors.reason && (
              <p className="text-red-500 text-sm mt-1">{errors.reason}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {reason.length}/500 ký tự
            </p>
          </div>

          {/* Change Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tóm tắt thay đổi *
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={loading}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.summary ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Tóm tắt các thay đổi chính trong phiên bản này..."
              maxLength={1000}
            />
            {errors.summary && (
              <p className="text-red-500 text-sm mt-1">{errors.summary}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {summary.length}/1000 ký tự
            </p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-blue-800 text-sm">
              <strong>Lưu ý:</strong> Sau khi tạo phiên bản mới, bạn sẽ được chuyển đến chế độ chỉnh sửa
              để cập nhật nội dung tài liệu. Phiên bản cũ sẽ được lưu trữ trong lịch sử.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim() || !summary.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <FiLoader className="animate-spin" size={16} />
              ) : (
                <FiSave size={16} />
              )}
              <span>Xác nhận & Chỉnh sửa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VersionCreateModal;
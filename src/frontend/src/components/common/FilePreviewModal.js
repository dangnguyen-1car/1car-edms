// src/frontend/src/components/common/FilePreviewModal.js
import React, { useState, useEffect, useCallback } from 'react'; // SỬA ĐỔI: Thêm useCallback
import { FiX, FiDownload, FiLoader, FiAlertCircle, FiFile, FiEye } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

function FilePreviewModal({ isOpen, onClose, fileInfo }) {
  // --- State Declarations ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // --- Helper Functions (SỬA ĐỔI: Bọc trong useCallback) ---
  const resetState = useCallback(() => {
    setLoading(true);
    setError(null);
    setPreviewUrl(null);
  }, []); // Mảng dependency rỗng vì hàm này không phụ thuộc vào props hay state nào

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (fileInfo.url) {
        setPreviewUrl(fileInfo.url);
      } else if (fileInfo.previewUrl) {
        setPreviewUrl(fileInfo.previewUrl);
      } else {
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const fileId = fileInfo.id || fileInfo.filename;
        setPreviewUrl(`${baseUrl}/files/preview/${fileId}`);
      }
    } catch (err) {
      setError('Không thể tải xem trước file');
    } finally {
      setLoading(false);
    }
  }, [fileInfo]); // Phụ thuộc vào fileInfo

  // --- Effects (SỬA ĐỔI: Cập nhật mảng dependency) ---
  useEffect(() => {
    if (isOpen && fileInfo) {
      loadPreview();
    } else {
      resetState();
    }
  }, [isOpen, fileInfo, loadPreview, resetState]);


  const handleDownload = async () => {
    try {
      const downloadUrl = fileInfo.downloadUrl ||
        fileInfo.url ||
        `${process.env.REACT_APP_API_URL}/files/download/${fileInfo.id || fileInfo.filename}`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileInfo.originalname || fileInfo.filename || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Đang tải xuống file...');
    } catch (error) {      
      toast.error('Lỗi tải xuống file');
    }
  };

  const getFileIcon = (mimetype) => {
    if (!mimetype) return '📎';

    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word')) return '📝';
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return '📊';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '📈';
    if (mimetype.includes('image')) return '🖼️';
    if (mimetype.includes('text')) return '📃';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Không xác định';

    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canPreview = (mimetype) => {
    if (!mimetype) return false;

    return mimetype.includes('pdf') ||
           mimetype.includes('image') ||
           mimetype.includes('text/plain');
  };

  const renderPreviewContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FiLoader className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
            <p className="text-gray-600">Đang tải xem trước...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FiAlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 mx-auto"
            >
              <FiDownload size={16} />
              <span>Tải xuống</span>
            </button>
          </div>
        </div>
      );
    }

    if (!canPreview(fileInfo.mimetype)) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">{getFileIcon(fileInfo.mimetype)}</div>
            <p className="text-gray-600 mb-4">
              Không hỗ trợ xem trước cho định dạng này
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Định dạng: {fileInfo.mimetype || 'Không xác định'}
            </p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 mx-auto"
            >
              <FiDownload size={16} />
              <span>Tải xuống để xem</span>
            </button>
          </div>
        </div>
      );
    }

    // Render preview based on file type
    if (fileInfo.mimetype?.includes('pdf')) {
      return (
        <div className="w-full h-96">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0 rounded"
            title="PDF Preview"
            onError={() => setError('Không thể tải PDF')}
          />
        </div>
      );
    }

    if (fileInfo.mimetype?.includes('image')) {
      return (
        <div className="flex justify-center items-center h-96">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded"
            onError={() => setError('Không thể tải hình ảnh')}
          />
        </div>
      );
    }

    if (fileInfo.mimetype?.includes('text/plain')) {
      return (
        <div className="w-full h-96">
          <iframe
            src={previewUrl}
            className="w-full h-full border border-gray-200 rounded"
            title="Text Preview"
            onError={() => setError('Không thể tải file text')}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FiFile className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600">Không thể hiển thị xem trước</p>
        </div>
      </div>
    );
  };

  // --- Render Logic ---
  if (!isOpen || !fileInfo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <FiEye className="text-blue-600" size={24} />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 truncate">
                  {fileInfo.originalname || fileInfo.filename || 'Xem trước file'}
                </h2>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span>Kích thước: {formatFileSize(fileInfo.size)}</span>
                  <span>Định dạng: {fileInfo.mimetype || 'Không xác định'}</span>
                  {fileInfo.uploadedAt && (
                    <span>
                      Tải lên: {new Date(fileInfo.uploadedAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Tải xuống"
            >
              <FiDownload size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              title="Đóng"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-160px)]">
          {renderPreviewContent()}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {canPreview(fileInfo.mimetype) ? (
              <span className="flex items-center">
                <FiEye className="mr-1" size={14} />
                Xem trước được hỗ trợ
              </span>
            ) : (
              <span className="flex items-center">
                <FiAlertCircle className="mr-1" size={14} />
                Xem trước không được hỗ trợ
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <FiDownload size={16} />
              <span>Tải xuống</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilePreviewModal;
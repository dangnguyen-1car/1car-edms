// src/frontend/src/pages/UploadPage.js

/**
 * =================================================================
 * EDMS 1CAR - Upload Page
 * File upload interface for document management
 * =================================================================
 */

// Imports
import React, { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { FiUpload, FiFile, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import api from '../services/api';

// It's better to get these from a shared config or API if possible,
// to keep frontend and backend in sync.
// For now, ensure these values match backend's `config/index.js` and `uploadService.js`
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]; //
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Main UploadPage Component
function UploadPage() {
  // State and hooks
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef();

  // Authentication and permission checks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Đang tải..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission('upload_files')) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Không có quyền</h2>
            <p className="text-gray-600">Bạn không có quyền tải lên file</p>
          </div>
        </div>
      </Layout>
    );
  }

  // File validation
  const validateFile = (file) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Chỉ chấp nhận file PDF, DOC, DOCX.');
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Kích thước file không được vượt quá ${MAX_FILE_SIZE_BYTES / (1024*1024)}MB.`);
      return false;
    }

    return true;
  };

  // File handling
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadResult(null); // Clear previous result
    } else {
      // Clear if validation fails
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadResult(null); // Clear previous result
    } else {
      setSelectedFile(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // File formatting utilities
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (!file) return <FiFile className="h-8 w-8 text-gray-400" />;
    if (file.type === 'application/pdf') {
      return <FiFile className="h-8 w-8 text-red-500" />;
    }
    return <FiFile className="h-8 w-8 text-blue-500" />;
  };

  // File upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file để tải lên');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile); // Backend 'upload.single('file')' expects 'file' field

      const response = await api.post('/upload/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      if (response.data.success) {
        setUploadResult(response.data.data); // Assuming backend returns { success: true, data: { fileInfo ... } }
        toast.success('Tải lên file thành công!');
        setSelectedFile(null); // Clear selected file after successful upload
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(response.data.message || 'Upload thất bại');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || error.message || 'Đã xảy ra lỗi khi tải lên file');
    } finally {
      setUploading(false);
    }
  };

  // Render
  return (
    <div>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tải lên tài liệu</h1>
          <p className="mt-2 text-gray-600">
            Tải lên file tài liệu vào hệ thống EDMS. Chấp nhận file PDF, DOC, DOCX (tối đa 10MB).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Chọn file tải lên</h2>
              </div>
              <div className="card-body">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    uploading ? 'cursor-not-allowed bg-gray-50' : 
                    selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                  }`}
                  onDragOver={!uploading ? handleDragOver : undefined}
                  onDrop={!uploading ? handleDrop : undefined}
                >
                  {selectedFile ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">{getFileIcon(selectedFile)}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <button
                        onClick={clearSelectedFile}
                        className="btn btn-secondary-outline btn-sm"
                        disabled={uploading}
                      >
                        <FiX className="h-4 w-4 mr-1" />
                        Xóa file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">Kéo thả file vào đây</p>
                        <p className="text-sm text-gray-500">hoặc click để chọn file</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-primary"
                        disabled={uploading}
                      >
                        Chọn file
                      </button>
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Đang tải lên...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {selectedFile && !uploading && (
                  <div className="mt-6">
                    <button onClick={handleUpload} className="btn btn-primary w-full" disabled={uploading}>
                      <FiUpload className="h-4 w-4 mr-2" />
                      Tải lên file
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="text-lg font-semibold">Hướng dẫn</h3></div>
              <div className="card-body">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start"><FiCheck className="h-4 w-4 text-green-500 mt-0.5 mr-2 shrink-0" />Chấp nhận: PDF, DOC, DOCX.</li>
                  <li className="flex items-start"><FiCheck className="h-4 w-4 text-green-500 mt-0.5 mr-2 shrink-0" />Kích thước tối đa: 10MB.</li>
                  <li className="flex items-start"><FiCheck className="h-4 w-4 text-green-500 mt-0.5 mr-2 shrink-0" />File sẽ được lưu trữ an toàn.</li>
                  <li className="flex items-start"><FiCheck className="h-4 w-4 text-green-500 mt-0.5 mr-2 shrink-0" />Sau khi tải lên, bạn có thể liên kết file này khi tạo hoặc cập nhật tài liệu.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {uploadResult && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-green-600 flex items-center">
                    <FiCheck className="h-5 w-5 mr-2" /> Tải lên thành công
                  </h3>
                </div>
                <div className="card-body space-y-3">
                  <div><label className="form-label">Tên file gốc:</label><p className="text-sm">{uploadResult.originalname}</p></div>
                  <div><label className="form-label">Tên file trên hệ thống:</label><p className="text-sm">{uploadResult.filename}</p></div>
                  <div><label className="form-label">Kích thước:</label><p className="text-sm">{formatFileSize(uploadResult.size)}</p></div>
                  <div><label className="form-label">Loại MIME:</label><p className="text-sm">{uploadResult.mimetype}</p></div>
                  <div><label className="form-label">Đường dẫn (tạm thời):</label><p className="text-sm break-all">{uploadResult.path}</p></div>
                  <div><label className="form-label">Thời gian tải lên:</label><p className="text-sm">{new Date(uploadResult.uploadedAt).toLocaleString('vi-VN')}</p></div>
                  <div className="mt-4 pt-3 border-t"><p className="text-sm text-gray-500">File đã được lưu. Ghi nhớ thông tin file nếu cần liên kết với tài liệu.</p></div>
                </div>
              </div>
            )}
             <div className="card">
              <div className="card-header"><h3 className="text-lg font-semibold">Lưu ý quan trọng</h3></div>
              <div className="card-body space-y-3 text-sm text-gray-600">
                <p><strong>Bước tiếp theo:</strong> Sau khi tải lên, file này cần được liên kết với một "Tài liệu" trong hệ thống (thông qua chức năng tạo mới hoặc cập nhật tài liệu).</p>
                <p><strong>Bảo mật:</strong> Các file được lưu trữ với tên ngẫu nhiên và chỉ có thể truy cập thông qua hệ thống EDMS bởi người dùng có quyền.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;
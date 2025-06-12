// src/frontend/src/components/documents/FileUploadArea.js
import React, { useRef, useState } from 'react';
import { FiUpload, FiFile, FiX, FiCheck, FiLoader } from 'react-icons/fi';

// --- Constants ---
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function FileUploadArea({
  onFileUpload,
  uploadedFile,
  onRemoveFile,
  isUploading = false,
  disabled = false
}) {
  // --- State and Refs ---
  const fileInputRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  // --- Helper Functions ---
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return '📈';
    return '📎';
  };

  const validateFile = (file) => {
    const errors = [];
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      errors.push('Định dạng file không được hỗ trợ. Chỉ chấp nhận PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX.');
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`Kích thước file vượt quá ${formatFileSize(MAX_FILE_SIZE)}.`);
    }
    return errors;
  };

  // --- Event Handlers ---
  const handleFileSelect = (file) => {
    if (!file) return;

    const errors = validateFile(file);
    if (errors.length > 0) {
      // In a real application, consider using a toast notification or a custom modal
      // instead of a browser alert, as alerts are blocking and can be intrusive.
      alert(errors.join('\n'));
      return;
    }
    onFileUpload(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]; // Get the first selected file
    handleFileSelect(file);
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled || isUploading) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]); // Only process the first file if multiple are dropped
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const openFileDialog = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  // --- JSX Rendering ---
  // Render uploaded file display if a file has been successfully uploaded
  if (uploadedFile) {
    return (
      <div className="border-2 border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getFileIcon(uploadedFile.mimetype)}
            </div>
            <div>
              <p className="font-medium text-gray-900">{uploadedFile.originalname}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(uploadedFile.size)} - {uploadedFile.mimetype}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <FiCheck className="text-green-500" size={20} />
            <button
              type="button"
              onClick={onRemoveFile}
              disabled={disabled}
              className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render file upload area (drag-and-drop or click)
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={openFileDialog}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        className="hidden"
        disabled={disabled || isUploading}
      />
      <div className="space-y-4">
        {isUploading ? (
          <>
            <FiLoader className="mx-auto text-blue-500 animate-spin" size={48} />
            <p className="text-gray-600">Đang tải file lên...</p>
          </>
        ) : (
          <>
            <FiUpload className="mx-auto text-gray-400" size={48} />
            <div>
              <p className="text-gray-600">
                <span className="font-medium text-blue-600">Kéo thả file vào đây</span>
                <br />
                hoặc click để chọn file
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (tối đa {formatFileSize(MAX_FILE_SIZE)})
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FileUploadArea;

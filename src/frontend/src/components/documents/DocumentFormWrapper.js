// src/frontend/src/components/documents/DocumentFormWrapper.js
import React, { useState, useEffect } from 'react';
import CreateDocumentModal from './CreateDocumentModal';
import { documentService } from '../../services/documentService';
import { toast } from 'react-hot-toast';

// =================================================================
// EDMS 1CAR - DocumentFormWrapper (FINAL - Refactored Version)
// PHIÊN BẢN TÁI CẤU TRÚC VÀ SỬA LỖI TRIỆT ĐỂ:
// - Loại bỏ `useQueries` để lấy options.
// - Import trực tiếp `documentTypeOptions` và `departmentOptions` từ `documentUtils.js`
//   để đảm bảo tính nhất quán, đồng bộ và là "nguồn sự thật duy nhất" (Single Source of Truth).
// - Giúp modal tải nhanh hơn và loại bỏ các lỗi do xử lý dữ liệu API không nhất quán.
// =================================================================
import { documentTypeOptions, departmentOptions } from '../../utils/documentUtils';

function DocumentFormWrapper({
  isOpen,
  onClose,
  onSuccess,
  isEditMode = false,
  documentId = null,
}) {
  // --- State Management ---
  const [documentData, setDocumentData] = useState(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  // --- Effect for loading Document Data in Edit Mode ---
  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) {
        setDocumentData(null);
        return;
      }

      setIsLoadingDocument(true);
      try {
        const response = await documentService.getDocument(documentId);
        if (response.success) {
          setDocumentData(response.data);
        } else {
          throw new Error(response.message || 'Lỗi tải thông tin tài liệu');
        }
      } catch (error) {
        console.error('Lỗi tải tài liệu để chỉnh sửa:', error);
        toast.error(error.message || 'Lỗi tải thông tin tài liệu');
        onClose(); // Đóng modal nếu không thể tải dữ liệu
      } finally {
        setIsLoadingDocument(false);
      }
    };

    if (isOpen && isEditMode) {
      loadDocument();
    }

    // Cleanup: Reset dữ liệu khi modal đóng
    if (!isOpen) {
      setDocumentData(null);
    }
  }, [isOpen, isEditMode, documentId, onClose]);

  // --- Event Handlers ---
  const handleSuccess = (document) => {
    if (onSuccess) {
      onSuccess(document, isEditMode);
    }
    onClose(); // Tự động đóng modal sau khi thành công
  };

  // --- Render Logic ---

  // Hiển thị trạng thái loading chung nếu đang fetch dữ liệu cho Edit mode
  if (isEditMode && isLoadingDocument) {
    // Có thể trả về một skeleton loader thay vì null để UX tốt hơn
    return null; 
  }

  // Component CreateDocumentModal sẽ nhận props và hoạt động đúng
  // vì dữ liệu options giờ đây đã được chuẩn hóa và đầy đủ.
  return (
    <CreateDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSuccess}
      isEditMode={isEditMode}
      initialData={documentData}
      documentTypeOptions={documentTypeOptions}
      departmentOptions={departmentOptions}
    />
  );
}

export default DocumentFormWrapper;
// src/frontend/src/components/documents/DocumentFormWrapper.js
import React, { useState, useEffect } from 'react';
import CreateDocumentModal from './CreateDocumentModal';
import { documentService } from '../../services/documentService';
import { toast } from 'react-hot-toast';
import { documentTypeOptions, departmentOptions } from '../../utils/documentUtils';

/**
 * =================================================================
 * EDMS 1CAR - DocumentFormWrapper (Không đổi)
 * Component này đã được viết đúng. Lỗi nằm ở cách nó được gọi.
 * Nó sẽ nhận `documentId` và kích hoạt `useEffect` để fetch dữ liệu.
 * =================================================================
 */
function DocumentFormWrapper({
  isOpen,
  onClose,
  onSuccess,
  isEditMode = false,
  documentId = null, // Prop này bây giờ sẽ nhận được giá trị ID
}) {
  const [documentData, setDocumentData] = useState(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      // Vì documentId đã được truyền vào, điều kiện này sẽ đúng
      if (!documentId) {
        setDocumentData(null);
        return;
      }

      setIsLoadingDocument(true);
      try {
        // Lệnh gọi API sẽ được thực hiện, server sẽ ghi nhận log
        const response = await documentService.getDocument(documentId);
        if (response.success) {
          setDocumentData(response.data);
        } else {
          throw new Error(response.message || 'Lỗi tải thông tin tài liệu');
        }
      } catch (error) {
        console.error('Lỗi tải tài liệu để chỉnh sửa:', error);
        toast.error(error.message || 'Lỗi tải thông tin tài liệu');
        onClose();
      } finally {
        setIsLoadingDocument(false);
      }
    };

    if (isOpen && isEditMode) {
      loadDocument();
    }

    if (!isOpen) {
      setDocumentData(null);
    }
  }, [isOpen, isEditMode, documentId, onClose]); // Dependency array đã đúng

  const handleSuccess = (document) => {
    if (onSuccess) {
      onSuccess(document, isEditMode);
    }
    onClose();
  };

  if (isEditMode && isLoadingDocument) {
    // Để có UX tốt hơn, có thể hiện một skeleton loader trong modal
    return (
        <CreateDocumentModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={() => {}}
            isEditMode={true}
            initialData={null} // Truyền null để CreateDocumentModal biết đang loading
            documentTypeOptions={documentTypeOptions}
            departmentOptions={departmentOptions}
            // Thêm prop isLoading
            isLoadingData={true} 
        />
    );
  }

  return (
    <CreateDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSuccess}
      isEditMode={isEditMode}
      initialData={documentData} // Truyền dữ liệu đã được fetch
      documentTypeOptions={documentTypeOptions}
      departmentOptions={departmentOptions}
      isLoadingData={isLoadingDocument}
    />
  );
}

export default DocumentFormWrapper;
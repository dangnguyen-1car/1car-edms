// src/frontend/src/components/documents/DocumentFormWrapper.js
import React, { useState, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import CreateDocumentModal from './CreateDocumentModal';
import { documentService } from '../../services/documentService';
import { toast } from 'react-hot-toast';

/**
 * DocumentFormWrapper - A unified component for creating and editing documents.
 * Optimized with useQueries for efficient parallel data loading.
 */
function DocumentFormWrapper({
  isOpen, // Controls the visibility of the modal
  onClose, // Function to call when the modal needs to be closed
  onSuccess, // Function to call after a document is successfully created or updated
  // Edit mode props
  isEditMode = false, // Flag to indicate if the modal is in edit mode
  documentId = null, // ID of the document to edit (used if initialDocument is not provided)
  initialDocument = null, // Optional: Pre-loaded document data for edit mode
}) {
  // --- State for Document Data ---
  const [documentData, setDocumentData] = useState(null); // Holds the document data for edit mode
  const [isLoadingDocument, setIsLoadingDocument] = useState(false); // Tracks loading state for the document

  // --- Optimized Data Loading with useQueries ---
  const queries = useQueries({
    queries: [
      {
        queryKey: ['documentTypes'],
        queryFn: () => documentService.getDocumentTypes(),
        staleTime: Infinity, // Metadata rarely changes, cache for entire session
        enabled: isOpen, // Only execute when modal is open
        select: (data) => {
          if (data?.success && Array.isArray(data.data)) {
            return data.data;
          }
          // Fallback data if API fails or data is not in the correct format
          return [
            { value: 'PL', label: 'Chính sách (PL)' },
            { value: 'PR', label: 'Quy trình (PR)' },
            { value: 'WI', label: 'Hướng dẫn (WI)' },
            { value: 'FM', label: 'Biểu mẫu (FM)' },
            { value: 'TD', label: 'Tài liệu kỹ thuật (TD)' },
            { value: 'TR', label: 'Tài liệu đào tạo (TR)' },
            { value: 'RC', label: 'Hồ sơ (RC)' },
          ];
        },
        onError: (error) => {
          console.error('Error loading document types:', error);
          // Don't show toast here as we have fallback data
        },
      },
      {
        queryKey: ['departments'],
        queryFn: () => documentService.getDepartments(),
        staleTime: Infinity, // Metadata rarely changes, cache for entire session
        enabled: isOpen, // Only execute when modal is open
        select: (data) => {
          if (data?.success && Array.isArray(data.data)) {
            return data.data;
          }
          // Fallback data if API fails or data is not in the correct format
          return [
            { value: 'MG', label: 'Ban Giám đốc' },
            { value: 'FR', label: 'Phòng Phát triển Nhượng quyền' },
            { value: 'TR', label: 'Phòng Đào tạo Tiêu chuẩn' },
            { value: 'MK', label: 'Phòng Marketing Thương hiệu' },
            { value: 'QC', label: 'Phòng Kỹ thuật QC' },
            { value: 'FI', label: 'Phòng Tài chính Kế toán' },
            { value: 'IT', label: 'Phòng Công nghệ Hệ thống' },
            { value: 'LG', label: 'Phòng Pháp Lý Tuân thủ' },
            { value: 'CS', label: 'Bộ phận Tiếp nhận CSKH' },
            { value: 'TE', label: 'Bộ phận Kỹ thuật Garage' },
            { value: 'QG', label: 'Bộ phận QC Garage' },
            { value: 'WH', label: 'Bộ phận Kho Kế toán Garage' },
            { value: 'AS', label: 'Bộ phận Marketing Garage' },
            { value: 'GM', label: 'Quản lý Garage' },
          ];
        },
        onError: (error) => {
          console.error('Error loading departments:', error);
          // Don't show toast here as we have fallback data
        },
      },
    ],
  });

  // --- Derived State from Queries ---
  const isLoadingOptions = queries.some((query) => query.isLoading);
  const hasErrorInOptions = queries.some((query) => query.isError);
  const documentTypeOptions = queries[0].data || [];
  const departmentOptions = queries[1].data || [];

  // --- Show error toast only once when there are errors ---
  useEffect(() => {
    if (hasErrorInOptions && isOpen) {
      toast.error('Lỗi tải dữ liệu cấu hình. Sử dụng dữ liệu mặc định.');
    }
  }, [hasErrorInOptions, isOpen]);

  // --- Effect to load document data for edit mode ---
  useEffect(() => {
    const loadDocument = async () => {
      // If not in edit mode, no documentId, or initialDocument is already provided,
      // just use initialDocument or set to null and return.
      if (!isEditMode || !documentId || initialDocument) {
        setDocumentData(initialDocument);
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
        console.error('Error loading document:', error);
        toast.error(error.message || 'Lỗi tải thông tin tài liệu');
        onClose(); // Close modal if unable to load the document data
      } finally {
        setIsLoadingDocument(false);
      }
    };

    // Only load document if modal is open and in edit mode
    if (isOpen && isEditMode) {
      loadDocument();
    }
  }, [isOpen, isEditMode, documentId, initialDocument, onClose]);

  // --- Event Handlers ---

  /**
   * Handles the success callback from CreateDocumentModal.
   * Calls the onSuccess prop if provided and then closes the modal.
   * @param {Object} document - The created or updated document object.
   */
  const handleSuccess = (document) => {
    if (onSuccess) {
      onSuccess(document, isEditMode); // Pass the document and edit mode status
    }
    onClose(); // Close the modal
  };

  // --- Render Logic ---

  // If in edit mode and currently loading the document data, don't render the modal yet.
  if (isEditMode && isLoadingDocument) {
    return null;
  }

  // If options are still loading, you might want to show a loading indicator or similar
  if (isLoadingOptions) {
    return <div> </div>; // Or a more sophisticated loading component
  }

  return (
    <CreateDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      // *** FIXED HERE: Changed onCreated/onUpdated to onSave to match the prop in CreateDocumentModal ***
      onSave={handleSuccess}
      isEditMode={isEditMode}
      initialData={documentData}
      documentTypeOptions={documentTypeOptions}
      departmentOptions={departmentOptions}
    />
  );
}

export default DocumentFormWrapper;
// src/frontend/src/pages/DocumentsPage.js
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DocumentList from '../components/documents/DocumentList';
import Breadcrumb from '../components/common/Breadcrumb';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import DocumentFormWrapper from '../components/documents/DocumentFormWrapper';
import { documentService } from '../services/documentService';

/**
 * =================================================================
 * EDMS 1CAR - DocumentsPage (FINAL - Corrected Version)
 * Trang quản lý danh sách tài liệu.
 * PHIÊN BẢN ĐÃ SỬA LỖI:
 * - Sửa lỗi trong hàm `select` của `useQuery` để trích xuất chính xác
 * mảng `results` từ response của API.
 * - Đảm bảo component `DocumentList` nhận được một mảng và render đúng.
 * =================================================================
 */
function DocumentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState(null);

  const { data: documents, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentService.searchDocuments({}), // Lấy tất cả tài liệu
    
    // SỬA LỖI TẠI ĐÂY: Trích xuất đúng mảng `results` từ `data.data`
    // API trả về { success: true, data: { results: [...] } }
    // Chúng ta cần lấy `data.data.results`
    select: (response) => {
      if (response?.success && Array.isArray(response.data?.results)) {
        return response.data.results;
      }
      return []; // Trả về mảng rỗng nếu có lỗi hoặc không có dữ liệu
    },
    staleTime: 5 * 60 * 1000, // Cache danh sách trong 5 phút
  });

  const breadcrumbItems = [
    { label: 'Trang chủ', href: '/', current: false },
    { label: 'Quản lý tài liệu', href: '/documents', current: true },
  ];

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setEditingDocumentId(null);
    setIsModalOpen(true);
  };

  const handleEditDocument = (docId) => {
    setEditingDocumentId(docId);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDocumentId(null);
    setIsEditMode(false);
  };
  
  // Sau khi tạo/sửa thành công, làm mới lại danh sách
  const handleSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner message="Đang tải danh sách tài liệu..." />
      </div>
    );
  }

  if (isError) {
    return <ErrorMessage message={error.message || "Đã xảy ra lỗi khi tải tài liệu."} />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Quản lý tài liệu</h1>
            <p className="mt-1 text-sm text-gray-600">
              Quản lý và tìm kiếm tài liệu trong hệ thống EDMS 1CAR
            </p>
          </div>
          </div>
        <div className="p-6">
          <DocumentList
            documents={documents}
            onEdit={handleEditDocument}
            onDeleteSuccess={refetch}
          />
        </div>
      </div>
      
      {isModalOpen && (
        <DocumentFormWrapper
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          isEditMode={isEditMode}
          documentId={editingDocumentId}
        />
      )}
    </div>
  );
}

export default DocumentsPage;
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
 * EDMS 1CAR - DocumentsPage (Sửa lỗi Tạo mới/Chỉnh sửa)
 * Tách riêng logic xử lý cho việc "Tạo mới" và "Chỉnh sửa"
 * để đảm bảo form chính xác được hiển thị.
 * =================================================================
 */
function DocumentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState(null);

  const { data: documents, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentService.searchDocuments({}),
    select: (response) => {
      if (response?.success && Array.isArray(response.data?.results)) {
        return response.data.results;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const breadcrumbItems = [
    { label: 'Trang chủ', href: '/', current: false },
    { label: 'Quản lý tài liệu', href: '/documents', current: true },
  ];

  // =================================================================
  // SỬA LỖI: BƯỚC 1 - Tạo hàm riêng cho việc mở modal TẠO MỚI
  // Hàm này sẽ đặt isEditMode = false
  // =================================================================
  const handleOpenCreateModal = () => {
    setEditingDocumentId(null);
    setIsEditMode(false); // Quan trọng: Đặt chế độ sửa thành false
    setIsModalOpen(true);
  };

  // Hàm này giữ nguyên, chỉ dành cho việc CHỈNH SỬA
  const handleEditDocument = (docId) => {
    setEditingDocumentId(docId);
    setIsEditMode(true); // Quan trọng: Đặt chế độ sửa thành true
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDocumentId(null); // Reset ID khi đóng
    // isEditMode sẽ tự động được đặt lại ở lần mở tiếp theo
  };
  
  const handleSuccess = () => {
    refetch();
    handleCloseModal(); // Đóng modal sau khi thành công
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
          {/* SỬA LỖI: BƯỚC 2 - Truyền cả 2 hàm onCreate và onEdit xuống DocumentList */}
          <DocumentList
            documents={documents || []}
            onCreate={handleOpenCreateModal}
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
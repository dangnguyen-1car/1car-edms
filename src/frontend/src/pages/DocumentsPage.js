// src/frontend/src/pages/DocumentsPage.js
import React from 'react';
// Thay thế useQuery bằng useQueries để tối ưu
import { useQueries } from '@tanstack/react-query';
import DocumentList from '../components/documents/DocumentList';
import Breadcrumb from '../components/common/Breadcrumb';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { documentService } from '../services/documentService';

function DocumentsPage() {
  // --- PHẦN GIAO DIỆN: GIỮ NGUYÊN 100% ---
  const breadcrumbItems = [
    { label: 'Trang chủ', href: '/', current: false },
    { label: 'Quản lý tài liệu', href: '/documents', current: true }
  ];

  // --- PHẦN LOGIC: ĐƯỢC THAY THẾ BẰNG useQueries ---
  // Khối logic mới này thay thế cho 3 hook useQuery riêng lẻ ở file cũ.
  // Nó hiệu quả hơn vì gửi các truy vấn song song và quản lý tập trung.
  const queries = useQueries({
    queries: [
      {
        queryKey: ['documentTypes'],
        queryFn: documentService.getDocumentTypes,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000, // gcTime là tên mới cho cacheTime
        // Dữ liệu được chuyển đổi ngay trong logic fetch, giúp code gọn gàng hơn
        select: (data) => data?.data?.documentTypes?.map((dt) => ({
          value: dt.code,
          label: dt.name,
        })) || [], // Luôn trả về một mảng để tránh lỗi
      },
      {
        queryKey: ['departmentsList'],
        queryFn: documentService.getDepartments,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        select: (data) => data?.data?.departments?.map((d) => ({
          value: d,
          label: d,
        })) || [],
      },
      {
        queryKey: ['workflowStates'],
        queryFn: documentService.getWorkflowStates,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        select: (data) => data?.data?.workflowStates?.map((s) => ({
          value: s.code,
          label: s.name,
        })) || [],
      },
    ],
  });

  // Thay thế cách tính toán biến loading và các biến data
  const isLoadingOptions = queries.some((query) => query.isPending);
  const documentTypeOptions = queries[0].data; // Dữ liệu đã được map sẵn
  const departmentOptions = queries[1].data;
  const statusOptions = queries[2].data;
  // --- KẾT THÚC PHẦN THAY THẾ LOGIC ---


  // --- PHẦN GIAO DIỆN: GIỮ NGUYÊN 100% TỪ FILE CŨ ---
  // Cấu trúc JSX cho trạng thái loading được giữ y hệt.
  if (isLoadingOptions) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Quản lý tài liệu</h1>
            <p className="mt-1 text-sm text-gray-600">
              Quản lý và tìm kiếm tài liệu trong hệ thống EDMS 1CAR
            </p>
          </div>
          <div className="p-6 flex justify-center items-center h-64">
            <LoadingSpinner message="Đang tải dữ liệu hệ thống..." />
          </div>
        </div>
      </div>
    );
  }

  // Cấu trúc JSX cho trạng thái hiển thị chính được giữ y hệt.
  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">Quản lý tài liệu</h1>
          <p className="mt-1 text-sm text-gray-600">
            Quản lý và tìm kiếm tài liệu trong hệ thống EDMS 1CAR
          </p>
        </div>
        <div className="p-6">
          {/* Chỉ cập nhật tên biến trong props, không thay đổi bất kỳ thứ gì khác */}
          <DocumentList
            documentTypeOptions={documentTypeOptions}
            departmentOptions={departmentOptions}
            statusOptions={statusOptions}
            isLoadingOptions={isLoadingOptions}
          />
        </div>
      </div>
    </div>
  );
}

export default DocumentsPage;
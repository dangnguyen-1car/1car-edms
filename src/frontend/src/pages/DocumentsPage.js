// src/frontend/src/pages/DocumentsPage.js
import React from 'react';
import { useQuery } from 'react-query';
import DocumentList from '../components/documents/DocumentList';
import Breadcrumb from '../components/common/Breadcrumb';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { documentService } from '../services/documentService';

function DocumentsPage() {
  const breadcrumbItems = [
    { label: 'Trang chủ', href: '/', current: false },
    { label: 'Quản lý tài liệu', href: '/documents', current: true }
  ];

  // Fetch options for dropdowns - centralized at page level
  const { data: docTypesData, isLoading: isLoadingDocTypes } = useQuery(
    'documentTypes',
    documentService.getDocumentTypes,
    { 
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000 // 10 minutes
    }
  );
  
  const { data: departmentsData, isLoading: isLoadingDepts } = useQuery(
    'departmentsList',
    documentService.getDepartments,
    { 
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000
    }
  );
  
  const { data: workflowStatesData, isLoading: isLoadingStatuses } = useQuery(
    'workflowStates',
    documentService.getWorkflowStates,
    { 
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000
    }
  );

  // Map data to options format
  const mappedDocumentTypeOptions = docTypesData?.data?.documentTypes?.map(dt => ({ 
    value: dt.code, 
    label: dt.name 
  })) || [];
  
  const mappedDepartmentOptions = departmentsData?.data?.departments?.map(d => ({ 
    value: d, 
    label: d 
  })) || [];
  
  const mappedStatusOptions = workflowStatesData?.data?.workflowStates?.map(s => ({ 
    value: s.code, 
    label: s.name 
  })) || [];
  
  const isLoadingOptions = isLoadingDocTypes || isLoadingDepts || isLoadingStatuses;

  // Show loading state while fetching critical dropdown data
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
          <DocumentList 
            documentTypeOptions={mappedDocumentTypeOptions}
            departmentOptions={mappedDepartmentOptions}
            statusOptions={mappedStatusOptions}
            isLoadingOptions={isLoadingOptions}
          />
        </div>
      </div>
    </div>
  );
}

export default DocumentsPage;

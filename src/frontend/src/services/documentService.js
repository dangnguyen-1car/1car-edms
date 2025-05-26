/**
 * =================================================================
 * EDMS 1CAR - Document Service (Updated)
 * API calls for document operations with version support
 * =================================================================
 */

import api from './api';

export const documentService = {
  // Search documents with filters
  async searchDocuments(params) {
    const response = await api.get('/documents', { params });
    return response.data;
  },

  // Get document by ID
  async getDocument(id) {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  // Create new document
  async createDocument(documentData) {
    const response = await api.post('/documents', documentData);
    return response.data;
  },

  // Update document
  async updateDocument(id, documentData) {
    const response = await api.put(`/documents/${id}`, documentData);
    return response.data;
  },

  // Delete document
  async deleteDocument(id) {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  // Update document status
  async updateDocumentStatus(id, status, comment) {
    const response = await api.put(`/documents/${id}/status`, { status, comment });
    return response.data;
  },

  // Create document version
  async createDocumentVersion(id, versionData) {
    const response = await api.post(`/documents/${id}/versions`, versionData);
    return response.data;
  },

  // Get document versions
  async getDocumentVersions(id) {
    const response = await api.get(`/documents/${id}/versions`);
    return response.data;
  },

  // Get workflow history
  async getWorkflowHistory(id) {
    const response = await api.get(`/documents/${id}/workflow`);
    return response.data;
  },

  // Download document
  async downloadDocument(id) {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `document-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Download specific version
  async downloadDocumentVersion(documentId, versionId) {
    const response = await api.get(`/documents/${documentId}/versions/${versionId}/download`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `document-${documentId}-v${versionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Compare versions
  async compareVersions(versionId1, versionId2) {
    const response = await api.get(`/documents/versions/compare`, {
      params: { version1: versionId1, version2: versionId2 }
    });
    return response.data;
  },

  // Get document types
  async getDocumentTypes() {
    return {
      data: {
        documentTypes: [
          { code: 'PL', name: 'Chính sách' },
          { code: 'PR', name: 'Quy trình' },
          { code: 'WI', name: 'Hướng dẫn' },
          { code: 'FM', name: 'Biểu mẫu' },
          { code: 'TD', name: 'Tài liệu kỹ thuật' },
          { code: 'TR', name: 'Tài liệu đào tạo' },
          { code: 'RC', name: 'Hồ sơ' }
        ]
      }
    };
  },

  // Get departments
  async getDepartments() {
    return {
      data: {
        departments: [
          'Ban Giám đốc',
          'Phòng Phát triển Nhượng quyền',
          'Phòng Đào tạo Tiêu chuẩn',
          'Phòng Marketing',
          'Phòng Kỹ thuật QC',
          'Phòng Tài chính',
          'Phòng Công nghệ Hệ thống',
          'Phòng Pháp lý',
          'Bộ phận Tiếp nhận CSKH',
          'Bộ phận Kỹ thuật Garage',
          'Bộ phận QC Garage',
          'Bộ phận Kho/Kế toán Garage',
          'Bộ phận Marketing Garage',
          'Quản lý Garage'
        ]
      }
    };
  },

  // Get workflow states
  async getWorkflowStates() {
    return {
      data: {
        workflowStates: [
          { code: 'draft', name: 'Bản nháp' },
          { code: 'review', name: 'Đang xem xét' },
          { code: 'published', name: 'Đã phê duyệt' },
          { code: 'archived', name: 'Đã lưu trữ' }
        ]
      }
    };
  }
};

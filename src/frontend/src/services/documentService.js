// src/frontend/src/services/documentService.js
/**
 * =================================================================
 * EDMS 1CAR - Document Service (Frontend)
 *
 * Lớp dịch vụ này đóng vai trò là một lớp trung gian (API layer)
 * để xử lý tất cả các yêu cầu liên quan đến tài liệu từ phía frontend.
 * Nó giúp trừu tượng hóa các lệnh gọi API và quản lý lỗi một cách tập trung.
 * =================================================================
 */

import api from './api';

class DocumentService {

  // =================================================================
  // Lấy dữ liệu Metadata & Options
  // =================================================================

  /**
   * Lấy danh sách các loại tài liệu (ví dụ: Quy trình, Hướng dẫn).
   * @returns {Promise<Object>} Dữ liệu trả về từ API.
   */
  async getDocumentTypes() {
    try {
      const response = await api.get('/documents/types');
      return response.data;
    } catch (error) {
      console.error('Error fetching document types:', error);
      throw new Error('Không thể tải danh sách loại tài liệu');
    }
  }

  /**
   * Lấy danh sách các phòng ban.
   * @returns {Promise<Object>} Dữ liệu trả về từ API.
   */
  async getDepartments() {
    try {
      const response = await api.get('/documents/departments');
      return response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw new Error('Không thể tải danh sách phòng ban');
    }
  }

  /**
   * Lấy danh sách các trạng thái của tài liệu (ví dụ: Nháp, Đang xem xét).
   * @returns {Promise<Object>} Dữ liệu trả về từ API.
   */
  async getWorkflowStates() {
    try {
      const response = await api.get('/documents/workflow-states');
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow states:', error);
      throw new Error('Không thể tải danh sách trạng thái workflow');
    }
  }
  
  /**
   * Lấy metadata cho các bộ lọc tìm kiếm.
   * @returns {Promise<Object>} Dữ liệu trả về từ API.
   */
  async getSearchFilters() {
    try {
      const response = await api.get('/documents/search-filters');
      return response.data;
    } catch (error) {
      console.error('Error fetching search filters:', error);
      throw new Error('Không thể tải bộ lọc tìm kiếm');
    }
  }


  // =================================================================
  // Tìm kiếm & Lấy danh sách
  // =================================================================

  /**
   * Tìm kiếm tài liệu với các tiêu chí nâng cao.
   * @param {Object} searchParams - Các tham số tìm kiếm (page, limit, type, status, v.v.).
   * @returns {Promise<Object>} Kết quả tìm kiếm từ API.
   */
  async searchDocuments(searchParams) {
    try {
      // Tạo query string từ object searchParams, loại bỏ các giá trị rỗng.
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      // Endpoint đúng là /documents, không phải /documents/search
      const response = await api.get(`/documents?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error('Không thể tìm kiếm tài liệu. Vui lòng kiểm tra lại bộ lọc.');
    }
  }
  
  /**
   * Lấy các gợi ý tìm kiếm dựa trên từ khóa.
   * @param {string} query - Từ khóa tìm kiếm.
   * @param {number} limit - Số lượng gợi ý tối đa.
   * @returns {Promise<Object>} Danh sách các gợi ý.
   */
  async getSearchSuggestions(query, limit = 10) {
    try {
      if (!query || query.trim().length < 2) {
        return { success: true, data: { suggestions: [], query, count: 0 } };
      }
      const response = await api.get(`/documents/search-suggestions?query=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      throw new Error('Không thể tải gợi ý tìm kiếm');
    }
  }

  /**
   * Gọi API backend để lấy gợi ý mã tài liệu
   * @param {string} type
   * @param {string} department
   * @returns {Promise<Object>} { success, data: { suggestedCode, ... } }
   */
  async getSuggestedCode(type, department) {
    try {
      if (!type || !department) {
        throw new Error('Loại tài liệu và phòng ban là bắt buộc');
      }
      const response = await api.get('/documents/suggest-code', {
        params: { type, department }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting suggested code:', error);
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Lỗi khi lấy gợi ý mã tài liệu'
      );
    }
  }


  // =================================================================
  // Thao tác CRUD trên một tài liệu
  // =================================================================

  /**
   * Lấy thông tin chi tiết của một tài liệu bằng ID.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise<Object>} Chi tiết tài liệu.
   */
  async getDocument(id) {
    try {
      const response = await api.get(`/documents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching document with ID ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Không tìm thấy tài liệu.');
      }
      throw new Error('Không thể tải thông tin chi tiết tài liệu.');
    }
  }

  /**
   * Tạo một tài liệu mới.
   * @param {Object} documentData - Dữ liệu của tài liệu cần tạo.
   * @returns {Promise<Object>} Tài liệu vừa được tạo.
   */
  async createDocument(documentData) {
    try {
      const response = await api.post('/documents', documentData);
      return response.data;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error(error.response?.data?.message || 'Không thể tạo tài liệu mới.');
    }
  }

  /**
   * Cập nhật một tài liệu đã có.
   * @param {number|string} id - ID của tài liệu.
   * @param {Object} documentData - Dữ liệu cần cập nhật.
   * @returns {Promise<Object>} Tài liệu đã được cập nhật.
   */
  async updateDocument(id, documentData) {
    try {
      const response = await api.put(`/documents/${id}`, documentData);
      return response.data;
    } catch (error) {
      console.error(`Error updating document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật tài liệu.');
    }
  }

  /**
   * Xóa một tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise<Object>} Kết quả xóa.
   */
  async deleteDocument(id) {
    try {
      const response = await api.delete(`/documents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể xóa tài liệu.');
    }
  }

  /**
   * Tải file của một tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise<void>}
   */
  async downloadDocument(id) {
    try {
      const response = await api.get(`/documents/${id}/download`, {
        responseType: 'blob' // Yêu cầu trả về dưới dạng file
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      let filename = 'document';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error downloading document ${id}:`, error);
      throw new Error('Không thể tải xuống tài liệu.');
    }
  }


  // =================================================================
  // Thao tác Workflow & Versioning
  // =================================================================

  /**
   * Cập nhật trạng thái của tài liệu (ví dụ: gửi duyệt, phê duyệt).
   * @param {number|string} id - ID của tài liệu.
   * @param {Object} statusData - Dữ liệu trạng thái mới.
   * @returns {Promise<Object>} Kết quả cập nhật.
   */
  async updateStatus(id, statusData) {
    try {
      const response = await api.put(`/documents/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      console.error(`Error updating status for document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật trạng thái.');
    }
  }

  /**
   * Tạo một phiên bản mới cho tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @param {Object} versionData - Dữ liệu phiên bản mới.
   * @returns {Promise<Object>} Chi tiết phiên bản mới.
   */
  async createVersion(id, versionData) {
    try {
      const response = await api.post(`/documents/${id}/versions`, versionData);
      return response.data;
    } catch (error) {
      console.error(`Error creating version for document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể tạo phiên bản mới.');
    }
  }

  /**
   * Lấy lịch sử các phiên bản của tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise<Object>} Lịch sử phiên bản.
   */
  async getVersionHistory(id) {
    try {
      const response = await api.get(`/documents/${id}/versions`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching version history for document ${id}:`, error);
      throw new Error('Không thể tải lịch sử phiên bản.');
    }
  }

  /**
   * Lấy lịch sử luồng công việc (workflow) của tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise<Object>} Lịch sử workflow.
   */
  async getWorkflowHistory(id) {
    try {
      const response = await api.get(`/documents/${id}/workflow`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow history for document ${id}:`, error);
      throw new Error('Không thể tải lịch sử workflow.');
    }
  }
}

// Xuất ra một instance duy nhất của class (Singleton Pattern)
// để đảm bảo toàn bộ ứng dụng dùng chung một đối tượng service.
export const documentService = new DocumentService();
export default documentService;
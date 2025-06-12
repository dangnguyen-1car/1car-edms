// src/frontend/src/services/documentService.js
/**
 * =================================================================
 * EDMS 1CAR - Document Service (Frontend)
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
   * @returns {Promise} Dữ liệu trả về từ API.
   */
  async getDocumentTypes() {
    try {
      const response = await api.get('/documents/types');
      return response.data;
    } catch (error) {
      console.error('Error fetching document types:', error);
      // Fallback data for development
      return {
        success: true,
        data: [
          { value: 'PL', label: 'Chính sách (PL)' },
          { value: 'PR', label: 'Quy trình (PR)' },
          { value: 'WI', label: 'Hướng dẫn (WI)' },
          { value: 'FM', label: 'Biểu mẫu (FM)' },
          { value: 'TD', label: 'Tài liệu kỹ thuật (TD)' },
          { value: 'TR', label: 'Tài liệu đào tạo (TR)' },
          { value: 'RC', label: 'Hồ sơ (RC)' }
        ]
      };
    }
  }

  /**
   * Lấy danh sách các phòng ban.
   * @returns {Promise} Dữ liệu trả về từ API.
   */
  async getDepartments() {
    try {
      const response = await api.get('/documents/departments');
      return response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback data for development
      return {
        success: true,
        data: [
          { value: 'BGD', label: 'Ban Giám đốc' },
          { value: 'PTNT', label: 'Phòng Phát triển Năng lượng' },
          { value: 'PDTTC', label: 'Phòng Đào tạo Tiêu chuẩn' },
          { value: 'PMK', label: 'Phòng Marketing' },
          { value: 'PKTQC', label: 'Phòng Kỹ thuật QC' },
          { value: 'PTC', label: 'Phòng Tài chính' },
          { value: 'PCNHT', label: 'Phòng Công nghệ Hệ thống' },
          { value: 'PPL', label: 'Phòng Pháp lý' },
          { value: 'BPTN', label: 'Bộ phận Tiếp nhận CSKH' },
          { value: 'BPKT', label: 'Bộ phận Kỹ thuật Garage' },
          { value: 'BPQC', label: 'Bộ phận QC Garage' },
          { value: 'BPKK', label: 'Bộ phận Kho/Kế toán Garage' },
          { value: 'BPMKG', label: 'Bộ phận Marketing Garage' },
          { value: 'QLG', label: 'Quản lý Garage' }
        ]
      };
    }
  }

  /**
   * Lấy danh sách các trạng thái của tài liệu (ví dụ: Nháp, Đang xem xét).
   * @returns {Promise} Dữ liệu trả về từ API.
   */
  async getWorkflowStates() {
    try {
      const response = await api.get('/documents/workflow-states');
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow states:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách trạng thái workflow. Vui lòng thử lại.');
    }
  }

  /**
   * Lấy metadata cho các bộ lọc tìm kiếm.
   * @returns {Promise} Dữ liệu trả về từ API.
   */
  async getSearchFilters() {
    try {
      const response = await api.get('/documents/search-filters');
      return response.data;
    } catch (error) {
      console.error('Error fetching search filters:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải bộ lọc tìm kiếm. Vui lòng thử lại.');
    }
  }

  // =================================================================
  // Tìm kiếm & Lấy danh sách
  // =================================================================
  /**
   * Tìm kiếm tài liệu với các tiêu chí nâng cao.
   * @param {Object} searchParams - Các tham số tìm kiếm (page, limit, type, status, v.v.).
   * @returns {Promise} Kết quả tìm kiếm từ API.
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
      throw new Error(error.response?.data?.message || 'Không thể tìm kiếm tài liệu. Vui lòng kiểm tra lại bộ lọc và thử lại.');
    }
  }

  /**
   * Lấy các gợi ý tìm kiếm dựa trên từ khóa.
   * @param {string} query - Từ khóa tìm kiếm.
   * @param {number} limit - Số lượng gợi ý tối đa.
   * @returns {Promise} Danh sách các gợi ý.
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
      throw new Error(error.response?.data?.message || 'Không thể tải gợi ý tìm kiếm. Vui lòng thử lại.');
    }
  }

  /**
   * Gọi API backend để lấy gợi ý mã tài liệu
   * @param {string} type
   * @param {string} department
   * @returns {Promise} { success, data: { suggestedCode, ... } }
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
        'Lỗi khi lấy gợi ý mã tài liệu. Vui lòng thử lại.'
      );
    }
  }

  /**
   * Kiểm tra tính khả dụng của mã tài liệu
   * @param {string} code - Mã tài liệu cần kiểm tra
   * @returns {Promise} { success, data: { available } }
   */
  async checkCodeAvailability(code) {
    try {
      const response = await api.post('/documents/check-code', { code });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Check code availability error:', error);
      return {
        success: false,
        data: { available: false },
        message: error.response?.data?.message || 'Lỗi kiểm tra mã tài liệu'
      };
    }
  }

  // =================================================================
  // Thao tác CRUD trên một tài liệu
  // =================================================================
  /**
   * Lấy thông tin chi tiết của một tài liệu bằng ID.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise} Chi tiết tài liệu.
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
      throw new Error(error.response?.data?.message || 'Không thể tải thông tin chi tiết tài liệu. Vui lòng thử lại.');
    }
  }

  /**
   * Tạo một tài liệu mới.
   * @param {Object} documentData - Dữ liệu của tài liệu cần tạo.
   * @returns {Promise} Tài liệu vừa được tạo.
   */
  async createDocument(documentData) {
    try {
      const response = await api.post('/documents', documentData);
      return response.data;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error(error.response?.data?.message || 'Không thể tạo tài liệu mới. Vui lòng thử lại.');
    }
  }

  /**
   * Cập nhật một tài liệu đã có.
   * @param {number|string} id - ID của tài liệu.
   * @param {Object} documentData - Dữ liệu cần cập nhật.
   * @returns {Promise} Tài liệu đã được cập nhật.
   */
  async updateDocument(id, documentData) {
    try {
      const response = await api.put(`/documents/${id}`, documentData);
      return response.data;
    } catch (error) {
      console.error(`Error updating document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật tài liệu. Vui lòng thử lại.');
    }
  }

  /**
   * Xóa một tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise} Kết quả xóa.
   */
  async deleteDocument(id) {
    try {
      const response = await api.delete(`/documents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể xóa tài liệu. Vui lòng thử lại.');
    }
  }

  /**
   * Tải file của một tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise}
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
      throw new Error(error.response?.data?.message || 'Không thể tải xuống tài liệu. Vui lòng thử lại.');
    }
  }

  // =================================================================
  // Thao tác Workflow & Versioning
  // =================================================================
  /**
   * Cập nhật trạng thái của tài liệu (ví dụ: gửi duyệt, phê duyệt).
   * @param {number|string} id - ID của tài liệu.
   * @param {Object} statusData - Dữ liệu trạng thái mới.
   * @returns {Promise} Kết quả cập nhật.
   */
  async updateStatus(id, statusData) {
    try {
      const response = await api.put(`/documents/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      console.error(`Error updating status for document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  }

  /**
   * Tạo một phiên bản mới cho tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @param {Object} versionData - Dữ liệu phiên bản mới.
   * @returns {Promise} Chi tiết phiên bản mới.
   */
  async createVersion(id, versionData) {
    try {
      const response = await api.post(`/documents/${id}/versions`, versionData);
      return response.data;
    } catch (error) {
      console.error(`Error creating version for document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể tạo phiên bản mới. Vui lòng thử lại.');
    }
  }

  /**
   * Lấy lịch sử các phiên bản của tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise} Lịch sử phiên bản.
   */
  async getVersionHistory(id) {
    try {
      const response = await api.get(`/documents/${id}/versions`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching version history for document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể tải lịch sử phiên bản. Vui lòng thử lại.');
    }
  }

  /**
   * Lấy lịch sử luồng công việc (workflow) của tài liệu.
   * @param {number|string} id - ID của tài liệu.
   * @returns {Promise} Lịch sử workflow.
   */
  async getWorkflowHistory(id) {
    try {
      const response = await api.get(`/documents/${id}/workflow`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow history for document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể tải lịch sử workflow. Vui lòng thử lại.');
    }
  }

  /**
   * Phê duyệt tài liệu
   * @param {number|string} id - ID của tài liệu
   * @param {Object} approvalData - Dữ liệu phê duyệt
   * @returns {Promise} Kết quả phê duyệt
   */
  async approveDocument(id, approvalData) {
    try {
      const response = await api.post(`/documents/${id}/approve`, approvalData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Tài liệu đã được phê duyệt'
      };
    } catch (error) {
      console.error(`Error approving document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể phê duyệt tài liệu. Vui lòng thử lại.');
    }
  }

  /**
   * Từ chối tài liệu
   * @param {number|string} id - ID của tài liệu
   * @param {Object} rejectionData - Dữ liệu từ chối
   * @returns {Promise} Kết quả từ chối
   */
  async rejectDocument(id, rejectionData) {
    try {
      const response = await api.post(`/documents/${id}/reject`, rejectionData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Tài liệu đã được từ chối'
      };
    } catch (error) {
      console.error(`Error rejecting document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể từ chối tài liệu. Vui lòng thử lại.');
    }
  }

  // =================================================================
  // Permission & Authorization Helpers
  // =================================================================
  /**
   * Kiểm tra quyền chỉnh sửa tài liệu
   * @param {Object} document - Tài liệu cần kiểm tra
   * @param {Object} currentUser - Người dùng hiện tại
   * @returns {boolean} Có quyền chỉnh sửa hay không
   */
  canEditDocument(document, currentUser) {
    if (!document || !currentUser) return false;

    // Admin có thể chỉnh sửa mọi tài liệu
    if (currentUser.role === 'admin') return true;

    // Tác giả có thể chỉnh sửa tài liệu của mình ở trạng thái draft hoặc review
    if (document.author_id === currentUser.id &&
      ['draft', 'review'].includes(document.status)) {
      return true;
    }

    // Manager có thể chỉnh sửa tài liệu trong phòng ban của mình
    if (currentUser.role === 'manager' &&
      document.department === currentUser.department &&
      ['draft', 'review'].includes(document.status)) {
      return true;
    }

    return false;
  }

  /**
   * Kiểm tra quyền tạo phiên bản mới
   * @param {Object} document - Tài liệu cần kiểm tra
   * @param {Object} currentUser - Người dùng hiện tại
   * @returns {boolean} Có quyền tạo phiên bản hay không
   */
  canCreateVersion(document, currentUser) {
    if (!document || !currentUser) return false;

    // Admin có thể tạo phiên bản cho mọi tài liệu đã published
    if (currentUser.role === 'admin' && document.status === 'published') {
      return true;
    }

    // Tác giả có thể tạo phiên bản cho tài liệu đã published của mình
    if (document.author_id === currentUser.id && document.status === 'published') {
      return true;
    }

    // Manager có thể tạo phiên bản cho tài liệu trong phòng ban
    if (currentUser.role === 'manager' &&
      document.department === currentUser.department &&
      document.status === 'published') {
      return true;
    }

    return false;
  }

  /**
   * Kiểm tra quyền phê duyệt tài liệu
   * @param {Object} document - Tài liệu cần kiểm tra
   * @param {Object} currentUser - Người dùng hiện tại
   * @returns {boolean} Có quyền phê duyệt hay không
   */
  canApproveDocument(document, currentUser) {
    if (!document || !currentUser) return false;

    // Admin có thể phê duyệt mọi tài liệu
    if (currentUser.role === 'admin') return true;

    // Manager có thể phê duyệt tài liệu trong phòng ban ở trạng thái review
    if (currentUser.role === 'manager' &&
      document.department === currentUser.department &&
      document.status === 'review') {
      return true;
    }

    return false;
  }

  /**
   * Kiểm tra quyền xóa tài liệu
   * @param {Object} document - Tài liệu cần kiểm tra
   * @param {Object} currentUser - Người dùng hiện tại
   * @returns {boolean} Có quyền xóa hay không
   */
  canDeleteDocument(document, currentUser) {
    if (!document || !currentUser) return false;

    // Admin có thể xóa mọi tài liệu
    if (currentUser.role === 'admin') return true;

    // Tác giả có thể xóa tài liệu draft của mình
    if (document.author_id === currentUser.id && document.status === 'draft') {
      return true;
    }

    return false;
  }
}

// Xuất ra một instance duy nhất của class (Singleton Pattern)
// để đảm bảo toàn bộ ứng dụng dùng chung một đối tượng service.
export const documentService = new DocumentService();
export default documentService;
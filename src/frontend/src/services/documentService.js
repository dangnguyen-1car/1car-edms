// src/frontend/src/services/documentService.js
/**
 * =================================================================
 * EDMS 1CAR - Document Service (Frontend) (FINAL FIX)
 * Đã sửa lỗi triệt để trong hàm getSuggestedCode.
 * Hàm này giờ sẽ tự tra cứu mã phòng ban trước khi gửi request.
 * =================================================================
 */
import api from './api';
// <<< SỬA LỖI 1: Import departmentOptions để tra cứu >>>
import { departmentOptions } from '../utils/documentUtils';

class DocumentService {
  // =================================================================
  // Lấy dữ liệu Metadata & Options
  // =================================================================
  async getDocumentTypes() {
    try {
      const response = await api.get('/documents/types');
      return response.data;
    } catch (error) {
      console.error('Error fetching document types:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải các loại tài liệu.');
    }
  }

  async getDepartments() {
    try {
      const response = await api.get('/documents/departments');
      return response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách phòng ban.');
    }
  }

  async getWorkflowStates() {
    try {
      const response = await api.get('/documents/workflow-states');
      return response.data;
    } catch (error) {
      console.error('Error fetching workflow states:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách trạng thái.');
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
  async searchDocuments(searchParams) {
    try {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      const response = await api.get(`/documents?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error(error.response?.data?.message || 'Lỗi khi tìm kiếm tài liệu.');
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

  // <<< SỬA LỖI 2: VIẾT LẠI HOÀN TOÀN HÀM getSuggestedCode >>>
  /**
   * Gọi API backend để lấy gợi ý mã tài liệu.
   * @param {string} type - Mã loại tài liệu (ví dụ: 'PL').
   * @param {string} departmentValue - Giá trị phòng ban từ form (có thể là mã 'FI' hoặc tên đầy đủ 'Phòng Tài chính').
   * @returns {Promise} Dữ liệu trả về từ API.
   */
  async getSuggestedCode(type, departmentValue) {
    try {
      if (!type || !departmentValue) {
        throw new Error('Loại tài liệu và phòng ban là bắt buộc để tạo mã gợi ý.');
      }

      let deptCode = '';

      // Tìm phòng ban trong departmentOptions
      const foundDept = departmentOptions.find(opt => opt.value === departmentValue || opt.label === departmentValue);

      if (foundDept) {
        // Nếu tìm thấy, luôn sử dụng `value` (mã phòng ban) để gửi đi
        deptCode = foundDept.value;
      } else {
        // Nếu không tìm thấy, báo lỗi rõ ràng
        throw new Error(`Phòng ban không hợp lệ: "${departmentValue}". Vui lòng kiểm tra lại.`);
      }

      // Gọi API với mã phòng ban đã được chuẩn hóa
      const response = await api.get('/documents/suggest-code', {
        params: {
          type,
          department: deptCode // Backend mong muốn nhận key là 'department' với value là mã
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting suggested code:', error);
      // Ném lỗi ra ngoài để `useQuery` hoặc `useMutation` có thể bắt và xử lý
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Lỗi khi lấy gợi ý mã tài liệu. Vui lòng thử lại.'
      );
    }
  }

  async checkCodeAvailability(code) {
    try {
      const response = await api.post('/documents/check-code', { code });
      return response.data;
    } catch (error) {
      console.error('Check code availability error:', error);
      throw new Error(error.response?.data?.message || 'Lỗi kiểm tra mã tài liệu');
    }
  }
  
  // =================================================================
  // Thao tác CRUD trên một tài liệu
  // =================================================================
  async getDocument(id) {
    try {
      const response = await api.get(`/documents/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching document with ID ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Không tìm thấy tài liệu.');
      }
      throw new Error(error.response?.data?.message || 'Không thể tải chi tiết tài liệu.');
    }
  }

  async createDocument(documentData) {
    try {
      const response = await api.post('/documents', documentData);
      return response.data;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error(error.response?.data?.message || 'Không thể tạo tài liệu mới.');
    }
  }

  async updateDocument(id, documentData) {
    try {
      const response = await api.put(`/documents/${id}`, documentData);
      return response.data;
    } catch (error) {
      console.error(`Error updating document ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật tài liệu.');
    }
  }
  
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
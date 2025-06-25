// src/frontend/src/api/documentApi.js - Cập nhật với API calls cho phân quyền
/**
 * =================================================================
 * EDMS 1CAR - Document API Service (Updated with Permissions)
 * =================================================================
 */
import api from '../services/api'; // Đảm bảo đường dẫn import đúng

/**
 * Helper function to handle file downloads from a blob response.
 * This avoids code repetition in download functions.
 * @param {Object} response - The Axios response object with data as a blob.
 * @param {string} defaultFilename - The fallback filename if not provided in headers.
 * @returns {Blob} The blob data from the response.
 */
const handleFileDownload = (response, defaultFilename) => {
    // Create a URL for the blob data
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Extract filename from the 'content-disposition' header
    const contentDisposition = response.headers['content-disposition'];
    let filename = defaultFilename;
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/i);
        if (filenameMatch && filenameMatch[1]) {
            filename = decodeURIComponent(filenameMatch[1]); // Decode URI component for special characters
        }
    }

    // Set the download attribute and trigger the click
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    // Clean up by removing the link and revoking the object URL
    link.remove();
    window.URL.revokeObjectURL(url);

    return response.data;
};

export const documentAPI = {
    // =================================================================
    // == Document CRUD Operations
    // =================================================================
    /**
     * Lấy danh sách tài liệu với bộ lọc và phân trang.
     * @param {object} params - Các tham số truy vấn (search, page, limit, sort, filters).
     * @returns {Promise<object>} Dữ liệu phản hồi từ API.
     */
    getDocuments: async (params = {}) => {
        const response = await api.get('/documents', { params });
        return response.data;
    },
    /**
     * Lấy thông tin chi tiết một tài liệu theo ID.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Dữ liệu tài liệu.
     */
    getDocument: async (id) => {
        const response = await api.get(`/documents/${id}`);
        return response.data;
    },
    /**
     * Tạo tài liệu mới.
     * @param {object} documentData - Dữ liệu của tài liệu mới.
     * @returns {Promise<object>} Dữ liệu tài liệu đã tạo.
     */
    createDocument: async (documentData) => {
        const response = await api.post('/documents', documentData);
        return response.data;
    },
    /**
     * Cập nhật thông tin tài liệu.
     * @param {number} id - ID của tài liệu.
     * @param {object} documentData - Dữ liệu tài liệu cần cập nhật.
     * @returns {Promise<object>} Dữ liệu tài liệu đã cập nhật.
     */
    updateDocument: async (id, documentData) => {
        const response = await api.put(`/documents/${id}`, documentData);
        return response.data;
    },
    /**
     * Xóa tài liệu.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Kết quả xóa.
     */
    deleteDocument: async (id) => {
        const response = await api.delete(`/documents/${id}`);
        return response.data;
    },

    // =================================================================
    // == File & Metadata Operations
    // =================================================================
    /**
     * Tải lên file tài liệu.
     * @param {number} id - ID của tài liệu.
     * @param {File} file - File để tải lên.
     * @returns {Promise<object>} Kết quả tải lên.
     */
    uploadDocumentFile: async (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/documents/${id}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
    /**
     * Tải xuống tài liệu.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<Blob>} Blob dữ liệu file.
     */
    downloadDocument: async (id) => {
        const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
        return handleFileDownload(response, `document_${id}.pdf`);
    },
    /**
     * Lấy buffer của file tài liệu.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<ArrayBuffer>} Buffer dữ liệu file.
     */
    getDocumentFileBuffer: async (id) => {
        const response = await api.get(`/documents/${id}/download`, { responseType: 'arraybuffer' });
        return response.data;
    },
    /**
     * Lấy metadata của tài liệu.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Metadata tài liệu.
     */
    getDocumentMetadata: async (id) => {
        const response = await api.get(`/documents/${id}/metadata`);
        return response.data;
    },
    /**
     * Cập nhật metadata của tài liệu.
     * @param {number} id - ID của tài liệu.
     * @param {object} metadata - Metadata cần cập nhật.
     * @returns {Promise<object>} Metadata đã cập nhật.
     */
    updateDocumentMetadata: async (id, metadata) => {
        const response = await api.put(`/documents/${id}/metadata`, metadata);
        return response.data;
    },

    // =================================================================
    // == Version Management
    // =================================================================
    /**
     * Lấy danh sách các phiên bản của tài liệu.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Danh sách phiên bản.
     */
    getDocumentVersions: async (id) => {
        const response = await api.get(`/documents/${id}/versions`);
        return response.data;
    },
    /**
     * Tạo phiên bản mới cho tài liệu.
     * @param {number} id - ID của tài liệu.
     * @param {object} versionData - Dữ liệu phiên bản mới.
     * @returns {Promise<object>} Phiên bản đã tạo.
     */
    createDocumentVersion: async (id, versionData) => {
        const response = await api.post(`/documents/${id}/versions`, versionData);
        return response.data;
    },
    /**
     * Tải xuống một phiên bản tài liệu cụ thể.
     * @param {number} documentId - ID của tài liệu.
     * @param {number} versionId - ID của phiên bản.
     * @returns {Promise<Blob>} Blob dữ liệu file.
     */
    downloadDocumentVersion: async (documentId, versionId) => {
        const response = await api.get(`/documents/${documentId}/versions/${versionId}/download`, { responseType: 'blob' });
        return handleFileDownload(response, `document_${documentId}_v${versionId}.pdf`);
    },
    /**
     * So sánh hai phiên bản tài liệu.
     * @param {number} versionId1 - ID của phiên bản thứ nhất.
     * @param {number} versionId2 - ID của phiên bản thứ hai.
     * @returns {Promise<object>} Kết quả so sánh.
     */
    compareVersions: async (versionId1, versionId2) => {
        const response = await api.get('/documents/versions/compare', {
            params: { version1: versionId1, version2: versionId2 }
        });
        return response.data;
    },

    // =================================================================
    // == Workflow & Status Operations
    // =================================================================
    /**
     * Lấy lịch sử workflow của tài liệu.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Lịch sử workflow.
     */
    getDocumentWorkflow: async (id) => {
        const response = await api.get(`/documents/${id}/workflow`);
        return response.data;
    },
    /**
     * Cập nhật trạng thái tài liệu (Sử dụng cho các trường hợp không phải workflow approval).
     * @param {number} id - ID của tài liệu.
     * @param {object} statusData - Dữ liệu trạng thái mới.
     * @returns {Promise<object>} Kết quả cập nhật.
     */
    updateDocumentStatus: async (id, statusData) => {
        const response = await api.put(`/documents/${id}/status`, statusData);
        return response.data;
    },
    /**
     * Thay đổi trạng thái tài liệu thông qua một hành động cụ thể.
     * @param {number} id - ID của tài liệu.
     * @param {object} statusData - Dữ liệu trạng thái và bình luận.
     * @returns {Promise<object>} Kết quả thay đổi.
     */
    changeDocumentStatus: async (id, statusData) => {
        const response = await api.post(`/documents/${id}/change-status`, statusData);
        return response.data;
    },
    /**
     * Xử lý hành động workflow (approve, reject, request_changes).
     * @param {number} id - ID của tài liệu.
     * @param {string} action - Hành động workflow ('approve', 'reject', 'request_changes').
     * @param {string} comment - Bình luận cho hành động.
     * @returns {Promise<object>} Kết quả hành động workflow.
     */
    processWorkflowAction: async (id, action, comment) => { // Đã hợp nhất processWorkflowAction
        const response = await api.post(`/documents/${id}/workflow`, { action, comment });
        return response.data;
    },
    // Các hàm approveDocument và rejectDocument có thể được hợp nhất vào processWorkflowAction
    // nếu backend đã được thiết kế như vậy. Nếu không, chúng cần được giữ lại.
    // Đối với yêu cầu này, tôi sẽ giữ chúng nếu chúng đã có trong code gốc.
    approveDocument: async (id, approvalData) => {
        const response = await api.post(`/documents/${id}/approve`, approvalData);
        return response.data;
    },
    rejectDocument: async (id, rejectionData) => {
        const response = await api.post(`/documents/${id}/reject`, rejectionData);
        return response.data;
    },

    // =================================================================
    // == Related Documents
    // =================================================================
    /**
     * Lấy các tài liệu liên quan.
     * @param {number} id - ID của tài liệu chính.
     * @param {object} params - Các tham số truy vấn.
     * @returns {Promise<object>} Danh sách tài liệu liên quan.
     */
    getRelatedDocuments: async (id, params = {}) => {
        const response = await api.get(`/documents/${id}/related`, { params });
        return response.data;
    },
    /**
     * Thêm tài liệu liên quan.
     * @param {number} id - ID của tài liệu chính.
     * @param {number} relatedDocumentId - ID của tài liệu liên quan.
     * @param {string} relationshipType - Loại mối quan hệ.
     * @returns {Promise<object>} Kết quả thêm.
     */
    addRelatedDocument: async (id, relatedDocumentId, relationshipType) => {
        const response = await api.post(`/documents/${id}/related`, { relatedDocumentId, relationshipType });
        return response.data;
    },
    /**
     * Xóa tài liệu liên quan.
     * @param {number} id - ID của tài liệu chính.
     * @param {number} relatedDocumentId - ID của tài liệu liên quan cần xóa.
     * @returns {Promise<object>} Kết quả xóa.
     */
    removeRelatedDocument: async (id, relatedDocumentId) => {
        const response = await api.delete(`/documents/${id}/related/${relatedDocumentId}`);
        return response.data;
    },

    // =================================================================
    // == Sharing & Permissions (Existing section for general sharing)
    // =================================================================
    /**
     * Chia sẻ tài liệu (ví dụ: qua email).
     * @param {number} id - ID của tài liệu.
     * @param {object} shareData - Dữ liệu chia sẻ.
     * @returns {Promise<object>} Kết quả chia sẻ.
     */
    shareDocument: async (id, shareData) => {
        const response = await api.post(`/documents/${id}/share`, shareData);
        return response.data;
    },
    /**
     * Tạo link chia sẻ cho tài liệu.
     * @param {number} id - ID của tài liệu.
     * @param {object} linkData - Dữ liệu link chia sẻ.
     * @returns {Promise<object>} Thông tin link chia sẻ.
     */
    generateShareLink: async (id, linkData) => {
        const response = await api.post(`/documents/${id}/share-link`, linkData);
        return response.data;
    },
    /**
     * Lấy danh sách các lượt chia sẻ của tài liệu.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Danh sách lượt chia sẻ.
     */
    getDocumentShares: async (id) => {
        const response = await api.get(`/documents/${id}/shares`);
        return response.data;
    },
    /**
     * Thu hồi một lượt chia sẻ tài liệu.
     * @param {number} id - ID của tài liệu.
     * @param {number} shareId - ID của lượt chia sẻ.
     * @returns {Promise<object>} Kết quả thu hồi.
     */
    revokeDocumentShare: async (id, shareId) => {
        const response = await api.delete(`/documents/${id}/shares/${shareId}`);
        return response.data;
    },

    // =================================================================
    // *** THÊM MỚI: DOCUMENT PERMISSIONS APIs (Detailed Access Control) ***
    // =================================================================
    /**
     * Lấy danh sách quyền chi tiết (user/department) đã được gán cho tài liệu.
     * @param {number} documentId - ID của tài liệu.
     * @returns {Promise<object>} Response chứa danh sách quyền.
     */
    getDocumentPermissions: async (documentId) => {
        const response = await api.get(`/documents/${documentId}/permissions`);
        return response.data;
    },
    /**
     * Gán quyền mới cho User hoặc Department trên một tài liệu.
     * @param {number} documentId - ID của tài liệu.
     * @param {Object} permissionData - Dữ liệu quyền cần gán.
     * @param {'user' | 'department'} permissionData.type - Loại đối tượng: 'user' | 'department'.
     * @param {number | string} permissionData.targetId - ID của user hoặc tên department.
     * @param {'read' | 'write' | 'approve' | 'admin'} permissionData.permission - Loại quyền: 'read' | 'write' | 'approve' | 'admin'.
     * @returns {Promise<object>} Response kết quả gán quyền.
     */
    grantDocumentPermission: async (documentId, permissionData) => {
        const response = await api.post(`/documents/${documentId}/permissions`, permissionData);
        return response.data;
    },
    /**
     * Thu hồi một quyền đã được gán cho tài liệu.
     * @param {number} documentId - ID của tài liệu.
     * @param {number} permissionId - ID của quyền cần thu hồi.
     * @returns {Promise<object>} Response kết quả thu hồi quyền.
     */
    revokeDocumentPermission: async (documentId, permissionId) => {
        const response = await api.delete(`/documents/${documentId}/permissions/${permissionId}`);
        return response.data;
    },

    // =================================================================
    // == Favorites
    // =================================================================
    /**
     * Lấy danh sách tài liệu yêu thích của người dùng hiện tại.
     * @param {object} params - Các tham số truy vấn.
     * @returns {Promise<object>} Danh sách tài liệu yêu thích.
     */
    getFavoriteDocuments: async (params = {}) => {
        const response = await api.get('/documents/favorites', { params });
        return response.data;
    },
    /**
     * Kiểm tra xem tài liệu có trong danh sách yêu thích của người dùng không.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Trạng thái yêu thích.
     */
    checkFavorite: async (id) => {
        const response = await api.get(`/documents/${id}/favorite`);
        return response.data;
    },
    /**
     * Thêm tài liệu vào danh sách yêu thích.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Kết quả thêm.
     */
    addToFavorites: async (id) => {
        const response = await api.post(`/documents/${id}/favorite`);
        return response.data;
    },
    /**
     * Xóa tài liệu khỏi danh sách yêu thích.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Kết quả xóa.
     */
    removeFromFavorites: async (id) => {
        const response = await api.delete(`/documents/${id}/favorite`);
        return response.data;
    },

    // =================================================================
    // == Search & Bulk Operations
    // =================================================================
    /**
     * Tìm kiếm tài liệu.
     * @param {object} searchParams - Các tham số tìm kiếm.
     * @returns {Promise<object>} Kết quả tìm kiếm.
     */
    searchDocuments: async (searchParams) => {
        const response = await api.get('/documents/search', { params: searchParams });
        return response.data;
    },
    /**
     * Tìm kiếm tài liệu nâng cao.
     * @param {object} searchCriteria - Tiêu chí tìm kiếm nâng cao.
     * @returns {Promise<object>} Kết quả tìm kiếm.
     */
    advancedSearch: async (searchCriteria) => {
        const response = await api.post('/documents/advanced-search', searchCriteria);
        return response.data;
    },
    /**
     * Cập nhật hàng loạt tài liệu.
     * @param {Array<number>} documentIds - Mảng ID tài liệu.
     * @param {object} updateData - Dữ liệu cần cập nhật.
     * @returns {Promise<object>} Kết quả cập nhật.
     */
    bulkUpdateDocuments: async (documentIds, updateData) => {
        const response = await api.put('/documents/bulk-update', { documentIds, updateData });
        return response.data;
    },
    /**
     * Xóa hàng loạt tài liệu.
     * @param {Array<number>} documentIds - Mảng ID tài liệu.
     * @returns {Promise<object>} Kết quả xóa.
     */
    bulkDeleteDocuments: async (documentIds) => {
        const response = await api.delete('/documents/bulk-delete', { data: { documentIds } });
        return response.data;
    },

    // =================================================================
    // == Data for UI & Analytics (General utility data)
    // =================================================================
    /**
     * Lấy danh sách người dùng.
     * @returns {Promise<object>} Danh sách người dùng.
     */
    getUsers: async () => {
        const response = await api.get('/users');
        return response.data;
    },
    /**
     * Lấy danh sách phòng ban.
     * @returns {Promise<object>} Danh sách phòng ban.
     */
    getDepartments: async () => {
        const response = await api.get('/departments');
        return response.data;
    },
    /**
     * Lấy thống kê tài liệu.
     * @param {number} id - ID của tài liệu.
     * @returns {Promise<object>} Dữ liệu thống kê.
     */
    getDocumentStats: async (id) => {
        const response = await api.get(`/documents/${id}/stats`);
        return response.data;
    },
    /**
     * Lấy danh sách tài liệu đang chờ phê duyệt.
     * @param {object} filters - Bộ lọc.
     * @returns {Promise<object>} Danh sách tài liệu.
     */
    getPendingApprovals: async (filters = {}) => {
        const response = await api.get('/documents/pending-approval', { params: filters });
        return response.data;
    },
    /**
     * Lấy thống kê tài liệu đang chờ phê duyệt.
     * @returns {Promise<object>} Dữ liệu thống kê.
     */
    getPendingApprovalStats: async () => {
        const response = await api.get('/documents/pending-approval/stats');
        return response.data;
    },
    /**
     * Lấy danh sách tài liệu sắp đến hạn xem xét.
     * @param {number} daysBefore - Số ngày trước hạn.
     * @returns {Promise<object>} Danh sách tài liệu.
     */
    getDocumentsDueForReview: async (daysBefore = 30) => {
        const response = await api.get('/documents/due-for-review', {
            params: { daysBefore }
        });
        return response.data;
    },
    /**
     * Lấy các loại tài liệu.
     * @returns {Promise<object>} Các loại tài liệu.
     */
    getDocumentTypes: async () => {
        const response = await api.get('/documents/types');
        return response.data;
    },
    /**
     * Lấy trạng thái workflow.
     * @returns {Promise<object>} Trạng thái workflow.
     */
    getWorkflowStates: async () => {
        const response = await api.get('/documents/workflow-states');
        return response.data;
    },
    /**
     * Lấy gợi ý tìm kiếm.
     * @param {string} query - Chuỗi tìm kiếm.
     * @param {number} limit - Giới hạn số lượng kết quả.
     * @returns {Promise<object>} Gợi ý tìm kiếm.
     */
    getSearchSuggestions: async (query, limit = 10) => {
        const response = await api.get('/documents/search-suggestions', {
            params: { query, limit }
        });
        return response.data;
    },
    /**
     * Kiểm tra mã tài liệu.
     * @param {string} code - Mã tài liệu.
     * @returns {Promise<object>} Kết quả kiểm tra.
     */
    checkDocumentCode: async (code) => {
        const response = await api.post('/documents/check-code', { code });
        return response.data;
    },
    /**
     * Lấy mã tài liệu gợi ý.
     * @param {string} type - Loại tài liệu.
     * @param {string} department - Phòng ban.
     * @returns {Promise<object>} Mã tài liệu gợi ý.
     */
    getSuggestedCode: async (type, department) => {
        const response = await api.get('/documents/suggest-code', {
            params: { type, department }
        });
        return response.data;
    },
    /**
     * Lấy thống kê tài liệu.
     * @param {object} filters - Bộ lọc.
     * @returns {Promise<object>} Thống kê tài liệu.
     */
    getDocumentStatistics: async (filters = {}) => {
        const response = await api.get('/documents/stats', { params: filters });
        return response.data;
    },

    // =================================================================
    // == Export Operations
    // =================================================================
    /**
     * Xuất tài liệu.
     * @param {object} params - Các tham số xuất.
     * @returns {Promise<Blob>} Dữ liệu file xuất.
     */
    exportDocuments: async (params = {}) => {
        const response = await api.get('/documents/export', { params, responseType: 'blob' });
        return handleFileDownload(response, 'documents_export.xlsx');
    }
};

export default documentAPI;

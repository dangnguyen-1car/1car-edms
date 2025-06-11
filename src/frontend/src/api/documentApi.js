// src/api/documentApi.js
/**
 * =================================================================
 * EDMS 1CAR - Document API Service (Enhanced & Corrected)
 * Sửa lỗi: getDocumentFileBuffer trỏ đến endpoint /download,
 * xóa bỏ các hàm không dùng đến như getDocumentFileUrl.
 * =================================================================
 */

import api from '../services/api'; // Corrected import path and name

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
    getDocuments: async (params = {}) => {
        const response = await api.get('/documents', { params });
        return response.data;
    },
    getDocument: async (id) => {
        const response = await api.get(`/documents/${id}`);
        return response.data;
    },
    createDocument: async (documentData) => {
        const response = await api.post('/documents', documentData);
        return response.data;
    },
    updateDocument: async (id, documentData) => {
        const response = await api.put(`/documents/${id}`, documentData);
        return response.data;
    },
    deleteDocument: async (id) => {
        const response = await api.delete(`/documents/${id}`);
        return response.data;
    },

    // =================================================================
    // == File & Metadata Operations
    // =================================================================
    uploadDocumentFile: async (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/documents/${id}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
    downloadDocument: async (id) => {
        const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
        return handleFileDownload(response, `document_${id}.pdf`);
    },
    
    // SỬA LỖI: Chỉnh sửa hàm này để gọi đúng endpoint /download và trả về ArrayBuffer
    getDocumentFileBuffer: async (id) => {
        const response = await api.get(`/documents/${id}/download`, { responseType: 'arraybuffer' });
        return response.data;
    },
    
    // XÓA BỎ: Hàm getDocumentFileUrl không tồn tại ở backend
    // getDocumentFileUrl: async (id) => { ... },

    getDocumentMetadata: async (id) => {
        const response = await api.get(`/documents/${id}/metadata`);
        return response.data;
    },
    updateDocumentMetadata: async (id, metadata) => {
        const response = await api.put(`/documents/${id}/metadata`, metadata);
        return response.data;
    },

    // =================================================================
    // == Version Management
    // =================================================================
    getDocumentVersions: async (id) => {
        const response = await api.get(`/documents/${id}/versions`);
        return response.data;
    },
    createDocumentVersion: async (id, versionData) => {
        const response = await api.post(`/documents/${id}/versions`, versionData);
        return response.data;
    },
    downloadDocumentVersion: async (documentId, versionId) => {
        const response = await api.get(`/documents/${documentId}/versions/${versionId}/download`, { responseType: 'blob' });
        return handleFileDownload(response, `document_${documentId}_v${versionId}.pdf`);
    },
    compareVersions: async (versionId1, versionId2) => {
        const response = await api.get('/documents/versions/compare', {
            params: { version1: versionId1, version2: versionId2 }
        });
        return response.data;
    },

    // =================================================================
    // == Workflow & Status Operations
    // =================================================================
    getDocumentWorkflow: async (id) => {
        const response = await api.get(`/documents/${id}/workflow`);
        return response.data;
    },
    updateDocumentStatus: async (id, statusData) => {
        const response = await api.put(`/documents/${id}/status`, statusData);
        return response.data;
    },
    changeDocumentStatus: async (id, statusData) => {
        const response = await api.post(`/documents/${id}/change-status`, statusData);
        return response.data;
    },
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
    getRelatedDocuments: async (id, params = {}) => {
        const response = await api.get(`/documents/${id}/related`, { params });
        return response.data;
    },
    addRelatedDocument: async (id, relatedDocumentId, relationshipType) => {
        const response = await api.post(`/documents/${id}/related`, { relatedDocumentId, relationshipType });
        return response.data;
    },
    removeRelatedDocument: async (id, relatedDocumentId) => {
        const response = await api.delete(`/documents/${id}/related/${relatedDocumentId}`);
        return response.data;
    },

    // =================================================================
    // == Sharing & Permissions
    // =================================================================
    shareDocument: async (id, shareData) => {
        const response = await api.post(`/documents/${id}/share`, shareData);
        return response.data;
    },
    generateShareLink: async (id, linkData) => {
        const response = await api.post(`/documents/${id}/share-link`, linkData);
        return response.data;
    },
    getDocumentShares: async (id) => {
        const response = await api.get(`/documents/${id}/shares`);
        return response.data;
    },
    revokeDocumentShare: async (id, shareId) => {
        const response = await api.delete(`/documents/${id}/shares/${shareId}`);
        return response.data;
    },
    
    // =================================================================
    // == Favorites
    // =================================================================
    getFavoriteDocuments: async (params = {}) => {
        const response = await api.get('/documents/favorites', { params });
        return response.data;
    },
    checkFavorite: async (id) => {
        const response = await api.get(`/documents/${id}/favorite`);
        return response.data;
    },
    addToFavorites: async (id) => {
        const response = await api.post(`/documents/${id}/favorite`);
        return response.data;
    },
    removeFromFavorites: async (id) => {
        const response = await api.delete(`/documents/${id}/favorite`);
        return response.data;
    },

    // =================================================================
    // == Search & Bulk Operations
    // =================================================================
    searchDocuments: async (searchParams) => {
        const response = await api.get('/documents/search', { params: searchParams });
        return response.data;
    },
    advancedSearch: async (searchCriteria) => {
        const response = await api.post('/documents/advanced-search', searchCriteria);
        return response.data;
    },
    bulkUpdateDocuments: async (documentIds, updateData) => {
        const response = await api.put('/documents/bulk-update', { documentIds, updateData });
        return response.data;
    },
    bulkDeleteDocuments: async (documentIds) => {
        const response = await api.delete('/documents/bulk-delete', { data: { documentIds } });
        return response.data;
    },

    // =================================================================
    // == Data for UI & Analytics
    // =================================================================
    getUsers: async () => {
        const response = await api.get('/users');
        return response.data;
    },
    getDepartments: async () => {
        const response = await api.get('/departments');
        return response.data;
    },
    getDocumentStats: async (id) => {
        const response = await api.get(`/documents/${id}/stats`);
        return response.data;
    },

    // =================================================================
    // == Export Operations
    // =================================================================
    exportDocuments: async (params = {}) => {
        const response = await api.get('/documents/export', { params, responseType: 'blob' });
        return handleFileDownload(response, 'documents_export.xlsx');
    }
};
// src/frontend/src/services/documentService.js
/**
 * =================================================================
 * EDMS 1CAR - Document Service (REVISED)
 * API calls for document operations using the main Axios instance.
 * Fetches types, departments, and workflow states from API.
 * =================================================================
 */

import api from './api'; // Sử dụng axios instance đã cấu hình từ src/frontend/src/services/api.js

export const documentService = {
  /**
   * Search/filter documents. Also used for getting general document list.
   * @param {object} params - Filtering and pagination parameters.
   * @returns {Promise<object>} Backend response: { success: boolean, data: { documents: [], pagination: {} } }
   */
  async searchDocuments(params) {
    const response = await api.get('/documents', { params });
    return response.data;
  },

  /**
   * Get a single document by its ID.
   * @param {string|number} id - The document ID.
   * @returns {Promise<object>} Backend response: { success: boolean, document: {} }
   */
  async getDocument(id) {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  /**
   * Create a new document.
   * @param {object} documentData - Data for the new document.
   * @returns {Promise<object>} Backend response: { success: boolean, document: {} }
   */
  async createDocument(documentData) {
    const response = await api.post('/documents', documentData);
    return response.data;
  },

  /**
   * Update an existing document.
   * @param {string|number} id - The document ID.
   * @param {object} documentData - Data to update.
   * @returns {Promise<object>} Backend response.
   */
  async updateDocument(id, documentData) {
    const response = await api.put(`/documents/${id}`, documentData);
    return response.data;
  },

  /**
   * Delete a document (soft delete by archiving or actual delete based on backend logic).
   * @param {string|number} id - The document ID.
   * @returns {Promise<object>} Backend response.
   */
  async deleteDocument(id) {
    // Backend's documents.js route for DELETE /:id uses workflowService to archive.
    // This is consistent.
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  /**
   * Update the status of a document.
   * @param {string|number} id - The document ID.
   * @param {string} status - The new status.
   * @param {string} [comment=''] - Optional comment for the transition.
   * @returns {Promise<object>} Backend response.
   */
  async updateDocumentStatus(id, status, comment = '') {
    const response = await api.put(`/documents/${id}/status`, { newStatus: status, comment }); // Backend expects `newStatus`
    return response.data;
  },

  /**
   * Create a new version for a document.
   * @param {string|number} id - The document ID.
   * @param {object} versionData - Data for the new version (e.g., newVersion, changeReason, changeSummary).
   * @returns {Promise<object>} Backend response.
   */
  async createDocumentVersion(id, versionData) {
    const response = await api.post(`/documents/${id}/versions`, versionData);
    return response.data;
  },

  /**
   * Get all versions of a document.
   * @param {string|number} id - The document ID.
   * @returns {Promise<object>} Backend response: { success: boolean, data: { versions: [] } }
   */
  async getDocumentVersions(id) {
    const response = await api.get(`/documents/${id}/versions`);
    return response.data;
  },

  /**
   * Get the workflow history of a document.
   * @param {string|number} id - The document ID.
   * @returns {Promise<object>} Backend response: { success: boolean, data: { history: [] } }
   */
  async getWorkflowHistory(id) {
    const response = await api.get(`/documents/${id}/workflow`);
    return response.data;
  },

  /**
   * Download a document file.
   * @param {string|number} id - The document ID.
   * @param {string} [documentTitle='document'] - Default title for the downloaded file.
   * @returns {Promise<object>} { success: true } if download initiated.
   * @throws Error if download fails.
   */
  async downloadDocument(id, documentTitle = 'document') {
    try {
      const response = await api.get(`/documents/${id}/download`, {
        responseType: 'blob'
      });
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${documentTitle}.bin`; // Default filename

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d'')?([^;\r\n"']*)['"]?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        } else {
           const simpleFilenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
           if (simpleFilenameMatch && simpleFilenameMatch[1]) {
             filename = simpleFilenameMatch[1];
           }
        }
      } else {
        const mimeType = response.headers['content-type'];
        if (mimeType === 'application/pdf') filename = `${documentTitle}.pdf`;
        else if (mimeType === 'application/msword') filename = `${documentTitle}.doc`;
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') filename = `${documentTitle}.docx`;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { success: true, filename };
    } catch (error) {
      console.error("Download error in documentService:", error);
      throw error; 
    }
  },

  /**
   * Download a specific version of a document file.
   * @param {string|number} documentId - The document ID.
   * @param {string|number} versionId - The version ID.
   * @returns {Promise<void>}
   */
  async downloadDocumentVersion(documentId, versionId) {
    // TODO: Implement filename extraction similar to downloadDocument
    const response = await api.get(`/documents/${documentId}/versions/${versionId}/download`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `document-${documentId}-version-${versionId}.file`); // Generic name, improve with backend header
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Compare two document versions.
   * @param {string|number} versionId1 - ID of the first version.
   * @param {string|number} versionId2 - ID of the second version.
   * @returns {Promise<object>} Backend response.
   */
  async compareVersions(versionId1, versionId2) {
    const response = await api.get(`/documents/versions/compare`, {
      params: { version1: versionId1, version2: versionId2 }
    });
    return response.data;
  },

  // --- Functions to fetch data for dropdowns/filters ---

  /**
   * Get list of document types.
   * @returns {Promise<object>} Backend response: { success: true, data: { documentTypes: [{code, name}, ...] } }
   */
  async getDocumentTypes() {
    const response = await api.get('/documents/types'); // API endpoint from src/backend/routes/documents.js
    return response.data;
  },

  /**
   * Get list of departments.
   * @returns {Promise<object>} Backend response: { success: true, data: { departments: ["DeptA", "DeptB", ...] } }
   */
  async getDepartments() {
    const response = await api.get('/documents/departments'); // API endpoint from src/backend/routes/documents.js
    return response.data;
  },

  /**
   * Get list of workflow states.
   * @returns {Promise<object>} Backend response: { success: true, data: { workflowStates: [{code, name}, ...] } }
   */
  async getWorkflowStates() {
    const response = await api.get('/documents/workflow-states'); // API endpoint from src/backend/routes/documents.js
    return response.data;
  },

  // Placeholder for metadata - if needed and different from getDocument()
  // async getDocumentMetadata(documentId) {
  //   const response = await api.get(`/documents/${documentId}/metadata`);
  //   return response.data;
  // }

  // (Optional) Add other specific document-related API calls here if needed
  // For example, if there's an API to check document code availability:
  // async checkDocumentCode(code) {
  //   const response = await api.get(`/documents/check-code?code=${code}`);
  //   return response.data;
  // }
};
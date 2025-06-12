// src/frontend/src/services/uploadService.js
import api from './api';

class UploadService {
  // --- File Upload / API Interaction Methods ---
  /**
   * Uploads a file to the server.
   * @param {File} file - The file to upload.
   * @returns {Promise} An object indicating success, data, and message from the API.
   */
  async uploadFile(file) {
    try {
      const formData = new FormData();
      formData.append('file', file); // 'file' is the expected field name by the backend
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Add upload progress tracking if needed
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          // You can emit progress events here or update a UI element
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response?.data) {
        return {
          success: false,
          message: error.response.data.message || 'Lỗi tải file. Vui lòng thử lại.',
          error: error.response.data
        };
      }
      return {
        success: false,
        message: 'Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại.',
        error: error.message
      };
    }
  }

  /**
   * Retrieves a list of uploaded files for a specific user.
   * @param {string} userId - The ID of the user.
   * @returns {Promise} An object indicating success and data from the API.
   */
  async getUploadedFiles(userId) {
    try {
      const response = await api.get(`/upload/user/${userId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Get uploaded files error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể lấy danh sách file đã tải lên. Vui lòng thử lại.',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Deletes an uploaded file by its ID.
   * @param {string} fileId - The ID of the file to delete.
   * @returns {Promise} An object indicating success and message from the API.
   */
  async deleteUploadedFile(fileId) {
    try {
      const response = await api.delete(`/upload/${fileId}`);
      return {
        success: true,
        message: response.data.message || 'File đã được xóa thành công'
      };
    } catch (error) {
      console.error('Delete file error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể xóa file. Vui lòng thử lại.',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Links an uploaded file to a document.
   * @param {string} fileId - The ID of the file.
   * @param {string} documentId - The ID of the document.
   * @returns {Promise} An object indicating success, data, and message from the API.
   */
  async linkFileToDocument(fileId, documentId) {
    try {
      const response = await api.post('/upload/link', {
        fileId,
        documentId
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'File đã được liên kết với tài liệu thành công'
      };
    } catch (error) {
      console.error('Link file to document error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể liên kết file với tài liệu. Vui lòng thử lại.',
        error: error.response?.data || error.message
      };
    }
  }

  // --- Utility Methods ---
  /**
   * Validates a file against allowed types and maximum size.
   * @param {File} file - The file to validate.
   * @returns {Object} An object with isValid (boolean) and errors (array of strings).
   */
  validateFile(file) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const errors = [];
    if (!allowedTypes.includes(file.type)) {
      errors.push('Định dạng file không được hỗ trợ. Chỉ chấp nhận PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX.');
    }
    if (file.size > maxSize) {
      errors.push(`Kích thước file vượt quá ${this.formatFileSize(maxSize)}.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Formats a file size in bytes to a human-readable string (e.g., "10.5 MB").
   * @param {number} bytes - The file size in bytes.
   * @returns {string} The formatted file size.
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export an instance of the UploadService class
export const uploadService = new UploadService();
export default uploadService; // Also export as default for convenience
// src/api/documentApi.js

const API_BASE_URL = 'http://localhost:3000'; // Backend API gốc

// Hàm để lấy token.
// Cần điều chỉnh cho phù hợp với cách bạn quản lý token trong ứng dụng.
const getToken = () => {
  try {
    const authDataString = localStorage.getItem('auth'); // Giả sử bạn lưu token trong localStorage với key 'auth'
    if (!authDataString) {
      // console.warn('Auth data not found in localStorage');
      return null;
    }
    const authData = JSON.parse(authDataString); //
    return authData?.token || null; // Giả sử token nằm trong trường 'token' của object authData
  } catch (e) {
    // console.error('Error parsing auth data from localStorage:', e);
    return null;
  }
};

// Hàm để xử lý khi truy cập không được phép (ví dụ: token hết hạn).
// Cần điều chỉnh để gọi hàm logout thực tế từ AuthContext hoặc service auth của bạn.
const handleUnauthorizedAccess = () => {
  console.warn('Unauthorized access or token expired. Logging out.'); //
  // Ví dụ:
  localStorage.removeItem('auth'); // Xóa thông tin auth
  // Chỉ điều hướng nếu không phải đang ở trang login để tránh vòng lặp
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'; // Điều hướng về trang login
  }
  // Hoặc gọi một hàm logout từ AuthContext: authContext.logout();
  // Quan trọng: Đảm bảo hàm này không gây vòng lặp vô hạn nếu nó cũng gọi API.
};


class DocumentAPI {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}/api${endpoint}`; // Thêm tiền tố /api
    const token = getToken(); // Lấy token

    const config = {
      headers: {
        'Content-Type': 'application/json', //
        ...options.headers,
      },
      ...options,
    };

    // Thêm Authorization header nếu có token và endpoint không phải là public (ví dụ: login, register)
    // Giả sử các public endpoints không cần token.
    // Bạn có thể thêm một danh sách các public endpoints hoặc một cờ trong options để kiểm soát việc này.
    const publicEndpoints = ['/auth/login', '/auth/register']; // Ví dụ
    if (token && !publicEndpoints.includes(endpoint.toLowerCase())) {
      config.headers['Authorization'] = `Bearer ${token}`; //
    }

    try {
      const response = await fetch(url, config); //

      if (!response.ok) { //
        let errorData;
        try {
          errorData = await response.json(); //
        } catch (e) {
          errorData = { message: `Lỗi HTTP! Status: ${response.status} - ${response.statusText}` }; //
        }

        const errorMessage = errorData?.message || errorData?.error?.message || errorData?.error || `Lỗi HTTP! Status: ${response.status}`; //
        const error = new Error(errorMessage); //
        error.status = response.status; //
        error.data = errorData; //

        // Xử lý lỗi 401 (Unauthorized)
        if (response.status === 401 && !options.isRetry && !publicEndpoints.includes(endpoint.toLowerCase())) { // Thêm kiểm tra publicEndpoints
          handleUnauthorizedAccess(); //
        }
        throw error; //
      }

      if (response.status === 204) { //
        return null; //
      }
      return await response.json(); //
    } catch (error) {
      // Log lỗi chi tiết hơn, có thể bỏ console.error ở đây nếu React Query đã xử lý logging
      // console.error(`API Request Failed: ${config.method || 'GET'} ${url}`, error.message, error.data || '');
      throw error; //
    }
  }

  // Lấy danh sách tài liệu
  async getDocuments(params = {}) {
    const queryString = new URLSearchParams(params).toString(); //
    const endpoint = `/documents${queryString ? `?${queryString}` : ''}`; //
    return this.request(endpoint); //
  }

  // Lấy chi tiết tài liệu
  async getDocument(documentId) {
    return this.request(`/documents/${documentId}`); //
  }

  // Lấy metadata của tài liệu
  async getDocumentMetadata(documentId) {
    return this.request(`/documents/${documentId}/metadata`); //
  }

  // Lấy lịch sử phiên bản
  async getDocumentVersions(documentId) {
    return this.request(`/documents/${documentId}/versions`); //
  }

  // Lấy lịch sử workflow
  async getDocumentWorkflow(documentId) {
    return this.request(`/documents/${documentId}/workflow`); //
  }

  // Tìm kiếm tài liệu (phiên bản POST)
  async searchDocuments(searchParams) {
    return this.request('/documents/search', { //
      method: 'POST', //
      body: JSON.stringify(searchParams), //
    });
  }

  // Download tài liệu
  async downloadDocument(documentId, documentTitle = 'document') {
    const url = `${API_BASE_URL}/api/documents/${documentId}/download`; // Thêm /api
    const token = getToken(); //
    const config = {
      method: 'GET', //
      headers: {}, //
    };
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`; //
    }

    try {
      const response = await fetch(url, config); //
      if (!response.ok) { //
        let errorData;
        try { errorData = await response.json(); } catch (e) { errorData = { message: `Tải xuống thất bại. Status: ${response.status}` }; } //
        const errorMessage = errorData?.message || `Tải xuống thất bại. Status: ${response.status}`; //
        if (response.status === 401) handleUnauthorizedAccess(); //
        throw new Error(errorMessage); //
      }
      const blob = await response.blob(); //
      const contentDisposition = response.headers.get('content-disposition'); //
      let filename = `${documentTitle}.${blob.type.split('/')[1] || 'bin'}`; //
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d'')?([^;\r\n"']*)['"]?/i); //
        if (filenameMatch && filenameMatch[1]) filename = decodeURIComponent(filenameMatch[1]); //
      }
      const link = document.createElement('a'); //
      link.href = window.URL.createObjectURL(blob); //
      link.download = filename; //
      document.body.appendChild(link); //
      link.click(); //
      document.body.removeChild(link); //
      window.URL.revokeObjectURL(link.href); //
      return { success: true, filename }; //
    } catch (error) {
      console.error('Download failed:', error.message); //
      throw error; //
    }
  }

  // Tạo tài liệu mới
  async createDocument(documentData) {
    return this.request('/documents', { //
      method: 'POST', //
      body: JSON.stringify(documentData), //
    });
  }

  // Kiểm tra tính duy nhất của mã tài liệu
  async checkDocumentCodeAvailability(documentCode) {
    const queryString = new URLSearchParams({ code: documentCode }).toString(); //
    const endpoint = `/documents/check-code?${queryString}`; //
    return this.request(endpoint); //
  }

  // Ghi log truy cập tài liệu
  async logDocumentAccess(documentId, accessType = 'VIEW') {
    const endpoint = `/documents/${documentId}/audit-log`; //
    return this.request(endpoint, { //
      method: 'POST', //
      body: JSON.stringify({ //
        access_type: accessType, //
        timestamp: new Date().toISOString() //
      }),
    });
  }

  // Hàm đăng nhập
  async login(credentials) {
    // Endpoint /auth/login sẽ không tự động gửi token (do logic kiểm tra publicEndpoints)
    return this.request('/auth/login', { //
      method: 'POST', //
      body: JSON.stringify(credentials), //
    });
  }

  // Hàm lấy thông tin user hiện tại (yêu cầu token)
  async getCurrentUser() {
    return this.request('/auth/me'); //
  }
}

export const documentAPI = new DocumentAPI(); //
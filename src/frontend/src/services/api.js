/**
 * =================================================================
 * EDMS 1CAR - API Configuration (Fixed Console Warnings)
 * Axios configuration for API calls
 * =================================================================
 */

import axios from 'axios';
import Cookies from 'js-cookie';

// Create axios instance with optimized config
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  maxContentLength: 10 * 1024 * 1024, // 10MB
  maxBodyLength: 10 * 1024 * 1024,
  maxRedirects: 5
});

// Request interceptor - minimal headers
api.interceptors.request.use(
  (config) => {
    // Only add essential headers
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Remove unnecessary headers that might cause 431
    delete config.headers['X-Requested-With'];
    delete config.headers['X-CSRF-Token'];
    delete config.headers['Cache-Control'];
    delete config.headers['Pragma'];

    // Ensure minimal header size
    if (config.headers.Authorization && config.headers.Authorization.length > 2048) {
      // eslint-disable-next-line no-console
      console.warn('Authorization header too large, clearing cookies');
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with optimized error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 431 error specifically
    if (error.response?.status === 431) {
      // eslint-disable-next-line no-console
      console.error('Request header too large (431), clearing all auth data');
      
      // Clear all auth data
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login
      window.location.href = '/login';
      return Promise.reject(new Error('Request headers too large. Please login again.'));
    }

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken && refreshToken.length < 1024) { // Check refresh token size
          const response = await axios.post('/api/auth/refresh', {
            refreshToken
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.data.success) {
            const newToken = response.data.data.tokens.accessToken;
            
            // Check new token size before storing
            if (newToken.length < 1024) {
              Cookies.set('accessToken', newToken, { expires: 1 });
              
              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            } else {
              // eslint-disable-next-line no-console
              console.error('New token too large, clearing auth data');
              Cookies.remove('accessToken');
              Cookies.remove('refreshToken');
            }
          }
        }
      } catch (refreshError) {
        // eslint-disable-next-line no-console
        console.error('Token refresh failed:', refreshError);
      }

      // Refresh failed, redirect to login
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;

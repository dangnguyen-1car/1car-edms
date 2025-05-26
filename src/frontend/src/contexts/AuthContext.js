/**
 * =================================================================
 * EDMS 1CAR - Authentication Context (Fixed All Warnings & Issues)
 * Global authentication state management for 40 users
 * Based on C-PL-MG-005 permission policy and C-FM-MG-004 role matrix
 * =================================================================
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { authService } from '../services/authService';

// Initial state
const initialState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED'
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: action.payload
      };

    case AUTH_ACTIONS.TOKEN_REFRESHED:
      return {
        ...state,
        tokens: action.payload.tokens
      };
    
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Memoized cookie options to fix useCallback dependency warning
  const cookieOptions = useMemo(() => ({
    expires: 1, // 1 day
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  }), []);

  // Memoized logout function
  const logout = useCallback(async () => {
    try {
      const accessToken = Cookies.get('accessToken');
      if (accessToken) {
        await authService.logout(accessToken);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout API failed:', error);
    } finally {
      // Clear all auth data
      Cookies.remove('accessToken', { path: '/' });
      Cookies.remove('refreshToken', { path: '/' });
      localStorage.clear();
      sessionStorage.clear();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  // Memoized refresh token function
  const refreshAuthToken = useCallback(async () => {
    try {
      const refreshToken = Cookies.get('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Check token size before sending
      if (refreshToken.length > 1024) {
        throw new Error('Refresh token too large');
      }

      const response = await authService.refreshToken(refreshToken);
      
      if (response.success) {
        const { tokens } = response.data;
        
        // Check new token size before storing
        if (tokens.accessToken.length > 1024) {
          throw new Error('New access token too large');
        }
        
        // Update stored tokens with size check
        Cookies.set('accessToken', tokens.accessToken, cookieOptions);
        
        dispatch({
          type: AUTH_ACTIONS.TOKEN_REFRESHED,
          payload: { tokens }
        });

        return tokens.accessToken;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  }, [logout, cookieOptions]);

  // FIXED: Wrap login function in useCallback to fix React Hook warning
  const login = useCallback(async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      const response = await authService.login(email, password);

      if (response.success) {
        const { user, tokens } = response.data;

        // Check token sizes before storing
        if (tokens.accessToken.length > 1024 || tokens.refreshToken.length > 1024) {
          throw new Error('Tokens too large for storage');
        }

        // Store tokens with optimized options
        Cookies.set('accessToken', tokens.accessToken, cookieOptions);
        Cookies.set('refreshToken', tokens.refreshToken, { 
          ...cookieOptions, 
          expires: 7 // 7 days for refresh token
        });

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, tokens }
        });

        return { success: true, user, tokens };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: response.message || 'Đăng nhập thất bại'
        });
        return { success: false, message: response.message };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Login error:', error);
      
      // Handle 431 error specifically
      if (error.message.includes('431') || error.message.includes('too large')) {
        const errorMessage = 'Lỗi hệ thống: Dữ liệu quá lớn. Vui lòng thử lại sau khi clear cache.';
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: errorMessage
        });
        return { success: false, message: errorMessage };
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Đăng nhập thất bại. Vui lòng thử lại.';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      
      return { success: false, message: errorMessage };
    }
  }, [cookieOptions]); // Fixed: Added cookieOptions dependency

  // Memoized initialize auth function
  const initializeAuth = useCallback(async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const accessToken = Cookies.get('accessToken');
      const refreshToken = Cookies.get('refreshToken');

      // Check token sizes
      if (accessToken && accessToken.length > 1024) {
        // eslint-disable-next-line no-console
        console.warn('Access token too large, clearing');
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }

      if (accessToken && refreshToken) {
        try {
          // Verify token validity
          const response = await authService.verifyToken(accessToken);
          
          if (response.success) {
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user: response.data.user,
                tokens: { accessToken, refreshToken }
              }
            });
          } else {
            // Try to refresh token
            await refreshAuthToken();
          }
        } catch (verifyError) {
          // eslint-disable-next-line no-console
          console.error('Token verification failed:', verifyError);
          // Try to refresh token as fallback
          try {
            await refreshAuthToken();
          } catch (refreshError) {
            // eslint-disable-next-line no-console
            console.error('Token refresh also failed:', refreshError);
            await logout();
          }
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Auth initialization failed:', error);
      await logout();
    }
  }, [refreshAuthToken, logout]);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  // Check if user has specific permission
  const hasPermission = useCallback((permission) => {
    if (!state.user) return false;
    
    // Admin has all permissions
    if (state.user.role === 'admin') return true;
    
    // Define permission mappings based on C-FM-MG-004
    const userPermissions = {
      'view_documents': true,
      'create_documents': true,
      'edit_own_documents': true,
      'upload_files': true,
      'view_own_department': true,
      'access_edms': true
    };

    const adminPermissions = {
      ...userPermissions,
      'manage_users': true,
      'view_all_documents': true,
      'manage_system': true,
      'view_audit_logs': true,
      'manage_archive': true,
      'access_all_departments': true,
      'approve_documents': true,
      'manage_permissions': true
    };

    const permissions = state.user.role === 'admin' ? adminPermissions : userPermissions;
    return permissions[permission] || false;
  }, [state.user]);

  // Check if user can access specific department
  const canAccessDepartment = useCallback((department) => {
    if (!state.user) return false;
    
    // Admin can access all departments
    if (state.user.role === 'admin') return true;
    
    // Users can access their own department
    return state.user.department === department;
  }, [state.user]);

  // Get user's accessible departments
  const getAccessibleDepartments = useCallback(() => {
    if (!state.user) return [];
    
    const allDepartments = [
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
    ];
    
    // Admin can access all departments
    if (state.user.role === 'admin') {
      return allDepartments;
    }
    
    // Regular users can only access their department
    return [state.user.department];
  }, [state.user]);

  // FIXED: Context value with proper dependencies
  const value = useMemo(() => ({
    // State
    ...state,
    
    // Actions
    login,
    logout,
    refreshAuthToken,
    clearError,
    
    // Permission helpers
    hasPermission,
    canAccessDepartment,
    getAccessibleDepartments,
    
    // Utility functions
    isAdmin: state.user?.role === 'admin',
    userName: state.user?.name || '',
    userEmail: state.user?.email || '',
    userDepartment: state.user?.department || '',
    userRole: state.user?.role || ''
  }), [
    state,
    login, // Now properly wrapped in useCallback
    logout,
    refreshAuthToken,
    clearError,
    hasPermission,
    canAccessDepartment,
    getAccessibleDepartments
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading-spinner"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    return <Component {...props} />;
  };
}

export default AuthContext;

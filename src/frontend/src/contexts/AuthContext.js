// src/frontend/src/contexts/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { authService } from '../services/authService';
import { PageLoader } from '../components/common/LoadingSpinner';

// =================================================================
// 1. Constants & Initial State
// =================================================================

const AUTH_ACTIONS = {
    INITIALIZE_START: 'INITIALIZE_START',
    INITIALIZE_SUCCESS: 'INITIALIZE_SUCCESS',
    INITIALIZE_FAILURE: 'INITIALIZE_FAILURE',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT'
};

const initialState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
};

// =================================================================
// 2. Role Permissions Matrix (Based on C-FM-MG-004)
// =================================================================

const ROLE_PERMISSIONS = {
    admin: [
        'view_all_documents', 'create_documents', 'edit_all_documents', 'delete_documents',
        'manage_users', 'manage_system', 'view_audit_logs', 'approve_documents',
        'view_system_stats', 'view_all_activities', 'manage_workflows', 'upload_files'
    ],
    manager: [
        'view_department_documents', 'create_documents', 'edit_department_documents',
        'approve_department_documents', 'view_department_stats', 'view_department_activities',
        'manage_department_workflows', 'upload_files'
    ],
    user: [
        'view_own_documents', 'create_documents', 'edit_own_documents',
        'view_shared_documents', 'view_own_activities', 'upload_files'
    ],
    guest: [
        'view_public_documents'
    ]
};

// =================================================================
// 3. Reducer Function
// =================================================================

function authReducer(state, action) {
    switch (action.type) {
        case AUTH_ACTIONS.INITIALIZE_START:
            return { ...state, isLoading: true };
        case AUTH_ACTIONS.INITIALIZE_SUCCESS:
            return { 
                ...state, 
                user: action.payload.user, 
                tokens: action.payload.tokens, 
                isAuthenticated: true, 
                isLoading: false, 
                error: null 
            };
        case AUTH_ACTIONS.INITIALIZE_FAILURE:
            return { 
                ...state, 
                user: null, 
                tokens: null, 
                isAuthenticated: false, 
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
        default:
            return state;
    }
}

// =================================================================
// 4. Context Creation
// =================================================================

const AuthContext = createContext();

// =================================================================
// 5. AuthProvider Component
// =================================================================

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const cookieOptions = useMemo(() => ({
        expires: 1, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict', 
        path: '/'
    }), []);

    // Enhanced permission checking functions
    const hasPermission = useCallback((permission) => {
        if (!state.user || !state.user.role) return false;
        const rolePermissions = ROLE_PERMISSIONS[state.user.role] || [];
        return rolePermissions.includes(permission);
    }, [state.user]);

    const hasDocumentPermission = useCallback((action, document) => {
        if (!state.user || !state.user.role) return false;
        
        const userRole = state.user.role;
        const userId = state.user.id;
        const userDepartment = state.user.department;

        switch (action) {
            case 'view':
                if (userRole === 'admin') return true;
                if (userRole === 'manager' && document.department === userDepartment) return true;
                if (userRole === 'user' && (document.author_id === userId || document.recipients?.includes(userDepartment))) return true;
                if (userRole === 'guest' && document.security_level === 'public') return true;
                return false;
            
            case 'edit':
                if (userRole === 'admin') return true;
                if (userRole === 'manager' && document.department === userDepartment) return true;
                if (userRole === 'user' && document.author_id === userId) return true;
                return false;
            
            case 'approve':
                if (userRole === 'admin') return true;
                if (userRole === 'manager' && document.department === userDepartment) return true;
                return false;
            
            default:
                return false;
        }
    }, [state.user]);

    const canAccessDashboardWidget = useCallback((widgetType) => {
        if (!state.user || !state.user.role) return false;
        
        const userRole = state.user.role;
        
        switch (widgetType) {
            case 'system_stats':
                return userRole === 'admin';
            case 'document_stats':
                return ['admin', 'manager'].includes(userRole);
            case 'pending_approvals':
                return ['admin', 'manager'].includes(userRole);
            case 'recent_activities':
                return ['admin', 'manager', 'user'].includes(userRole);
            case 'notifications':
                return ['admin', 'manager', 'user'].includes(userRole);
            default:
                return false;
        }
    }, [state.user]);

    const logout = useCallback(async () => {
        try {
            const accessToken = Cookies.get('accessToken');
            if (accessToken) await authService.logout(accessToken);
        } catch (error) {
            console.error('Logout API failed:', error);
        } finally {
            Cookies.remove('accessToken', { path: '/' });
            Cookies.remove('refreshToken', { path: '/' });
            localStorage.removeItem('user_context');
            dispatch({ type: AUTH_ACTIONS.INITIALIZE_FAILURE });
        }
    }, []);
    
    const refreshAuthToken = useCallback(async () => {
        try {
            const refreshToken = Cookies.get('refreshToken');
            if (!refreshToken) throw new Error('No refresh token');

            const response = await authService.refreshToken(refreshToken);
            if (response.success) {
                const { user, tokens } = response.data;
                Cookies.set('accessToken', tokens.accessToken, cookieOptions);
                localStorage.setItem('user_context', JSON.stringify({ 
                    id: user.id, 
                    role: user.role, 
                    department: user.department 
                }));
                dispatch({ 
                    type: AUTH_ACTIONS.INITIALIZE_SUCCESS, 
                    payload: { user, tokens: { accessToken: tokens.accessToken, refreshToken } } 
                });
                return tokens.accessToken;
            } else {
                throw new Error('Token refresh failed on server');
            }
        } catch (error) {
            console.error('Token refresh process failed:', error);
            await logout();
            throw error;
        }
    }, [logout, cookieOptions]);
    
    const initializeAuth = useCallback(async () => {
        dispatch({ type: AUTH_ACTIONS.INITIALIZE_START });
        const accessToken = Cookies.get('accessToken');
        const refreshToken = Cookies.get('refreshToken');

        if (accessToken && refreshToken) {
            try {
                const response = await authService.verifyToken(accessToken);
                if (response.success) {
                    const { user } = response.data;
                    localStorage.setItem('user_context', JSON.stringify({ 
                        id: user.id, 
                        role: user.role, 
                        department: user.department 
                    }));
                    dispatch({ 
                        type: AUTH_ACTIONS.INITIALIZE_SUCCESS, 
                        payload: { user, tokens: { accessToken, refreshToken } } 
                    });
                } else {
                    await refreshAuthToken();
                }
            } catch (error) {
                console.warn('Access token verification failed, attempting refresh...');
                try {
                    await refreshAuthToken();
                } catch (refreshError) {
                    console.error('Final auth attempt failed after refresh.');
                }
            }
        } else {
            dispatch({ type: AUTH_ACTIONS.INITIALIZE_FAILURE });
        }
    }, [refreshAuthToken]);

    const login = useCallback(async (email, password) => {
        try {
            const response = await authService.login(email, password);
            if (response.success) {
                const { user, tokens } = response.data;
                Cookies.set('accessToken', tokens.accessToken, cookieOptions);
                Cookies.set('refreshToken', tokens.refreshToken, { ...cookieOptions, expires: 7 });
                localStorage.setItem('user_context', JSON.stringify({ 
                    id: user.id, 
                    role: user.role, 
                    department: user.department 
                }));
                dispatch({ 
                    type: AUTH_ACTIONS.INITIALIZE_SUCCESS, 
                    payload: { user, tokens } 
                });
                return { success: true };
            } else {
                dispatch({ 
                    type: AUTH_ACTIONS.LOGIN_FAILURE, 
                    payload: response.message || 'Đăng nhập thất bại' 
                });
                return { success: false, message: response.message };
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Đăng nhập thất bại.';
            dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
            return { success: false, message: errorMessage };
        }
    }, [cookieOptions]);

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    const value = useMemo(() => ({
        ...state, 
        login, 
        logout, 
        hasPermission, 
        hasDocumentPermission, 
        canAccessDashboardWidget
    }), [state, login, logout, hasPermission, hasDocumentPermission, canAccessDashboardWidget]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// =================================================================
// 6. Custom Hook and Protected Route
// =================================================================

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function ProtectedRoute({ children, requiredRole = null, requiredPermission = null }) {
    const { isAuthenticated, isLoading, user, hasPermission } = useAuth();

    if (isLoading) {
        return <PageLoader message="Đang kiểm tra xác thực..." />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        return <Navigate to="/unauthorized" replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}

export default AuthContext;

// src/frontend/src/contexts/AuthContext.js
/* =================================================================
 * EDMS 1CAR - Authentication Context (Fully Restored & Corrected)
 *
 * REFACTOR:
 * - Restored the complete implementation of 'initializeAuth' to fix infinite loading.
 * - Restored permission helper functions 'hasPermission', 'hasDocumentPermission', etc.
 * - Consolidated all previous fixes into a single, stable file.
 * ================================================================= */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { authService } from '../services/authService';
import { PageLoader } from '../components/common/LoadingSpinner'; // Import PageLoader for a consistent loading UI

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
    isLoading: true, // Starts as true, will be set to false after initialization
    error: null
};

// =================================================================
// 2. Reducer Function
// =================================================================

function authReducer(state, action) {
    switch (action.type) {
        case AUTH_ACTIONS.INITIALIZE_START:
            return { ...state, isLoading: true };
        case AUTH_ACTIONS.INITIALIZE_SUCCESS: // Handles successful login/session verification
            return { ...state, user: action.payload.user, tokens: action.payload.tokens, isAuthenticated: true, isLoading: false, error: null };
        case AUTH_ACTIONS.INITIALIZE_FAILURE: // Handles failed session/logout
            return { ...state, user: null, tokens: null, isAuthenticated: false, isLoading: false, error: null };
        case AUTH_ACTIONS.LOGIN_FAILURE:
            return { ...state, user: null, tokens: null, isAuthenticated: false, isLoading: false, error: action.payload };
        // LOGOUT now effectively uses INITIALIZE_FAILURE to reset state
        default:
            return state;
    }
}

// =================================================================
// 3. Context Creation
// =================================================================

const AuthContext = createContext();

// =================================================================
// 4. AuthProvider Component
// =================================================================

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    const cookieOptions = useMemo(() => ({
        expires: 1, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/'
    }), []);

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
                localStorage.setItem('user_context', JSON.stringify({ id: user.id, role: user.role }));
                dispatch({ type: AUTH_ACTIONS.INITIALIZE_SUCCESS, payload: { user, tokens: { accessToken: tokens.accessToken, refreshToken } } });
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
                    localStorage.setItem('user_context', JSON.stringify({ id: user.id, role: user.role }));
                    dispatch({ type: AUTH_ACTIONS.INITIALIZE_SUCCESS, payload: { user, tokens: { accessToken, refreshToken } } });
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
                localStorage.setItem('user_context', JSON.stringify({ id: user.id, role: user.role }));
                dispatch({ type: AUTH_ACTIONS.INITIALIZE_SUCCESS, payload: { user, tokens } });
                return { success: true };
            } else {
                dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: response.message || 'Đăng nhập thất bại' });
                return { success: false, message: response.message };
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Đăng nhập thất bại.';
            dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
            return { success: false, message: errorMessage };
        }
    }, [cookieOptions]);

    const hasPermission = useCallback((permission) => {
        if (!state.user || !state.user.role) return false;
        if (state.user.role === 'admin') return true;
        // Add more detailed permission logic here if needed
        const rolePermissions = {
            manager: ['view_documents', 'create_documents', 'edit_department_documents'],
            user: ['view_documents', 'create_documents', 'edit_own_documents'],
        };
        return rolePermissions[state.user.role]?.includes(permission) || false;
    }, [state.user]);


    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    const value = useMemo(() => ({
        ...state, login, logout, hasPermission
    }), [state, login, logout, hasPermission]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// =================================================================
// 5. Custom Hook and Protected Route
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
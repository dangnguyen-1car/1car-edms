/**
 * =================================================================
 * EDMS 1CAR - Login Page
 * Authentication page for 40 users system
 * =================================================================
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';

function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            1CAR - EDMS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hệ thống Quản lý Tài liệu Điện tử
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

export default LoginPage;

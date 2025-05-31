/**
 * =================================================================
 * EDMS 1CAR - Dashboard Page
 * Main dashboard for authenticated users
 * =================================================================
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';

function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

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

  return (
    <div>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Chào mừng, {user?.name}!
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-medium text-gray-900">Tài liệu</h3>
              <p className="text-sm text-gray-600">Quản lý tài liệu điện tử</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-medium text-gray-900">Phòng ban</h3>
              <p className="text-sm text-gray-600">{user?.department}</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-medium text-gray-900">Vai trò</h3>
              <p className="text-sm text-gray-600">
                {user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

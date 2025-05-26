/**
 * =================================================================
 * EDMS 1CAR - Documents Page (Updated)
 * Document management interface with DocumentList integration
 * =================================================================
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import DocumentList from '../components/documents/DocumentList';

function DocumentsPage() {
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

  return (
    <Layout>
      <DocumentList />
    </Layout>
  );
}

export default DocumentsPage;

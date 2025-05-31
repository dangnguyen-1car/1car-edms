// src/frontend/src/pages/DocumentsPage.js
import React from 'react';
import DocumentList from '../components/documents/DocumentList'; 

function DocumentsPage() {
  // ProtectedRoute trong App.js sẽ xử lý Layout và kiểm tra auth
  return (
    <DocumentList />
  );
}
export default DocumentsPage;
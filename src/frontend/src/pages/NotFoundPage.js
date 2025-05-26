/**
 * =================================================================
 * EDMS 1CAR - 404 Not Found Page
 * Error page for non-existent routes
 * =================================================================
 */

import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900">404</h1>
          <h2 className="text-2xl font-medium text-gray-600 mt-2">
            Không tìm thấy trang
          </h2>
          <p className="text-gray-500 mt-4">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </p>
        </div>
        
        <div className="space-y-3">
          <Link
            to="/"
            className="btn btn-primary w-full"
          >
            Về trang chủ
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="btn btn-outline w-full"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;

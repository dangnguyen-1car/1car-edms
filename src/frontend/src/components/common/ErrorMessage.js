// src/components/common/ErrorMessage.js
import React from 'react';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

function ErrorMessage({ title, message, onRetry, showRetry = true }) {
  return (
    <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-lg">
      <FiAlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-red-800 mb-2">{title}</h3>
      <p className="text-sm text-red-700 mb-6">{message}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-danger-outline flex items-center mx-auto"
        >
          <FiRefreshCw className="mr-2 h-4 w-4" />
          Thử lại
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
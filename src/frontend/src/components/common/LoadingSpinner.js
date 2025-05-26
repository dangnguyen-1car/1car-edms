/**
 * =================================================================
 * EDMS 1CAR - Loading Spinner Component
 * Reusable loading indicator for async operations
 * =================================================================
 */

import React from 'react';

function LoadingSpinner({ size = 'medium', message = 'Đang tải...', className = '' }) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]}`}
      />
      {message && (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      )}
    </div>
  );
}

export default LoadingSpinner;

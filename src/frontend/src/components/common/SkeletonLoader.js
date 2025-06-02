// src/components/common/SkeletonLoader.js
/**
 * =================================================================
 * EDMS 1CAR - Enhanced Skeleton Loader Component
 * Skeleton loading states for better UX
 * Added: More variants, responsive design, customization options
 * Giữ nguyên: Logic cốt lõi hiện tại, mở rộng thêm variants
 * =================================================================
 */

import React from 'react';

function SkeletonLoader({ type = 'card', count = 1, className = '' }) {
  const renderCardSkeleton = () => (
    <div className={`bg-white rounded-lg shadow p-6 animate-pulse ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="h-12 w-12 bg-gray-300 rounded-lg flex-shrink-0"></div>
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 rounded w-full"></div>
            <div className="h-3 bg-gray-300 rounded w-5/6"></div>
          </div>
          <div className="flex space-x-2 pt-2">
            <div className="h-6 bg-gray-300 rounded-full w-16"></div>
            <div className="h-6 bg-gray-300 rounded-full w-20"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTableSkeleton = () => (
    <div className={`bg-white rounded-lg shadow overflow-hidden animate-pulse ${className}`}>
      {/* Table header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex space-x-4">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/6"></div>
          <div className="h-4 bg-gray-300 rounded w-1/5"></div>
          <div className="h-4 bg-gray-300 rounded w-1/6"></div>
          <div className="h-4 bg-gray-300 rounded w-1/8"></div>
        </div>
      </div>

      {/* Table rows */}
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
          <div className="flex space-x-4 items-center">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/6"></div>
            <div className="h-6 bg-gray-300 rounded-full w-16"></div>
            <div className="h-4 bg-gray-300 rounded w-1/6"></div>
            <div className="flex space-x-2">
              <div className="h-8 w-8 bg-gray-300 rounded"></div>
              <div className="h-8 w-8 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListSkeleton = () => (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gray-300 rounded-full flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
            <div className="h-8 w-20 bg-gray-300 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFormSkeleton = () => (
    <div className={`bg-white rounded-lg shadow p-6 space-y-6 animate-pulse ${className}`}>
      <div className="h-6 bg-gray-300 rounded w-1/3"></div>
      {Array.from({ length: count || 4 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-10 bg-gray-300 rounded w-full"></div>
        </div>
      ))}
      <div className="flex space-x-3 pt-4">
        <div className="h-10 bg-gray-300 rounded w-24"></div>
        <div className="h-10 bg-gray-300 rounded w-20"></div>
      </div>
    </div>
  );

  const renderDetailSkeleton = () => (
    <div className={`bg-white rounded-lg shadow overflow-hidden animate-pulse ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 bg-gray-300 rounded w-64"></div>
            <div className="h-4 bg-gray-300 rounded w-32"></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-9 w-20 bg-gray-300 rounded"></div>
            <div className="h-9 w-24 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-300 rounded w-full"></div>
              <div className="h-3 bg-gray-300 rounded w-5/6"></div>
              <div className="h-3 bg-gray-300 rounded w-4/5"></div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex justify-between">
                  <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchSkeleton = () => (
    <div className={`space-y-4 ${className}`}>
      {/* Search bar */}
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="flex space-x-4">
          <div className="flex-1 h-10 bg-gray-300 rounded"></div>
          <div className="h-10 w-24 bg-gray-300 rounded"></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-8 bg-gray-300 rounded w-20"></div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {Array.from({ length: count || 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="h-16 w-16 bg-gray-300 rounded flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 rounded w-full"></div>
                <div className="h-3 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDashboardSkeleton = () => (
    <div className={`space-y-6 ${className}`}>
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gray-300 rounded-lg"></div>
              <div className="ml-4 flex-1">
                <div className="h-6 bg-gray-300 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTextSkeleton = () => (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: count || 3 }).map((_, index) => (
        <div key={index} className="space-y-2 mb-4">
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          <div className="h-4 bg-gray-300 rounded w-4/5"></div>
        </div>
      ))}
    </div>
  );

  // Render based on type
  switch (type) {
    case 'table':
      return renderTableSkeleton();
    case 'list':
      return renderListSkeleton();
    case 'form':
      return renderFormSkeleton();
    case 'detail':
      return renderDetailSkeleton();
    case 'search':
      return renderSearchSkeleton();
    case 'dashboard':
      return renderDashboardSkeleton();
    case 'text':
      return renderTextSkeleton();
    case 'card':
    default:
      return (
        <div className="space-y-6">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index}>{renderCardSkeleton()}</div>
          ))}
        </div>
      );
  }
}

export default SkeletonLoader;

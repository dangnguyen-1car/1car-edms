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

function SkeletonLoader({
  width = '100%',
  height = '20px',
  count = 1,
  className = '',
  variant = 'rectangular' // rectangular, circular, text
}) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded';
      case 'rectangular':
      default:
        return 'rounded';
    }
  };

  const skeletonStyle = {
    width,
    height: variant === 'text' ? '1em' : height
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 animate-pulse ${getVariantClasses()}`}
          style={skeletonStyle}
        />
      ))}
    </div>
  );
}

export default SkeletonLoader;
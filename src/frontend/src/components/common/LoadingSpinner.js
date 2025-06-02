// src/frontend/src/components/common/LoadingSpinner.js
/* =================================================================
 * EDMS 1CAR - Enhanced Loading Spinner Component
 * Reusable loading indicator for async operations
 * Added: Overlay option, color variants, accessibility improvements
 * ================================================================= */

import React from 'react';

// =================================================================
// 1. Main Loading Spinner Component
// =================================================================

function LoadingSpinner({
    size = 'medium',
    message = 'Đang tải...',
    className = '',
    overlay = false,
    color = 'blue',
    showMessage = true
}) {
    // --- Configuration Objects ---
    const sizeClasses = {
        small: 'h-4 w-4',
        medium: 'h-8 w-8',
        large: 'h-12 w-12',
        xlarge: 'h-16 w-16'
    };

    const colorClasses = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        red: 'text-red-600',
        gray: 'text-gray-600',
        white: 'text-white'
    };

    const messageSizeClasses = {
        small: 'text-xs',
        medium: 'text-sm',
        large: 'text-base',
        xlarge: 'text-lg'
    };

    // --- Spinner Element ---
    const spinner = (
        <div
            className={`flex flex-col items-center justify-center ${className}`}
            role="status"
            aria-label={message}
        >
            <svg
                className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {showMessage && message && (
                <p className={`mt-2 ${messageSizeClasses[size]} ${
                    overlay ? 'text-gray-700' : 'text-gray-600'
                } text-center`}>
                    {message}
                </p>
            )}
            {/* Screen reader text */}
            <span className="sr-only">{message}</span>
        </div>
    );

    // --- Conditional Rendering Logic ---
    if (overlay) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Loading" >
                <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
                    {React.cloneElement(spinner, {
                        className: `${spinner.props.className} text-center`
                    })}
                </div>
            </div>
        );
    }

    return spinner;
}


// =================================================================
// 2. Specialized Loader Components
// =================================================================

export function PageLoader({ message = 'Đang tải trang...' }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <LoadingSpinner size="large" message={message} className="text-center" />
        </div>
    );
}

export function InlineLoader({ message = 'Đang tải...', size = 'small' }) {
    return (
        <LoadingSpinner size={size} message={message} className="py-4" showMessage={true} />
    );
}

export function ButtonLoader({ size = 'small', color = 'white' }) {
    return (
        <LoadingSpinner size={size} color={color} showMessage={false} className="inline-flex" />
    );
}

export function OverlayLoader({ message = 'Đang xử lý...', size = 'large' }) {
    return (
        <LoadingSpinner size={size} message={message} overlay={true} />
    );
}


// =================================================================
// 3. Default Export
// =================================================================

export default LoadingSpinner;
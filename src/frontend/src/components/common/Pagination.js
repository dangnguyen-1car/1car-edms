// src/frontend/src/components/common/Pagination.js
/* =================================================================
 * EDMS 1CAR - Enhanced Pagination Component
 * Improved pagination with accessibility and better UX
 * Added: ARIA labels, keyboard navigation, improved responsive design
 * ================================================================= */

import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';


// =================================================================
// 1. Pagination Component
// =================================================================

function Pagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    showFirstLast = true,
    showPageSizeSelector = true,
    maxVisiblePages = 5
}) {
    // --- Constants ---
    const pageSizeOptions = [10, 20, 50, 100];

    // --- Helper Functions & Logic ---

    // Enhanced page numbers calculation with ellipsis support
    const getPageNumbers = () => {
        const pages = [];

        if (totalPages <= maxVisiblePages) {
            // Show all pages if total is less than max visible
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Complex logic for ellipsis
            const halfVisible = Math.floor(maxVisiblePages / 2);
            let startPage = Math.max(1, currentPage - halfVisible);
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            // Adjust start page if we're near the end
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            // Add first page and ellipsis if needed
            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) {
                    pages.push('...');
                }
            }

            // Add visible page range
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            // Add ellipsis and last page if needed
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pages.push('...');
                }
                pages.push(totalPages);
            }
        }
        return pages;
    };
    
    const handleKeyDown = (event, action, page = null) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (action === 'page' && page) {
                onPageChange(page);
            } else if (action === 'prev' && currentPage > 1) {
                onPageChange(currentPage - 1);
            } else if (action === 'next' && currentPage < totalPages) {
                onPageChange(currentPage + 1);
            } else if (action === 'first') {
                onPageChange(1);
            } else if (action === 'last') {
                onPageChange(totalPages);
            }
        }
    };

    const pageNumbers = getPageNumbers();
    const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endItem = totalItems > 0 ? Math.min(currentPage * pageSize, totalItems) : 0;
    
    // --- Conditional Rendering ---

    // Don't render if there's only one page and no page size selector
    if (totalPages <= 1 && !showPageSizeSelector) {
        return null;
    }

    // --- Render Logic ---

    return (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            {/* Mobile view */}
            <div className="flex-1 flex justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    aria-label="Trang trước"
                    onKeyDown={(e) => handleKeyDown(e, 'prev')}
                >
                    <FiChevronLeft className="h-4 w-4 mr-1" />
                    Trước
                </button>
                <span className="text-sm text-gray-700 flex items-center">
                    Trang {currentPage} / {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    aria-label="Trang sau"
                    onKeyDown={(e) => handleKeyDown(e, 'next')}
                >
                    Sau
                    <FiChevronRight className="h-4 w-4 ml-1" />
                </button>
            </div>

            {/* Desktop view */}
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                    {/* Results info */}
                    <div>
                        <p className="text-sm text-gray-700">
                            Hiển thị{' '}
                            <span className="font-medium">{startItem}</span>
                            {' '}-{' '}
                            <span className="font-medium">{endItem}</span>
                            {' '}trong tổng số{' '}
                            <span className="font-medium">{totalItems}</span>
                            {' '}kết quả
                        </p>
                    </div>

                    {/* Page size selector */}
                    {showPageSizeSelector && onPageSizeChange && (
                        <div className="flex items-center space-x-2">
                            <label htmlFor="pageSize" className="text-sm text-gray-700">
                                Hiển thị:
                            </label>
                            <select
                                id="pageSize"
                                value={pageSize}
                                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                className="border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                aria-label="Số mục trên mỗi trang"
                            >
                                {pageSizeOptions.map(size => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                            <span className="text-sm text-gray-700">mục/trang</span>
                        </div>
                    )}
                </div>

                {/* Pagination controls */}
                <div>
                    <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                        role="navigation"
                    >
                        {/* First page button */}
                        {showFirstLast && (
                            <button
                                onClick={() => onPageChange(1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                aria-label="Trang đầu"
                                onKeyDown={(e) => handleKeyDown(e, 'first')}
                            >
                                <FiChevronsLeft className="h-4 w-4" />
                            </button>
                        )}
                        {/* Previous page button */}
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                !showFirstLast ? 'rounded-l-md' : ''
                            }`}
                            aria-label="Trang trước"
                            onKeyDown={(e) => handleKeyDown(e, 'prev')}
                        >
                            <FiChevronLeft className="h-4 w-4" />
                        </button>
                        {/* Page numbers */}
                        {pageNumbers.map((page, index) => {
                            if (page === '...') {
                                return (
                                    <span
                                        key={`ellipsis-${index}`}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                                    >
                                        ...
                                    </span>
                                );
                            }
                            const isCurrentPage = page === currentPage;
                            return (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                        isCurrentPage
                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                    aria-label={`Trang ${page}`}
                                    aria-current={isCurrentPage ? 'page' : undefined}
                                    onKeyDown={(e) => handleKeyDown(e, 'page', page)}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        {/* Next page button */}
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                !showFirstLast ? 'rounded-r-md' : ''
                            }`}
                            aria-label="Trang sau"
                            onKeyDown={(e) => handleKeyDown(e, 'next')}
                        >
                            <FiChevronRight className="h-4 w-4" />
                        </button>
                        {/* Last page button */}
                        {showFirstLast && (
                            <button
                                onClick={() => onPageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                aria-label="Trang cuối"
                                onKeyDown={(e) => handleKeyDown(e, 'last')}
                            >
                                <FiChevronsRight className="h-4 w-4" />
                            </button>
                        )}
                    </nav>
                </div>
            </div>
        </div>
    );
}

// =================================================================
// 2. Export
// =================================================================

export default Pagination;
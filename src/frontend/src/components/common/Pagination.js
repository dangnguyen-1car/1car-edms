// src/components/common/Pagination.js
import React from 'react';
import { FiChevronLeft, FiChevronRight } // FiChevronsLeft, FiChevronsRight bỏ đi nếu không dùng First/Last
from 'react-icons/fi';

function Pagination({
  currentPage,
  totalPages,
  totalItems, // Thêm từ .new.js
  pageSize,   // Thêm từ .new.js
  onPageChange,
  onPageSizeChange, // Thêm từ .new.js
  // showFirstLast = false, // Bỏ đi nếu logic getPageNumbers không hỗ trợ phức tạp
  // maxVisiblePages = 5    // Bỏ đi nếu logic getPageNumbers không hỗ trợ phức tạp
}) {
  if (totalPages <= 1 && (!onPageSizeChange || !totalItems)) { // Nếu chỉ có 1 trang và không có pageSize changer thì không cần hiển thị gì
    return null;
  }

  const pageSizeOptions = [10, 20, 50, 100]; // Từ .new.js

  // Giữ lại logic getPageNumbers từ .new.js vì nó đơn giản và hiệu quả cho hầu hết các trường hợp
  // Nếu cần logic phức tạp hơn (ellipsis, first/last), có thể lấy từ file cũ và điều chỉnh.
  const getPageNumbers = () => {
    const pages = [];
    const maxVisibleButtons = 5; // Số nút trang tối đa hiển thị

    if (totalPages <= maxVisibleButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
      let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

      if (endPage - startPage + 1 < maxVisibleButtons) {
        startPage = Math.max(1, endPage - maxVisibleButtons + 1);
      }
      
      // Logic thêm '...' (tùy chọn, có thể làm phức tạp hóa)
      // Ví dụ đơn giản hơn là chỉ hiển thị 5 nút quanh trang hiện tại
      if (currentPage <= 3) {
        for (let i = 1; i <= Math.min(totalPages, maxVisibleButtons); i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = Math.max(1, totalPages - maxVisibleButtons + 1); i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - Math.floor(maxVisibleButtons / 2); i <= currentPage + Math.floor(maxVisibleButtons / 2); i++) {
          pages.push(i);
        }
      }
    }
    return pages;
  };

  const pageNumbersToDisplay = getPageNumbers();

  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0; // Từ .new.js, kiểm tra totalItems
  const endItem = totalItems > 0 ? Math.min(currentPage * pageSize, totalItems) : 0; // Từ .new.js, kiểm tra totalItems

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6"> {/* Thêm sm:px-6 và flex-col cho mobile */}
      {/* Results info and Page size selector (từ .new.js) */}
      <div className="flex items-center gap-4 mb-2 sm:mb-0">
        {totalItems > 0 && ( // Chỉ hiển thị khi có item
          <div className="text-sm text-gray-700">
            Hiển thị <span className="font-medium">{startItem}</span> đến{' '}
            <span className="font-medium">{endItem}</span> trong{' '}
            <span className="font-medium">{totalItems}</span> kết quả
          </div>
        )}

        {onPageSizeChange && ( // Chỉ hiển thị khi có hàm onPageSizeChange
          <div className="flex items-center gap-2">
            <label htmlFor="pageSizeSelect" className="text-sm text-gray-700 whitespace-nowrap">Hiển thị:</label>
            <select
              id="pageSizeSelect"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-sm text-gray-700">mục</span>
          </div>
        )}
      </div>

      {/* Pagination controls (kết hợp styling từ cả hai) */}
      {totalPages > 1 && ( // Chỉ hiển thị nút phân trang nếu có nhiều hơn 1 trang
        <div className="flex items-center gap-1"> {/* Giảm gap */}
          {/* Previous button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-md border border-gray-300" // Thêm border và style nhất quán
            title="Trang trước"
          >
            <FiChevronLeft size={18} /> {/* Giảm size icon một chút */}
          </button>

          {/* Page numbers */}
          {pageNumbersToDisplay.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors border ${ // Giảm padding Y
                page === currentPage
                  ? 'bg-blue-600 text-white border-blue-600 font-medium' // Thêm font-medium
                  : 'text-gray-700 hover:bg-gray-100 border-gray-300'
              }`}
            >
              {page}
            </button>
          ))}

          {/* Next button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0} // Thêm totalPages === 0
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-md border border-gray-300"
            title="Trang sau"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Pagination;
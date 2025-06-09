// src/frontend/src/components/common/ConfirmDialog.js

// 1. Imports
// -----------------------------------------------------------------------------
import React from 'react';
import { FiAlertTriangle, FiX, FiTrash2, FiAlertCircle } from 'react-icons/fi';

// 2. Constants & UI Configuration (Nên đặt bên ngoài component vì chúng không thay đổi)
// -----------------------------------------------------------------------------
const DIALOG_TYPE_STYLES = {
  danger: {
    icon: <FiTrash2 className="w-6 h-6 text-red-600" />,
    iconBg: 'bg-red-100',
    confirmBtn: 'btn btn-danger',
    titleColor: 'text-red-900'
  },
  warning: {
    icon: <FiAlertTriangle className="w-6 h-6 text-yellow-600" />,
    iconBg: 'bg-yellow-100',
    confirmBtn: 'btn btn-warning',
    titleColor: 'text-yellow-900'
  },
  default: {
    icon: <FiAlertCircle className="w-6 h-6 text-blue-600" />,
    iconBg: 'bg-blue-100',
    confirmBtn: 'btn btn-primary',
    titleColor: 'text-gray-900'
  }
};

// 3. Main Component
// -----------------------------------------------------------------------------
function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  type = 'default', // 'default', 'danger', 'warning'
  isLoading = false
}) {
  // --- Early return nếu không mở ---
  if (!isOpen) return null;

  // --- Derived State & Variables ---
  // Lấy style tương ứng với type, nếu không có thì dùng default
  const typeStyles = DIALOG_TYPE_STYLES[type] || DIALOG_TYPE_STYLES.default;

  // --- Event Handlers ---
  const handleConfirm = () => {
    if (onConfirm && !isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel && !isLoading) {
      onCancel();
    }
  };

  // Đóng dialog khi click vào nền mờ bên ngoài
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // --- Render ---
  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50 p-4" 
      onClick={handleBackdropClick} 
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        {/* Dialog Content */}
        <div className="p-6">
          <div className="flex items-start">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${typeStyles.iconBg} flex items-center justify-center`}>
              {typeStyles.icon}
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-lg font-medium ${typeStyles.titleColor} mb-2`}>
                {title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Dialog Actions/Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="btn btn-secondary-outline"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`${typeStyles.confirmBtn} min-w-[100px]`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Đang xử lý...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// 4. Export
// -----------------------------------------------------------------------------
export default ConfirmDialog;
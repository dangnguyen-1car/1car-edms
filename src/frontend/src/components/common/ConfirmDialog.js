// src/frontend/src/components/common/ConfirmDialog.js
import React from 'react';
import { FiAlertTriangle, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const DIALOG_VARIANTS = {
  danger: {
    icon: FiAlertTriangle,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    buttonClass: 'btn-danger'
  },
  primary: {
    icon: FiCheckCircle,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    buttonClass: 'btn-primary'
  },
  secondary: {
    icon: FiAlertCircle,
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    buttonClass: 'btn-secondary'
  }
};

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isLoading = false,
  confirmButtonVariant = 'primary'
}) {
  if (!isOpen) return null;

  const variant = DIALOG_VARIANTS[confirmButtonVariant] || DIALOG_VARIANTS.primary;
  const Icon = variant.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={!isLoading ? onClose : undefined}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${variant.bgColor} ${variant.borderColor} border`}>
                <Icon className={`w-5 h-5 ${variant.iconColor}`} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            </div>
            {!isLoading && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-700">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-outline"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={`btn ${variant.buttonClass}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

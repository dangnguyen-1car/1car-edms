// src/frontend/src/components/common/DocumentStatusBadge.js
import React from 'react';

function DocumentStatusBadge({ status }) {
  const statusConfig = {
    draft: {
      label: 'Dự thảo',
      className: 'bg-gray-100 text-gray-800'
    },
    review: {
      label: 'Đang xem xét',
      className: 'bg-yellow-100 text-yellow-800'
    },
    published: {
      label: 'Đã phê duyệt',
      className: 'bg-green-100 text-green-800'
    },
    archived: {
      label: 'Lưu trữ',
      className: 'bg-blue-100 text-blue-800'
    },
    disposed: {
      label: 'Đã hủy',
      className: 'bg-red-100 text-red-800'
    }
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

export default DocumentStatusBadge;
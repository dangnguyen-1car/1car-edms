// src/frontend/src/components/documents/DocumentList.js
/**
 * =================================================================
 * EDMS 1CAR - Document List Component (SIMPLIFIED & REFACTORED)
 *
 * Chức năng:
 * - Component này chỉ chịu trách nhiệm hiển thị danh sách tài liệu.
 * - Nhận dữ liệu (documents) và chế độ xem (viewMode) từ component cha.
 * - Không còn chứa logic về bộ lọc hay các nút điều khiển.
 *
 * Sửa lỗi:
 * - Gỡ bỏ toàn bộ phần UI điều khiển bị lặp lại.
 * =================================================================
 */
import React, { useCallback } from 'react';
// Bỏ import useNavigate vì không cần nữa
import { toast } from 'react-hot-toast';

import DocumentCard from './DocumentCard';
import DocumentTable from './DocumentTable';
import SkeletonLoader from '../common/SkeletonLoader';
import { documentService } from '../../services/documentService';
import ConfirmDialog from '../common/ConfirmDialog';

function DocumentList({
  documents,
  isLoading,
  viewMode = 'card',
  onEdit,
  onViewClick, // <<< THÊM: Nhận onViewClick từ props
  onDeleteSuccess,
  onSortChange,
  currentSort
}) {
  // Bỏ navigate và handleViewDocument khỏi đây
  const [confirmDialog, setConfirmDialog] = React.useState({ isOpen: false, document: null });

  const handleDeleteDocument = useCallback((document) => {
    setConfirmDialog({ isOpen: true, document });
  }, []);

  const confirmDelete = useCallback(async () => {
    const { document } = confirmDialog;
    if (!document) return;

    setConfirmDialog({ isOpen: false, document: null });
    try {
      await documentService.deleteDocument(document.id);
      toast.success(`Đã xóa tài liệu "${document.title}"`);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa tài liệu');
    }
  }, [confirmDialog, onDeleteSuccess]);

  if (isLoading) {
    // Hiển thị skeleton loader phù hợp với chế độ xem
    return viewMode === 'card' 
      ? <SkeletonLoader type="card" count={8} /> 
      : <SkeletonLoader type="table" count={8} />;
  }
  
  return (
    <>
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {documents.map(doc =>
            <DocumentCard
              key={doc.id}
              document={doc}
              onViewClick={onViewClick} // <<< SỬA: Truyền thẳng prop nhận được
              onEditClick={() => onEdit(doc.id)}
              onDeleteClick={handleDeleteDocument}
            />
          )}
        </div>
      ) : (
        <DocumentTable
          documents={documents}
          onViewClick={onViewClick} // <<< SỬA: Truyền thẳng prop nhận được
          onEditClick={(doc) => onEdit(doc.id)}
          onDeleteClick={handleDeleteDocument}
          onSort={onSortChange}
          currentSort={currentSort}
        />
      )}
      
      {/* Modal xác nhận xóa */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Xác nhận xóa tài liệu"
        message={`Bạn có chắc muốn xóa tài liệu "${confirmDialog.document?.title}"? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, document: null })}
        type="danger"
      />
    </>
  );
}

export default DocumentList;
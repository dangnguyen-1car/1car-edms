// src/frontend/src/hooks/useDocumentPermission.js
import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { documentService } from '../services/documentService';

/**
 * Custom hook để kiểm tra quyền của người dùng hiện tại đối với một tài liệu
 * Refactored để sử dụng Single Source of Truth từ documentService
 * @param {Object} document - Tài liệu cần kiểm tra quyền
 * @returns {Object} Object chứa các boolean về quyền của user
 */
function useDocumentPermission(document) {
  const { user: currentUser } = useAuth();

  const permissions = useMemo(() => {
    if (!document || !currentUser) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canCreateVersion: false,
        canDownload: false,
        canShare: false,
        canArchive: false,
        canRestore: false,
      };
    }

    // Sử dụng các hàm helper từ documentService (Single Source of Truth)
    const canEdit = documentService.canEditDocument(document, currentUser);
    const canDelete = documentService.canDeleteDocument(document, currentUser);
    const canApprove = documentService.canApproveDocument(document, currentUser);
    const canCreateVersion = documentService.canCreateVersion(document, currentUser);

    // Logic bổ sung cho các quyền chưa có trong service
    const canView = (() => {
      // Admin có thể xem mọi tài liệu
      if (currentUser.role === 'admin') return true;

      // Tác giả có thể xem tài liệu của mình
      if (document.author_id === currentUser.id) return true;

      // Manager có thể xem tài liệu trong phòng ban
      if (currentUser.role === 'manager' && document.department === currentUser.department) {
        return true;
      }

      // User có thể xem tài liệu published trong phòng ban hoặc được chia sẻ
      if (document.status === 'published') {
        // Kiểm tra security level
        if (document.security_level === 'public') return true;
        if (document.security_level === 'internal' && document.department === currentUser.department) return true;
        if (document.recipients && document.recipients.includes(currentUser.department)) return true;
      }

      return false;
    })();

    const canDownload = (() => {
      // Cần có quyền view và file phải tồn tại
      if (!canView || !document.file_info) return false;

      // Admin luôn có thể download
      if (currentUser.role === 'admin') return true;

      // Tác giả có thể download
      if (document.author_id === currentUser.id) return true;

      // Manager trong phòng ban có thể download
      if (currentUser.role === 'manager' && document.department === currentUser.department) {
        return true;
      }

      // User có thể download nếu tài liệu published và có quyền view
      return document.status === 'published' && canView;
    })();

    const canShare = (() => {
      // Admin có thể share mọi tài liệu
      if (currentUser.role === 'admin') return true;

      // Tác giả có thể share tài liệu của mình
      if (document.author_id === currentUser.id) return true;

      // Manager có thể share tài liệu trong phòng ban
      if (currentUser.role === 'manager' && document.department === currentUser.department) {
        return true;
      }

      // Chỉ có thể share tài liệu published
      return document.status === 'published' && canView;
    })();

    const canArchive = (() => {
      // Chỉ Admin và Manager có thể archive
      if (currentUser.role === 'admin') return true;

      if (currentUser.role === 'manager' &&
          document.department === currentUser.department &&
          document.status === 'published') {
        return true;
      }

      return false;
    })();

    const canRestore = (() => {
      // Chỉ Admin và Manager có thể restore từ archived
      if (document.status !== 'archived') return false;

      if (currentUser.role === 'admin') return true;

      if (currentUser.role === 'manager' && document.department === currentUser.department) {
        return true;
      }

      return false;
    })();

    return {
      canView,
      canEdit,
      canDelete,
      canApprove,
      canCreateVersion,
      canDownload,
      canShare,
      canArchive,
      canRestore,
    };
  }, [document, currentUser]);

  return permissions;
}

export default useDocumentPermission;
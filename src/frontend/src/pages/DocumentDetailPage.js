// src/pages/DocumentDetailPage.js - Cập nhật hoàn thiện với tab Phân quyền
/**
 * =================================================================
 * EDMS 1CAR - Document Detail Page (Updated with Permissions Tab)
 * =================================================================
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  FiEdit, FiDownload, FiShare, FiPrinter, FiStar, FiCheckCircle, FiGitBranch,
  FiAlertCircle, FiClock, FiHome, FiRefreshCw, FiEye, FiList,
  FiPaperclip, FiShield // *** THÊM ICON SHIELD ***
} from 'react-icons/fi';

// Component Imports
import MetadataPanel from '../components/documents/MetadataPanel';
import DocumentViewer from '../components/documents/DocumentViewer';
import VersionHistory from '../components/documents/VersionHistory';
import WorkflowHistory from '../components/documents/WorkflowHistory';
import RelatedDocuments from '../components/documents/RelatedDocuments';
import DocumentPermissionsPanel from '../components/documents/DocumentPermissionsPanel'; // *** THÊM IMPORT ***
import NewVersionModal from '../components/documents/NewVersionModal';
import ApprovalModal from '../components/documents/ApprovalModal';
import ShareDocumentModal from '../components/documents/ShareDocumentModal';
import ChangeStatusModal from '../components/documents/ChangeStatusModal';
import VersionComparisonModal from '../components/documents/VersionComparisonModal';
import ErrorMessage from '../components/common/ErrorMessage';
import Breadcrumb from '../components/common/Breadcrumb';

// API & Context Imports
import { documentAPI } from '../api/documentApi';
import { useAuth } from '../contexts/AuthContext';

function DocumentDetailPage() {
  // =================================================================
  // HOOKS & STATE MANAGEMENT
  // =================================================================
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('viewer');
  const [isFavorite, setIsFavorite] = useState(false); // State này cần được fetch từ API
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showVersionComparisonModal, setShowVersionComparisonModal] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  // =================================================================
  // DATA FETCHING (useQuery)
  // =================================================================
  const {
    data: documentData,
    isLoading: documentLoading,
    error: documentError,
    refetch: refetchDocument
  } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentAPI.getDocument(documentId),
    enabled: !!documentId,
  });

  const {
    data: versionsData,
    isLoading: versionsLoading,
    error: versionsError,
    refetch: refetchVersions
  } = useQuery({
    queryKey: ['documentVersions', documentId],
    queryFn: () => documentAPI.getDocumentVersions(documentId),
    enabled: !!documentId,
  });

  const {
    data: workflowData,
    isLoading: workflowLoading,
    error: workflowError,
    refetch: refetchWorkflow
  } = useQuery({
    queryKey: ['workflowHistory', documentId],
    queryFn: () => documentAPI.getDocumentWorkflow(documentId),
    enabled: !!documentId,
  });

  // =================================================================
  // MUTATIONS (useMutation)
  // =================================================================
  const compareVersionsMutation = useMutation({
    mutationFn: ({ versionId1, versionId2 }) => documentAPI.compareVersions(versionId1.id, versionId2.id),
    onSuccess: (data) => {
      setComparisonData(data);
      setShowVersionComparisonModal(true);
    },
    onError: () => toast.error('Không thể so sánh các phiên bản. Vui lòng thử lại.')
  });

  // =================================================================
  // DERIVED STATE & SIDE EFFECTS (useMemo, useEffect)
  // =================================================================
  const versions = useMemo(() => versionsData?.data?.versions || [], [versionsData]);
  const workflowHistory = useMemo(() => workflowData?.data?.workflowHistory?.history || [], [workflowData]);
  const isLoading = documentLoading || versionsLoading || workflowLoading;

  // Effect để cập nhật trạng thái yêu thích từ dữ liệu tài liệu
  useEffect(() => {
    if (documentData?.data?.is_favorite !== undefined) {
      setIsFavorite(documentData.data.is_favorite);
    }
  }, [documentData]);

  // =================================================================
  // PERMISSION CHECKS (Helper functions for rendering)
  // =================================================================
  const document = documentData?.data; // Dùng biến 'document' để tiện truy cập

  const canEdit = () => {
    if (!document || !user) return false;
    // user có quyền EDIT_DOCUMENT chung, hoặc user là tác giả và tài liệu đang ở trạng thái draft
    return hasPermission('EDIT_DOCUMENT') || (document.author_id === user.id && document.status === 'draft');
  };

  const canApprove = () => {
    if (!document || !user) return false;
    // user có quyền APPROVE_DOCUMENT chung và tài liệu đang ở trạng thái review
    return document.status === 'review' && hasPermission('APPROVE_DOCUMENT');
  };

  const canCreateVersion = () => {
    if (!document || !user) return false;
    // user có quyền CREATE_VERSION chung, hoặc user là tác giả và tài liệu đang ở trạng thái published
    return hasPermission('CREATE_VERSION') || (document.author_id === user.id && document.status === 'published');
  };

  const canChangeStatus = () => {
    if (!document || !user) return false;
    // user có quyền CHANGE_DOCUMENT_STATUS chung hoặc là admin
    return hasPermission('CHANGE_DOCUMENT_STATUS') || user.role === 'admin';
  };

  // *** THÊM MỚI: Kiểm tra quyền quản lý phân quyền ***
  const canManagePermissions = () => {
    if (!document || !user) return false;
    // user có quyền MANAGE_PERMISSIONS chung hoặc là admin
    return hasPermission('MANAGE_PERMISSIONS') || user.role === 'admin';
  };

  // =================================================================
  // EVENT HANDLERS
  // =================================================================
  const refetchAllData = () => {
    refetchDocument();
    refetchVersions();
    refetchWorkflow();
    // Invalidate document permissions cache to ensure fresh data
    queryClient.invalidateQueries(['documentPermissions', documentId]);
  };

  const handleVersionComparison = (version1, version2) => {
    if (!version1 || !version2) {
      toast.error('Vui lòng chọn hai phiên bản để so sánh.');
      return;
    }
    compareVersionsMutation.mutate({ versionId1: version1, versionId2: version2 });
  };

  // =================================================================
  // TAB CONFIGURATION
  // =================================================================
  const tabs = [
    {
      id: 'viewer',
      label: 'Xem tài liệu',
      icon: FiEye,
      component: <DocumentViewer document={document} />
    },
    {
      id: 'metadata',
      label: 'Thông tin',
      icon: FiList,
      component: <MetadataPanel document={document} />
    },
    {
      id: 'versions',
      label: 'Phiên bản',
      icon: FiGitBranch,
      component: <VersionHistory versions={versions} isLoading={versionsLoading} error={versionsError} onCompareVersions={handleVersionComparison} onRefresh={refetchVersions} />
    },
    {
      id: 'workflow',
      label: 'Quy trình',
      icon: FiAlertCircle,
      component: <WorkflowHistory history={workflowHistory} isLoading={workflowLoading} error={workflowError} onRefresh={refetchWorkflow} />
    },
    {
      id: 'related',
      label: 'Liên quan',
      icon: FiPaperclip,
      component: <RelatedDocuments documentId={documentId} />
    },
    // *** THÊM MỚI: Tab Phân quyền ***
    ...(canManagePermissions() ? [{
      id: 'permissions',
      label: 'Phân quyền',
      icon: FiShield, // Sử dụng icon Shield
      component: <DocumentPermissionsPanel documentId={documentId} />
    }] : [])
  ];

  // =================================================================
  // BREADCRUMB CONFIGURATION
  // =================================================================
  const breadcrumbItems = [
    { label: 'Trang chủ', href: '/', icon: FiHome },
    { label: 'Tài liệu', href: '/documents' },
    { label: document?.document_code || 'Tài liệu chi tiết', href: `/documents/${documentId}`, current: true }
  ];

  // =================================================================
  // CONDITIONAL RENDERING (LOADING & ERROR)
  // =================================================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (documentError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message="Không thể tải thông tin tài liệu. Vui lòng thử lại." onRetry={refetchDocument} />
        </div>
      </div>
    );
  }

  // =================================================================
  // MAIN RENDER
  // =================================================================
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} className="mb-6" />

        {/* Document Header */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">
                    {document?.title}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {document?.document_code}
                  </span>
                </div>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <span>Phiên bản: {document?.version}</span>
                  <span>- </span>
                  <span>Trạng thái: {document?.status}</span>
                  <span>- </span>
                  <span>Tác giả: {document?.author_name}</span>
                  <span>- </span>
                  <span>
                    <FiClock className="inline w-4 h-4 mr-1" />
                    {document?.updated_at ? new Date(document.updated_at).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsFavorite(!isFavorite)} // This needs API integration for actual favorite status
                  className={`p-2 rounded-lg border ${
                    isFavorite
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
                      : 'bg-white border-gray-300 text-gray-400 hover:text-gray-500'
                  }`}
                  title={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                >
                  <FiStar className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="p-2 rounded-lg border border-gray-300 text-gray-400 hover:text-gray-500"
                  title="Chia sẻ"
                >
                  <FiShare className="w-5 h-5" />
                </button>

                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-lg border border-gray-300 text-gray-400 hover:text-gray-500"
                  title="In"
                >
                  <FiPrinter className="w-5 h-5" />
                </button>

                <button
                  onClick={() => documentAPI.downloadDocument(documentId)} // This needs proper error handling and might trigger browser download
                  className="p-2 rounded-lg border border-gray-300 text-gray-400 hover:text-gray-500"
                  title="Tải xuống"
                >
                  <FiDownload className="w-5 h-5" />
                </button>

                {canEdit() && (
                  <button
                    onClick={() => navigate(`/documents/${documentId}/edit`)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <FiEdit className="w-4 h-4" />
                    Chỉnh sửa
                  </button>
                )}

                {canCreateVersion() && (
                  <button
                    onClick={() => setShowNewVersionModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <FiGitBranch className="w-4 h-4" />
                    Tạo phiên bản
                  </button>
                )}

                {canApprove() && (
                  <button
                    onClick={() => setShowApprovalModal(true)}
                    className="btn btn-success flex items-center gap-2"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    Phê duyệt
                  </button>
                )}

                {canChangeStatus() && (
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="btn btn-info flex items-center gap-2"
                  >
                    <FiAlertCircle className="w-4 h-4" />
                    Đổi trạng thái
                  </button>
                )}

                <button
                  onClick={refetchAllData}
                  className="p-2 rounded-lg border border-gray-300 text-gray-400 hover:text-gray-500"
                  title="Làm mới"
                >
                  <FiRefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon; // Component icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="p-6">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </div>

        {/* Modals */}
        {showNewVersionModal && (
          <NewVersionModal
            document={document}
            onClose={() => setShowNewVersionModal(false)}
            onSuccess={() => {
              setShowNewVersionModal(false);
              refetchAllData();
            }}
          />
        )}
        {showApprovalModal && (
          <ApprovalModal
            document={document}
            onClose={() => setShowApprovalModal(false)}
            onSuccess={() => {
              setShowApprovalModal(false);
              refetchAllData();
            }}
          />
        )}
        {showShareModal && (
          <ShareDocumentModal
            document={document}
            onClose={() => setShowShareModal(false)}
          />
        )}
        {showStatusModal && (
          <ChangeStatusModal
            document={document}
            onClose={() => setShowStatusModal(false)}
            onSuccess={() => {
              setShowStatusModal(false);
              refetchAllData();
            }}
          />
        )}
        {showVersionComparisonModal && comparisonData && (
          <VersionComparisonModal
            comparisonData={comparisonData}
            onClose={() => {
              setShowVersionComparisonModal(false);
              setComparisonData(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default DocumentDetailPage;

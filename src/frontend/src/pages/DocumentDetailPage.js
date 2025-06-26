// src/frontend/src/pages/DocumentDetailPage.js
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    FiEdit, FiDownload, FiShare, FiPrinter, FiStar, FiCheckCircle, FiGitBranch,
    FiAlertCircle, FiClock, FiHome, FiRefreshCw, FiEye,
    FiList, FiPaperclip, FiShield
} from 'react-icons/fi';

// Component Imports
import MetadataPanel from '../components/documents/MetadataPanel';
import DocumentViewer from '../components/documents/DocumentViewer';
import VersionHistory from '../components/documents/VersionHistory';
import WorkflowHistory from '../components/documents/WorkflowHistory';
import RelatedDocuments from '../components/documents/RelatedDocuments';
import DocumentPermissionsPanel from '../components/documents/DocumentPermissionsPanel';
import NewVersionModal from '../components/documents/NewVersionModal';
import ShareDocumentModal from '../components/documents/ShareDocumentModal';
import VersionComparisonModal from '../components/documents/VersionComparisonModal';
import ErrorMessage from '../components/common/ErrorMessage';
import Breadcrumb from '../components/common/Breadcrumb';
import WorkflowActionModal from '../components/documents/WorkflowActionModal'; // Import WorkflowActionModal

// API & Context Imports
import { documentAPI } from '../api/documentApi';
import { favoritesService } from '../services/favoritesService';
import { useAuth } from '../contexts/AuthContext';
import { useWorkflowActions } from '../hooks/useWorkflowActions'; // Import hook xử lý workflow

function DocumentDetailPage() {
    // =================================================================
    // HOOKS & STATE MANAGEMENT
    // =================================================================
    const { id: documentId } = useParams();
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    const queryClient = useQueryClient();
    const { processWorkflowAction, isLoading: isProcessingWorkflow } = useWorkflowActions(); // Sử dụng hook xử lý workflow

    const [activeTab, setActiveTab] = useState('viewer');
    const [showNewVersionModal, setShowNewVersionModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showVersionComparisonModal, setShowVersionComparisonModal] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);
    // State mới cho WorkflowActionModal
    const [workflowModalState, setWorkflowModalState] = useState({ isOpen: false, action: '', document: null });

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
        refetch: refetchVersions
    } = useQuery({
        queryKey: ['documentVersions', documentId],
        queryFn: () => documentAPI.getDocumentVersions(documentId),
        enabled: !!documentId,
    });

    const {
        data: workflowData,
        isLoading: workflowLoading,
        refetch: refetchWorkflow
    } = useQuery({
        queryKey: ['workflowHistory', documentId],
        queryFn: () => documentAPI.getDocumentWorkflow(documentId),
        enabled: !!documentId,
    });

    // =================================================================
    // MUTATIONS (useMutation) - THÊM FAVORITES MUTATIONS
    // =================================================================

    // Mutation cho toggle favorite với Optimistic Update
    const toggleFavoriteMutation = useMutation({
        mutationFn: async ({ documentId, isFavorite }) => {
            if (isFavorite) {
                return await favoritesService.removeFromFavorites(documentId);
            } else {
                return await favoritesService.addToFavorites(documentId);
            }
        },
        onMutate: async ({ documentId, isFavorite }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries(['document', documentId]);

            // Snapshot the previous value
            const previousDocument = queryClient.getQueryData(['document', documentId]);

            // Optimistically update to the new value
            queryClient.setQueryData(['document', documentId], old => ({
                ...old,
                data: {
                    ...old?.data,
                    is_favorite: !isFavorite
                }
            }));

            // Return a context object with the snapshotted value
            return { previousDocument, documentId };
        },
        onError: (err, variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousDocument) {
                queryClient.setQueryData(['document', context.documentId], context.previousDocument);
            }
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật yêu thích');
        },
        onSuccess: (data, { isFavorite }) => {
            toast.success(isFavorite ? 'Đã xóa khỏi yêu thích' : 'Đã thêm vào yêu thích');
            // Invalidate and refetch favorites list
            queryClient.invalidateQueries(['favorites']);
        },
        onSettled: (data, error, { documentId }) => {
            // Always refetch after error or success
            queryClient.invalidateQueries(['document', documentId]);
        }
    });

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
    const isLoading = documentLoading || versionsLoading || workflowLoading || isProcessingWorkflow; // Thêm isProcessingWorkflow vào isLoading

    // =================================================================
    // PERMISSION CHECKS (Helper functions for rendering)
    // =================================================================
    const document = documentData?.data;

    const canEdit = () => {
        if (!document || !user) return false;
        return hasPermission('EDIT_DOCUMENT') || (document.author_id === user.id && document.status === 'draft');
    };

    const canApprove = () => {
        if (!document || !user) return false;
        return document.status === 'review' && hasPermission('APPROVE_DOCUMENT');
    };

    const canCreateVersion = () => {
        if (!document || !user) return false;
        return hasPermission('CREATE_VERSION') || (document.author_id === user.id && document.status === 'published');
    };

    const canManagePermissions = () => {
        if (!document || !user) return false;
        return hasPermission('MANAGE_PERMISSIONS') || user.role === 'admin';
    };

    // =================================================================
    // EVENT HANDLERS
    // =================================================================
    const refetchAllData = () => {
        refetchDocument();
        refetchVersions();
        refetchWorkflow();
        queryClient.invalidateQueries(['documentPermissions', documentId]);
    };

    const handleVersionComparison = (version1, version2) => {
        if (!version1 || !version2) {
            toast.error('Vui lòng chọn hai phiên bản để so sánh.');
            return;
        }
        compareVersionsMutation.mutate({ versionId1: version1, versionId2: version2 });
    };

    const handleToggleFavorite = () => {
        if (!user) {
            toast.error("Vui lòng đăng nhập để sử dụng tính năng này.");
            return;
        }

        toggleFavoriteMutation.mutate({
            documentId: parseInt(documentId),
            isFavorite: document?.is_favorite || false
        });
    };

    const handleDownload = async () => {
        try {
            toast.promise(
                documentAPI.downloadDocument(documentId),
                {
                    loading: 'Đang xử lý tải xuống...',
                    success: 'Đã bắt đầu tải xuống.',
                    error: (err) => err.response?.data?.message || 'Lỗi khi tải xuống.',
                }
            );
        } catch (error) {
            // Error handled by toast.promise
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Hàm mở WorkflowActionModal
    const openWorkflowModal = (action) => {
        setWorkflowModalState({ isOpen: true, action, document });
    };

    // Hàm đóng WorkflowActionModal
    const closeWorkflowModal = () => {
        setWorkflowModalState({ isOpen: false, action: '', document: null });
        refetchAllData(); // Refresh data sau khi thực hiện hành động workflow
    };

    // Hàm xử lý khi xác nhận hành động từ WorkflowActionModal
    const handleWorkflowActionConfirm = (comment) => {
        if (workflowModalState.document) {
            processWorkflowAction({
                documentId: workflowModalState.document.id,
                action: workflowModalState.action,
                comment: comment.trim()
            });
            closeWorkflowModal(); // Đóng modal sau khi gửi hành động
        }
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
            label: 'Thông tin chi tiết',
            icon: FiList,
            component: <MetadataPanel document={document} />
        },
        {
            id: 'versions',
            label: 'Lịch sử phiên bản',
            icon: FiGitBranch,
            component: (
                <VersionHistory
                    versions={versions}
                    isLoading={versionsLoading}
                    onCompareVersions={handleVersionComparison}
                    onRefresh={refetchVersions}
                />
            )
        },
        {
            id: 'workflow',
            label: 'Lịch sử workflow',
            icon: FiClock,
            component: (
                <WorkflowHistory
                    workflowHistory={workflowHistory}
                    isLoading={workflowLoading}
                    onRefresh={refetchWorkflow}
                />
            )
        },
        {
            id: 'related',
            label: 'Tài liệu liên quan',
            icon: FiPaperclip,
            component: <RelatedDocuments documentId={documentId} />
        }
    ];

    // Add permissions tab if user can manage permissions
    if (canManagePermissions()) {
        tabs.push({
            id: 'permissions',
            label: 'Phân quyền',
            icon: FiShield,
            component: <DocumentPermissionsPanel documentId={documentId} />
        });
    }

    // =================================================================
    // BREADCRUMB CONFIGURATION
    // =================================================================
    const breadcrumbItems = [
        { label: 'Trang chủ', href: '/', icon: FiHome },
        { label: 'Tài liệu', href: '/documents', icon: FiList },
        { label: document?.title || 'Chi tiết tài liệu' }
    ];

    // =================================================================
    // LOADING & ERROR STATES
    // =================================================================
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải thông tin tài liệu...</p>
                </div>
            </div>
        );
    }

    if (documentError) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <Breadcrumb items={breadcrumbItems} />
                    <ErrorMessage
                        message="Không thể tải thông tin tài liệu"
                        onRetry={refetchDocument}
                    />
                </div>
            </div>
        );
    }

    if (!document) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Không tìm thấy tài liệu
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Tài liệu bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
                    </p>
                    <button
                        onClick={() => navigate('/documents')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Quay lại danh sách tài liệu
                    </button>
                </div>
            </div>
        );
    }

    // =================================================================
    // MAIN RENDER
    // =================================================================
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Breadcrumb */}
                <Breadcrumb items={breadcrumbItems} />

                {/* Header */}
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-gray-600">
                                    Mã: {document.document_code}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    document.status === 'published' ? 'bg-green-100 text-green-800' :
                                        document.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                                            document.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                'bg-red-100 text-red-800'
                                    }`}>
                                    {document.status === 'published' ? 'Đã xuất bản' :
                                        document.status === 'review' ? 'Đang xem xét' :
                                            document.status === 'draft' ? 'Bản nháp' : 'Đã lưu trữ'}
                                </span>
                                <span className="text-sm text-gray-500">
                                    Phiên bản {document.version}
                                </span>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {document.title}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Tác giả: {document.author_name}</span>
                                <span>Phòng ban: {document.department}</span>
                                <span>Cập nhật: {new Date(document.updated_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-6">
                            {/* Favorite Button */}
                            {user && (
                                <button
                                    onClick={handleToggleFavorite}
                                    disabled={toggleFavoriteMutation.isLoading}
                                    className={`p-2 rounded-lg transition-colors duration-200 ${
                                        document.is_favorite
                                            ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                                            : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                                    } ${toggleFavoriteMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={document.is_favorite ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                                >
                                    <FiStar
                                        className={`w-5 h-5 ${document.is_favorite ? 'fill-current' : ''}`}
                                    />
                                </button>
                            )}

                            <button
                                onClick={handleDownload}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Tải xuống"
                            >
                                <FiDownload className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handlePrint}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="In tài liệu"
                            >
                                <FiPrinter className="w-5 h-5" />
                            </button>

                            <button
                                onClick={() => setShowShareModal(true)}
                                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Chia sẻ"
                            >
                                <FiShare className="w-5 h-5" />
                            </button>

                            {canEdit() && (
                                <button
                                    onClick={() => navigate(`/documents/${documentId}/edit`)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <FiEdit className="w-4 h-4" />
                                    Chỉnh sửa
                                </button>
                            )}

                            {canCreateVersion() && (
                                <button
                                    onClick={() => setShowNewVersionModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <FiGitBranch className="w-4 h-4" />
                                    Tạo phiên bản mới
                                </button>
                            )}

                            {/* Sử dụng WorkflowActionModal cho hành động phê duyệt */}
                            {canApprove() && (
                                <button
                                    onClick={() => openWorkflowModal('approve')}
                                    disabled={isProcessingWorkflow}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FiCheckCircle className="w-4 h-4" />
                                    Phê duyệt
                                </button>
                            )}

                            {/* Nút Từ chối */}
                            {(document.user_role_in_workflow === 'reviewer' || document.user_role_in_workflow === 'approver') && (
                                <button
                                    onClick={() => openWorkflowModal('reject')}
                                    disabled={isProcessingWorkflow}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FiAlertCircle className="w-4 h-4" />
                                    Từ chối
                                </button>
                            )}

                             {/* Nút Yêu cầu chỉnh sửa */}
                            {(document.user_role_in_workflow === 'reviewer' || document.user_role_in_workflow === 'approver') && (
                                <button
                                    onClick={() => openWorkflowModal('request_changes')}
                                    disabled={isProcessingWorkflow}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FiEdit className="w-4 h-4" />
                                    Yêu cầu chỉnh sửa
                                </button>
                            )}

                            <button
                                onClick={refetchAllData}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Làm mới"
                            >
                                <FiRefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6" aria-label="Tabs">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
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

                    {/* Tab Content */}
                    <div className="p-6">
                        {tabs.find(tab => tab.id === activeTab)?.component}
                    </div>
                </div>

                {/* Modals */}
                {showNewVersionModal && (
                    <NewVersionModal
                        document={document}
                        isOpen={showNewVersionModal}
                        onClose={() => setShowNewVersionModal(false)}
                        onSuccess={refetchAllData}
                    />
                )}

                {showShareModal && (
                    <ShareDocumentModal
                        document={document}
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                    />
                )}

                {showVersionComparisonModal && comparisonData && (
                    <VersionComparisonModal
                        comparisonData={comparisonData}
                        isOpen={showVersionComparisonModal}
                        onClose={() => {
                            setShowVersionComparisonModal(false);
                            setComparisonData(null);
                        }}
                    />
                )}

                {/* Workflow Action Modal chung */}
                {workflowModalState.isOpen && (
                    <WorkflowActionModal
                        document={workflowModalState.document}
                        action={workflowModalState.action}
                        isOpen={workflowModalState.isOpen}
                        onClose={closeWorkflowModal}
                        onConfirm={handleWorkflowActionConfirm}
                        isLoading={isProcessingWorkflow}
                    />
                )}
            </div>
        </div>
    );
}

export default DocumentDetailPage;
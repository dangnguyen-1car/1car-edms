// src/pages/DocumentDetailPage.js
/**
 * =================================================================
 * EDMS 1CAR - Document Detail Page (Optimized)
 * Centralized data fetching to avoid duplicate API calls
 * Enhanced with version comparison functionality
 * =================================================================
 */

// 1. IMPORTS
// -----------------------------------------------------------------
// --- React & Libraries ---
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { toast } from 'react-hot-toast';
import {
    FiEdit, FiDownload, FiShare, FiPrinter, FiStar, FiCheckCircle,
    FiGitBranch, FiAlertCircle, FiClock, FiHome, FiChevronRight, FiRefreshCw
} from 'react-icons/fi';

import MetadataPanel from '../components/documents/MetadataPanel';
import DocumentViewer from '../components/documents/DocumentViewer';
import VersionHistory from '../components/documents/VersionHistory';
import WorkflowHistory from '../components/documents/WorkflowHistory';
import RelatedDocuments from '../components/documents/RelatedDocuments';
import NewVersionModal from '../components/documents/NewVersionModal';
import ApprovalModal from '../components/documents/ApprovalModal';
import ShareDocumentModal from '../components/documents/ShareDocumentModal';
import ChangeStatusModal from '../components/documents/ChangeStatusModal';
import VersionComparisonModal from '../components/documents/VersionComparisonModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

import { documentAPI } from '../api/documentApi';
import { useAuth } from '../contexts/AuthContext';

// 2. COMPONENT DEFINITION
// -----------------------------------------------------------------
function DocumentDetailPage() {

    // 3. HOOKS & STATE MANAGEMENT
    // -----------------------------------------------------------------
    const { documentId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, hasPermission } = useAuth();

    // --- Local UI State ---
    const [activeTab, setActiveTab] = useState('viewer'); // Mặc định mở tab viewer
    const [isFavorite, setIsFavorite] = useState(false);
    const [showNewVersionModal, setShowNewVersionModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showVersionComparisonModal, setShowVersionComparisonModal] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);

    // 4. CENTRALIZED DATA FETCHING (React Query) - THAY ĐỔI LỚN
    // -----------------------------------------------------------------
    // Fetch dữ liệu chính của tài liệu
    const { data: document, isLoading: documentLoading, error: documentError, refetch: refetchDocument } = useQuery({
        queryKey: ['document', documentId],
        queryFn: () => documentAPI.getDocument(documentId),
        enabled: !!documentId,
    });

    // Fetch lịch sử phiên bản
    const { data: versionsData, isLoading: versionsLoading, error: versionsError, refetch: refetchVersions } = useQuery({
        queryKey: ['documentVersions', documentId],
        queryFn: () => documentAPI.getDocumentVersions(documentId),
        enabled: !!documentId,
    });

    // Fetch lịch sử workflow
    const { data: workflowData, isLoading: workflowLoading, error: workflowError, refetch: refetchWorkflow } = useQuery({
        queryKey: ['workflowHistory', documentId],
        queryFn: () => documentAPI.getDocumentWorkflow(documentId),
        enabled: !!documentId,
    });
    
    // Fetch trạng thái yêu thích
    const { data: favoriteStatus } = useQuery({
        queryKey: ['favorite', documentId],
        queryFn: () => documentAPI.checkFavorite(documentId),
        enabled: !!documentId && !!user,
    });

    // 5. DATA MUTATIONS (React Query)
    // -----------------------------------------------------------------
    const toggleFavoriteMutation = useMutation({
        mutationFn: (isFav) => isFav ? documentAPI.removeFromFavorites(documentId) : documentAPI.addToFavorites(documentId),
        onSuccess: () => {
            setIsFavorite(!isFavorite);
            queryClient.invalidateQueries({ queryKey: ['favorite', documentId] });
            toast.success(isFavorite ? 'Đã xóa khỏi yêu thích' : 'Đã thêm vào yêu thích');
        }
    });

    const downloadMutation = useMutation({
        mutationFn: () => documentAPI.downloadDocument(documentId),
        onSuccess: () => toast.success('Tài liệu đã được tải xuống.'),
        onError: () => toast.error('Không thể tải xuống tài liệu.')
    });

    const compareVersionsMutation = useMutation({
        mutationFn: ({ versionId1, versionId2 }) => documentAPI.compareVersions(versionId1, versionId2),
        onSuccess: (data) => { setComparisonData(data); setShowVersionComparisonModal(true); },
        onError: () => toast.error('Không thể so sánh phiên bản.')
    });

    // 6. DERIVED STATE & SIDE EFFECTS
    // -----------------------------------------------------------------
    const versions = useMemo(() => versionsData?.data?.versions || [], [versionsData]);
    const workflowHistory = useMemo(() => workflowData?.data?.workflow || [], [workflowData]);
    const isLoading = documentLoading || versionsLoading || workflowLoading;

    useEffect(() => {
        if (favoriteStatus?.data) {
            setIsFavorite(favoriteStatus.data.isFavorite);
        }
    }, [favoriteStatus]);

    // 7. EVENT HANDLERS & HELPER FUNCTIONS
    // -----------------------------------------------------------------
    const refetchAllData = () => {
        refetchDocument();
        refetchVersions();
        refetchWorkflow();
    };

    const handleVersionComparison = (versionId1, versionId2) => {
        compareVersionsMutation.mutate({ versionId1, versionId2 });
    };
    
    const handlePrint = () => window.print();

    const canEdit = () => hasPermission('edit_documents') || (document?.data.author_id === user.id && document?.data.status === 'draft');
    const canApprove = () => document?.data.status === 'review' && (hasPermission('approve_documents') || user.role === 'manager');
    const canCreateVersion = () => hasPermission('create_versions') || (document?.data.author_id === user.id && document?.data.status === 'published');
    const canChangeStatus = () => hasPermission('manage_documents') || user.role === 'admin';
    
    const getStatusInfo = (status) => {
        const statusMap = {
            'draft': { name: 'Bản nháp', color: 'bg-yellow-100 text-yellow-800', icon: FiEdit },
            'review': { name: 'Đang xem xét', color: 'bg-blue-100 text-blue-800', icon: FiClock },
            'published': { name: 'Đã phê duyệt', color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
            'archived': { name: 'Đã lưu trữ', color: 'bg-gray-100 text-gray-800', icon: FiRefreshCw }
        };
        return statusMap[status] || statusMap.draft;
    };

    const getNotifications = () => { /* ... implementation ... */ return []; };

    // 8. CONDITIONAL RENDERING (LOADING & ERROR)
    // -----------------------------------------------------------------
    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>;
    if (documentError) return <div className="min-h-screen p-8"><ErrorMessage title="Lỗi" message={documentError.message} onRetry={refetchDocument} /></div>;
    if (!document?.data) return <div className="min-h-screen p-8"><ErrorMessage title="Không tìm thấy" message="Tài liệu không tồn tại." /></div>;

    // 9. MAIN RENDER
    // -----------------------------------------------------------------
    const { data: doc } = document;
    const statusInfo = getStatusInfo(doc.status);
    const StatusIcon = statusInfo.icon;
    const notifications = getNotifications();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb, Document Header, Notifications... */}
                
                {/* === NỘI DUNG CHÍNH ĐƯỢC CẬP NHẬT === */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1">
                        <div style={{ width: '280px' }} className="sticky top-6">
                            <MetadataPanel document={doc} versions={versions} workflowHistory={workflowHistory} onRefresh={refetchAllData} />
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="border-b border-gray-200">
                                <nav className="-mb-px flex space-x-8 px-6">
                                    {[
                                        { id: 'viewer', label: 'Xem tài liệu' },
                                        { id: 'details', label: 'Chi tiết' },
                                        { id: 'versions', label: 'Phiên bản' },
                                        { id: 'workflow', label: 'Workflow' },
                                        { id: 'related', label: 'Liên quan' }
                                    ].map(tab => (
                                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            <div className="p-6">
                                {activeTab === 'viewer' && <DocumentViewer document={doc} />}
                                {activeTab === 'details' && <MetadataPanel document={doc} versions={versions} workflowHistory={workflowHistory} className="border-0 shadow-none p-0" />}
                                {activeTab === 'versions' && (
                                    <VersionHistory 
                                        document={doc} 
                                        versions={versions} 
                                        isLoading={versionsLoading} 
                                        error={versionsError} 
                                        onRefresh={refetchVersions}
                                        onCompareVersions={handleVersionComparison}
                                        isComparing={compareVersionsMutation.isLoading}
                                    />
                                )}
                                {activeTab === 'workflow' && (
                                    <WorkflowHistory 
                                        document={doc} 
                                        workflowHistory={workflowHistory} 
                                        isLoading={workflowLoading} 
                                        error={workflowError} 
                                        onRefresh={refetchWorkflow} 
                                    />
                                )}
                                {activeTab === 'related' && <RelatedDocuments documentId={doc.id} />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Modals --- */}
            {showNewVersionModal && <NewVersionModal document={doc} isOpen={showNewVersionModal} onClose={() => setShowNewVersionModal(false)} onSuccess={refetchAllData} />}
            {showApprovalModal && <ApprovalModal document={doc} isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)} onSuccess={refetchAllData} />}
            {showShareModal && <ShareDocumentModal document={doc} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />}
            {showStatusModal && <ChangeStatusModal document={doc} isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} onSuccess={refetchAllData} />}
            {showVersionComparisonModal && <VersionComparisonModal isOpen={showVersionComparisonModal} comparisonData={comparisonData} onClose={() => setShowVersionComparisonModal(false)} />}
        </div>
    );
}

export default DocumentDetailPage;
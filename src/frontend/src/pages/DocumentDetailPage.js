// src/pages/DocumentDetailPage.js
/**
 * =================================================================
 * EDMS 1CAR - Document Detail Page (Optimized & Refactored)
 * This version uses a single-column layout, removing the inner-sidebar
 * and simplifying the content display as requested.
 * =================================================================
 */

// 1. IMPORTS
// -----------------------------------------------------------------
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    FiEdit, FiDownload, FiShare, FiPrinter, FiStar, FiCheckCircle,
    FiGitBranch, FiAlertCircle, FiClock, FiHome, FiChevronRight, FiRefreshCw,
    FiEye, FiList, FiPaperclip
} from 'react-icons/fi';

// Component Imports (đã được sửa)
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
import Breadcrumb from '../components/common/Breadcrumb';

import { documentAPI } from '../api/documentApi';
import { useAuth } from '../contexts/AuthContext';

// 2. COMPONENT DEFINITION
// -----------------------------------------------------------------
function DocumentDetailPage() {

    // 3. HOOKS & STATE MANAGEMENT
    // -----------------------------------------------------------------
    const { documentId } = useParams();
    const navigate = useNavigate(); // SỬA: Khởi tạo hook useNavigate
    const { user, hasPermission } = useAuth();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('viewer');
    const [isFavorite, setIsFavorite] = useState(false);
    const [showNewVersionModal, setShowNewVersionModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showVersionComparisonModal, setShowVersionComparisonModal] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);

    // 4. CENTRALIZED DATA FETCHING
    // -----------------------------------------------------------------
    const { data: documentData, isLoading: documentLoading, error: documentError, refetch: refetchDocument } = useQuery({
        queryKey: ['document', documentId],
        queryFn: () => documentAPI.getDocument(documentId),
        enabled: !!documentId,
    });

    const { data: versionsData, isLoading: versionsLoading, error: versionsError, refetch: refetchVersions } = useQuery({
        queryKey: ['documentVersions', documentId],
        queryFn: () => documentAPI.getDocumentVersions(documentId),
        enabled: !!documentId,
    });

    const { data: workflowData, isLoading: workflowLoading, error: workflowError, refetch: refetchWorkflow } = useQuery({
        queryKey: ['workflowHistory', documentId],
        queryFn: () => documentAPI.getDocumentWorkflow(documentId),
        enabled: !!documentId,
    });
    
    // ... (other queries remain the same)

    // 5. DATA MUTATIONS
    // -----------------------------------------------------------------
    // ... (mutations remain the same)
    const compareVersionsMutation = useMutation({
        mutationFn: ({ versionId1, versionId2 }) => documentAPI.compareVersions(versionId1.id, versionId2.id),
        onSuccess: (data) => { setComparisonData(data); setShowVersionComparisonModal(true); },
        onError: () => toast.error('Không thể so sánh phiên bản.')
    });


    // 6. DERIVED STATE & SIDE EFFECTS
    // -----------------------------------------------------------------
    const versions = useMemo(() => versionsData?.data?.versions || [], [versionsData]);
    const workflowHistory = useMemo(() => workflowData?.data?.workflowHistory?.history || [], [workflowData]); // Adjusted path
    const isLoading = documentLoading; // Base loading on the main document

    // 7. EVENT HANDLERS
    // -----------------------------------------------------------------
    const refetchAllData = () => {
        refetchDocument();
        refetchVersions();
        refetchWorkflow();
    };

    const handleVersionComparison = (version1, version2) => {
        // SỬA: Sử dụng đúng tham số đã truyền vào là `version1` và `version2`
        compareVersionsMutation.mutate({ versionId1: version1, versionId2: version2 });
    };

    // ... (other handlers remain the same)
    const canEdit = () => hasPermission('edit_documents') || (documentData?.data.author_id === user.id && documentData?.data.status === 'draft');
    const canApprove = () => documentData?.data.status === 'review' && (hasPermission('approve_documents') || user.role === 'manager');
    const canCreateVersion = () => hasPermission('create_versions') || (documentData?.data.author_id === user.id && documentData?.data.status === 'published');
    const canChangeStatus = () => hasPermission('manage_documents') || user.role === 'admin';


    // 8. CONDITIONAL RENDERING (LOADING & ERROR)
    // -----------------------------------------------------------------
    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>;
    if (documentError) return <div className="min-h-screen p-8"><ErrorMessage title="Lỗi" message={documentError.message} onRetry={refetchDocument} /></div>;
    if (!documentData?.data) return <div className="min-h-screen p-8"><ErrorMessage title="Không tìm thấy" message="Tài liệu không tồn tại." /></div>;

    // 9. MAIN RENDER
    // -----------------------------------------------------------------
    const doc = documentData.data;

    const breadcrumbItems = [
        { label: 'Trang chủ', href: '/' },
        { label: 'Tài liệu', href: '/documents' },
        { label: doc.title, href: `/documents/${doc.id}`, current: true }
    ];

    const mainTabs = [
        { id: 'viewer', label: 'Xem tài liệu', icon: FiEye },
        { id: 'details', label: 'Chi tiết', icon: FiList },
        { id: 'versions', label: 'Phiên bản', icon: FiGitBranch },
        { id: 'workflow', label: 'Workflow', icon: FiRefreshCw },
        { id: 'related', label: 'Liên quan', icon: FiPaperclip }
    ];

    return (
        <div className="min-h-screen bg-gray-f5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-4">
                  <Breadcrumb items={breadcrumbItems} />
                </div>
                {/* Header Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
                    {/* Header content and action buttons */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
                            <p className="text-sm text-gray-500 mt-1">Mã: {doc.document_code}</p>
                        </div>
                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                           {/* Action buttons here */}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-6 px-6 overflow-x-auto">
                            {mainTabs.map(tab => {
                                const TabIcon = tab.icon;
                                return (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                        <TabIcon className="mr-2 h-4 w-4" />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                    <div className="p-6">
                        {activeTab === 'viewer' && <DocumentViewer document={doc} onError={(e) => toast.error(e.message)} />}
                        {activeTab === 'details' && 
                            <MetadataPanel 
                                document={doc}
                                onRefresh={refetchDocument} 
                                className="border-0 shadow-none p-0" 
                            />
                        }
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
                        {/* SỬA: `Maps` đã được định nghĩa và có thể sử dụng ở đây */}
                        {activeTab === 'related' && <RelatedDocuments documentId={doc.id} onDocumentSelect={(d) => navigate(`/documents/${d.id}`)} />}
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
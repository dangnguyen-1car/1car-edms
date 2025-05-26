/**
 * =================================================================
 * EDMS 1CAR - Metadata Panel Component
 * Display comprehensive document metadata based on C-TD-VM-001
 * Support for version history, workflow tracking, and compliance data
 * =================================================================
 */

import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  FiFileText, 
  FiUser, 
  FiCalendar, 
  FiTag, 
  FiClock,
  FiEye,
  FiEdit,
  FiDownload,
  FiArchive,
  FiRefreshCw,
  FiChevronDown,
  FiChevronRight,
  FiInfo,
  FiUsers,
  FiMapPin
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { formatDate, formatFileSize } from '../../utils/formatters';
import VersionHistory from './VersionHistory';
import WorkflowHistory from './WorkflowHistory';

function MetadataPanel({ document, onRefresh, className = '' }) {
  const { user, hasPermission, canAccessDepartment } = useAuth();
  const [activeTab, setActiveTab] = useState('metadata');
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    technical: true,
    workflow: true,
    access: true,
    compliance: true
  });

  // Get document versions
  const { data: versionsData } = useQuery(
    ['documentVersions', document.id],
    () => documentService.getDocumentVersions(document.id),
    {
      enabled: !!document.id,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Get workflow history
  const { data: workflowData } = useQuery(
    ['workflowHistory', document.id],
    () => documentService.getWorkflowHistory(document.id),
    {
      enabled: !!document.id,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get document type display name based on C-TD-MG-005
  const getDocumentTypeDisplay = (type) => {
    const types = {
      'PL': 'Chính sách (Policy)',
      'PR': 'Quy trình (Procedure)', 
      'WI': 'Hướng dẫn (Work Instruction)',
      'FM': 'Biểu mẫu (Form)',
      'TD': 'Tài liệu kỹ thuật (Technical Document)',
      'TR': 'Tài liệu đào tạo (Training Document)',
      'RC': 'Hồ sơ (Record)'
    };
    return types[type] || type;
  };

  // Get status display and color
  const getStatusInfo = (status) => {
    const statusMap = {
      'draft': { name: 'Bản nháp', color: 'bg-yellow-100 text-yellow-800', icon: FiEdit },
      'review': { name: 'Đang xem xét', color: 'bg-blue-100 text-blue-800', icon: FiEye },
      'published': { name: 'Đã phê duyệt', color: 'bg-green-100 text-green-800', icon: FiRefreshCw },
      'archived': { name: 'Đã lưu trữ', color: 'bg-gray-100 text-gray-800', icon: FiArchive }
    };
    return statusMap[status] || { name: status, color: 'bg-gray-100 text-gray-800', icon: FiInfo };
  };

  // Parse recipients if it's a JSON string
  const getRecipients = () => {
    if (!document.recipients) return [];
    try {
      return typeof document.recipients === 'string' 
        ? JSON.parse(document.recipients) 
        : document.recipients;
    } catch {
      return [];
    }
  };

  // Calculate document age
  const getDocumentAge = () => {
    const created = new Date(document.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} ngày`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng`;
    return `${Math.floor(diffDays / 365)} năm`;
  };

  // Calculate next review date
  const getNextReviewDate = () => {
    if (!document.review_cycle || !document.published_at) return null;
    const publishedDate = new Date(document.published_at);
    const nextReview = new Date(publishedDate);
    nextReview.setDate(nextReview.getDate() + document.review_cycle);
    return nextReview;
  };

  // Calculate disposal date
  const getDisposalDate = () => {
    if (!document.retention_period || !document.published_at) return null;
    const publishedDate = new Date(document.published_at);
    const disposalDate = new Date(publishedDate);
    disposalDate.setDate(disposalDate.getDate() + document.retention_period);
    return disposalDate;
  };

  const statusInfo = getStatusInfo(document.status);
  const StatusIcon = statusInfo.icon;
  const recipients = getRecipients();
  const nextReviewDate = getNextReviewDate();
  const disposalDate = getDisposalDate();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FiFileText className="h-5 w-5 mr-2 text-primary-600" />
            Thông tin tài liệu
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.name}
            </span>
            <span className="text-sm text-gray-500 font-mono">
              v{document.version}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'metadata', name: 'Metadata', icon: FiInfo },
            { id: 'versions', name: 'Phiên bản', icon: FiClock },
            { id: 'workflow', name: 'Workflow', icon: FiRefreshCw }
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TabIcon className="h-4 w-4 mr-2" />
                {tab.name}
                {tab.id === 'versions' && versionsData?.data?.versionHistory?.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-primary-500 rounded-full">
                    {versionsData.data.versionHistory.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'metadata' && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <button
                onClick={() => toggleSection('basic')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <FiFileText className="h-4 w-4 mr-2" />
                  Thông tin cơ bản
                </h4>
                {expandedSections.basic ? (
                  <FiChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <FiChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {expandedSections.basic && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                    <p className="mt-1 text-sm text-gray-900">{document.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mã tài liệu</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{document.document_code}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loại tài liệu</label>
                    <p className="mt-1 text-sm text-gray-900">{getDocumentTypeDisplay(document.type)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nơi ban hành</label>
                    <p className="mt-1 text-sm text-gray-900">{document.department}</p>
                  </div>
                  
                  {document.description && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                      <p className="mt-1 text-sm text-gray-900">{document.description}</p>
                    </div>
                  )}
                  
                  {document.scope_of_application && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Phạm vi áp dụng của phiên bản</label>
                      <p className="mt-1 text-sm text-gray-900">{document.scope_of_application}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Technical Information */}
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={() => toggleSection('technical')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <FiTag className="h-4 w-4 mr-2" />
                  Thông tin kỹ thuật
                </h4>
                {expandedSections.technical ? (
                  <FiChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <FiChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {expandedSections.technical && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phiên bản hiện tại</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{document.version}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tuổi tài liệu</label>
                    <p className="mt-1 text-sm text-gray-900">{getDocumentAge()}</p>
                  </div>
                  
                  {document.file_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tệp đính kèm</label>
                      <div className="mt-1 flex items-center">
                        <FiFileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{document.file_name}</span>
                        {document.file_size && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({formatFileSize(document.file_size)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {document.mime_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Loại tệp</label>
                      <p className="mt-1 text-sm text-gray-900">{document.mime_type}</p>
                    </div>
                  )}
                  
                  {document.change_reason && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Lý do thay đổi</label>
                      <p className="mt-1 text-sm text-gray-900">{document.change_reason}</p>
                    </div>
                  )}
                  
                  {document.change_summary && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Tóm tắt thay đổi</label>
                      <p className="mt-1 text-sm text-gray-900">{document.change_summary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Workflow Information */}
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={() => toggleSection('workflow')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <FiRefreshCw className="h-4 w-4 mr-2" />
                  Thông tin quy trình
                </h4>
                {expandedSections.workflow ? (
                  <FiChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <FiChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {expandedSections.workflow && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tác giả</label>
                    <div className="mt-1 flex items-center">
                      <FiUser className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{document.author_name || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {document.reviewer_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Người xem xét</label>
                      <div className="mt-1 flex items-center">
                        <FiEye className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{document.reviewer_name}</span>
                      </div>
                    </div>
                  )}
                  
                  {document.approver_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Người phê duyệt</label>
                      <div className="mt-1 flex items-center">
                        <FiRefreshCw className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{document.approver_name}</span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngày tạo</label>
                    <div className="mt-1 flex items-center">
                      <FiCalendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{formatDate(document.created_at)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngày cập nhật</label>
                    <div className="mt-1 flex items-center">
                      <FiClock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{formatDate(document.updated_at)}</span>
                    </div>
                  </div>
                  
                  {document.published_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ngày phê duyệt</label>
                      <div className="mt-1 flex items-center">
                        <FiRefreshCw className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{formatDate(document.published_at)}</span>
                      </div>
                    </div>
                  )}
                  
                  {document.archived_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ngày lưu trữ</label>
                      <div className="mt-1 flex items-center">
                        <FiArchive className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{formatDate(document.archived_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Access Control */}
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={() => toggleSection('access')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <FiUsers className="h-4 w-4 mr-2" />
                  Kiểm soát truy cập
                </h4>
                {expandedSections.access ? (
                  <FiChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <FiChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {expandedSections.access && (
                <div className="mt-4 space-y-4">
                  {recipients.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Người nhận tài liệu
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {recipients.map((recipient, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <FiMapPin className="h-3 w-3 mr-1" />
                            {recipient}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quyền truy cập</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {canAccessDepartment(document.department) ? 'Có quyền truy cập' : 'Hạn chế truy cập'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mức độ bảo mật</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {document.type === 'RC' ? 'Cao' : 'Thông thường'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compliance Information */}
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={() => toggleSection('compliance')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <FiArchive className="h-4 w-4 mr-2" />
                  Thông tin tuân thủ
                </h4>
                {expandedSections.compliance ? (
                  <FiChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <FiChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {expandedSections.compliance && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chu kỳ xem xét</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {document.review_cycle ? `${document.review_cycle} ngày` : 'Không xác định'}
                    </p>
                  </div>
                  
                  {nextReviewDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ngày xem xét tiếp theo</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(nextReviewDate)}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Thời gian lưu trữ</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {document.retention_period ? `${document.retention_period} ngày` : 'Không xác định'}
                    </p>
                  </div>
                  
                  {disposalDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ngày hủy bỏ dự kiến</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(disposalDate)}</p>
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Tuân thủ tiêu chuẩn</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        C-PR-VM-001
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        C-TD-VM-001
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        C-WI-AR-001
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <VersionHistory
            document={document}
            versions={versionsData?.data?.versionHistory || []}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === 'workflow' && (
          <WorkflowHistory
            document={document}
            workflowHistory={workflowData?.data?.workflowHistory || []}
            onRefresh={onRefresh}
          />
        )}
      </div>
    </div>
  );
}

export default MetadataPanel;

// src/components/documents/MetadataPanel.js
import React, { useState, useEffect } from 'react';
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
  FiMapPin,
  FiAlertCircle
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { documentAPI } from '../../api/documentApi';
import { formatDate, formatFileSize } from '../../utils/formatters';
import VersionHistory from './VersionHistory';
import WorkflowHistory from './WorkflowHistory';
import SkeletonLoader from '../common/SkeletonLoader';

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
  
  // State for API data
  const [metadata, setMetadata] = useState(null);
  const [versions, setVersions] = useState([]);
  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch document metadata
  const fetchMetadata = async () => {
    if (!document?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [metadataResponse, versionsResponse, workflowResponse] = await Promise.all([
        documentAPI.getDocumentMetadata(document.id),
        documentAPI.getDocumentVersions(document.id),
        documentAPI.getDocumentWorkflow(document.id)
      ]);
      
      setMetadata(metadataResponse.data);
      setVersions(versionsResponse.data?.versions || []);
      setWorkflowHistory(workflowResponse.data?.workflow || []);
    } catch (err) {
      setError(err.message || 'Không thể tải metadata');
      console.error('Error fetching metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load metadata when document changes
  useEffect(() => {
    fetchMetadata();
  }, [document?.id]);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get document type display name
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
      return typeof document.recipients === 'string' ? JSON.parse(document.recipients) : document.recipients;
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

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <SkeletonLoader type="metadata" count={1} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6 text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Không thể tải metadata
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchMetadata}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <FiRefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(document.status);
  const StatusIcon = statusInfo.icon;
  const recipients = getRecipients();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Chi tiết tài liệu
          </h3>
          <button
            onClick={fetchMetadata}
            className="p-2 text-gray-400 hover:text-gray-600 rounded"
            title="Làm mới"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          {[
            { id: 'metadata', label: 'Metadata', icon: FiInfo },
            { id: 'versions', label: 'Phiên bản', icon: FiClock },
            { id: 'workflow', label: 'Workflow', icon: FiRefreshCw }
          ].map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TabIcon className="mr-2 h-4 w-4" />
                {tab.label}
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
                <h4 className="text-base font-medium text-gray-900">Thông tin cơ bản</h4>
                {expandedSections.basic ? (
                  <FiChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <FiChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.basic && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center">
                    <StatusIcon className="mr-2 h-4 w-4" />
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.name}
                    </span>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tiêu đề</dt>
                    <dd className="mt-1 text-sm text-gray-900">{document.title}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Mã tài liệu</dt>
                    <dd className="mt-1 text-sm text-gray-900">{document.document_code}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Loại tài liệu</dt>
                    <dd className="mt-1 text-sm text-gray-900">{getDocumentTypeDisplay(document.type)}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phòng ban</dt>
                    <dd className="mt-1 text-sm text-gray-900">{document.department}</dd>
                  </div>
                  
                  {document.description && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Mô tả</dt>
                      <dd className="mt-1 text-sm text-gray-900">{document.description}</dd>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Technical Information */}
            <div>
              <button
                onClick={() => toggleSection('technical')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-base font-medium text-gray-900">Thông tin kỹ thuật</h4>
                {expandedSections.technical ? (
                  <FiChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <FiChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.technical && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phiên bản</dt>
                    <dd className="mt-1 text-sm text-gray-900">{document.version || '1.0'}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tuổi tài liệu</dt>
                    <dd className="mt-1 text-sm text-gray-900">{getDocumentAge()}</dd>
                  </div>
                  
                  {document.mime_type && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Định dạng</dt>
                      <dd className="mt-1 text-sm text-gray-900">{document.mime_type}</dd>
                    </div>
                  )}
                  
                  {document.file_size && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Kích thước</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatFileSize(document.file_size)}</dd>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Access Information */}
            <div>
              <button
                onClick={() => toggleSection('access')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-base font-medium text-gray-900">Quyền truy cập</h4>
                {expandedSections.access ? (
                  <FiChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <FiChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {expandedSections.access && (
                <div className="mt-4 space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Quyền truy cập</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {canAccessDepartment(document.department) ? 'Có quyền truy cập' : 'Hạn chế truy cập'}
                    </dd>
                  </div>
                  
                  {recipients.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Người nhận</dt>
                      <dd className="mt-1">
                        <div className="flex flex-wrap gap-1">
                          {recipients.map((recipient, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {recipient}
                            </span>
                          ))}
                        </div>
                      </dd>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <VersionHistory
            document={document}
            versions={versions}
            onRefresh={fetchMetadata}
          />
        )}

        {activeTab === 'workflow' && (
          <WorkflowHistory
            document={document}
            workflowHistory={workflowHistory}
            onRefresh={fetchMetadata}
          />
        )}
      </div>
    </div>
  );
}

export default MetadataPanel;

// src/components/documents/MetadataPanel.js
/**
 * =================================================================
 * EDMS 1CAR - Metadata Panel Component (Optimized & Simplified)
 * This version is refactored to only display metadata details,
 * removing internal tabs to prevent UI duplication as requested.
 * =================================================================
 */
import React, { useState, useMemo } from 'react';
import {
    FiUser, FiCalendar, FiClock, FiEye, FiEdit,
    FiArchive, FiRefreshCw, FiChevronDown, FiChevronRight, FiInfo
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { numeric, dateTime } from '../../utils/formatters'; 
import SkeletonLoader from '../common/SkeletonLoader';

// --- Constants & Helper Functions ---

const getDocumentTypeDisplay = (type) => {
    const types = { 'PL': 'Chính sách (Policy)', 'PR': 'Quy trình (Procedure)', 'WI': 'Hướng dẫn (Work Instruction)', 'FM': 'Biểu mẫu (Form)', 'TD': 'Tài liệu kỹ thuật (Technical Document)', 'TR': 'Tài liệu đào tạo (Training Document)', 'RC': 'Hồ sơ (Record)' };
    return types[type] || type;
};

const getStatusInfo = (status) => {
    const statusMap = {
        'draft': { name: 'Bản nháp', color: 'bg-yellow-100 text-yellow-800', icon: FiEdit },
        'review': { name: 'Đang xem xét', color: 'bg-blue-100 text-blue-800', icon: FiEye },
        'published': { name: 'Đã phê duyệt', color: 'bg-green-100 text-green-800', icon: FiRefreshCw },
        'archived': { name: 'Đã lưu trữ', color: 'bg-gray-100 text-gray-800', icon: FiArchive }
    };
    return statusMap[status] || { name: status, color: 'bg-gray-100 text-gray-800', icon: FiInfo };
};

// --- Sub-components ---

const PanelHeader = ({ onRefresh }) => (
    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Chi tiết tài liệu</h3>
        {onRefresh && (
            <button onClick={onRefresh} className="p-2 text-gray-400 hover:text-gray-600 rounded" title="Làm mới">
                <FiRefreshCw className="h-4 w-4" />
            </button>
        )}
    </div>
);

const AccordionSection = ({ title, isExpanded, onToggle, children }) => (
    <div>
        <button onClick={onToggle} className="flex items-center justify-between w-full text-left py-2">
            <h4 className="text-base font-medium text-gray-900">{title}</h4>
            {isExpanded ? <FiChevronDown className="h-5 w-5 text-gray-400" /> : <FiChevronRight className="h-5 w-5 text-gray-400" />}
        </button>
        {isExpanded && <div className="mt-4 pl-2 border-l-2 border-gray-200">{children}</div>}
    </div>
);

const MetadataField = ({ label, children }) => (
    <div className="mb-3">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{children}</dd>
    </div>
);

const MetadataDisplay = ({ document, expandedSections, toggleSection, canAccessDepartment }) => {
    const statusInfo = getStatusInfo(document.status);
    const StatusIcon = statusInfo.icon;

    const recipients = useMemo(() => {
        if (!document.recipients) return [];
        try { return typeof document.recipients === 'string' ? JSON.parse(document.recipients) : document.recipients; }
        catch { return []; }
    }, [document.recipients]);

    const documentAge = useMemo(() => {
        const created = new Date(document.created_at);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now - created) / (1000 * 60 * 60 * 24));
        if (diffDays < 30) return `${diffDays} ngày`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng`;
        return `${Math.floor(diffDays / 365)} năm`;
    }, [document.created_at]);

    return (
        <div className="space-y-6">
            <AccordionSection title="Thông tin cơ bản" isExpanded={expandedSections.basic} onToggle={() => toggleSection('basic')}>
                <div className="space-y-3">
                    <div className="flex items-center"><StatusIcon className="mr-2 h-4 w-4" /><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.name}</span></div>
                    <MetadataField label="Tiêu đề">{document.title}</MetadataField>
                    <MetadataField label="Mã tài liệu">{document.document_code}</MetadataField>
                    <MetadataField label="Loại tài liệu">{getDocumentTypeDisplay(document.type)}</MetadataField>
                    <MetadataField label="Phòng ban">{document.department}</MetadataField>
                    {document.description && <MetadataField label="Mô tả">{document.description}</MetadataField>}
                </div>
            </AccordionSection>

            <AccordionSection title="Thông tin kỹ thuật" isExpanded={expandedSections.technical} onToggle={() => toggleSection('technical')}>
                <div className="grid grid-cols-2 gap-4">
                    <MetadataField label="Phiên bản">{document.version || '1.0'}</MetadataField>
                    <MetadataField label="Tuổi tài liệu">{documentAge}</MetadataField>
                    {document.mime_type && <MetadataField label="Định dạng">{document.mime_type}</MetadataField>}
                    {document.file_size && <MetadataField label="Kích thước">{numeric.formatFileSize(document.file_size)}</MetadataField>}
                </div>
            </AccordionSection>

            <AccordionSection title="Quyền truy cập" isExpanded={expandedSections.access} onToggle={() => toggleSection('access')}>
                <div className="space-y-3">
                    <MetadataField label="Quyền truy cập">{canAccessDepartment(document.department) ? 'Có quyền truy cập' : 'Hạn chế truy cập'}</MetadataField>
                    {recipients.length > 0 && (
                        <MetadataField label="Người nhận">
                            <div className="flex flex-wrap gap-1">{recipients.map((r, i) => <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{r}</span>)}</div>
                        </MetadataField>
                    )}
                </div>
            </AccordionSection>

            <AccordionSection title="Tuân thủ" isExpanded={expandedSections.compliance} onToggle={() => toggleSection('compliance')}>
                <div className="space-y-3">
                    {document.next_review_date && <MetadataField label="Ngày rà soát tiếp theo">{dateTime.formatDate(document.next_review_date)}</MetadataField>}
                    {document.retention_period && <MetadataField label="Thời gian lưu trữ">{document.retention_period} năm</MetadataField>}
                    {document.security_level && <MetadataField label="Mức bảo mật">{document.security_level}</MetadataField>}
                </div>
            </AccordionSection>
        </div>
    );
};

// --- Main Component ---
function MetadataPanel({ document, onRefresh, className = '' }) {
    const { canAccessDepartment } = useAuth();
    const [expandedSections, setExpandedSections] = useState({ basic: true, technical: true, access: false, compliance: false });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    if (!document) {
        return <SkeletonLoader type="detail" />;            
    }

    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
             <PanelHeader onRefresh={onRefresh} />
            <div className="p-6">
                <MetadataDisplay
                    document={document}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    canAccessDepartment={canAccessDepartment}
                />
            </div>
        </div>
    );
}

export default MetadataPanel;
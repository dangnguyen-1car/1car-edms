// src/components/documents/VersionHistory.js
/**
 * =================================================================
 * EDMS 1CAR - Version History Component (Complete)
 * Enhanced version comparison functionality
 * Optimized to receive data via props instead of fetching
 * =================================================================
 */

import React, { useState } from 'react';
import {
    FiClock, FiUser, FiFileText, FiEye, FiDownload, FiGitBranch,
    FiEdit, FiCheckCircle, FiXCircle, FiAlertCircle, FiLoader
} from 'react-icons/fi';
import { dateTime, numeric } from '../../utils/formatters';
import { documentAPI } from '../../api/documentApi';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

// --- Helper Functions ---

const getVersionStatusInfo = (version, currentDocumentVersion) => {
    const statusMap = {
        'current': { icon: FiCheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Hiện tại' },
        'superseded': { icon: FiClock, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Đã thay thế' },
        'archived': { icon: FiXCircle, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Đã lưu trữ' },
        'draft': { icon: FiEdit, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Bản nháp' }
    };

    let status = 'superseded';
    if (version.version === currentDocumentVersion) {
        status = 'current';
    } else if (version.status) {
        status = version.status;
    }
    return statusMap[status] || statusMap.superseded;
};

// --- Sub-components ---

const HistoryLoading = () => (
    <div className="flex items-center justify-center h-64">
        <LoadingSpinner message="Đang tải lịch sử phiên bản..." />
    </div>
);

const HistoryError = ({ error, onRetry }) => (
    <div className="text-center py-8">
        <ErrorMessage title="Không thể tải lịch sử phiên bản" message={error.message} onRetry={onRetry} />
    </div>
);

const HistoryEmpty = () => (
    <div className="text-center py-8">
        <FiClock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có lịch sử phiên bản</h3>
        <p className="text-gray-500">Lịch sử phiên bản sẽ được hiển thị khi có cập nhật tài liệu.</p>
    </div>
);

const ComparisonControls = ({ count, onCompare, onClear, isComparing }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <FiGitBranch className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">Đã chọn {count} phiên bản</span>
            </div>
            <div className="flex items-center space-x-2">
                {count === 2 && (
                    <button onClick={onCompare} disabled={isComparing} className="btn btn-primary btn-sm flex items-center">
                        {isComparing ? (
                            <><FiLoader className="animate-spin h-4 w-4 mr-2" />Đang so sánh...</>
                        ) : (
                            <><FiGitBranch className="h-4 w-4 mr-1" />So sánh phiên bản</>
                        )}
                    </button>
                )}
                <button onClick={onClear} className="btn btn-outline btn-sm">Hủy chọn</button>
            </div>
        </div>
        {count === 1 && <p className="text-sm text-blue-700 mt-2">Chọn thêm một phiên bản nữa để so sánh.</p>}
    </div>
);

const VersionItem = ({ version, previousVersion, document, isSelected, isLast, onSelect, onDownload, onView, selectionDisabled }) => {
    const statusInfo = getVersionStatusInfo(version, document.version);
    const StatusIcon = statusInfo.icon;

    return (
        <li>
            <div className="relative pb-8">
                {!isLast && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />}
                <div className="relative flex space-x-3">
                    <div>
                        <span className={`${statusInfo.bgColor} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white`}>
                            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className={`border rounded-lg p-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white'}`}>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <h4 className="text-base font-medium text-gray-900">Phiên bản {version.version}</h4>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>{statusInfo.label}</span>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                    <label className="flex items-center cursor-pointer">
                                        <input type="checkbox" checked={isSelected} onChange={() => onSelect(version)} disabled={selectionDisabled} className="form-checkbox h-4 w-4 text-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-200" />
                                        <span className="ml-2 text-sm text-gray-600">Chọn</span>
                                    </label>
                                    <button onClick={() => onView(version)} className="btn btn-outline btn-xs flex items-center" title="Xem phiên bản"><FiEye className="h-3 w-3" /></button>
                                    {version.file_path && <button onClick={() => onDownload(version)} className="btn btn-outline btn-xs flex items-center" title="Tải xuống phiên bản"><FiDownload className="h-3 w-3" /></button>}
                                </div>
                            </div>
                            {/* Metadata */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-700">Người tạo:</span>
                                    <div className="flex items-center mt-1"><FiUser className="h-4 w-4 text-gray-400 mr-2" /><span className="text-gray-900">{version.created_by_name || 'N/A'}</span></div>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Thời gian:</span>
                                    <div className="flex items-center mt-1"><FiClock className="h-4 w-4 text-gray-400 mr-2" /><span className="text-gray-900" title={dateTime.formatDateTime(version.created_at)}>{dateTime.formatRelativeTime(version.created_at)}</span></div>
                                </div>
                                {version.file_name && (
                                    <div>
                                        <span className="font-medium text-gray-700">Tệp đính kèm:</span>
                                        {/* SỬA LỖI 1: Xóa bỏ cú pháp ** không hợp lệ */}
                                        <div className="flex items-center mt-1"><FiFileText className="h-4 w-4 text-gray-400 mr-2" /><span className="text-gray-900">{version.file_name}</span>{version.file_size && <span className="ml-2 text-xs text-gray-500">({numeric.formatFileSize(version.file_size)})</span>}</div>
                                    </div>
                                )}
                                {version.change_reason && <div className="md:col-span-2"><span className="font-medium text-gray-700">Lý do thay đổi:</span><p className="mt-1 text-gray-900 break-words">{version.change_reason}</p></div>}
                                {version.change_summary && <div className="md:col-span-2"><span className="font-medium text-gray-700">Tóm tắt thay đổi:</span><p className="mt-1 text-gray-900 break-words">{version.change_summary}</p></div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
};

const VersionStatistics = ({ versions, document }) => (
    <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Thống kê phiên bản</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="font-medium text-gray-700">Tổng phiên bản:</span><p className="text-gray-900">{versions.length}</p></div>
            <div><span className="font-medium text-gray-700">Phiên bản hiện tại:</span><p className="text-gray-900">{document.version}</p></div>
            <div><span className="font-medium text-gray-700">Phiên bản đầu tiên:</span><p className="text-gray-900">{versions[versions.length - 1]?.version || 'N/A'}</p></div>
            <div>
                <span className="font-medium text-gray-700">Cập nhật gần nhất:</span>
                {/* SỬA LỖI 2: Xóa bỏ cú pháp ** không hợp lệ */}
                <p className="text-gray-900">{dateTime.formatRelativeTime(versions[0]?.created_at || document.updated_at)}</p>
            </div>
        </div>
    </div>
);


// --- Main Component ---

function VersionHistory({ document, versions = [], isLoading = false, error = null, onRefresh, onCompareVersions, isComparing = false }) {
    // SỬA LỖI 3.1: State bây giờ sẽ lưu toàn bộ object phiên bản, không chỉ ID
    const [selectedVersions, setSelectedVersions] = useState([]);

    const handleVersionSelect = (version) => {
        // SỬA LỖI 3.2: Cập nhật logic để làm việc với mảng các object
        const isAlreadySelected = selectedVersions.some(v => v.id === version.id);

        if (isAlreadySelected) {
            setSelectedVersions(prev => prev.filter(v => v.id !== version.id));
        } else if (selectedVersions.length < 2) {
            setSelectedVersions(prev => [...prev, version]);
        }
    };

    const handleCompare = () => {
        if (selectedVersions.length !== 2) return;
        
        // SỬA LỖI 3.3: Bây giờ có thể truyền thẳng 2 object phiên bản đầy đủ
        onCompareVersions(selectedVersions[0], selectedVersions[1]);

        // SỬA LỖI 4: Không xóa trạng thái lựa chọn ở đây.
        // Để cho component cha quyết định khi nào cần xóa (ví dụ: sau khi modal so sánh đóng lại)
        // setSelectedVersions([]); 
    };
    
    const handleClearSelection = () => {
        setSelectedVersions([]);
    };

    const handleDownloadVersion = async (version) => {
        try { await documentAPI.downloadDocumentVersion(document.id, version.id); } catch (error) { console.error('Version download failed:', error); }
    };

    const handleViewVersion = async (version) => {
        try { console.log('Viewing version:', version); } catch (error) { console.error('Version view failed:', error); }
    };

    if (isLoading) return <HistoryLoading />;
    if (error) return <HistoryError error={error} onRetry={onRefresh} />;
    if (!document || !versions || versions.length === 0) return <HistoryEmpty />;

    return (
        <div className="space-y-6">
            {selectedVersions.length > 0 && (
                <ComparisonControls
                    count={selectedVersions.length}
                    onCompare={handleCompare}
                    onClear={handleClearSelection}
                    isComparing={isComparing}
                />
            )}
            
            <VersionStatistics versions={versions} document={document} />

            <div className="flow-root">
                <ul className="-mb-8">
                    {versions.map((version, index) => {
                        // SỬA LỖI 3.4: Cập nhật logic kiểm tra lựa chọn và vô hiệu hóa
                        const isSelected = selectedVersions.some(v => v.id === version.id);
                        const selectionDisabled = selectedVersions.length >= 2 && !isSelected;

                        return (
                            <VersionItem
                                key={version.id}
                                version={version}
                                previousVersion={versions[index + 1]}
                                document={document}
                                isLast={index === versions.length - 1}
                                isSelected={isSelected}
                                selectionDisabled={selectionDisabled}
                                onSelect={handleVersionSelect}
                                onDownload={handleDownloadVersion}
                                onView={handleViewVersion}
                            />
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

export default VersionHistory;
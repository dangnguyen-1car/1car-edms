// src/components/documents/VersionComparisonModal.js
/**
 * =================================================================
 * EDMS 1CAR - Version Comparison Modal Component
 * Advanced version comparison with diff viewer
 * =================================================================
 */

import React, { useState } from 'react';
import {
    FiX, FiGitBranch, FiClock, FiUser, FiFileText,
    FiInfo, FiDownload, FiEye, FiAlertCircle, FiLoader
} from 'react-icons/fi';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { dateTime, numeric } from '../../utils/formatters';
import Modal from '../common/Modal';

// --- Constants ---
const metadataFields = [
    { key: 'title', label: 'Tiêu đề' },
    { key: 'description', label: 'Mô tả' },
    { key: 'change_reason', label: 'Lý do thay đổi' },
    { key: 'change_summary', label: 'Tóm tắt thay đổi' },
    { key: 'file_name', label: 'Tên file' },
    { key: 'file_size', label: 'Kích thước file', formatter: formatFileSize },
    { key: 'created_by_name', label: 'Người tạo' },
    // SỬA LỖI 1: Xóa bỏ cú pháp không hợp lệ `**`
    { key: 'created_at', label: 'Ngày tạo', formatter: dateTime.formatDateTime }
];

// --- Helper Functions ---

const getVersionStatusInfo = (version) => {
    const statusMap = {
        'current': { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Hiện tại' },
        'superseded': { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Đã thay thế' },
        'archived': { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Đã lưu trữ' }
    };
    return statusMap[version?.status] || statusMap.superseded;
};

function formatFileSize(bytes) {
    if (!bytes || typeof bytes !== 'number') return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

// --- Sub-components ---

const VersionHeader = ({ version, type }) => {
    if (!version) return null;

    // SỬA LỖI 3: Tạo map chứa các class đầy đủ để Tailwind không purge
    const colorStyles = {
        v1: {
            container: 'bg-blue-50 border-blue-200',
            icon: 'text-blue-600',
            title: 'text-blue-900',
        },
        v2: {
            container: 'bg-green-50 border-green-200',
            icon: 'text-green-600',
            title: 'text-green-900',
        }
    };
    const styles = type === 'v1' ? colorStyles.v1 : colorStyles.v2;
    const statusInfo = getVersionStatusInfo(version);

    return (
        <div className={`rounded-lg p-4 border ${styles.container}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <FiGitBranch className={`h-5 w-5 mr-2 ${styles.icon}`} />
                    <h3 className={`text-lg font-medium ${styles.title}`}>
                        Phiên bản {version.version}
                    </h3>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                    {statusInfo.label}
                </span>
            </div>
            <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                    <FiUser className="h-4 w-4 mr-2" />
                    <span>{version.created_by_name || 'N/A'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                    <FiClock className="h-4 w-4 mr-2" />
                    {/* SỬA LỖI 2: Xóa bỏ cú pháp không hợp lệ `**` */}
                    <span>{dateTime.formatRelativeTime(version.created_at)}</span>
                </div>
                {version.file_name && (
                    <div className="flex items-center text-gray-600">
                        <FiFileText className="h-4 w-4 mr-2" />
                        <span className="truncate">{version.file_name}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const ComparisonSummary = ({ differences }) => {
    if (!differences) return null;
    const { additions = 0, deletions = 0, modifications = 0 } = differences;
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
                <FiInfo className="h-5 w-5 text-gray-600 mr-2" />
                <h4 className="font-medium text-gray-900">Tóm tắt thay đổi</h4>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{additions}</div>
                    <div className="text-gray-600">Thêm mới</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{deletions}</div>
                    <div className="text-gray-600">Xóa bỏ</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{modifications}</div>
                    <div className="text-gray-600">Thay đổi</div>
                </div>
            </div>
        </div>
    );
};

const ViewToggle = ({ activeView, setActiveView }) => (
    <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
            {[
                { id: 'metadata', label: 'So sánh Metadata', icon: FiInfo },
                { id: 'content', label: 'So sánh Nội dung', icon: FiFileText }
            ].map(tab => {
                const TabIcon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeView === tab.id
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
);

const MetadataComparisonView = ({ version1, version2 }) => (
    <div className="space-y-4">
        <h4 className="font-medium text-gray-900 mb-4">So sánh Metadata</h4>
        <div className="space-y-3">
            {metadataFields.map(field => {
                const value1 = field.formatter ? field.formatter(version1?.[field.key]) : version1?.[field.key] || 'N/A';
                const value2 = field.formatter ? field.formatter(version2?.[field.key]) : version2?.[field.key] || 'N/A';
                const hasChanged = value1 !== value2;

                return (
                    <div
                        key={field.key}
                        className={`grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 p-3 rounded-lg ${hasChanged ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                            }`}
                    >
                        <div className="font-medium text-gray-700 col-span-1 flex items-center">
                            {field.label}
                            {hasChanged && <FiAlertCircle className="inline h-4 w-4 ml-2 text-yellow-600" />}
                        </div>
                        <div className={`text-sm md:col-span-1 ${hasChanged ? 'bg-red-100 p-2 rounded text-red-800' : 'text-gray-800'}`}>{value1}</div>
                        <div className={`text-sm md:col-span-1 ${hasChanged ? 'bg-green-100 p-2 rounded text-green-800' : 'text-gray-800'}`}>{value2}</div>
                    </div>
                );
            })}
        </div>
    </div>
);

const ContentComparisonView = ({ contentComparison, version1, version2 }) => (
    <div className="space-y-4">
        <h4 className="font-medium text-gray-900 mb-4">So sánh Nội dung</h4>
        {contentComparison ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <ReactDiffViewer
                    oldValue={contentComparison.oldContent || ''}
                    newValue={contentComparison.newContent || ''}
                    splitView={true}
                    leftTitle={`Phiên bản ${version1?.version}`}
                    rightTitle={`Phiên bản ${version2?.version}`}
                    showDiffOnly={false}
                    hideLineNumbers={false}
                />
            </div>
        ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FiFileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Không thể so sánh nội dung</h3>
                <p className="text-gray-500">So sánh nội dung chỉ khả dụng cho các file văn bản (text-based files).</p>
            </div>
        )}
    </div>
);

const ActionButtons = ({ version1, version2, onClose }) => (
    <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200">
        <div className="flex space-x-2">
            <button
                onClick={() => { /* Handle download version 1 */ }}
                className="btn btn-outline btn-sm flex items-center"
                title={`Tải xuống phiên bản ${version1?.version}`}
                disabled={!version1}
            >
                <FiDownload className="h-4 w-4 mr-1" />
                Tải v{version1?.version}
            </button>
            <button
                onClick={() => { /* Handle download version 2 */ }}
                className="btn btn-outline btn-sm flex items-center"
                title={`Tải xuống phiên bản ${version2?.version}`}
                disabled={!version2}
            >
                <FiDownload className="h-4 w-4 mr-1" />
                Tải v{version2?.version}
            </button>
        </div>
        <button onClick={onClose} className="btn btn-primary">
            Đóng
        </button>
    </div>
);

// --- Main Component ---

function VersionComparisonModal({ isOpen, comparisonData, onClose }) {
    const [activeView, setActiveView] = useState('metadata'); // 'metadata' | 'content'

    const renderContent = () => {
        // SỬA LỖI 4: Kiểm tra dữ liệu an toàn hơn
        if (!comparisonData || !comparisonData.data) {
            return (
                <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                    <FiLoader className="h-12 w-12 animate-spin mb-4" />
                    <p>Đang tải dữ liệu so sánh...</p>
                </div>
            );
        }

        const { version1, version2, differences, contentComparison } = comparisonData.data;

        if (!version1 || !version2) {
             return (
                <div className="flex flex-col items-center justify-center h-96 text-red-500">
                    <FiAlertCircle className="h-12 w-12 mb-4" />
                    <p>Lỗi: Dữ liệu so sánh không đầy đủ.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <VersionHeader version={version1} type="v1" />
                    <VersionHeader version={version2} type="v2" />
                </div>

                <ComparisonSummary differences={differences} />
                <ViewToggle activeView={activeView} setActiveView={setActiveView} />

                <div className="min-h-[24rem]">
                    {activeView === 'metadata' ? (
                        <MetadataComparisonView version1={version1} version2={version2} />
                    ) : (
                        <ContentComparisonView
                            contentComparison={contentComparison}
                            version1={version1}
                            version2={version2}
                        />
                    )}
                </div>

                <ActionButtons version1={version1} version2={version2} onClose={onClose} />
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="So sánh Phiên bản" size="4xl">
            {renderContent()}
        </Modal>
    );
}

export default VersionComparisonModal;
/**
 * =================================================================
 * EDMS 1CAR - Version History Component
 * Display document version history based on C-TD-VM-001
 * Support for version tracking and comparison
 * =================================================================
 */

import React, { useState } from 'react';
import { 
  FiClock, 
  FiUser, 
  FiFileText, 
  FiEye,
  FiDownload,
  FiGitBranch,
  FiEdit,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle
} from 'react-icons/fi';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';

function VersionHistory({ document, versions = [], onRefresh }) {
  const { user, hasPermission } = useAuth();
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [isComparing, setIsComparing] = useState(false);

  // Get version status icon and color
  const getVersionStatusInfo = (version) => {
    const statusMap = {
      'current': { 
        icon: FiCheckCircle, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100',
        label: 'Hiện tại' 
      },
      'superseded': { 
        icon: FiClock, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-100',
        label: 'Đã thay thế' 
      },
      'archived': { 
        icon: FiXCircle, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100',
        label: 'Đã lưu trữ' 
      },
      'draft': { 
        icon: FiEdit, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100',
        label: 'Bản nháp' 
      }
    };

    // Determine status based on version data
    let status = 'superseded';
    if (version.version === document.version) {
      status = 'current';
    } else if (version.status === 'archived') {
      status = 'archived';
    } else if (version.status === 'draft') {
      status = 'draft';
    }

    return statusMap[status] || statusMap.superseded;
  };

  // Handle version selection for comparison
  const handleVersionSelect = (version) => {
    if (selectedVersions.includes(version.id)) {
      setSelectedVersions(prev => prev.filter(id => id !== version.id));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions(prev => [...prev, version.id]);
    }
  };

  // Handle version comparison
  const handleCompareVersions = async () => {
    if (selectedVersions.length !== 2) return;
    
    setIsComparing(true);
    try {
      // This would typically open a comparison view
      console.log('Comparing versions:', selectedVersions);
      // await documentService.compareVersions(selectedVersions[0], selectedVersions[1]);
    } catch (error) {
      console.error('Version comparison failed:', error);
    } finally {
      setIsComparing(false);
    }
  };

  // Handle version download
  const handleDownloadVersion = async (version) => {
    try {
      await documentService.downloadDocumentVersion(document.id, version.id);
    } catch (error) {
      console.error('Version download failed:', error);
    }
  };

  // Handle version view
  const handleViewVersion = async (version) => {
    try {
      // This would typically open the version in a viewer
      console.log('Viewing version:', version);
    } catch (error) {
      console.error('Version view failed:', error);
    }
  };

  if (!versions || versions.length === 0) {
    return (
      <div className="text-center py-8">
        <FiClock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Chưa có lịch sử phiên bản
        </h3>
        <p className="text-gray-500">
          Lịch sử phiên bản sẽ được hiển thị khi có cập nhật tài liệu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison Controls */}
      {selectedVersions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiGitBranch className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">
                Đã chọn {selectedVersions.length} phiên bản
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {selectedVersions.length === 2 && (
                <button
                  onClick={handleCompareVersions}
                  disabled={isComparing}
                  className="btn btn-primary btn-sm"
                >
                  {isComparing ? 'Đang so sánh...' : 'So sánh phiên bản'}
                </button>
              )}
              <button
                onClick={() => setSelectedVersions([])}
                className="btn btn-outline btn-sm"
              >
                Hủy chọn
              </button>
            </div>
          </div>
          {selectedVersions.length === 1 && (
            <p className="text-sm text-blue-700 mt-2">
              Chọn thêm một phiên bản nữa để so sánh
            </p>
          )}
        </div>
      )}

      {/* Version Timeline */}
      <div className="flow-root">
        <ul className="-mb-8">
          {versions.map((version, index) => {
            const statusInfo = getVersionStatusInfo(version);
            const StatusIcon = statusInfo.icon;
            const isSelected = selectedVersions.includes(version.id);
            const isLast = index === versions.length - 1;

            return (
              <li key={version.id}>
                <div className="relative pb-8">
                  {!isLast && (
                    <span 
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" 
                      aria-hidden="true" 
                    />
                  )}
                  
                  <div className="relative flex space-x-3">
                    {/* Version Status Icon */}
                    <div>
                      <span className={`${statusInfo.bgColor} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white`}>
                        <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                      </span>
                    </div>

                    {/* Version Details */}
                    <div className="min-w-0 flex-1">
                      <div className={`border rounded-lg p-4 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                        {/* Version Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-sm font-medium text-gray-900">
                              Phiên bản {version.version}
                            </h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            {version.version === document.version && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <FiCheckCircle className="h-3 w-3 mr-1" />
                                Đang sử dụng
                              </span>
                            )}
                          </div>

                          {/* Version Actions */}
                          <div className="flex items-center space-x-2">
                            {/* Selection checkbox */}
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleVersionSelect(version)}
                                disabled={selectedVersions.length >= 2 && !isSelected}
                                className="form-checkbox h-4 w-4 text-blue-600"
                              />
                              <span className="ml-2 text-sm text-gray-600">Chọn</span>
                            </label>

                            {/* View version */}
                            <button
                              onClick={() => handleViewVersion(version)}
                              className="btn btn-outline btn-sm flex items-center"
                              title="Xem phiên bản"
                            >
                              <FiEye className="h-3 w-3 mr-1" />
                              Xem
                            </button>

                            {/* Download version */}
                            {version.file_path && (
                              <button
                                onClick={() => handleDownloadVersion(version)}
                                className="btn btn-outline btn-sm flex items-center"
                                title="Tải xuống phiên bản"
                              >
                                <FiDownload className="h-3 w-3 mr-1" />
                                Tải
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Version Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Người tạo:</span>
                            <div className="flex items-center mt-1">
                              <FiUser className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-gray-900">{version.created_by_name || 'N/A'}</span>
                            </div>
                          </div>

                          <div>
                            <span className="font-medium text-gray-700">Thời gian:</span>
                            <div className="flex items-center mt-1">
                              <FiClock className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-gray-900" title={formatDateTime(version.created_at)}>
                                {formatRelativeTime(version.created_at)}
                              </span>
                            </div>
                          </div>

                          {version.file_name && (
                            <div>
                              <span className="font-medium text-gray-700">Tệp đính kèm:</span>
                              <div className="flex items-center mt-1">
                                <FiFileText className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-gray-900">{version.file_name}</span>
                                {version.file_size && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({(version.file_size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {version.change_reason && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-700">Lý do thay đổi:</span>
                              <p className="mt-1 text-gray-900">{version.change_reason}</p>
                            </div>
                          )}

                          {version.change_summary && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-700">Tóm tắt thay đổi:</span>
                              <p className="mt-1 text-gray-900">{version.change_summary}</p>
                            </div>
                          )}
                        </div>

                        {/* Version Changes Indicator */}
                        {index > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center text-sm text-gray-600">
                              <FiAlertCircle className="h-4 w-4 mr-2" />
                              <span>
                                Thay đổi từ phiên bản {versions[index - 1]?.version || 'trước'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Version Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Thống kê phiên bản</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Tổng phiên bản:</span>
            <p className="text-gray-900">{versions.length}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Phiên bản hiện tại:</span>
            <p className="text-gray-900">{document.version}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Phiên bản đầu tiên:</span>
            <p className="text-gray-900">{versions[versions.length - 1]?.version || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Cập nhật gần nhất:</span>
            <p className="text-gray-900">
              {formatRelativeTime(versions[0]?.created_at || document.updated_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VersionHistory;

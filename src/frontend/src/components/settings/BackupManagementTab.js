// src/frontend/src/components/settings/BackupManagementTab.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  FiDatabase,
  FiDownload,
  FiTrash2,
  FiRefreshCw,
  FiPlus,
  FiAlertTriangle,
  FiClock,
  FiUser,
  FiHardDrive,
  FiCheck,
  FiX,
  FiArchive,
  FiShield
} from 'react-icons/fi';

import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmDialog from '../common/ConfirmDialog';
import api from '../../services/api';

/**
 * BackupManagementTab Component
 * Quản lý backup cho admin - Tuân thủ yêu cầu EDMS 1CAR
 */
function BackupManagementTab() {
  const queryClient = useQueryClient();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  // --- Data Fetching and Mutations ---

  // Fetch backup list
  const {
    data: backupsResponse,
    isLoading: isLoadingBackups,
    isFetching, // Thêm isFetching để biết khi nào đang có yêu cầu chạy ngầm
    error: backupsError,
    refetch: refetchBackups
  } = useQuery(
    ['backups'],
    async () => {
      const response = await api.get('/backups');
      return response.data;
    },
    {
      // ĐÃ XÓA: refetchInterval: 30000,
      refetchOnWindowFocus: true, // Chỉ refetch khi người dùng focus lại vào tab
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Không thể tải danh sách backup');
      }
    }
  );

  // Create backup mutation
  const createBackupMutation = useMutation(
    async (reason = 'manual') => {
      const response = await api.post('/backups', { reason });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Tạo backup thành công!');
        queryClient.invalidateQueries(['backups']);
        setIsCreatingBackup(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Tạo backup thất bại');
        setIsCreatingBackup(false);
      }
    }
  );

  // Restore backup mutation
  const restoreBackupMutation = useMutation(
    async (fileName) => {
      const response = await api.post(`/backups/${fileName}/restore`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Phục hồi database thành công!');
        queryClient.invalidateQueries(['backups']);
        setIsRestoringBackup(false);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Phục hồi database thất bại');
        setIsRestoringBackup(false);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    }
  );

  // Delete backup mutation
  const deleteBackupMutation = useMutation(
    async (fileName) => {
      const response = await api.delete(`/backups/${fileName}`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Xóa backup thành công!');
        queryClient.invalidateQueries(['backups']);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Xóa backup thất bại');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    }
  );

  // Cleanup old backups mutation
  const cleanupBackupsMutation = useMutation(
    async () => {
      const response = await api.post('/backups/cleanup');
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success(data.message || 'Dọn dẹp backup cũ thành công!');
        queryClient.invalidateQueries(['backups']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Dọn dẹp backup thất bại');
      }
    }
  );

  // --- Event Handlers ---

  // Handle create backup
  const handleCreateBackup = () => {
    setIsCreatingBackup(true);
    createBackupMutation.mutate('manual');
  };

  // Handle restore backup
  const handleRestoreBackup = (backup) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Xác nhận Phục hồi Database',
      message: `Hành động này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại từ file backup "${backup.fileName}". Mọi thay đổi chưa được sao lưu sẽ BỊ MẤT VĨNH VIỄN. Bạn có chắc chắn muốn tiếp tục?`,
      onConfirm: () => {
        setIsRestoringBackup(true);
        restoreBackupMutation.mutate(backup.fileName);
      },
      onCancel: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Handle delete backup
  const handleDeleteBackup = (backup) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Xác nhận Xóa Backup',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn file backup "${backup.fileName}"? Hành động này không thể hoàn tác.`,
      onConfirm: () => {
        deleteBackupMutation.mutate(backup.fileName);
      },
      onCancel: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Handle download backup
  const handleDownloadBackup = async (backup) => {
    try {
      const response = await api.get(`/backups/${backup.fileName}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tải xuống backup thành công!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Tải xuống backup thất bại');
    }
  };

  // Handle cleanup old backups
  const handleCleanupBackups = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Xác nhận Dọn dẹp Backup Cũ',
      message: 'Bạn có chắc chắn muốn xóa tất cả các backup cũ theo chính sách lưu trữ? Hành động này không thể hoàn tác.',
      onConfirm: () => {
        cleanupBackupsMutation.mutate();
      },
      onCancel: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- Helper Functions ---

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get reason display text
  const getReasonDisplay = (reason) => {
    const reasonMap = {
      manual: 'Thủ công',
      scheduled: 'Tự động',
      pre_restore_safety: 'An toàn trước phục hồi',
      maintenance: 'Bảo trì'
    };
    return reasonMap[reason] || reason;
  };

  // Get status badge
  const getStatusBadge = (backup) => {
    if (backup.status === 'completed' && backup.fileExists) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <FiCheck className="w-3 h-3 mr-1" />
          Hoàn thành
        </span>
      );
    } else if (backup.status === 'failed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <FiX className="w-3 h-3 mr-1" />
          Thất bại
        </span>
      );
    } else if (!backup.fileExists) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <FiAlertTriangle className="w-3 h-3 mr-1" />
          File không tồn tại
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Không xác định
      </span>
    );
  };

  const backups = backupsResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Blocking Overlay for Long Operations */}
      {(isCreatingBackup || isRestoringBackup) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-3">
              <LoadingSpinner />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {isCreatingBackup ? 'Đang tạo backup...' : 'Đang phục hồi database...'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isCreatingBackup
                    ? 'Vui lòng chờ trong khi hệ thống tạo bản sao lưu'
                    : 'Vui lòng chờ trong khi hệ thống phục hồi dữ liệu'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FiDatabase className="w-5 h-5 mr-2" />
            Quản lý Backup
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Tạo, quản lý và phục hồi các bản sao lưu cơ sở dữ liệu
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => refetchBackups()}
            disabled={isFetching}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            onClick={handleCleanupBackups}
            disabled={cleanupBackupsMutation.isLoading}
            className="inline-flex items-center px-3 py-2 border border-yellow-300 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            <FiTrash2 className="w-4 h-4 mr-2" />
            Dọn dẹp Cũ
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup || createBackupMutation.isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Tạo Backup Mới
          </button>
        </div>
      </div>

      {/* Error State */}
      {backupsError && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <FiAlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Không thể tải danh sách backup
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {backupsError.response?.data?.message || backupsError.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingBackups && !backupsResponse && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Backup List */}
      {!isLoadingBackups && !backupsError && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Danh sách Backup ({backups.length})
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Các bản sao lưu cơ sở dữ liệu có sẵn
            </p>
          </div>
          {backups.length === 0 ? (
            <div className="text-center py-12">
              <FiDatabase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có backup nào</h3>
              <p className="mt-1 text-sm text-gray-500">
                Bắt đầu bằng cách tạo backup đầu tiên
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {backups.map((backup) => (
                <li key={backup.id || backup.fileName} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <FiHardDrive className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {backup.displayName || backup.fileName}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center text-sm text-gray-500">
                              <FiClock className="w-4 h-4 mr-1" />
                              {formatDate(backup.createdAt || backup.timestamp)}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <FiHardDrive className="w-4 h-4 mr-1" />
                              {formatFileSize(backup.size)}
                            </div>
                            {backup.createdBy && (
                              <div className="flex items-center text-sm text-gray-500">
                                <FiUser className="w-4 h-4 mr-1" />
                                ID: {backup.createdBy}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            {getStatusBadge(backup)}
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getReasonDisplay(backup.reason)}
                            </span>
                            {backup.compressed && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <FiArchive className="w-3 h-3 mr-1" />
                                Nén
                              </span>
                            )}
                            {backup.encrypted && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                <FiShield className="w-3 h-3 mr-1" />
                                Mã hóa
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      {backup.canDownload && (
                        <button
                          onClick={() => handleDownloadBackup(backup)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="Tải xuống"
                        >
                          <FiDownload className="w-4 h-4" />
                        </button>
                      )}

                      {backup.canRestore && (
                        <button
                          onClick={() => handleRestoreBackup(backup)}
                          disabled={isRestoringBackup}
                          className="inline-flex items-center px-3 py-1.5 border border-orange-300 shadow-sm text-xs font-medium rounded text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                          title="Phục hồi"
                        >
                          <FiRefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteBackup(backup)}
                        disabled={deleteBackupMutation.isLoading}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        title="Xóa"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
      />
    </div>
  );
}

export default BackupManagementTab;

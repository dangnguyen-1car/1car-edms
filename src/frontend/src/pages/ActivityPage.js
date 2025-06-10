// src/frontend/src/pages/ActivityPage.js
/**
 * =================================================================
 * EDMS 1CAR - Activity Page (Admin Only - ESLint Hooks Fixed & Imports)
 * System activity logs interface for administrators
 * =================================================================
 */

// Imports
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
// THÊM FiX VÀO IMPORT
import { FiActivity, FiAlertCircle, FiSearch, FiFilter, FiUser, FiCalendar, FiEye, FiRefreshCw, FiX } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
// Layout sẽ được áp dụng bởi ProtectedRoute trong App.js (nếu bạn đã cấu hình App.js như vậy)
// import Layout from '../components/layout/Layout'; 
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import api from '../services/api';

// Main ActivityPage Component
function ActivityPage() {
  // === ALL HOOKS MUST BE CALLED AT THE TOP LEVEL ===
  const { isAuthenticated, isLoading: isLoadingAuth, user: currentUser, hasPermission } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resourceType: '',
    dateFrom: '',
    dateTo: '',
    searchDetails: '',
  });
  const [selectedLog, setSelectedLog] = useState(null);

  const [actionTypesOptions, setActionTypesOptions] = useState([]);
  const [resourceTypesOptions, setResourceTypesOptions] = useState([]);

  const allPossibleActions = [
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET',
    'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'USER_CREATED', 'USER_UPDATED',
    'USER_ACTIVATED', 'USER_DEACTIVATED', 'USER_DELETED', 'USER_VIEWED', 'USERS_LISTED',
    'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_VIEWED',
    'DOCUMENT_DOWNLOADED', 'DOCUMENT_UPLOADED', 'DOCUMENT_SEARCHED', 'DOCUMENT_APPROVED',
    'DOCUMENT_REJECTED', 'DOCUMENT_PUBLISHED', 'DOCUMENT_ARCHIVED', 'VERSION_CREATED',
    'VERSION_COMPARED', 'VERSION_RESTORED', 'WORKFLOW_TRANSITION', 'WORKFLOW_APPROVED',
    'WORKFLOW_REJECTED', 'WORKFLOW_RETURNED', 'FILE_UPLOADED', 'FILE_DOWNLOADED',
    'FILE_DELETED', 'FILE_ATTACHED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED',
    'PERMISSION_CHECKED', 'SYSTEM_BACKUP', 'SYSTEM_RESTORE', 'SYSTEM_MAINTENANCE',
    'SYSTEM_ERROR', 'SYSTEM_STARTUP', 'SYSTEM_SHUTDOWN'
  ];
  const allPossibleResourceTypes = ['user', 'document', 'version', 'file', 'workflow', 'permission', 'system'];

  useEffect(() => {
    setActionTypesOptions(allPossibleActions.map(action => ({ value: action, label: getActionDisplay(action) })));
    setResourceTypesOptions(allPossibleResourceTypes.map(type => ({ value: type, label: getResourceTypeDisplay(type) })));
  }, []);

  const canFetchLogs = isAuthenticated && !isLoadingAuth && (hasPermission('view_audit_logs') || currentUser?.role === 'admin');
  // THÊM isError VÀO KHI DESTRUCTURE TỪ useQuery
  const { data: logsData, isLoading: isLoadingLogs, isFetching, error, isError, refetch } = useQuery(
    ['audit-logs', currentPage, pageSize, filters],
    async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        userId: filters.userId || undefined,
        action: filters.action || undefined,
        resourceType: filters.resourceType || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        search: filters.searchDetails || undefined,
      };
      // Backend cho /audit-logs cần được tạo và trả về đúng cấu trúc
      // Ví dụ: { success: true, data: { logs: [], pagination: {} } }
      const response = await api.get('/audit-logs', { params }); 
      return response.data;
    },
    {
      keepPreviousData: true,
      staleTime: 1 * 60 * 1000,
      enabled: canFetchLogs,
      onError: (err) => {
        console.error("Error fetching audit logs:", err);
        // Toast notification có thể được gọi ở đây
      }
    }
  );

  // === EARLY RETURNS AFTER ALL HOOKS ARE CALLED ===
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Đang kiểm tra xác thực..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canFetchLogs) { // Sử dụng biến đã tính toán
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Không có quyền truy cập
          </h2>
          <p className="text-gray-600">
            Bạn không có quyền xem nhật ký hoạt động hệ thống.
          </p>
        </div>
      </div>
    );
  }
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ userId: '', action: '', resourceType: '', dateFrom: '', dateTo: '', searchDetails: '' });
    setCurrentPage(1);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
  };

  function getActionDisplay(action) {
    const actions = {
      'LOGIN_SUCCESS': 'Đăng nhập thành công', 'LOGIN_FAILED': 'Đăng nhập thất bại', 'LOGOUT': 'Đăng xuất', 
      'PASSWORD_CHANGED': 'Thay đổi mật khẩu', 'PASSWORD_RESET': 'Đặt lại mật khẩu', 'ACCOUNT_LOCKED': 'Tài khoản bị khóa',
      'ACCOUNT_UNLOCKED': 'Mở khóa tài khoản', 'USER_CREATED': 'Tạo người dùng', 'USER_UPDATED': 'Cập nhật người dùng',
      'USER_ACTIVATED': 'Kích hoạt người dùng', 'USER_DEACTIVATED': 'Vô hiệu hóa người dùng', 'USER_DELETED': 'Xóa người dùng',
      'USER_VIEWED': 'Xem người dùng', 'USERS_LISTED': 'Xem DS người dùng', 'DOCUMENT_CREATED': 'Tạo tài liệu',
      'DOCUMENT_UPDATED': 'Cập nhật tài liệu', 'DOCUMENT_DELETED': 'Xóa tài liệu', 'DOCUMENT_VIEWED': 'Xem tài liệu',
      'DOCUMENT_DOWNLOADED': 'Tải xuống tài liệu', 'DOCUMENT_UPLOADED': 'Tải lên tài liệu (metadata)',
      'DOCUMENT_SEARCHED': 'Tìm kiếm tài liệu', 'DOCUMENT_APPROVED': 'Phê duyệt tài liệu', 'DOCUMENT_REJECTED': 'Từ chối tài liệu',
      'DOCUMENT_PUBLISHED': 'Xuất bản tài liệu', 'DOCUMENT_ARCHIVED': 'Lưu trữ tài liệu', 'VERSION_CREATED': 'Tạo phiên bản',
      'VERSION_COMPARED': 'So sánh phiên bản', 'VERSION_RESTORED': 'Khôi phục phiên bản', 'WORKFLOW_TRANSITION': 'Chuyển trạng thái Workflow',
      'WORKFLOW_APPROVED': 'Phê duyệt Workflow', 'WORKFLOW_REJECTED': 'Từ chối Workflow', 'WORKFLOW_RETURNED': 'Trả lại Workflow',
      'FILE_UPLOADED': 'Tải lên file', 'FILE_DOWNLOADED': 'Tải xuống file', 'FILE_DELETED': 'Xóa file',
      'FILE_ATTACHED': 'Đính kèm file', 'PERMISSION_GRANTED': 'Cấp quyền', 'PERMISSION_REVOKED': 'Thu hồi quyền',
      'PERMISSION_CHECKED': 'Kiểm tra quyền', 'SYSTEM_BACKUP': 'Sao lưu hệ thống', 'SYSTEM_RESTORE': 'Khôi phục hệ thống',
      'SYSTEM_MAINTENANCE': 'Bảo trì hệ thống', 'SYSTEM_ERROR': 'Lỗi hệ thống', 'SYSTEM_STARTUP': 'Khởi động hệ thống',
      'SYSTEM_SHUTDOWN': 'Tắt hệ thống'
    };
    return actions[action] || action;
  }
  function getResourceTypeDisplay(resourceType) {
    const types = {
      'user': 'Người dùng', 'document': 'Tài liệu', 'version': 'Phiên bản',
      'file': 'Tệp tin', 'workflow': 'Luồng công việc', 'permission': 'Quyền truy cập',
      'system': 'Hệ thống'
    };
    return types[resourceType] || resourceType;
  }
  function getActionColor(action) {
    if (action.includes('FAILED') || action.includes('DELETED') || action.includes('ERROR') || action.includes('LOCKED')) return 'text-red-600';
    if (action.includes('CREATED') || action.includes('LOGIN_SUCCESS') || action.includes('ACTIVATED') || action.includes('UNLOCKED') || action.includes('GRANTED')) return 'text-green-600';
    if (action.includes('UPDATED') || action.includes('VIEWED') || action.includes('DOWNLOADED') || action.includes('SEARCHED')) return 'text-blue-600';
    return 'text-gray-600';
  }

  const logs = logsData?.data?.logs || logsData?.data || [];
  const pagination = logsData?.data?.pagination || { total: 0, totalPages: 1, page: currentPage, limit: pageSize };

  return (
    // Layout được áp dụng bởi ProtectedRoute trong App.js
    <div>
      <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
                <FiActivity className="mr-3 text-blue-600" />
                Nhật ký hoạt động Hệ thống
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Theo dõi các hoạt động quan trọng và thay đổi dữ liệu trong EDMS.
              </p>
            </div>
             <button onClick={() => refetch()} className="btn btn-outline btn-sm flex-shrink-0" disabled={isLoadingLogs || isFetching}>
                <FiRefreshCw className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Làm mới
            </button>
          </div>
        </div>

        <div className="card mb-6">
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
              <div>
                <label className="form-label">Người dùng (ID)</label>
                <input type="text" placeholder="Nhập User ID..." value={filters.userId} onChange={(e) => handleFilterChange('userId', e.target.value)} className="form-input"/>
              </div>
              <div>
                <label className="form-label">Hành động</label>
                <select value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)} className="form-select">
                  <option value="">Tất cả hành động</option>
                  {actionTypesOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Loại đối tượng</label>
                <select value={filters.resourceType} onChange={(e) => handleFilterChange('resourceType', e.target.value)} className="form-select">
                  <option value="">Tất cả loại</option>
                  {resourceTypesOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Từ ngày</label>
                <input type="datetime-local" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} className="form-input"/>
              </div>
              <div>
                <label className="form-label">Đến ngày</label>
                <input type="datetime-local" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} className="form-input"/>
              </div>
               <div>
                <label className="form-label">Tìm trong chi tiết</label>
                <input type="text" placeholder="Nội dung chi tiết..." value={filters.searchDetails} onChange={(e) => handleFilterChange('searchDetails', e.target.value)} className="form-input"/>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
                <button onClick={handleClearFilters} className="btn btn-secondary-outline btn-sm">
                    <FiFilter className="mr-1.5" /> Xóa bộ lọc
                </button>
                <p className="text-sm text-gray-600">
                    {isFetching ? 'Đang tìm...' : `${pagination.total} kết quả.`}
                </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-0">
            {/* SỬ DỤNG isError đã khai báo */}
            {isLoadingLogs && !logsData ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="large" message="Đang tải nhật ký..." /></div>
            ) : isError && !logsData ? ( 
                <div className="text-center py-10 text-red-600">
                    <FiAlertCircle className="mx-auto h-10 w-10 mb-2"/>
                    <p>Lỗi tải nhật ký: {error?.message || 'Không rõ lỗi'}</p>
                </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FiActivity className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">Không có nhật ký nào phù hợp</h3>
                <p className="text-sm text-gray-500">Vui lòng thử điều chỉnh bộ lọc của bạn.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Đối tượng</th><th>ID</th><th>IP</th><th>Chi tiết</th></tr>
                  </thead>
                  <tbody className="table-body">
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                        <td className="whitespace-nowrap">{log.user_name || log.user_email || (log.user_id ? `User ID: ${log.user_id}`: 'System')}</td>
                        <td><span className={`font-medium ${getActionColor(log.action)}`}>{getActionDisplay(log.action)}</span></td>
                        <td className="whitespace-nowrap">{getResourceTypeDisplay(log.resource_type)}</td>
                        <td>{log.resource_id || '-'}</td>
                        <td className="font-mono">{log.ip_address || '-'}</td>
                        <td>
                          <button onClick={() => handleViewDetails(log)} className="btn-icon text-blue-600 hover:text-blue-700 p-1" title="Xem chi tiết">
                            <FiEye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {pagination.totalPages > 1 && !isLoadingLogs && logs.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          </div>
        )}

        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-xl font-semibold text-gray-800">Chi tiết Nhật ký #{selectedLog.id}</h3>
                {/* THÊM FiX VÀO ĐÂY */}
                <button onClick={() => setSelectedLog(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md transition-colors" aria-label="Đóng">
                  <FiX size={22} />
                </button>
              </div>
              <div className="p-6 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><strong>ID:</strong> {selectedLog.id}</div>
                  <div><strong>Thời gian:</strong> {new Date(selectedLog.timestamp).toLocaleString('vi-VN')}</div>
                  <div><strong>Người dùng:</strong> {selectedLog.user_name || selectedLog.user_email || (selectedLog.user_id ? `ID: ${selectedLog.user_id}` : 'Hệ thống')}</div>
                  <div><strong>Hành động:</strong> <span className={getActionColor(selectedLog.action)}>{getActionDisplay(selectedLog.action)}</span> ({selectedLog.action})</div>
                  <div><strong>Loại đối tượng:</strong> {getResourceTypeDisplay(selectedLog.resource_type)} ({selectedLog.resource_type})</div>
                  <div><strong>ID Đối tượng:</strong> {selectedLog.resource_id || 'N/A'}</div>
                  <div><strong>Địa chỉ IP:</strong> <span className="font-mono">{selectedLog.ip_address || 'N/A'}</span></div>
                  <div><strong>Session ID:</strong> <span className="font-mono break-all">{selectedLog.session_id || 'N/A'}</span></div>
                </div>
                {selectedLog.user_agent && <div><strong>User Agent:</strong><p className="text-xs mt-0.5 bg-gray-50 p-2 rounded border break-all">{selectedLog.user_agent}</p></div>}
                {selectedLog.details && (
                  <div>
                    <strong>Chi tiết (JSON):</strong>
                    <pre className="mt-1 text-xs text-gray-800 bg-gray-50 p-3 rounded border overflow-auto max-h-48">
                      {typeof selectedLog.details === 'string' ? selectedLog.details : JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
                <button onClick={() => setSelectedLog(null)} className="btn btn-secondary">Đóng</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityPage;
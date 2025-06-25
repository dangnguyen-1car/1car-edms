// src/frontend/src/pages/ActivityPage.js
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  FiActivity, 
  FiAlertCircle, 
  FiSearch, 
  FiFilter, 
  FiUser, 
  FiCalendar, 
  FiEye, 
  FiRefreshCw, 
  FiX,
  FiDownload,
  FiBarChart2,
  FiTrendingUp
} from 'react-icons/fi';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import api from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function ActivityPage() {
  const { isAuthenticated, isLoading: isLoadingAuth, user: currentUser, hasPermission } = useAuth();
  
  // State for filters and pagination
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
  const [showSummary, setShowSummary] = useState(true);

  // Date picker states
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());

  // Update filters when date changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      dateFrom: startDate.toISOString().split('T')[0],
      dateTo: endDate.toISOString().split('T')[0]
    }));
  }, [startDate, endDate]);

  const canFetchLogs = isAuthenticated && !isLoadingAuth && 
    (hasPermission('view_audit_logs') || currentUser?.role === 'admin');

  // Fetch audit logs summary
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['audit-logs-summary', filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      });
      const response = await api.get(`/reports/audit-logs/summary?${params}`);
      return response.data;
    },
    enabled: canFetchLogs && showSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch audit logs list
  const { data: logsData, isLoading: isLoadingLogs, isFetching, error, isError, refetch } = useQuery({
    queryKey: ['audit-logs', currentPage, pageSize, filters],
    queryFn: async () => {
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
      const response = await api.get('/audit-logs', { params });
      return response.data;
    },
    keepPreviousData: true,
    staleTime: 1 * 60 * 1000,
    enabled: canFetchLogs,
  });

  // Export to Excel
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...filters,
        format: 'xlsx'
      });
      
      const response = await api.get(`/reports/audit-logs/export?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Xuất file Excel thành công!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  // Early returns
  if (isLoadingAuth) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canFetchLogs) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Không có quyền truy cập</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bạn không có quyền xem nhật ký hoạt động hệ thống.
          </p>
        </div>
      </div>
    );
  }

  const logs = logsData?.data?.logs || [];
  const pagination = logsData?.data?.pagination || {};
  const summary = summaryData?.data || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FiActivity className="mr-3 text-blue-600" />
                Báo cáo Hoạt động
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Theo dõi các hoạt động quan trọng và thay đổi dữ liệu trong EDMS.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSummary(!showSummary)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showSummary 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <FiBarChart2 className="w-4 h-4 mr-2 inline" />
                {showSummary ? 'Ẩn thống kê' : 'Hiện thống kê'}
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                <FiDownload className="w-4 h-4 mr-2 inline" />
                Xuất Excel
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FiCalendar className="mr-2" />
              Khoảng thời gian
            </h3>
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                <DatePicker
                  selected={startDate}
                  onChange={setStartDate}
                  dateFormat="dd/MM/yyyy"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxDate={endDate}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                <DatePicker
                  selected={endDate}
                  onChange={setEndDate}
                  dateFormat="dd/MM/yyyy"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  minDate={startDate}
                  maxDate={new Date()}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        {showSummary && summary && (
          <div className="mb-8 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FiActivity className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Tổng hoạt động</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.totalStats?.total_actions?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FiUser className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Người dùng hoạt động</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.totalStats?.unique_users || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FiTrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Ngày hoạt động</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.totalStats?.active_days || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Timeline */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Hoạt động theo ngày</h3>
                {summary.actionsByDay && summary.actionsByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={summary.actionsByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        name="Số hoạt động"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    Không có dữ liệu
                  </div>
                )}
              </div>

              {/* Top Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top 5 hành động</h3>
                {summary.topActions && summary.topActions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={summary.topActions}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ action, percentage }) => `${action} (${percentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {summary.topActions.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    Không có dữ liệu
                  </div>
                )}
              </div>

              {/* Top Users */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top 5 người dùng hoạt động</h3>
                {summary.topUsers && summary.topUsers.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary.topUsers} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="activity_count" fill="#10b981" name="Số hoạt động" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    Không có dữ liệu
                  </div>
                )}
              </div>

              {/* Resource Types */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Phân bố theo đối tượng</h3>
                {summary.resourceTypes && summary.resourceTypes.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary.resourceTypes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="resource_type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" name="Số lượng" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    Không có dữ liệu
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm chi tiết
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm trong chi tiết..."
                  value={filters.searchDetails}
                  onChange={(e) => setFilters({ ...filters, searchDetails: e.target.value })}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hành động
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tất cả hành động</option>
                <option value="LOGIN_SUCCESS">Đăng nhập thành công</option>
                <option value="LOGIN_FAILED">Đăng nhập thất bại</option>
                <option value="DOCUMENT_CREATED">Tạo tài liệu</option>
                <option value="DOCUMENT_UPDATED">Cập nhật tài liệu</option>
                <option value="DOCUMENT_VIEWED">Xem tài liệu</option>
                <option value="DOCUMENT_DELETED">Xóa tài liệu</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đối tượng
              </label>
              <select
                value={filters.resourceType}
                onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tất cả đối tượng</option>
                <option value="user">Người dùng</option>
                <option value="document">Tài liệu</option>
                <option value="version">Phiên bản</option>
                <option value="system">Hệ thống</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  userId: '',
                  action: '',
                  resourceType: '',
                  dateFrom: startDate.toISOString().split('T')[0],
                  dateTo: endDate.toISOString().split('T')[0],
                  searchDetails: ''
                })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FiX className="w-4 h-4 mr-2 inline" />
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Nhật ký hoạt động
              </h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {isFetching ? 'Đang tìm...' : `${pagination.total || 0} kết quả.`}
                </span>
                <button
                  onClick={() => refetch()}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Làm mới"
                >
                  <FiRefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="p-8">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Lỗi tải nhật ký: {error?.message || 'Không rõ lỗi'}
              </h3>
              <p className="text-gray-500 mb-4">Vui lòng thử điều chỉnh bộ lọc của bạn.</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <FiEye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Không có nhật ký</h3>
              <p className="text-gray-500">Không tìm thấy hoạt động nào với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thời gian
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Người dùng
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hành động
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Đối tượng
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.user_name || log.user_email || (log.user_id ? `User ID: ${log.user_id}` : 'System')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.resource_type || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.resource_id || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.ip_address || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Chi tiết nhật ký</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Thời gian</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedLog.timestamp).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Người dùng</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedLog.user_name || selectedLog.user_email || 'System'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User Agent</label>
                  <p className="mt-1 text-sm text-gray-900 break-all">
                    {selectedLog.user_agent || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Chi tiết</label>
                  <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                    {typeof selectedLog.details === 'string' 
                      ? selectedLog.details 
                      : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityPage;

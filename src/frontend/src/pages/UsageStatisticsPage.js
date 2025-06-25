// src/frontend/src/pages/UsageStatisticsPage.js
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  FiTrendingUp, 
  FiUsers, 
  FiFileText, 
  FiHardDrive,
  FiRefreshCw,
  FiEye,
  FiActivity
} from 'react-icons/fi';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import api from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

function UsageStatisticsPage() {
  const { isAuthenticated, isLoading: isLoadingAuth, user: currentUser, hasPermission } = useAuth();
  
  // State
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [selectedLimit, setSelectedLimit] = useState(10);

  const canViewReports = isAuthenticated && !isLoadingAuth && 
    (hasPermission('view_reports') || currentUser?.role === 'admin');

  // Fetch document views statistics
  const { data: documentViewsData, isLoading: isLoadingViews, refetch: refetchViews } = useQuery({
    queryKey: ['stats-document-views', startDate, endDate, selectedLimit],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateFrom: startDate.toISOString().split('T')[0],
        dateTo: endDate.toISOString().split('T')[0],
        limit: selectedLimit.toString()
      });
      
      const response = await api.get(`/reports/stats/document-views?${params}`);
      return response.data;
    },
    enabled: canViewReports,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user activity statistics
  const { data: userActivityData, isLoading: isLoadingActivity, refetch: refetchActivity } = useQuery({
    queryKey: ['stats-user-activity', startDate, endDate, selectedLimit],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateFrom: startDate.toISOString().split('T')[0],
        dateTo: endDate.toISOString().split('T')[0],
        limit: selectedLimit.toString()
      });
      
      const response = await api.get(`/reports/stats/user-activity?${params}`);
      return response.data;
    },
    enabled: canViewReports,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch storage statistics
  const { data: storageData, isLoading: isLoadingStorage, refetch: refetchStorage } = useQuery({
    queryKey: ['stats-storage'],
    queryFn: async () => {
      const response = await api.get('/reports/stats/storage');
      return response.data;
    },
    enabled: canViewReports,
    staleTime: 10 * 60 * 1000, // Cache longer for storage data
  });

  // Early returns
  if (isLoadingAuth) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canViewReports) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiTrendingUp className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Không có quyền truy cập</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bạn không có quyền xem thống kê sử dụng.
          </p>
        </div>
      </div>
    );
  }

  const documentViews = documentViewsData?.data || [];
  const userActivity = userActivityData?.data || [];
  const storage = storageData?.data || {};

  const handleRefresh = () => {
    refetchViews();
    refetchActivity();
    refetchStorage();
    toast.success('Đã làm mới dữ liệu');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FiTrendingUp className="mr-3 text-blue-600" />
                Thống kê Sử dụng
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Theo dõi mức độ sử dụng và hiệu suất của hệ thống EDMS.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <FiRefreshCw className="w-4 h-4 mr-2 inline" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ ngày
              </label>
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                dateFormat="dd/MM/yyyy"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxDate={endDate}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đến ngày
              </label>
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                dateFormat="dd/MM/yyyy"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                minDate={startDate}
                maxDate={new Date()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng hiển thị
              </label>
              <select
                value={selectedLimit}
                onChange={(e) => setSelectedLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-500">
                Khoảng thời gian: {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))} ngày
              </div>
            </div>
          </div>
        </div>

        {/* Storage Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiFileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng tài liệu</p>
                <p className="text-2xl font-bold text-gray-900">
                  {storage.totalStats?.total_documents?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiHardDrive className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Dung lượng (MB)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {storage.totalStats?.total_size_mb?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiEye className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng lượt xem</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documentViews.reduce((sum, doc) => sum + (doc.view_count || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiUsers className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Người dùng hoạt động</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userActivity.filter(user => user.total_actions > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Documents by Views */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FiEye className="mr-2" />
              Top tài liệu được xem nhiều nhất
            </h3>
            {isLoadingViews ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : documentViews.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={documentViews} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="document_code" 
                    type="category" 
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value, 'Lượt xem']}
                    labelFormatter={(label) => {
                      const doc = documentViews.find(d => d.document_code === label);
                      return doc ? `${doc.document_code}: ${doc.title}` : label;
                    }}
                  />
                  <Bar dataKey="view_count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Không có dữ liệu
              </div>
            )}
          </div>

          {/* Top Active Users */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FiActivity className="mr-2" />
              Top người dùng hoạt động tích cực
            </h3>
            {isLoadingActivity ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : userActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userActivity} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      value,
                      name === 'total_actions' ? 'Tổng hoạt động' : 
                      name === 'document_actions' ? 'Hoạt động tài liệu' : 
                      'Ngày hoạt động'
                    ]}
                  />
                  <Bar dataKey="total_actions" fill="#10b981" name="total_actions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Không có dữ liệu
              </div>
            )}
          </div>

          {/* Storage by Department */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FiHardDrive className="mr-2" />
              Dung lượng theo phòng ban
            </h3>
            {isLoadingStorage ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : storage.storageByDept && storage.storageByDept.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={storage.storageByDept}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ department, total_size_mb }) => 
                      `${department}: ${total_size_mb}MB`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total_size_mb"
                  >
                    {storage.storageByDept.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} MB`, 'Dung lượng']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Không có dữ liệu
              </div>
            )}
          </div>

          {/* Storage by Document Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FiFileText className="mr-2" />
              Dung lượng theo loại tài liệu
            </h3>
            {isLoadingStorage ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : storage.storageByType && storage.storageByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={storage.storageByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'total_size_mb' ? `${value} MB` : value,
                      name === 'total_size_mb' ? 'Dung lượng' : 'Số tài liệu'
                    ]}
                  />
                  <Bar dataKey="total_size_mb" fill="#f59e0b" name="total_size_mb" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Không có dữ liệu
              </div>
            )}
          </div>
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Views Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Chi tiết tài liệu được xem</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã tài liệu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phòng ban
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lượt xem
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentViews.slice(0, 10).map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {doc.document_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.view_count || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Activity Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Chi tiết hoạt động người dùng</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phòng ban
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hoạt động
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày hoạt động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userActivity.slice(0, 10).map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.total_actions || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.active_days || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UsageStatisticsPage;

// src/frontend/src/pages/SettingsPage.js
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiSettings, FiUser, FiLock, FiSave, FiAlertCircle, FiDatabase } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
// ĐÃ XÓA: Dòng import Layout không cần thiết
// import Layout from '../components/layout/Layout'; 
import LoadingSpinner from '../components/common/LoadingSpinner';
import BackupManagementTab from '../components/settings/BackupManagementTab';

import { authService } from '../services/authService';
import api from '../services/api';

function SettingsPage() {
  const {
    isAuthenticated,
    isLoading: isLoadingAuth,
    user: currentUser
  } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [systemSettings, setSystemSettings] = useState({
    defaultReviewCycle: 12,
    defaultRetentionPeriod: 60,
    maxFileSize: 10,
    emailNotifications: true,
    documentAutoArchive: true
  });
  const [errors, setErrors] = useState({});

  const isAdmin = currentUser?.role === 'admin';

  // --- Data Fetching (Không thay đổi) ---
  const {
    isLoading: isLoadingProfile,
    error: profileError
  } = useQuery(
    ['user-profile', currentUser?.id],
    authService.getProfile,
    {
      enabled: !!isAuthenticated && !!currentUser,
      onSuccess: (data) => {
        if (data.success && data.user) {
          setProfileData({
            name: data.user.name || '',
            email: data.user.email || '',
            department: data.user.department || '',
            position: data.user.position || '',
            phone: data.user.phone || ''
          });
        }
      },
      onError: (error) => {
        if (error.response?.status !== 401) {
          toast.error(error.response?.data?.message || "Không thể tải thông tin cá nhân.");
        }
      }
    }
  );

  const canManageSystem = !!isAuthenticated && !!currentUser && isAdmin;
  const {
    isLoading: isLoadingSystemSettings,
    error: systemSettingsError
  } = useQuery(
    ['system-settings'],
    async () => {
      const response = await api.get('/system-settings');
      return response.data;
    },
    {
      enabled: canManageSystem,
      onSuccess: (data) => {
        if (data.success && data.data) {
          setSystemSettings({
            defaultReviewCycle: data.data.defaultReviewCycle || 12,
            defaultRetentionPeriod: data.data.defaultRetentionPeriod || 60,
            maxFileSize: data.data.maxFileSize || 10,
            emailNotifications: data.data.emailNotifications !== false,
            documentAutoArchive: data.data.documentAutoArchive !== false
          });
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || "Không thể tải cài đặt hệ thống.");
      }
    }
  );

  // --- Mutations (Không thay đổi) ---
  const updateProfileMutation = useMutation(
    (newProfileData) => authService.updateProfile(newProfileData),
    {
      onSuccess: (data) => {
        if (data.success) {
          toast.success('Cập nhật thông tin cá nhân thành công!');
          queryClient.invalidateQueries(['user-profile', currentUser?.id]);
          queryClient.invalidateQueries('auth-user');
          setErrors({});
        } else {
          throw new Error(data.message || 'Cập nhật thất bại');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || error.message || 'Đã xảy ra lỗi khi cập nhật thông tin.');
      }
    }
  );

  const changePasswordMutation = useMutation(
    ({ currentPassword, newPassword }) => authService.changePassword(currentPassword, newPassword),
    {
      onSuccess: (data) => {
        if (data.success) {
          toast.success('Đổi mật khẩu thành công!');
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          setErrors({});
        } else {
          throw new Error(data.message || 'Đổi mật khẩu thất bại');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || error.message || 'Đã xảy ra lỗi khi đổi mật khẩu.');
      }
    }
  );

  const updateSystemSettingsMutation = useMutation(
    (settings) => api.put('/system-settings', settings),
    {
      onSuccess: (response) => {
        if (response.data.success) {
          toast.success('Cập nhật cài đặt hệ thống thành công!');
          queryClient.invalidateQueries(['system-settings']);
          setErrors({});
        } else {
          throw new Error(response.data.message || 'Cập nhật cài đặt thất bại');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || error.message || 'Đã xảy ra lỗi khi cập nhật cài đặt hệ thống.');
      }
    }
  );


  if (isLoadingAuth) {
    // ĐÃ XÓA: Bỏ thẻ <Layout> bao bọc bên ngoài
    return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // --- Event Handlers (Không thay đổi) ---
  const handleProfileSubmit = (e) => { e.preventDefault(); const newErrors = {}; if (!profileData.name.trim()) { newErrors.name = 'Họ tên không được để trống'; } if (!profileData.email.trim()) { newErrors.email = 'Email không được để trống'; } else if (!/\S+@\S+\.\S+/.test(profileData.email)) { newErrors.email = 'Email không hợp lệ'; } if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; } updateProfileMutation.mutate(profileData); };
  const handlePasswordSubmit = (e) => { e.preventDefault(); const newErrors = {}; if (!passwordData.currentPassword) { newErrors.currentPassword = 'Mật khẩu hiện tại không được để trống'; } if (!passwordData.newPassword) { newErrors.newPassword = 'Mật khẩu mới không được để trống'; } else if (passwordData.newPassword.length < 6) { newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự'; } if (passwordData.newPassword !== passwordData.confirmPassword) { newErrors.confirmPassword = 'Xác nhận mật khẩu không khớp'; } if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; } changePasswordMutation.mutate({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }); };
  const handleSystemSettingsSubmit = (e) => { e.preventDefault(); updateSystemSettingsMutation.mutate(systemSettings); };


  const tabs = [
    { id: 'profile', name: 'Thông tin cá nhân', icon: FiUser },
    { id: 'password', name: 'Đổi mật khẩu', icon: FiLock },
    ...(isAdmin ? [
      { id: 'system', name: 'Cài đặt hệ thống', icon: FiSettings },
      { id: 'backup', name: 'Quản lý Backup', icon: FiDatabase }
    ] : [])
  ];

  // ĐÃ XÓA: Bỏ thẻ <Layout> bao bọc bên ngoài
  return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h1 className="text-2xl font-semibold text-gray-900">Cài đặt</h1>
                <p className="mt-2 text-sm text-gray-700">
                  Quản lý thông tin cá nhân và cài đặt hệ thống
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6">
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden sm:block">
              <nav className="flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content - KHÔI PHỤC ĐẦY ĐỦ NỘI DUNG */}
          <div className="mt-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Thông tin cá nhân
                  </h3>

                  {profileError && (
                    <div className="mb-4 rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <FiAlertCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Không thể tải thông tin cá nhân: {profileError.message}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}

                  {isLoadingProfile ? (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Họ tên *
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                              errors.name ? 'border-red-300' : ''
                            }`}
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email *
                          </label>
                          <input
                            type="email"
                            id="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                              errors.email ? 'border-red-300' : ''
                            }`}
                          />
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                          )}
                        </div>
                        <div>
                          <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                            Phòng ban
                          </label>
                          <input
                            type="text"
                            id="department"
                            value={profileData.department}
                            readOnly
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                            Chức vụ
                          </label>
                          <input
                            type="text"
                            id="position"
                            value={profileData.position}
                            onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Số điện thoại
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={updateProfileMutation.isLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <FiSave className="w-4 h-4 mr-2" />
                          {updateProfileMutation.isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Đổi mật khẩu
                  </h3>

                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Mật khẩu hiện tại *
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors.currentPassword ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        Mật khẩu mới *
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors.newPassword ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.newPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Xác nhận mật khẩu mới *
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                          errors.confirmPassword ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={changePasswordMutation.isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <FiLock className="w-4 h-4 mr-2" />
                        {changePasswordMutation.isLoading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* System Settings Tab - Admin Only */}
            {activeTab === 'system' && isAdmin && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Cài đặt hệ thống
                  </h3>

                  {systemSettingsError && (
                    <div className="mb-4 rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <FiAlertCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Không thể tải cài đặt hệ thống: {systemSettingsError.message}
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            API endpoint /api/system-settings có thể chưa được triển khai ở backend.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isLoadingSystemSettings ? (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <form onSubmit={handleSystemSettingsSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="defaultReviewCycle" className="block text-sm font-medium text-gray-700">
                            Chu kỳ rà soát mặc định (tháng)
                          </label>
                          <input
                            type="number"
                            id="defaultReviewCycle"
                            min="1"
                            max="60"
                            value={systemSettings.defaultReviewCycle}
                            onChange={(e) => setSystemSettings({ ...systemSettings, defaultReviewCycle: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="defaultRetentionPeriod" className="block text-sm font-medium text-gray-700">
                            Thời gian lưu trữ mặc định (tháng)
                          </label>
                          <input
                            type="number"
                            id="defaultRetentionPeriod"
                            min="1"
                            max="120"
                            value={systemSettings.defaultRetentionPeriod}
                            onChange={(e) => setSystemSettings({ ...systemSettings, defaultRetentionPeriod: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="maxFileSize" className="block text-sm font-medium text-gray-700">
                            Kích thước file tối đa (MB)
                          </label>
                          <input
                            type="number"
                            id="maxFileSize"
                            min="1"
                            max="100"
                            value={systemSettings.maxFileSize}
                            onChange={(e) => setSystemSettings({ ...systemSettings, maxFileSize: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <input
                            id="emailNotifications"
                            type="checkbox"
                            checked={systemSettings.emailNotifications}
                            onChange={(e) => setSystemSettings({ ...systemSettings, emailNotifications: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                            Bật thông báo email
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="documentAutoArchive"
                            type="checkbox"
                            checked={systemSettings.documentAutoArchive}
                            onChange={(e) => setSystemSettings({ ...systemSettings, documentAutoArchive: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="documentAutoArchive" className="ml-2 block text-sm text-gray-900">
                            Tự động lưu trữ tài liệu
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={updateSystemSettingsMutation.isLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <FiSave className="w-4 h-4 mr-2" />
                          {updateSystemSettingsMutation.isLoading ? 'Đang lưu...' : 'Lưu cài đặt'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Backup Management Tab - Admin Only */}
            {activeTab === 'backup' && isAdmin && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <BackupManagementTab />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default SettingsPage;
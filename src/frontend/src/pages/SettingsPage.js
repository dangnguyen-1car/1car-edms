// src/frontend/src/pages/SettingsPage.js
/**
 * =================================================================
 * EDMS 1CAR - Settings Page (ESLint Hooks Fixed)
 * User profile and system settings interface
 * =================================================================
 */

// Imports
import React, { useState, useEffect } from 'react'; // useEffect có thể cần nếu bạn fetch options cho system settings
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiSettings, FiUser, FiLock, FiSave, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { authService } from '../services/authService';
import api from '../services/api'; // Your configured axios instance

// Main SettingsPage Component
function SettingsPage() {
  // === ALL HOOKS MUST BE CALLED AT THE TOP LEVEL ===
  const { isAuthenticated, isLoading: isLoadingAuth, user: currentUser, hasPermission, refreshAuthToken } = useAuth(); // Renamed isLoading to avoid conflict
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

  // Data fetching for user profile
  // The `enabled` option handles conditional fetching correctly according to Rules of Hooks
  const { data: profileResponse, isLoading: isLoadingProfile, error: profileError } = useQuery(
    ['user-profile', currentUser?.id], // Add currentUser.id to key if it makes sense for caching
    authService.getProfile,
    {
      enabled: !!isAuthenticated && !!currentUser, // Only fetch if authenticated and currentUser is available
      onSuccess: (data) => {
        if (data.success && data.user) {
          setProfileData({
            name: data.user.name || '',
            email: data.user.email || '',
            department: data.user.department || '',
            position: data.user.position || '',
            phone: data.user.phone || ''
          });
        } else if (!data.success && data.message?.includes("Token verification failed")) {
            // This case might be handled by interceptors already, but good to be defensive
            // refreshAuthToken().then(() => queryClient.invalidateQueries(['user-profile']));
        }
      },
      onError: (error) => {
        if (error.response?.status === 401 || error.message?.includes("401") || error.message?.includes("Token")) {
          // AuthContext interceptor or logout mechanism should handle this
          // toast.error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          toast.error(error.response?.data?.message || error.message || "Không thể tải thông tin cá nhân.");
        }
      }
    }
  );

  // Data fetching for system settings (only for admin/privileged users)
  const canManageSystem = !!isAuthenticated && !!currentUser && (currentUser.role === 'admin' || hasPermission('manage_system'));
  const { data: systemSettingsResponse, isLoading: isLoadingSystemSettings, error: systemSettingsError } = useQuery(
    ['system-settings'],
    async () => {
      const response = await api.get('/system-settings'); // Backend needs to implement this
      return response.data;
    },
    {
      enabled: canManageSystem, // Correctly use enabled here
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

  // Mutations
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
          toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại nếu được yêu cầu.');
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setErrors({});
          // auth.logout(); // Consider if automatic logout is desired
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
    (settings) => api.put('/system-settings', settings), // Backend needs to implement this
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

  // === EARLY RETURNS AFTER ALL HOOKS ARE CALLED ===
  if (isLoadingAuth) { // Use isLoadingAuth from useAuth()
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Đang kiểm tra xác thực..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Event handlers and validation (phần này không thay đổi, chỉ đảm bảo nó nằm sau Hooks)
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
     if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSystemSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSystemSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateProfile = () => { 
    const newErrors = {};
    if (!profileData.name.trim()) newErrors.name = 'Tên là bắt buộc';
    // Email không cho sửa nên không cần validate ở đây nữa
    // Thêm validation cho position, phone nếu cần
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
   };
  const validatePassword = () => { 
    const newErrors = {};
    if (!passwordData.currentPassword) newErrors.currentPassword = 'Mật khẩu hiện tại là bắt buộc';
    if (!passwordData.newPassword) newErrors.newPassword = 'Mật khẩu mới là bắt buộc';
    else if (passwordData.newPassword.length < 6) newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    if (passwordData.newPassword !== passwordData.confirmPassword) newErrors.confirmPassword = 'Xác nhận mật khẩu không khớp';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
   };
  const validateSystemSettings = () => { 
    const newErrors = {};
    if (systemSettings.defaultReviewCycle < 1 || systemSettings.defaultReviewCycle > 60) {
      newErrors.defaultReviewCycle = 'Chu kỳ rà soát phải từ 1-60 tháng';
    }
    if (systemSettings.defaultRetentionPeriod < 12 || systemSettings.defaultRetentionPeriod > 120) {
      newErrors.defaultRetentionPeriod = 'Thời hạn lưu trữ phải từ 12-120 tháng';
    }
    if (systemSettings.maxFileSize < 1 || systemSettings.maxFileSize > 100) { // Giả sử đơn vị là MB
      newErrors.maxFileSize = 'Kích thước file tối đa phải từ 1-100 MB';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
   };


  const handleUpdateProfile = (e) => {
    e.preventDefault();
    if (validateProfile()) {
      const { email, department, ...dataToUpdate } = profileData; // Không gửi email, department
      updateProfileMutation.mutate(dataToUpdate);
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (validatePassword()) {
      changePasswordMutation.mutate({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
    }
  };

  const handleUpdateSystemSettings = (e) => {
    e.preventDefault();
    if (validateSystemSettings()) {
      updateSystemSettingsMutation.mutate(systemSettings);
    }
  };

  // Data for tabs
  const tabs = [
    { id: 'profile', name: 'Thông tin cá nhân', icon: FiUser },
    { id: 'password', name: 'Đổi mật khẩu', icon: FiLock }
  ];

  if (canManageSystem) { // Sử dụng biến đã tính toán ở trên
    tabs.push({ id: 'system', name: 'Cài đặt hệ thống', icon: FiSettings });
  }

  // Render
  return (
    <div> {/* Layout được render bởi ProtectedRoute, nên ở đây có thể bỏ nếu App.js đã dùng ProtectedRoute */}
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FiSettings className="mr-3" />
            Cài đặt
          </h1>
          <p className="mt-2 text-gray-600">
            Quản lý thông tin cá nhân và cài đặt hệ thống
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${ // Tăng padding Y một chút
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm' // Thay đổi style active
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-gray-900">Thông tin cá nhân</h2>
                </div>
                <div className="card-body">
                  {isLoadingProfile && !profileResponse ? ( // Chỉ hiện loading khi chưa có data lần nào
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="medium" message="Đang tải thông tin..." />
                    </div>
                  ) : profileError && !profileData.name ? ( // Hiển thị lỗi nếu không load được profile
                    <div className="text-center py-8 text-red-600">
                        <FiAlertCircle className="mx-auto h-10 w-10 mb-2"/>
                        <p>Không thể tải thông tin cá nhân: {profileError.message}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Tên *</label>
                          <input type="text" name="name" value={profileData.name} onChange={handleProfileChange} className={`form-input ${errors.name ? 'border-red-500' : ''}`} disabled={updateProfileMutation.isLoading} />
                          {errors.name && <p className="form-error">{errors.name}</p>}
                        </div>
                        <div>
                          <label className="form-label">Email *</label>
                          <input type="email" name="email" value={profileData.email} className="form-input bg-gray-100 cursor-not-allowed" disabled={true} title="Email không thể thay đổi" />
                        </div>
                        <div>
                          <label className="form-label">Phòng ban</label>
                          <input type="text" name="department" value={profileData.department} className="form-input bg-gray-100 cursor-not-allowed" disabled={true} title="Phòng ban không thể thay đổi"/>
                        </div>
                        <div>
                          <label className="form-label">Vị trí</label>
                          <input type="text" name="position" value={profileData.position || ''} onChange={handleProfileChange} className="form-input" disabled={updateProfileMutation.isLoading} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label">Số điện thoại</label>
                          <input type="tel" name="phone" value={profileData.phone || ''} onChange={handleProfileChange} className="form-input" disabled={updateProfileMutation.isLoading} />
                        </div>
                      </div>
                      <div className="flex justify-end pt-4 border-t mt-6">
                        <button type="submit" className="btn btn-primary min-w-[150px]" disabled={updateProfileMutation.isLoading || isLoadingProfile}>
                          {updateProfileMutation.isLoading ? <LoadingSpinner size="sm" /> : <FiSave className="mr-2" />}
                          Lưu thay đổi
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="card">
                <div className="card-header"><h2 className="text-lg font-semibold">Đổi mật khẩu</h2></div>
                <div className="card-body">
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="form-label">Mật khẩu hiện tại *</label>
                      <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className={`form-input ${errors.currentPassword ? 'border-red-500' : ''}`} disabled={changePasswordMutation.isLoading} />
                      {errors.currentPassword && <p className="form-error">{errors.currentPassword}</p>}
                    </div>
                    <div>
                      <label className="form-label">Mật khẩu mới *</label>
                      <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className={`form-input ${errors.newPassword ? 'border-red-500' : ''}`} disabled={changePasswordMutation.isLoading} />
                      {errors.newPassword && <p className="form-error">{errors.newPassword}</p>}
                      <p className="text-xs text-gray-500 mt-1">Ít nhất 6 ký tự.</p>
                    </div>
                    <div>
                      <label className="form-label">Xác nhận mật khẩu mới *</label>
                      <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className={`form-input ${errors.confirmPassword ? 'border-red-500' : ''}`} disabled={changePasswordMutation.isLoading} />
                      {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                    </div>
                    <div className="flex justify-end pt-4 border-t mt-6">
                      <button type="submit" className="btn btn-primary min-w-[150px]" disabled={changePasswordMutation.isLoading}>
                        {changePasswordMutation.isLoading ? <LoadingSpinner size="sm" /> : <FiLock className="mr-2" />}
                        Đổi mật khẩu
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* System Settings Tab (Admin only) */}
            {activeTab === 'system' && canManageSystem && (
              <div className="card">
                <div className="card-header"><h2 className="text-lg font-semibold">Cài đặt hệ thống</h2></div>
                <div className="card-body">
                  {isLoadingSystemSettings && !systemSettingsResponse ? (
                     <div className="flex justify-center py-8"><LoadingSpinner message="Đang tải cài đặt..." /></div>
                  ) : systemSettingsError && !systemSettings.maxFileSize ? ( // Check một trường để biết đã load được chưa
                    <div className="text-center py-8 text-red-600">
                        <FiAlertCircle className="mx-auto h-10 w-10 mb-2"/>
                        <p>Không thể tải cài đặt hệ thống: {systemSettingsError.message}</p>
                        <p className="text-sm text-gray-500 mt-1">API endpoint /api/system-settings có thể chưa được triển khai ở backend.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateSystemSettings} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Chu kỳ rà soát mặc định (tháng)</label>
                          <input type="number" name="defaultReviewCycle" value={systemSettings.defaultReviewCycle} onChange={handleSystemSettingsChange} min="1" max="60" className={`form-input ${errors.defaultReviewCycle ? 'border-red-500' : ''}`} disabled={updateSystemSettingsMutation.isLoading} />
                          {errors.defaultReviewCycle && <p className="form-error">{errors.defaultReviewCycle}</p>}
                        </div>
                        <div>
                          <label className="form-label">Thời hạn lưu trữ mặc định (tháng)</label>
                          <input type="number" name="defaultRetentionPeriod" value={systemSettings.defaultRetentionPeriod} onChange={handleSystemSettingsChange} min="12" max="120" className={`form-input ${errors.defaultRetentionPeriod ? 'border-red-500' : ''}`} disabled={updateSystemSettingsMutation.isLoading} />
                          {errors.defaultRetentionPeriod && <p className="form-error">{errors.defaultRetentionPeriod}</p>}
                        </div>
                        <div>
                          <label className="form-label">Kích thước file tối đa (MB)</label>
                          <input type="number" name="maxFileSize" value={systemSettings.maxFileSize} onChange={handleSystemSettingsChange} min="1" max="100" className={`form-input ${errors.maxFileSize ? 'border-red-500' : ''}`} disabled={updateSystemSettingsMutation.isLoading} />
                          {errors.maxFileSize && <p className="form-error">{errors.maxFileSize}</p>}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center cursor-pointer">
                          <input type="checkbox" id="emailNotifications" name="emailNotifications" checked={systemSettings.emailNotifications} onChange={handleSystemSettingsChange} className="form-checkbox" disabled={updateSystemSettingsMutation.isLoading} />
                          <span className="ml-2 text-sm text-gray-800">Bật thông báo qua email</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input type="checkbox" id="documentAutoArchive" name="documentAutoArchive" checked={systemSettings.documentAutoArchive} onChange={handleSystemSettingsChange} className="form-checkbox" disabled={updateSystemSettingsMutation.isLoading} />
                          <span className="ml-2 text-sm text-gray-800">Tự động lưu trữ tài liệu hết hạn</span>
                        </label>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                        <h4 className="text-sm font-medium text-slate-700 mb-1.5">Lưu ý:</h4>
                        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                          <li>Thay đổi cài đặt hệ thống có thể yêu cầu quyền quản trị cao nhất.</li>
                          <li>Một số thay đổi có thể cần thời gian để áp dụng hoặc khởi động lại dịch vụ.</li>
                        </ul>
                      </div>
                      <div className="flex justify-end pt-4 border-t mt-6">
                        <button type="submit" className="btn btn-primary min-w-[150px]" disabled={updateSystemSettingsMutation.isLoading || isLoadingSystemSettings}>
                           {updateSystemSettingsMutation.isLoading ? <LoadingSpinner size="sm" /> : <FiSave className="mr-2" />}
                           Lưu cài đặt
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
             {activeTab === 'system' && !canManageSystem && (
                 <div className="text-center py-8 text-gray-600">Bạn không có quyền truy cập mục này.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
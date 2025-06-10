// src/frontend/src/pages/UsersPage.js
/**
 * =================================================================
 * EDMS 1CAR - Users Management Page (Admin Only - Refactored for TanStack Query)
 * User management interface for administrators
 * =================================================================
 */

// Imports
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiUsers, FiPlus, FiEdit, FiLock, FiUnlock, FiKey, FiAlertCircle, FiSearch, FiFilter, FiX, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import { userService } from '../services/userService';

// UserFormModal Component - KHÔI PHỤC ĐẦY ĐỦ
function UserFormModal({ isOpen, onClose, user: existingUser, onSuccess }) {
  const initialFormData = {
    name: '', email: '', password: '', department: '', role: 'user',
    position: '', phone: '', is_active: true
  };
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [rolesOptions, setRolesOptions] = useState([
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'user', label: 'Người dùng' }
  ]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: existingUser?.name || '',
        email: existingUser?.email || '',
        password: '', 
        department: existingUser?.department || '',
        role: existingUser?.role || 'user',
        position: existingUser?.position || '',
        phone: existingUser?.phone || '',
        is_active: existingUser?.is_active !== undefined ? existingUser.is_active : true
      });
      setErrors({});
      
      setIsLoadingDepartments(true);
      userService.getDepartments()
        .then(apiResponse => {
          if (apiResponse.success && Array.isArray(apiResponse.data?.departments)) {
            setDepartments(apiResponse.data.departments);
          } else {
            console.warn("Failed to fetch departments from API or invalid format, using fallback.");
            setDepartments([
              'Ban Giám đốc', 'Phòng Phát triển Nhượng quyền', 'Phòng Đào tạo Tiêu chuẩn',
              'Phòng Marketing', 'Phòng Kỹ thuật QC', 'Phòng Tài chính',
              'Phòng Công nghệ Hệ thống', 'Phòng Pháp lý', 'Bộ phận Tiếp nhận CSKH',
              'Bộ phận Kỹ thuật Garage', 'Bộ phận QC Garage', 'Bộ phận Kho/Kế toán Garage',
              'Bộ phận Marketing Garage', 'Quản lý Garage'
            ]);
          }
        }).catch((err) => {
           console.error("Error fetching departments for UserFormModal:", err);
           setDepartments(['Ban Giám đốc', 'Quản lý Garage']);
           toast.error("Không thể tải danh sách phòng ban cho form.");
        }).finally(() => {
            setIsLoadingDepartments(false);
        });
    }
  }, [isOpen, existingUser]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Tên là bắt buộc';
    if (!formData.email.trim()) newErrors.email = 'Email là bắt buộc';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email không hợp lệ';
    
    if (!existingUser && !formData.password) {
        newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    
    if (!formData.department) newErrors.department = 'Phòng ban là bắt buộc';
    if (!formData.role) newErrors.role = 'Vai trò là bắt buộc';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const dataToSubmit = { ...formData };
      if (existingUser && !dataToSubmit.password) {
        delete dataToSubmit.password;
      }

      const response = existingUser 
        ? await userService.updateUser(existingUser.id, dataToSubmit)
        : await userService.createUser(dataToSubmit);

      if (response.success || response.data?.id || response.id ) {
        toast.success(existingUser ? 'Cập nhật người dùng thành công!' : 'Tạo người dùng thành công!');
        if(onSuccess) onSuccess();
        onClose();
      } else {
        if (response.errors) {
            setErrors(response.errors);
            const firstError = Object.values(response.errors)[0];
            toast.error(firstError || 'Vui lòng kiểm tra lại thông tin.');
        } else {
            throw new Error(response.message || 'Thao tác thất bại');
        }
      }
    } catch (error) {
      console.error('User form error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Đã xảy ra lỗi không mong muốn.';
      toast.error(errorMsg);
      if(error.response?.data?.errors) {
        setErrors(prev => ({...prev, ...error.response.data.errors}));
      } else {
        setErrors(prev => ({...prev, general: errorMsg}));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-gray-800">
            {existingUser ? 'Chỉnh sửa Thông tin Người dùng' : 'Tạo Người dùng Mới'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md transition-colors" disabled={loading} aria-label="Đóng modal">
            <FiX size={20} />
          </button>
        </div>

        {errors.general && <div className="p-4 m-4 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">{errors.general}</div>}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label htmlFor="name-userform" className="form-label">Tên người dùng <span className="text-red-500">*</span></label>
              <input id="name-userform" type="text" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`form-input ${errors.name ? 'border-red-400 bg-red-50' : ''}`} disabled={loading} />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="email-userform" className="form-label">Địa chỉ Email <span className="text-red-500">*</span></label>
              <input id="email-userform" type="email" name="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`form-input ${errors.email ? 'border-red-400 bg-red-50' : ''}`} disabled={loading || !!existingUser} />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="password-userform" className="form-label">{existingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}</label>
              <input id="password-userform" type="password" name="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`form-input ${errors.password ? 'border-red-400 bg-red-50' : ''}`} disabled={loading} />
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="department-userform" className="form-label">Phòng ban <span className="text-red-500">*</span></label>
              <select id="department-userform" name="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className={`form-select ${errors.department ? 'border-red-400 bg-red-50' : ''}`} disabled={loading || isLoadingDepartments || departments.length === 0}>
                <option value="">{isLoadingDepartments ? "Đang tải phòng ban..." : "-- Chọn phòng ban --"}</option>
                {departments.map(dept => (<option key={dept} value={dept}>{dept}</option>))}
              </select>
              {errors.department && <p className="form-error">{errors.department}</p>}
            </div>
            <div>
              <label htmlFor="role-userform" className="form-label">Vai trò <span className="text-red-500">*</span></label>
              <select id="role-userform" name="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="form-select" disabled={loading}>
                {rolesOptions.map(role => (<option key={role.value} value={role.value}>{role.label}</option>))}
              </select>
               {errors.role && <p className="form-error">{errors.role}</p>}
            </div>
            <div>
              <label htmlFor="position-userform" className="form-label">Vị trí công việc</label>
              <input id="position-userform" type="text" name="position" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="form-input" disabled={loading} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="phone-userform" className="form-label">Số điện thoại</label>
              <input id="phone-userform" type="tel" name="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="form-input" disabled={loading} />
            </div>
            <div className="md:col-span-2 flex items-center mt-2">
              <input type="checkbox" id={`is_active_modal_userform_${existingUser?.id || 'new'}`} name="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="form-checkbox" disabled={loading} />
              <label htmlFor={`is_active_modal_userform_${existingUser?.id || 'new'}`} className="ml-2 form-label-inline cursor-pointer">Kích hoạt tài khoản này</label>
            </div>
          </div>
           <div className="flex justify-end items-center space-x-3 pt-5 border-t border-gray-200 mt-5">
            <button type="button" onClick={onClose} className="btn btn-secondary-outline" disabled={loading}>Hủy bỏ</button>
            <button type="submit" className="btn btn-primary min-w-[120px]" disabled={loading || isLoadingDepartments}>
              {loading ? <LoadingSpinner size="sm" /> : (existingUser ? 'Lưu thay đổi' : 'Tạo người dùng')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ResetPasswordModal Component - KHÔI PHỤC ĐẦY ĐỦ
function ResetPasswordModal({ isOpen, onClose, user: targetUser, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if(isOpen) {
        setNewPassword('');
        setConfirmPassword('');
        setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!newPassword) newErrors.newPassword = 'Mật khẩu mới là bắt buộc.';
    else if (newPassword.length < 6) newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Xác nhận mật khẩu không khớp.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await userService.resetUserPassword(targetUser.id, newPassword);
      if (response.success) {
        toast.success('Đặt lại mật khẩu thành công!');
        if(onSuccess) onSuccess();
        onClose();
      } else {
        throw new Error(response.message || 'Đặt lại mật khẩu thất bại');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !targetUser) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
         <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Đặt lại mật khẩu cho {targetUser.name}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md" disabled={loading} aria-label="Đóng modal"><FiX size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div>
                <label className="form-label">Mật khẩu mới *</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`form-input ${errors.newPassword ? 'border-red-500' : ''}`} disabled={loading} />
                {errors.newPassword && <p className="form-error">{errors.newPassword}</p>}
            </div>
            <div>
                <label className="form-label">Xác nhận mật khẩu mới *</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`form-input ${errors.confirmPassword ? 'border-red-500' : ''}`} disabled={loading} />
                {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
            </div>
            <div className="flex justify-end space-x-3 pt-4 mt-auto">
                <button type="button" onClick={onClose} className="btn btn-secondary-outline" disabled={loading}>Hủy</button>
                <button type="submit" className="btn btn-primary min-w-[120px]" disabled={loading}>
                    {loading ? <LoadingSpinner size="sm" /> : 'Đặt lại'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}


// Main UsersPage Component - ÁP DỤNG LẠI CÁC SỬA ĐỔI
function UsersPage() {
  const { isAuthenticated, isLoading: isLoadingAuth, user: currentUser, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ search: '', department: '', role: '', is_active: '' });
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // SỬA ĐỔI: Cập nhật cú pháp useQuery và dùng isPending
  const { data: departmentsDataFromService, isPending: isLoadingDepartmentsForFilter } = useQuery({
    queryKey: ['userFilterDepartments'],
    queryFn: userService.getDepartments,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated && !isLoadingAuth,
    select: (apiResponse) => apiResponse.data?.departments || [],
  });
  const departmentOptionsForFilter = departmentsDataFromService || [];

  const canFetchUsers = isAuthenticated && !isLoadingAuth && (hasPermission('manage_users') || currentUser?.role === 'admin');
  
  // SỬA ĐỔI: Cập nhật cú pháp useQuery và dùng isPending
  const { 
    data: usersResponse, 
    isPending: isLoadingUsers,
    isError,
    error,
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ['users', currentPage, pageSize, filters],
    queryFn: () => {
      const params = { 
        page: currentPage, limit: pageSize, search: filters.search || undefined,
        department: filters.department || undefined, role: filters.role || undefined,
        is_active: filters.is_active !== '' ? (filters.is_active === 'true') : undefined
      };
      return userService.getUsers(params);
    },
    keepPreviousData: true, 
    staleTime: 1 * 60 * 1000,
    enabled: canFetchUsers,
  });

  // SỬA ĐỔI: Cập nhật cú pháp useMutation cho nhất quán
  const activateUserMutation = useMutation({
    mutationFn: userService.activateUser,
    onSuccess: () => { toast.success('Kích hoạt người dùng thành công!'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi kích hoạt người dùng.'),
  });

  const deactivateUserMutation = useMutation({
    mutationFn: userService.deactivateUser,
    onSuccess: () => { toast.success('Vô hiệu hóa người dùng thành công!'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi vô hiệu hóa người dùng.'),
  });

  // ... (Phần logic và render còn lại được giữ nguyên)
  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" message="Đang tải..." /></div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!canFetchUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-600">Bạn không có quyền quản lý người dùng.</p>
        </div>
      </div>
    );
  }
  
  const handleFilterChange = (key, value) => { setFilters(prev => ({ ...prev, [key]: value })); setCurrentPage(1); };
  const handleClearFilters = () => { setFilters({ search: '', department: '', role: '', is_active: '' }); setCurrentPage(1);};
  const handleEditUser = (user) => { setSelectedUser(user); setShowUserModal(true); };
  const handleResetPassword = (user) => { setSelectedUser(user); setShowPasswordModal(true); };
  const handleToggleUserStatus = (user) => {
    const actionText = user.is_active ? "vô hiệu hóa" : "kích hoạt";
    if (window.confirm(`Bạn có chắc muốn ${actionText} người dùng ${user.name}?`)) {
        user.is_active ? deactivateUserMutation.mutate(user.id) : activateUserMutation.mutate(user.id);
    }
  };
  const handleModalSuccess = () => { refetch(); };

  const users = usersResponse?.data || [];
  const pagination = usersResponse?.pagination || { total: 0, totalPages: 1, page: currentPage, limit: pageSize };

  return (
    <div>
      <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
                <FiUsers className="mr-3 text-blue-600" />Quản lý Người dùng
              </h1>
              <p className="mt-1 text-sm text-gray-600">Thêm mới, chỉnh sửa và quản lý tài khoản người dùng trong hệ thống.</p>
            </div>
            <div className="flex-shrink-0">
            <button onClick={() => { setSelectedUser(null); setShowUserModal(true); }} className="btn btn-primary w-full sm:w-auto">
              <FiPlus className="mr-2" />Thêm người dùng
            </button>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="form-label">Tìm kiếm (Tên, Email)</label>
                <div className="relative"><FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Nhập tên hoặc email..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="form-input pl-10" /></div>
              </div>
              <div>
                <label className="form-label">Phòng ban</label>
                <select value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)} className="form-select" disabled={isLoadingDepartmentsForFilter}>
                  <option value="">{isLoadingDepartmentsForFilter ? "Đang tải..." : "Tất cả phòng ban"}</option>
                  {departmentOptionsForFilter.map(dept => (<option key={dept} value={dept}>{dept}</option>))}
                </select>
              </div>
              <div>
                <label className="form-label">Vai trò</label>
                <select value={filters.role} onChange={(e) => handleFilterChange('role', e.target.value)} className="form-select">
                  <option value="">Tất cả vai trò</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="user">Người dùng</option>
                </select>
              </div>
              <div>
                <label className="form-label">Trạng thái</label>
                <select value={filters.is_active} onChange={(e) => handleFilterChange('is_active', e.target.value)} className="form-select">
                  <option value="">Tất cả</option>
                  <option value="true">Hoạt động</option>
                  <option value="false">Vô hiệu hóa</option>
                </select>
              </div>
            </div>
             <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <button onClick={handleClearFilters} className="btn btn-secondary-outline w-full sm:w-auto">
                    <FiFilter className="mr-2" />Xóa bộ lọc
                </button>
                <button onClick={() => refetch()} className="btn btn-outline w-full sm:w-auto" disabled={isLoadingUsers || isFetching}>
                    <FiRefreshCw className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />Làm mới
                </button>
                <p className="text-sm text-gray-600">
                    {isFetching && !isLoadingUsers ? 'Đang cập nhật...' : `${pagination.total} người dùng.`}
                </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-0">
            {isLoadingUsers && !usersResponse ? (
              <div className="flex justify-center py-12"><LoadingSpinner message="Đang tải danh sách người dùng..." /></div>
            ) : isError && !usersResponse ? (
                 <div className="text-center py-10 text-red-600">
                    <FiAlertCircle className="mx-auto h-10 w-10 mb-2"/>
                    <p>Lỗi tải danh sách người dùng: {error.message}</p>
                </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr><th>Tên / Vị trí</th><th>Email / SĐT</th><th>Phòng ban</th><th>Vai trò</th><th>Trạng thái</th><th className="text-center">Hành động</th></tr>
                  </thead>
                  <tbody className="table-body">
                    {users.length === 0 && !isFetching ? (
                      <tr><td colSpan="6" className="text-center py-6 text-gray-500">Không tìm thấy người dùng nào khớp với bộ lọc.</td></tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="font-medium text-gray-900">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.position || 'Chưa cập nhật'}</div>
                          </td>
                          <td>
                            <div>{u.email}</div>
                            <div className="text-xs text-gray-500">{u.phone || ''}</div>
                          </td>
                          <td>{u.department}</td>
                          <td><span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>{u.role === 'admin' ? 'Quản trị' : 'Người dùng'}</span></td>
                          <td><span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}</span></td>
                          <td>
                            <div className="flex justify-center items-center space-x-1">
                              <button onClick={() => handleEditUser(u)} className="btn-icon text-slate-600 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50" title="Chỉnh sửa"><FiEdit size={16}/></button>
                              <button onClick={() => handleResetPassword(u)} className="btn-icon text-slate-600 hover:text-orange-600 p-1.5 rounded-md hover:bg-orange-50" title="Đặt lại mật khẩu"><FiKey size={16}/></button>
                              <button onClick={() => handleToggleUserStatus(u)} className={`btn-icon ${u.is_active ? 'text-slate-600 hover:text-red-600' : 'text-slate-600 hover:text-green-600'} p-1.5 rounded-md ${u.is_active ? 'hover:bg-red-50' : 'hover:bg-green-50'}`} title={u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                                {u.is_active ? <FiLock size={16}/> : <FiUnlock size={16}/>}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {pagination.totalPages > 1 && !isLoadingUsers && users.length > 0 && (
          <div className="mt-6">
            <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.total} pageSize={pagination.limit} onPageChange={setCurrentPage} onPageSizeChange={(size) => {setPageSize(size); setCurrentPage(1);}} />
          </div>
        )}
        {showUserModal && <UserFormModal isOpen={showUserModal} onClose={() => { setShowUserModal(false); setSelectedUser(null); }} user={selectedUser} onSuccess={handleModalSuccess} />}
        {selectedUser && showPasswordModal && <ResetPasswordModal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setSelectedUser(null); }} user={selectedUser} onSuccess={handleModalSuccess} />}
      </div>
    </div>
  );
}

export default UsersPage;
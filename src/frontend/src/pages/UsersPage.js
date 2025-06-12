// src/frontend/src/pages/UsersPage.js
/**
 * =================================================================
 * EDMS 1CAR - Users Management Page (FINAL UI RESTORED VERSION)
 * - Restored original button placement and badge styling from UsersPage_old.js.
 * - This version should be visually identical to the old version while retaining all functional bug fixes.
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

// =================================================================
// UserFormModal COMPONENT (Defined internally)
// =================================================================
function UserFormModal({ isOpen, onClose, user: existingUser, onSuccess }) {
  const initialFormData = {
    name: '', email: '', password: '', department: '', role: 'user',
    position: '', phone: '', is_active: true
  };
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { data: departmentOptions, isLoading: isLoadingDepartments } = useQuery({
      queryKey: ['departmentsForUserForm'],
      queryFn: userService.getDepartments,
      staleTime: 5 * 60 * 1000,
      enabled: isOpen,
      select: (apiResponse) => apiResponse.success ? apiResponse.data.departments : [],
  });

  const rolesOptions = [
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'user', label: 'Người dùng' }
  ];

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
    }
  }, [isOpen, existingUser]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Tên là bắt buộc';
    if (!formData.email.trim()) newErrors.email = 'Email là bắt buộc';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email không hợp lệ';
    if (!existingUser && !formData.password) newErrors.password = 'Mật khẩu là bắt buộc';
    else if (formData.password && formData.password.length < 6) newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
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
      if (existingUser && !dataToSubmit.password) delete dataToSubmit.password;
      
      await (existingUser 
        ? userService.updateUser(existingUser.id, dataToSubmit)
        : userService.createUser(dataToSubmit));

      toast.success(existingUser ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
      if(onSuccess) onSuccess();
      onClose();
    } catch (error) {
      const errorMsg = error.message || 'Thao tác thất bại.';
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold">{existingUser ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}</h3>
          <button onClick={onClose} disabled={loading}><FiX size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.general && <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">{errors.general}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tên *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} disabled={loading} className={`form-input ${errors.name ? 'border-red-500' : ''}`} />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} disabled={loading || !!existingUser} className={`form-input ${errors.email ? 'border-red-500' : ''} ${!!existingUser ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>
            <div>
              <label className="form-label">{existingUser ? 'Mật khẩu mới' : 'Mật khẩu *'}</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))} disabled={loading} className={`form-input ${errors.password ? 'border-red-500' : ''}`} placeholder={existingUser ? 'Để trống nếu không đổi' : ''} />
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>
            <div>
              <label className="form-label">Phòng ban *</label>
              <select value={formData.department} onChange={(e) => setFormData(prev => ({...prev, department: e.target.value}))} disabled={loading || isLoadingDepartments} className={`form-select ${errors.department ? 'border-red-500' : ''}`}>
                <option value="">{isLoadingDepartments ? "Đang tải..." : "-- Chọn phòng ban --"}</option>
                {(departmentOptions || []).map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
              {errors.department && <p className="form-error">{errors.department}</p>}
            </div>
            <div>
              <label className="form-label">Vai trò *</label>
              <select value={formData.role} onChange={(e) => setFormData(prev => ({...prev, role: e.target.value}))} disabled={loading} className={`form-select ${errors.role ? 'border-red-500' : ''}`}>
                {rolesOptions.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              {errors.role && <p className="form-error">{errors.role}</p>}
            </div>
             <div>
              <label className="form-label">Vị trí công việc</label>
              <input type="text" value={formData.position} onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))} className="form-input" disabled={loading} />
            </div>
            <div className="md:col-span-2">
                <label className="form-label">Số điện thoại</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="form-input" disabled={loading} />
            </div>
             <div className="md:col-span-2 flex items-center">
                <input type="checkbox" id="is_active_modal" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="form-checkbox" disabled={loading} />
                <label htmlFor="is_active_modal" className="ml-2 form-label-inline cursor-pointer">Kích hoạt tài khoản</label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
            <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary-outline">Hủy</button>
            <button type="submit" disabled={loading || isLoadingDepartments} className="btn btn-primary">
              {loading ? <LoadingSpinner size="sm" /> : (existingUser ? 'Lưu thay đổi' : 'Tạo người dùng')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =================================================================
// ResetPasswordModal COMPONENT (Defined internally)
// =================================================================
function ResetPasswordModal({ isOpen, onClose, user, onSuccess }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
        setError('');
        setLoading(true);
        try {
            await userService.resetUserPassword(user.id, password);
            toast.success(`Đã đặt lại mật khẩu cho ${user.name}.`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message || 'Lỗi đặt lại mật khẩu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (!isOpen) { setPassword(''); setError(''); } }, [isOpen]);
    
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold">Đặt lại mật khẩu cho {user.name}</h2>
                    <button onClick={onClose} disabled={loading}><FiX size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="form-label">Mật khẩu mới *</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} className={`form-input ${error ? 'border-red-500' : ''}`} />
                        {error && <p className="form-error">{error}</p>}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary-outline">Hủy</button>
                        <button type="submit" disabled={loading || !password} className="btn btn-primary">
                            {loading ? <LoadingSpinner size="sm" /> : 'Xác nhận'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =================================================================
// Main UsersPage COMPONENT
// =================================================================
function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ search: '', department: '', role: '', is_active: '' });
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const rolesOptions = [
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'user', label: 'Người dùng' },
  ];

  const { data: departmentOptions, isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['departmentsForFilter'],
    queryFn: () => userService.getDepartments(),
    staleTime: 5 * 60 * 1000,
    select: (apiResponse) => apiResponse?.success ? apiResponse.data.departments : [],
  });

  const { data: usersData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['users', currentPage, pageSize, filters],
    queryFn: () => {
        const params = { 
            page: currentPage, 
            limit: pageSize, 
            search: filters.search || undefined,
            department: filters.department || undefined, 
            role: filters.role || undefined,
            is_active: filters.is_active !== '' ? (filters.is_active === 'true') : undefined
        };
        return userService.getUsers(params);
    },
    keepPreviousData: true,
  });

  const { mutate: toggleUserStatus, isPending: isTogglingStatus } = useMutation({
    mutationFn: (user) => user.is_active ? userService.deactivateUser(user.id) : userService.activateUser(user.id),
    onSuccess: (_, user) => {
      toast.success(`Đã ${user.is_active ? 'vô hiệu hóa' : 'kích hoạt'} người dùng.`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.message || 'Thao tác thất bại.'),
  });

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const users = usersData?.data || [];
  const pagination = usersData?.pagination || { total: 0, totalPages: 1, page: 1, limit: 10 };

  const handleFilterChange = (key, value) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setCurrentPage(1);
    setFilters({ search: '', department: '', role: '', is_active: '' });
  };
  
  const handleEditUser = (user) => { setSelectedUser(user); setShowUserModal(true); };
  const handleResetPassword = (user) => { setSelectedUser(user); setShowPasswordModal(true); };
  
  return (
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
              <input type="text" placeholder="Nhập tên hoặc email..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Phòng ban</label>
              <select value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)} className="form-select" disabled={isLoadingDepartments}>
                <option value="">{isLoadingDepartments ? "Đang tải..." : "Tất cả phòng ban"}</option>
                {(departmentOptions || []).map(dept => (<option key={dept} value={dept}>{dept}</option>))}
              </select>
            </div>
            <div>
              <label className="form-label">Vai trò</label>
              <select value={filters.role} onChange={(e) => handleFilterChange('role', e.target.value)} className="form-select">
                <option value="">Tất cả vai trò</option>
                {rolesOptions.map(role => (<option key={role.value} value={role.value}>{role.label}</option>))}
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
            <button onClick={() => refetch()} className="btn btn-outline w-full sm:w-auto" disabled={isFetching}>
              <FiRefreshCw className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />Làm mới
            </button>
            <p className="text-sm text-gray-600">
              {isFetching ? 'Đang cập nhật...' : `${pagination.total} người dùng.`}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner message="Đang tải danh sách người dùng..." /></div> : error ? <div className="text-center py-10 text-red-600"><FiAlertCircle className="mx-auto h-10 w-10 mb-2"/><p>Lỗi tải danh sách người dùng: {error.message}</p></div> : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr><th>Tên / Vị trí</th><th>Email / SĐT</th><th>Phòng ban</th><th>Vai trò</th><th>Trạng thái</th><th className="text-center">Hành động</th></tr>
                </thead>
                <tbody className="table-body">
                  {users.length > 0 ? users.map(user => (
                    <tr key={user.id}>
                      <td><div className="font-medium">{user.name}</div><div className="text-xs text-gray-500">{user.position}</div></td>
                      <td><div>{user.email}</div><div className="text-xs text-gray-500">{user.phone}</div></td>
                      <td>{user.department}</td>
                      {/* SỬA LỖI: Khôi phục lại màu nền cho badge */}
                      <td><span className={`badge ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>{rolesOptions.find(r => r.value === user.role)?.label}</span></td>
                      <td><span className={`badge ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-800'}`}>{user.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}</span></td>
                      <td className="text-center">
                          <div className="flex justify-center items-center space-x-1">
                              <button onClick={() => handleEditUser(user)} className="btn-icon text-slate-600 hover:text-blue-600" title="Chỉnh sửa"><FiEdit size={16}/></button>
                              <button onClick={() => handleResetPassword(user)} className="btn-icon text-slate-600 hover:text-orange-600" title="Đặt lại mật khẩu"><FiKey size={16}/></button>
                              <button onClick={() => toggleUserStatus(user)} disabled={isTogglingStatus} className={`btn-icon ${user.is_active ? 'text-slate-600 hover:text-red-600' : 'text-slate-600 hover:text-green-600'}`} title={user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                                  {user.is_active ? <FiLock size={16}/> : <FiUnlock size={16}/>}
                              </button>
                          </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="text-center py-10 text-gray-500">Không tìm thấy người dùng nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {pagination.totalPages > 1 && !isLoading && users.length > 0 && (
        <div className="mt-6">
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.total} pageSize={pagination.limit} onPageChange={setCurrentPage} onPageSizeChange={(size) => {setPageSize(size); setCurrentPage(1);}} />
        </div>
      )}

      <UserFormModal isOpen={showUserModal} onClose={() => { setShowUserModal(false); setSelectedUser(null); }} user={selectedUser} onSuccess={refetch} />
      {selectedUser && <ResetPasswordModal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setSelectedUser(null); }} user={selectedUser} />}
    </div>
  );
}

export default UsersPage;
// src/frontend/src/components/documents/DocumentPermissionsPanel.js
/**
 * =================================================================
 * EDMS 1CAR - Document Permissions Panel
 * Component quản lý phân quyền chi tiết cho tài liệu
 * =================================================================
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import {
  FiShield, FiUser, FiUsers, FiTrash2, FiPlus, FiEye, FiEdit,
  FiCheckCircle, FiSettings, FiClock, FiMail
} from 'react-icons/fi';

import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import SkeletonLoader from '../common/SkeletonLoader';

import { documentAPI } from '../../api/documentApi';
import { userAPI } from '../../api/userApi';
import { useAuth } from '../../contexts/AuthContext';

const DocumentPermissionsPanel = ({ documentId }) => {
  // =================================================================
  // HOOKS INITIALIZATION (useState, useContext, useQueryClient)
  // =================================================================
  const { } = useAuth();
  const queryClient = useQueryClient();

  // State cho form thêm quyền mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPermission, setNewPermission] = useState({
    type: 'user',
    targetId: null,
    permission: 'read'
  });

  // =================================================================
  // DATA FETCHING (useQuery)
  // =================================================================
  // Lấy danh sách quyền hiện tại
  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError
  } = useQuery({
    queryKey: ['documentPermissions', documentId],
    queryFn: () => documentAPI.getDocumentPermissions(documentId),
    enabled: !!documentId,
  });

  // Lấy danh sách users cho dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userAPI.getUsers({ limit: 100 }), // Lấy tối đa 100 user, có thể cần phân trang hoặc tìm kiếm tốt hơn
    enabled: showAddForm && newPermission.type === 'user',
  });

  // Lấy danh sách departments
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => documentAPI.getDepartments(),
    enabled: showAddForm && newPermission.type === 'department',
  });

  // =================================================================
  // MUTATIONS (useMutation)
  // =================================================================
  // Thêm quyền mới
  const addPermissionMutation = useMutation({
    mutationFn: (permissionData) => documentAPI.grantDocumentPermission(documentId, permissionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['documentPermissions', documentId]);
      toast.success('Đã gán quyền thành công');
      setShowAddForm(false);
      setNewPermission({ type: 'user', targetId: null, permission: 'read' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Không thể gán quyền');
    }
  });

  // Thu hồi quyền
  const revokePermissionMutation = useMutation({
    mutationFn: (permissionId) => documentAPI.revokeDocumentPermission(documentId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['documentPermissions', documentId]);
      toast.success('Đã thu hồi quyền thành công');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Không thể thu hồi quyền');
    }
  });

  // =================================================================
  // COMPUTED VALUES (useMemo)
  // =================================================================
  const permissions = useMemo(() => {
    return permissionsData?.data?.permissions || [];
  }, [permissionsData]);

  const document = useMemo(() => {
    return permissionsData?.data?.document || {};
  }, [permissionsData]);

  // Options cho dropdown users
  const userOptions = useMemo(() => {
    if (!usersData?.data) return [];
    return usersData.data.map(user => ({
      value: user.id,
      label: `${user.name} (${user.email})`,
      department: user.department
    }));
  }, [usersData]);

  // Options cho dropdown departments
  const departmentOptions = useMemo(() => {
    if (!departmentsData?.data?.departments) return [];
    return departmentsData.data.departments.map(dept => ({
      value: dept,
      label: dept
    }));
  }, [departmentsData]);

  // =================================================================
  // HELPER FUNCTIONS (Non-hook functions)
  // =================================================================
  const getPermissionIcon = (permissionType) => {
    switch (permissionType) {
      case 'read': return <FiEye className="w-4 h-4 text-blue-500" />;
      case 'write': return <FiEdit className="w-4 h-4 text-green-500" />;
      case 'approve': return <FiCheckCircle className="w-4 h-4 text-purple-500" />;
      case 'admin': return <FiSettings className="w-4 h-4 text-red-500" />;
      default: return <FiShield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPermissionLabel = (permissionType) => {
    switch (permissionType) {
      case 'read': return 'Xem';
      case 'write': return 'Chỉnh sửa';
      case 'approve': return 'Phê duyệt';
      case 'admin': return 'Quản trị';
      default: return permissionType;
    }
  };

  const getPermissionBadgeColor = (permissionType) => {
    switch (permissionType) {
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'write': return 'bg-green-100 text-green-800';
      case 'approve': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // =================================================================
  // EVENT HANDLERS
  // =================================================================
  const handleAddPermission = () => {
    if (!newPermission.targetId) {
      toast.error('Vui lòng chọn đối tượng để gán quyền');
      return;
    }
    addPermissionMutation.mutate({
      type: newPermission.type,
      targetId: newPermission.targetId,
      permission: newPermission.permission
    });
  };

  const handleRevokePermission = (permissionId, targetName) => {
    // IMPORTANT: Avoid using window.confirm() in production due to blocking nature and UI limitations.
    // Replace with a custom modal/dialog component for better UX.
    if (window.confirm(`Bạn có chắc chắn muốn thu hồi quyền của "${targetName}"?`)) {
      revokePermissionMutation.mutate(permissionId);
    }
  };

  // =================================================================
  // RENDER LOGIC
  // =================================================================
  if (permissionsLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader height="h-8" />
        <SkeletonLoader height="h-32" />
        <SkeletonLoader height="h-24" />
      </div>
    );
  }

  if (permissionsError) {
    return (
      <ErrorMessage
        message="Không thể tải danh sách phân quyền"
        onRetry={() => queryClient.invalidateQueries(['documentPermissions', documentId])}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiShield className="w-5 h-5 text-blue-600" />
            Phân quyền tài liệu
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Quản lý quyền truy cập cho tài liệu: <span className="font-medium">{document.code}</span>
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary flex items-center gap-2"
          disabled={addPermissionMutation.isLoading}
        >
          <FiPlus className="w-4 h-4" />
          Thêm quyền
        </button>
      </div>

      {/* Add Permission Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-medium text-gray-900 mb-4">Gán quyền mới</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại đối tượng
              </label>
              <select
                value={newPermission.type}
                onChange={(e) => setNewPermission(prev => ({
                  ...prev,
                  type: e.target.value,
                  targetId: null
                }))}
                className="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="user">Người dùng</option>
                <option value="department">Phòng ban</option>
              </select>
            </div>
            {/* Target Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {newPermission.type === 'user' ? 'Chọn người dùng' : 'Chọn phòng ban'}
              </label>
              <Select
                value={newPermission.type === 'user'
                  ? userOptions.find(opt => opt.value === newPermission.targetId)
                  : departmentOptions.find(opt => opt.value === newPermission.targetId)
                }
                onChange={(selectedOption) =>
                  setNewPermission(prev => ({
                    ...prev,
                    targetId: selectedOption?.value || null
                  }))
                }
                options={newPermission.type === 'user' ? userOptions : departmentOptions}
                placeholder={`Chọn ${newPermission.type === 'user' ? 'người dùng' : 'phòng ban'}...`}
                isClearable
                isSearchable
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </div>
            {/* Permission Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại quyền
              </label>
              <select
                value={newPermission.permission}
                onChange={(e) => setNewPermission(prev => ({
                  ...prev,
                  permission: e.target.value
                }))}
                className="form-select w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="read">Xem</option>
                <option value="write">Chỉnh sửa</option>
                <option value="approve">Phê duyệt</option>
                <option value="admin">Quản trị</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="btn btn-secondary"
              disabled={addPermissionMutation.isLoading}
            >
              Hủy
            </button>
            <button
              onClick={handleAddPermission}
              className="btn btn-primary"
              disabled={addPermissionMutation.isLoading || !newPermission.targetId}
            >
              {addPermissionMutation.isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Đang thêm...
                </>
              ) : (
                'Thêm quyền'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Permissions List */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        {permissions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FiShield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Chưa có phân quyền nào</p>
            <p className="text-sm">Tài liệu này chưa được gán quyền truy cập cụ thể cho ai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Đối tượng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quyền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Người gán
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {permission.type === 'user' ? (
                            <FiUser className="w-5 h-5 text-gray-400" />
                          ) : (
                            <FiUsers className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {permission.targetName}
                          </div>
                          {permission.type === 'user' && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <FiMail className="w-3 h-3" />
                              {permission.targetEmail}
                            </div>
                          )}
                          {permission.targetDepartment && (
                            <div className="text-xs text-gray-500">
                              {permission.targetDepartment}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getPermissionBadgeColor(permission.permissionType)}`}>
                        {getPermissionIcon(permission.permissionType)}
                        {getPermissionLabel(permission.permissionType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {permission.grantedBy.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {new Date(permission.grantedAt).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRevokePermission(permission.id, permission.targetName)}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                        disabled={revokePermissionMutation.isLoading}
                        title="Thu hồi quyền"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Thu hồi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
        <h4 className="font-medium text-blue-900 mb-2">Tóm tắt phân quyền</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-600 font-medium">Tổng số quyền:</span>
            <span className="ml-2 text-blue-900">{permissions.length}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Người dùng:</span>
            <span className="ml-2 text-blue-900">
              {permissions.filter(p => p.type === 'user').length}
            </span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Phòng ban:</span>
            <span className="ml-2 text-blue-900">
              {permissions.filter(p => p.type === 'department').length}
            </span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Quyền cao nhất:</span>
            <span className="ml-2 text-blue-900">
              {permissions.some(p => p.permissionType === 'admin') ? 'Quản trị' :
               permissions.some(p => p.permissionType === 'approve') ? 'Phê duyệt' :
               permissions.some(p => p.permissionType === 'write') ? 'Chỉnh sửa' : 'Xem'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPermissionsPanel;
// src/frontend/src/components/layout/Sidebar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { documentService } from '../../services/documentService';
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiSettings,
  FiSearch,
  FiArchive,
  FiUpload,
  FiActivity,
  FiStar,
  FiClock,
  FiBarChart2,
  FiX,
  FiAlertTriangle
} from 'react-icons/fi';

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { user } = useAuth();

  // =================================================================
  // Data Fetching (TanStack Query)
  // =================================================================
  // Query pending approval count for badge
  const { data: pendingStats } = useQuery({
    queryKey: ['pendingApprovalStats'],
    queryFn: () => documentService.getPendingApprovalStats(),
    enabled: !!user && user.role !== 'guest',
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    staleTime: 60 * 1000
  });
  const pendingCount = pendingStats?.data?.total_pending || 0;

  // =================================================================
  // Helper Functions
  // =================================================================
  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'Quản trị viên',
      'manager': 'Quản lý',
      'user': 'Người dùng',
      'guest': 'Khách'
    };
    return roleNames[role] || 'Không xác định';
  };

  const getRoleBadgeClass = (role) => {
    const badgeClasses = {
      'admin': 'bg-red-100 text-red-800',
      'manager': 'bg-blue-100 text-blue-800',
      'user': 'bg-green-100 text-green-800',
      'guest': 'bg-gray-100 text-gray-800'
    };
    return badgeClasses[role] || 'bg-gray-100 text-gray-800';
  };

  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Trang chủ',
        href: '/',
        icon: FiHome,
        current: location.pathname === '/',
        roles: ['admin', 'manager', 'user', 'guest']
      },
      {
        name: 'Tài liệu',
        href: '/documents',
        icon: FiFileText,
        current: location.pathname.startsWith('/documents'),
        roles: ['admin', 'manager', 'user', 'guest'],
        children: [
          {
            name: 'Danh sách tài liệu',
            href: '/documents',
            current: location.pathname === '/documents'
          },
          {
            name: 'Chờ phê duyệt',
            href: '/documents/pending-approval',
            current: location.pathname === '/documents/pending-approval',
            roles: ['admin', 'manager', 'user'],
            badge: pendingCount > 0 ? pendingCount : null,
            badgeColor: pendingCount > 0 ? 'bg-red-500 text-white' : null,
            icon: pendingCount > 0 ? FiAlertTriangle : null
          }
        ]
      },
      {
        name: 'Tìm kiếm',
        href: '/search',
        icon: FiSearch,
        current: location.pathname === '/search',
        roles: ['admin', 'manager', 'user', 'guest']
      }
    ];

    // Add upload for non-guest users
    if (user?.role !== 'guest') {
      baseItems.push({
        name: 'Tải lên',
        href: '/upload',
        icon: FiUpload,
        current: location.pathname === '/upload',
        roles: ['admin', 'manager', 'user']
      });
    }

    // Add user-specific items
    if (['user', 'manager', 'admin'].includes(user?.role)) {
      baseItems.push(
        {
          name: 'Yêu thích',
          href: '/favorites',
          icon: FiStar,
          current: location.pathname === '/favorites',
          roles: ['admin', 'manager', 'user']
        },
        {
          name: 'Gần đây',
          href: '/recent',
          icon: FiClock,
          current: location.pathname === '/recent',
          roles: ['admin', 'manager', 'user']
        }
      );
    }

    // Add manager/admin items
    if (['manager', 'admin'].includes(user?.role)) {
      baseItems.push({
        name: 'Báo cáo',
        href: '/reports',
        icon: FiBarChart2,
        current: location.pathname.startsWith('/reports'),
        roles: ['admin', 'manager']
      });
    }

    // Add admin-only items
    if (user?.role === 'admin') {
      baseItems.push(
        {
          name: 'Quản lý người dùng',
          href: '/users',
          icon: FiUsers,
          current: location.pathname.startsWith('/users'),
          roles: ['admin']
        },
        {
          name: 'Lưu trữ',
          href: '/archive',
          icon: FiArchive,
          current: location.pathname === '/archive',
          roles: ['admin']
        },
        {
          name: 'Hoạt động',
          href: '/activity',
          icon: FiActivity,
          current: location.pathname === '/activity',
          roles: ['admin']
        },
        {
          name: 'Cài đặt',
          href: '/settings',
          icon: FiSettings,
          current: location.pathname === '/settings',
          roles: ['admin']
        }
      );
    }

    return baseItems.filter(item =>
      !item.roles || item.roles.includes(user?.role || 'guest')
    );
  };

  const navigationItems = getNavigationItems();

  const renderNavItem = (item) => {
    const IconComponent = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = hasChildren && item.current;

    return (
      <div key={item.name}>
        <Link
          to={item.href}
          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            item.current && !hasChildren
              ? 'bg-blue-100 text-blue-900'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
          onClick={onClose}
        >
          <IconComponent
            className={`mr-3 flex-shrink-0 h-5 w-5 ${
              item.current && !hasChildren ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
            }`}
          />
          <span className="flex-1">{item.name}</span>
          {item.badge && (
            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              item.badgeColor || 'bg-gray-100 text-gray-800'
            }`}>
              {item.badge}
            </span>
          )}
        </Link>
        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children
              .filter(child => !child.roles || child.roles.includes(user?.role || 'guest'))
              .map((child) => (
                <Link
                  key={child.name}
                  to={child.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    child.current
                      ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={onClose}
                >
                  {child.icon && (
                    <child.icon className="mr-2 h-4 w-4 text-gray-400" />
                  )}
                  <span className="flex-1">{child.name}</span>
                  {child.badge && (
                    <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      child.badgeColor || 'bg-red-100 text-red-800'
                    }`}>
                      {child.badge}
                    </span>
                  )}
                </Link>
              ))}
          </div>
        )}
      </div>
    );
  };

  // =================================================================
  // Render JSX
  // =================================================================
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <FiFileText className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">1CAR EDMS</h1>
                  <p className="text-xs text-gray-500">v1.0.0</p>
                </div>
              </div>
            </div>
            {/* User info */}
            {user && (
              <div className="px-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name || 'Người dùng'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.department || 'Chưa xác định'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Navigation */}
            <nav className="flex-1 px-2 space-y-1">
              {navigationItems.map(renderNavItem)}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`md:hidden ${isOpen ? 'fixed inset-0 z-40' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={onClose}
            >
              <span className="sr-only">Đóng sidebar</span>
              <FiX className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            {/* Mobile Logo */}
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <FiFileText className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">1CAR EDMS</h1>
                  <p className="text-xs text-gray-500">v1.0.0</p>
                </div>
              </div>
            </div>
            {/* Mobile User info */}
            {user && (
              <div className="px-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name || 'Người dùng'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.department || 'Chưa xác định'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Mobile Navigation */}
            <nav className="px-2 space-y-1">
              {navigationItems.map(renderNavItem)}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
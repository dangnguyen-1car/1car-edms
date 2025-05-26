/**
 * =================================================================
 * EDMS 1CAR - Sidebar Navigation Component
 * Navigation sidebar based on C-FM-MG-004 role permissions
 * =================================================================
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiFileText, 
  FiUsers, 
  FiSettings, 
  FiSearch,
  FiArchive,
  FiUpload,
  FiActivity
} from 'react-icons/fi';

function Sidebar({ isOpen, onClose, user }) {
  const location = useLocation();

  // Navigation items based on C-FM-MG-004 role matrix
  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Trang chủ',
        href: '/',
        icon: FiHome,
        current: location.pathname === '/'
      },
      {
        name: 'Tài liệu',
        href: '/documents',
        icon: FiFileText,
        current: location.pathname.startsWith('/documents')
      },
      {
        name: 'Tìm kiếm',
        href: '/search',
        icon: FiSearch,
        current: location.pathname === '/search'
      },
      {
        name: 'Tải lên',
        href: '/upload',
        icon: FiUpload,
        current: location.pathname === '/upload'
      }
    ];

    // Admin-only items based on C-FM-MG-004
    if (user?.role === 'admin') {
      baseItems.push(
        {
          name: 'Quản lý người dùng',
          href: '/users',
          icon: FiUsers,
          current: location.pathname.startsWith('/users')
        },
        {
          name: 'Lưu trữ',
          href: '/archive',
          icon: FiArchive,
          current: location.pathname === '/archive'
        },
        {
          name: 'Hoạt động',
          href: '/activity',
          icon: FiActivity,
          current: location.pathname === '/activity'
        },
        {
          name: 'Cài đặt',
          href: '/settings',
          icon: FiSettings,
          current: location.pathname === '/settings'
        }
      );
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-gray-900">EDMS 1CAR</h1>
          </div>

          {/* User info */}
          <div className="mt-5 px-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.department}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                user?.role === 'admin' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    item.current
                      ? 'sidebar-link-active'
                      : 'sidebar-link-inactive'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                >
                  <Icon
                    className={`${
                      item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 flex-shrink-0 h-5 w-5`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer info */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Hệ thống Quản lý Tài liệu Điện tử
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Phiên bản 1.0.0
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">EDMS 1CAR</h1>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Đóng menu</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User info */}
          <div className="p-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.department}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                user?.role === 'admin' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`${
                    item.current
                      ? 'sidebar-link-active'
                      : 'sidebar-link-inactive'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                >
                  <Icon
                    className={`${
                      item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 flex-shrink-0 h-5 w-5`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}

export default Sidebar;

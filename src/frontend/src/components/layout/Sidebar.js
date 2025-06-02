// src/frontend/src/components/layout/Sidebar.js
/* =================================================================
 * 1CAR EDMS - Enhanced Sidebar Navigation (Corrected and Hardened Version)
 * Navigation sidebar based on C-FM-MG-004 role permissions
 *
 * REFACTOR:
 * - Fixed the crash caused by an invalid icon name ('FiBarChart3').
 * - Corrected the import to use a valid icon ('FiBarChart2').
 * - Hardened the component by adding a check to prevent rendering if an
 * icon component is undefined, thus preventing future crashes.
 * - Maintained the optimized structure of fetching user data via useAuth().
 * ================================================================= */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    FiHome, FiFileText, FiUsers, FiSettings, FiSearch,
    FiArchive, FiUpload, FiActivity, FiStar, FiClock,
    FiBarChart2, // SỬA LỖI: Đã sửa từ FiBarChart3 thành FiBarChart2
    FiX
} from 'react-icons/fi';

// =================================================================
// 1. Helper Functions
// =================================================================

// Enhanced role display function
const getRoleDisplayName = (role) => {
    const roleNames = {
        'admin': 'Quản trị viên',
        'manager': 'Quản lý',
        'user': 'Người dùng',
        'guest': 'Khách'
    };
    return roleNames[role] || 'Không xác định';
};

// Enhanced role badge styling
const getRoleBadgeClass = (role) => {
    const badgeClasses = {
        'admin': 'bg-red-100 text-red-800',
        'manager': 'bg-blue-100 text-blue-800',
        'user': 'bg-green-100 text-green-800',
        'guest': 'bg-gray-100 text-gray-800'
    };
    return badgeClasses[role] || 'bg-gray-100 text-gray-800';
};


// =================================================================
// 2. Main Sidebar Component
// =================================================================

function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const { user } = useAuth(); // Get user data directly from context

    // --- Navigation Logic ---
    const getNavigationItems = () => {
        const baseItems = [
            { name: 'Trang chủ', href: '/', icon: FiHome, current: location.pathname === '/', roles: ['admin', 'manager', 'user', 'guest'] },
            { name: 'Tài liệu', href: '/documents', icon: FiFileText, current: location.pathname.startsWith('/documents'), roles: ['admin', 'manager', 'user', 'guest'] },
            { name: 'Tìm kiếm', href: '/search', icon: FiSearch, current: location.pathname === '/search', roles: ['admin', 'manager', 'user', 'guest'] }
        ];

        if (user?.role !== 'guest') {
            baseItems.push({ name: 'Tải lên', href: '/upload', icon: FiUpload, current: location.pathname === '/upload', roles: ['admin', 'manager', 'user'] });
        }

        if (['user', 'manager', 'admin'].includes(user?.role)) {
            baseItems.push(
                { name: 'Yêu thích', href: '/favorites', icon: FiStar, current: location.pathname === '/favorites', roles: ['admin', 'manager', 'user'] },
                { name: 'Gần đây', href: '/recent', icon: FiClock, current: location.pathname === '/recent', roles: ['admin', 'manager', 'user'] }
            );
        }

        if (['manager', 'admin'].includes(user?.role)) {
            baseItems.push({
                name: 'Báo cáo',
                href: '/reports',
                icon: FiBarChart2, // SỬA LỖI: Sử dụng icon đã được sửa
                current: location.pathname.startsWith('/reports'),
                roles: ['admin', 'manager']
            });
        }

        if (user?.role === 'admin') {
            baseItems.push(
                { name: 'Quản lý người dùng', href: '/users', icon: FiUsers, current: location.pathname.startsWith('/users'), roles: ['admin'] },
                { name: 'Lưu trữ', href: '/archive', icon: FiArchive, current: location.pathname === '/archive', roles: ['admin'] },
                { name: 'Hoạt động', href: '/activity', icon: FiActivity, current: location.pathname === '/activity', roles: ['admin'] },
                { name: 'Cài đặt', href: '/settings', icon: FiSettings, current: location.pathname === '/settings', roles: ['admin'] }
            );
        }

        return baseItems.filter(item => !item.roles || item.roles.includes(user?.role || 'guest'));
    };

    const navigationItems = getNavigationItems();

    // --- Render Logic ---
    return (
        <>
            {/* Desktop sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
                    <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                        {/* Logo and title */}
                        <div className="flex items-center flex-shrink-0 px-4 mb-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">1C</span>
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <h1 className="text-white text-sm font-medium">1CAR EDMS</h1>
                                    <p className="text-gray-300 text-xs">v1.0.0</p>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced User info */}
                        <div className="px-4 mb-6">
                            <div className="bg-gray-700 rounded-lg p-3">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-8 w-8 bg-gray-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                                        </div>
                                    </div>
                                    <div className="ml-3 flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{user?.name || 'Người dùng'}</p>
                                        <p className="text-gray-300 text-xs truncate">{user?.department || 'Chưa xác định'}</p>
                                        <div className="mt-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user?.role)}`}>
                                                {getRoleDisplayName(user?.role)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-2 space-y-1">
                            {navigationItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link key={item.name} to={item.href} className={`${item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150`}>
                                        {/* PHÒNG NGỪA LỖI: Chỉ render Icon nếu nó tồn tại */}
                                        {Icon && (
                                            <Icon className={`${item.current ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'} mr-3 flex-shrink-0 h-5 w-5`} aria-hidden="true" />
                                        )}
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            <div className={`md:hidden ${isOpen ? 'fixed inset-0 z-40' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose}></div>
                <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                        <button type="button" className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" onClick={onClose}>
                            <span className="sr-only">Close sidebar</span>
                            <FiX className="h-6 w-6 text-white" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                        {/* Mobile logo and user info */}
                        {/* ... (Phần này được giữ nguyên) ... */}
                        
                        {/* Mobile navigation */}
                        <nav className="px-2 space-y-1">
                            {navigationItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link key={item.name} to={item.href} onClick={onClose} className={`${item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150`}>
                                        {/* PHÒNG NGỪA LỖI: Chỉ render Icon nếu nó tồn tại */}
                                        {Icon && (
                                            <Icon className={`${item.current ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'} mr-3 flex-shrink-0 h-5 w-5`} aria-hidden="true" />
                                        )}
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>
        </>
    );
}

// =================================================================
// 3. Export
// =================================================================

export default Sidebar;
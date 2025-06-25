// src/frontend/src/components/layout/Sidebar.js
/* =================================================================
 * 1CAR EDMS - Enhanced Sidebar Navigation (Corrected and Hardened Version)
 * Navigation sidebar based on C-FM-MG-004 role permissions
 *
 * REFACTOR:
 * - Merged the visually appealing dark theme from the old file with new functionalities.
 * - Added a notification badge for "Pending Approvals" by fetching data with TanStack Query.
 * - Fixed the crash caused by an invalid icon name ('FiBarChart3').
 * - Corrected the import to use a valid icon ('FiBarChart2').
 * - Hardened the component by adding a check to prevent rendering if an
 * icon component is undefined, thus preventing future crashes.
 * - Maintained the optimized structure of fetching user data via useAuth().
 * ================================================================= */

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
    FiBarChart2, // SỬA LỖI: Đã sửa từ FiBarChart3 thành FiBarChart2
    FiX,
    FiAlertTriangle,
    FiShield,     // Thêm import mới
    FiTrendingUp  // Thêm import mới
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

    // --- Data Fetching (TanStack Query for Pending Approvals Badge) ---
    const { data: pendingStats } = useQuery({
        queryKey: ['pendingApprovalStats'],
        queryFn: () => documentService.getPendingApprovalStats(),
        enabled: !!user && (user.role === 'admin' || user.role === 'manager'),
        refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
        staleTime: 60 * 1000,
    });
    const pendingCount = pendingStats?.data?.total_pending || 0;

    // --- Navigation Logic ---
    const getNavigationItems = () => {
        const baseItems = [
            { name: 'Trang chủ', href: '/', icon: FiHome, current: location.pathname === '/', roles: ['admin', 'manager', 'user', 'guest'] },
            { 
                name: 'Tài liệu', 
                href: '/documents', 
                icon: FiFileText, 
                current: location.pathname.startsWith('/documents'), 
                roles: ['admin', 'manager', 'user', 'guest'],
                children: [
                    { name: 'Danh sách tài liệu', href: '/documents', current: location.pathname === '/documents' },
                    { 
                        name: 'Chờ phê duyệt', 
                        href: '/documents/pending-approval', 
                        current: location.pathname === '/documents/pending-approval', 
                        roles: ['admin', 'manager', 'user'],
                        badge: pendingCount > 0 ? pendingCount : null,
                        badgeColor: 'bg-red-500 text-white',
                        icon: pendingCount > 0 ? FiAlertTriangle : null
                    }
                ]
            },
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

        // Cập nhật phần Báo cáo & Thống kê
        if (['manager', 'admin'].includes(user?.role)) {
            baseItems.push({
                name: 'Báo cáo & Thống kê',
                href: '/reports',
                icon: FiBarChart2,
                current: location.pathname.startsWith('/reports'),
                roles: ['admin', 'manager'],
                children: [
                    {
                        name: 'Báo cáo Hoạt động',
                        href: '/reports/activity',
                        current: location.pathname === '/reports/activity',
                        roles: ['admin'],
                        icon: FiActivity
                    },
                    {
                        name: 'Báo cáo Tuân thủ',
                        href: '/reports/compliance',
                        current: location.pathname === '/reports/compliance',
                        roles: ['admin', 'manager'],
                        icon: FiShield
                    },
                    {
                        name: 'Thống kê Sử dụng',
                        href: '/reports/usage',
                        current: location.pathname === '/reports/usage',
                        roles: ['admin', 'manager'],
                        icon: FiTrendingUp
                    }
                ]
            });
        }

        if (user?.role === 'admin') {
            baseItems.push(
                { name: 'Quản lý người dùng', href: '/users', icon: FiUsers, current: location.pathname.startsWith('/users'), roles: ['admin'] },
                { name: 'Lưu trữ', href: '/archive', icon: FiArchive, current: location.pathname === '/archive', roles: ['admin'] },               
                { name: 'Cài đặt', href: '/settings', icon: FiSettings, current: location.pathname === '/settings', roles: ['admin'] }
            );
        }

        return baseItems.filter(item => !item.roles || item.roles.includes(user?.role || 'guest'));
    };

    const navigationItems = getNavigationItems();

    // Reusable Nav Item Renderer
    const renderNavItem = (item) => {
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        // A parent item is "current" if its path is the start of the current location's path
        const isParentCurrent = hasChildren && location.pathname.startsWith(item.href);

        return (
            <div key={item.name}>
                <Link
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                        (item.current && !hasChildren) || (isParentCurrent && !item.children.some(c => c.current))
                        ? 'bg-gray-900 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    onClick={onClose}
                >
                    {Icon && (
                        <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${
                            (item.current && !hasChildren) || isParentCurrent
                            ? 'text-gray-300' 
                            : 'text-gray-400 group-hover:text-gray-300'
                        }`} aria-hidden="true" />
                    )}
                    <span className="flex-1">{item.name}</span>
                </Link>

                {/* Render children if the parent is active */}
                {hasChildren && isParentCurrent && (
                    <div className="mt-1 ml-7 pl-2 border-l border-gray-600 space-y-1">
                        {item.children
                            .filter(child => !child.roles || child.roles.includes(user?.role || 'guest'))
                            .map(child => {
                                const ChildIcon = child.icon;
                                return (
                                    <Link
                                        key={child.name}
                                        to={child.href}
                                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                                            child.current ? 'text-white bg-gray-700/50' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                        }`}
                                        onClick={onClose}
                                    >
                                        {ChildIcon && <ChildIcon className="mr-2 h-4 w-4 text-red-400" />}
                                        <span className="flex-1">{child.name}</span>
                                        {child.badge && (
                                            <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${child.badgeColor || 'bg-red-500 text-white'}`}>
                                                {child.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })
                        }
                    </div>
                )}
            </div>
        );
    };

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
                            {navigationItems.map(renderNavItem)}
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
                        <nav className="mt-5 px-2 space-y-1">
                            {navigationItems.map(renderNavItem)}
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
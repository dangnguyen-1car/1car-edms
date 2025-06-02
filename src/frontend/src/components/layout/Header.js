// src/frontend/src/components/layout/Header.js
/**
 * =================================================================
 * EDMS 1CAR - Complete and Optimized Header Component
 * This version contains the full JSX for rendering the header,
 * including the mobile menu button, and is optimized to use the useAuth hook.
 * =================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiBell, FiMenu, FiUser, FiLogOut, FiSettings, FiChevronDown } from 'react-icons/fi';
import { Link } from 'react-router-dom';

function Header({ onMenuClick }) {
    // --- State and Refs ---
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notificationCount] = useState(3); // Mock notification count
    const userMenuRef = useRef(null);
    
    // --- Hooks ---
    // Get user and logout function directly from the context, removing the need for user prop
    const { user, logout } = useAuth();

    // --- Helper Functions & Event Handlers ---
    const handleLogout = async () => {
        await logout();
    };

    const getRoleDisplayName = (role) => {
        const roleNames = { 'admin': 'Quản trị viên', 'manager': 'Quản lý', 'user': 'Người dùng', 'guest': 'Khách' };
        return roleNames[role] || 'Không xác định';
    };

    const getRoleBadgeClass = (role) => {
        const badgeClasses = { 'admin': 'bg-red-100 text-red-800', 'manager': 'bg-blue-100 text-blue-800', 'user': 'bg-green-100 text-green-800', 'guest': 'bg-gray-100 text-gray-800' };
        return badgeClasses[role] || 'bg-gray-100 text-gray-800';
    };

    // --- Side Effects ---
    // Close user menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Render Logic ---
    return (
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        {/* Mobile menu button - This is the crucial trigger */}
                        <button
                            type="button"
                            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            onClick={onMenuClick}
                        >
                            <span className="sr-only">Open main menu</span>
                            <FiMenu className="h-6 w-6" aria-hidden="true" />
                        </button>

                        {/* Desktop title */}
                        <div className="hidden md:flex md:items-center">
                            <h1 className="text-xl font-semibold text-gray-900">1CAR - EDMS</h1>
                            <span className="ml-2 text-sm text-gray-500">Hệ thống Quản lý Tài liệu</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* Notifications */}
                        <button type="button" className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full">
                            <span className="sr-only">View notifications</span>
                            <FiBell className="h-6 w-6" aria-hidden="true" />
                            {notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                        </button>
                        {/* User menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                type="button"
                                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                                    <span className="text-gray-700 text-sm font-medium">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-medium text-gray-900">{user?.name || 'Người dùng'}</p>
                                    <p className="text-xs text-gray-500">{user?.department || 'Chưa xác định'}</p>
                                </div>
                                <FiChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${userMenuOpen ? 'transform rotate-180' : ''}`} />
                            </button>
                            {/* Dropdown menu */}
                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                    <div className="px-4 py-3 border-b border-gray-200">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-12 w-12 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-gray-700 text-lg font-medium">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Người dùng'}</p>
                                                <p className="text-sm text-gray-500 truncate">{user?.email || 'Chưa có email'}</p>
                                                <div className="mt-1">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user?.role)}`}>
                                                        {getRoleDisplayName(user?.role)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="py-1">
                                        <Link to="/profile" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150" onClick={() => setUserMenuOpen(false)}>
                                            <FiUser className="mr-3 h-4 w-4 text-gray-400" />
                                            Thông tin cá nhân
                                        </Link>
                                        {['admin', 'manager'].includes(user?.role) && (
                                            <Link to="/settings" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150" onClick={() => setUserMenuOpen(false)}>
                                                <FiSettings className="mr-3 h-4 w-4 text-gray-400" />
                                                Cài đặt
                                            </Link>
                                        )}
                                        <div className="border-t border-gray-200 my-1"></div>
                                        <button className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors duration-150" onClick={handleLogout}>
                                            <FiLogOut className="mr-3 h-4 w-4 text-red-400" />
                                            Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Header;
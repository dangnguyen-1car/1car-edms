// src/components/documents/ShareDocumentModal.js
/**
 * =================================================================
 * EDMS 1CAR - Share Document Modal Component
 * Document sharing functionality
 * Compliant with Plan 10.3
 * =================================================================
 */

// 1. IMPORTS
// -----------------------------------------------------------------
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    FiShare, FiCopy, FiMail, FiUsers, FiLink, FiCheck,
    FiAlertCircle, FiX, FiCalendar, FiShield
} from 'react-icons/fi';
import { documentAPI } from '../../api/documentApi';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../common/Modal';

// 2. COMPONENT DEFINITION
// -----------------------------------------------------------------
function ShareDocumentModal({ document, isOpen, onClose, onSuccess }) {

    // 3. HOOKS & STATE MANAGEMENT
    // -----------------------------------------------------------------
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [formData, setFormData] = useState({
        selectedUsers: [],
        selectedDepartments: [],
        permissions: 'read',
        expiryDate: '',
        message: '',
        notifyByEmail: true
    });
    const [shareLink, setShareLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);
    const [errors, setErrors] = useState({});

    // 4. DATA FETCHING (React Query)
    // -----------------------------------------------------------------
    const { data: usersData } = useQuery({
        queryKey: ['usersListForSharing'],
        queryFn: documentAPI.getUsers,
        enabled: isOpen,
        staleTime: 5 * 60 * 1000,
    });
    const { data: departmentsData } = useQuery({
        queryKey: ['departmentsListForSharing'],
        queryFn: documentAPI.getDepartments,
        enabled: isOpen,
        staleTime: 5 * 60 * 1000,
    });

    // 5. DATA MUTATIONS (React Query)
    // -----------------------------------------------------------------
    const shareMutation = useMutation({
        mutationFn: (shareData) => documentAPI.shareDocument(document.id, shareData),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['documentShares', document.id] });
            toast.success('Tài liệu đã được chia sẻ thành công.');
            onSuccess?.(data);
            handleClose(true);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Lỗi khi chia sẻ tài liệu.');
            console.error('Share error:', error);
        }
    });

    const generateLinkMutation = useMutation({
        mutationFn: (linkData) => documentAPI.generateShareLink(document.id, linkData),
        onSuccess: (data) => {
            setShareLink(data.shareLink);
            toast.success('Đã tạo liên kết chia sẻ.');
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Lỗi khi tạo liên kết.');
            console.error('Generate link error:', error);
        }
    });

    // 6. VALIDATION & EVENT HANDLERS
    // -----------------------------------------------------------------
    const validateForm = () => {
        const newErrors = {};
        if (activeTab === 'users' && formData.selectedUsers.length === 0 && formData.selectedDepartments.length === 0) {
            newErrors.recipients = 'Vui lòng chọn ít nhất một người dùng hoặc phòng ban.';
        }
        if (formData.expiryDate) {
            const expiry = new Date(formData.expiryDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (expiry <= today) {
                newErrors.expiryDate = 'Ngày hết hạn phải sau ngày hiện tại.';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleShare = () => {
        if (!validateForm()) return;
        shareMutation.mutate({
            shareType: 'users',
            users: formData.selectedUsers,
            departments: formData.selectedDepartments,
            permissions: formData.permissions,
            expiryDate: formData.expiryDate || null,
            message: formData.message.trim(),
            notifyByEmail: formData.notifyByEmail
        });
    };

    const handleGenerateLink = () => {
        generateLinkMutation.mutate({
            permissions: formData.permissions,
            expiryDate: formData.expiryDate || null
        });
    };

    const handleCopyLink = async () => {
        if (!shareLink) return;
        try {
            await navigator.clipboard.writeText(shareLink);
            setLinkCopied(true);
            toast.success('Đã sao chép liên kết vào clipboard.');
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (error) {
            toast.error('Không thể sao chép liên kết.');
        }
    };

    const handleUserSelect = (userId) => {
        setFormData(prev => ({
            ...prev,
            selectedUsers: prev.selectedUsers.includes(userId)
                ? prev.selectedUsers.filter(id => id !== userId)
                : [...prev.selectedUsers, userId]
        }));
        if (errors.recipients) setErrors(prev => ({...prev, recipients: ''}));
    };

    const handleDepartmentSelect = (department) => {
        setFormData(prev => ({
            ...prev,
            selectedDepartments: prev.selectedDepartments.includes(department)
                ? prev.selectedDepartments.filter(d => d !== department)
                : [...prev.selectedDepartments, department]
        }));
        if (errors.recipients) setErrors(prev => ({...prev, recipients: ''}));
    };

    const handleClose = (force = false) => {
        if ((shareMutation.isLoading || generateLinkMutation.isLoading) && !force) return;
        setFormData({ selectedUsers: [], selectedDepartments: [], permissions: 'read', expiryDate: '', message: '', notifyByEmail: true });
        setErrors({});
        setShareLink('');
        setLinkCopied(false);
        setActiveTab('users');
        onClose();
    };
    
    // 7. DERIVED STATE
    // -----------------------------------------------------------------
    const users = usersData?.data || [];
    const departments = departmentsData?.data || [];

    // 8. MAIN RENDER
    // -----------------------------------------------------------------
    return (
        <Modal isOpen={isOpen} onClose={() => handleClose()} title="Chia sẻ Tài liệu" size="2xl">
            <div className="space-y-6">

                {/* --- Document Information --- */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Tài liệu được chia sẻ</h4>
                    <div className="text-sm">
                        <p className="text-gray-900 font-medium truncate">{document?.title}</p>
                        <p className="text-gray-600">Mã: {document?.document_code} | Phiên bản: {document?.version}</p>
                    </div>
                </div>

                {/* --- Tab Navigation --- */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {[{ id: 'users', label: 'Chia sẻ với người dùng', icon: FiUsers }, { id: 'link', label: 'Tạo liên kết', icon: FiLink }].map(tab => {
                            // SỬA LỖI 1: Gán icon cho biến viết hoa
                            const IconComponent = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    <IconComponent className="mr-2 h-4 w-4" />{tab.label}
                                </button>
                            )
                        })}
                    </nav>
                </div>

                {/* --- Tab Content --- */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">Người nhận <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-gray-600 mb-1 block">Chọn người dùng cụ thể</label><div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">{users.map(u => (<label key={u.id} className="flex items-center p-2 hover:bg-gray-50 rounded"><input type="checkbox" checked={formData.selectedUsers.includes(u.id)} onChange={() => handleUserSelect(u.id)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /><div className="ml-3"><p className="text-sm font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-500">{u.email}</p></div></label>))}</div></div>
                            <div><label className="text-xs text-gray-600 mb-1 block">Chọn cả phòng ban</label><div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-2">{departments.map(dept => (<label key={dept} className="flex items-center p-2 rounded hover:bg-gray-50"><input type="checkbox" checked={formData.selectedDepartments.includes(dept)} onChange={() => handleDepartmentSelect(dept)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /><span className="ml-2 text-sm text-gray-900">{dept}</span></label>))}</div></div>
                        </div>
                        {errors.recipients && <p className="text-sm text-red-600 flex items-center"><FiAlertCircle className="h-4 w-4 mr-1" />{errors.recipients}</p>}
                    </div>
                )}
                {activeTab === 'link' && (
                    <div className="space-y-4">
                        {!shareLink && <p className="text-sm text-gray-600">Tạo liên kết để chia sẻ tài liệu với bất kỳ ai (kể cả người ngoài tổ chức). Quyền truy cập và ngày hết hạn sẽ được áp dụng.</p>}
                        {shareLink ? (
                            <div className="bg-gray-50 rounded-lg p-4">
                                {/* SỬA LỖI 2: Đóng thẻ label đúng */}
                                <label className="block text-sm font-medium text-gray-700 mb-2">Liên kết chia sẻ</label>
                                <div className="flex"><input type="text" value={shareLink} readOnly className="flex-1 block w-full rounded-l-md border-gray-300 bg-gray-100 text-sm" /><button onClick={handleCopyLink} className={`px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${linkCopied ? 'bg-green-100 text-green-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{linkCopied ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />}</button></div>
                            </div>
                        ) : (
                             <button onClick={handleGenerateLink} disabled={generateLinkMutation.isLoading} className="btn btn-outline flex items-center">{generateLinkMutation.isLoading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>Đang tạo...</>) : (<><FiLink className="h-4 w-4 mr-2" />Tạo liên kết</>)}</button>
                        )}
                    </div>
                )}

                {/* --- Common Controls --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quyền truy cập</label>
                        <select value={formData.permissions} onChange={(e) => setFormData(prev => ({ ...prev, permissions: e.target.value }))} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"><option value="read">Chỉ xem</option><option value="comment">Xem và bình luận</option>{/* <option value="edit">Xem và chỉnh sửa</option> */}</select>
                    </div>
                    <div>
                        <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-2">Ngày hết hạn (tùy chọn)</label>
                        <div className="relative"><FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="date" id="expiryDate" value={formData.expiryDate} onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))} min={new Date().toISOString().split('T')[0]} className={`pl-10 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.expiryDate ? 'border-red-300' : 'border-gray-300'}`} /></div>
                        {errors.expiryDate && <p className="mt-1 text-xs text-red-600 flex items-center"><FiAlertCircle className="h-3 w-3 mr-1" />{errors.expiryDate}</p>}
                    </div>
                </div>
                {activeTab === 'users' && (
                    <>
                        <div><label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Tin nhắn (tùy chọn)</label><textarea id="message" rows={3} value={formData.message} onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Thêm tin nhắn cho người nhận..."></textarea></div>
                        <div className="flex items-center"><input id="notifyByEmail" type="checkbox" checked={formData.notifyByEmail} onChange={(e) => setFormData(prev => ({ ...prev, notifyByEmail: e.target.checked }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /><label htmlFor="notifyByEmail" className="ml-2 text-sm text-gray-900">Gửi thông báo qua email cho người nhận</label></div>
                    </>
                )}

                {/* --- Security Notice --- */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm flex items-start"><FiShield className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" /><div><p><strong>Lưu ý bảo mật:</strong> Việc chia sẻ sẽ được ghi lại trong lịch sử tài liệu. Hãy đảm bảo bạn chỉ chia sẻ với những người có thẩm quyền.</p></div></div>
                
                {/* --- Action Buttons --- */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={() => handleClose()} disabled={shareMutation.isLoading || generateLinkMutation.isLoading} className="btn btn-outline">Hủy</button>
                    {activeTab === 'users' && <button onClick={handleShare} disabled={shareMutation.isLoading} className="btn btn-primary flex items-center min-w-[120px] justify-center">{shareMutation.isLoading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div><span>Đang chia sẻ...</span></>) : (<><FiShare className="h-4 w-4 mr-2" /><span>Chia sẻ</span></>)}</button>}
                </div>
            </div>
        </Modal>
    );
}

// 9. EXPORT
// -----------------------------------------------------------------
export default ShareDocumentModal;
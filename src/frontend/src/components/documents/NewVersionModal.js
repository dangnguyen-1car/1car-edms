// src/components/documents/NewVersionModal.js
/**
 * =================================================================
 * EDMS 1CAR - New Version Modal Component
 * Create new document version with change tracking
 * Compliant with Plan 10.1 and C-PR-VM-001
 * =================================================================
 */

// 1. IMPORTS
// -----------------------------------------------------------------
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { FiX, FiGitBranch, FiInfo, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { documentAPI } from '../../api/documentApi';
import Modal from '../common/Modal';

// 2. COMPONENT DEFINITION
// -----------------------------------------------------------------
function NewVersionModal({ document, isOpen, onClose, onSuccess }) {

    // 3. HOOKS & STATE MANAGEMENT
    // -----------------------------------------------------------------
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        versionType: 'minor',
        changeReason: '',
        changeSummary: ''
    });
    const [errors, setErrors] = useState({});

    // 4. HELPER FUNCTIONS & DERIVED STATE
    // -----------------------------------------------------------------
    const calculateNextVersion = (currentVersion, versionType) => {
        if (!currentVersion) return '01.00';
        const [major, minor] = currentVersion.split('.').map(Number);
        if (versionType === 'major') {
            return `${String(major + 1).padStart(2, '0')}.00`;
        }
        return `${String(major).padStart(2, '0')}.${String(minor + 1).padStart(2, '0')}`;
    };

    // Memoize the next version calculation to avoid re-computing on every render
    const nextVersion = useMemo(() =>
        calculateNextVersion(document?.version || '01.00', formData.versionType),
        [document?.version, formData.versionType]
    );

    // 5. DATA MUTATION (React Query)
    // -----------------------------------------------------------------
    const createVersionMutation = useMutation({
        mutationFn: (versionData) => documentAPI.createDocumentVersion(document.id, versionData),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['document', document.id] });
            queryClient.invalidateQueries({ queryKey: ['documentVersions', document.id] });
            toast.success('Phiên bản mới đã được tạo thành công!');
            onSuccess?.(data);
            handleClose(true); // Close after success
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Lỗi khi tạo phiên bản mới.');
            console.error(error);
        },
    });

    // 6. VALIDATION & EVENT HANDLERS
    // -----------------------------------------------------------------
    const validateForm = () => {
        const newErrors = {};
        if (!formData.versionType) {
            newErrors.versionType = 'Vui lòng chọn loại thay đổi.';
        }
        if (!formData.changeReason.trim()) {
            newErrors.changeReason = 'Vui lòng nhập lý do thay đổi.';
        } else if (formData.changeReason.trim().length < 10) {
            newErrors.changeReason = 'Lý do phải có ít nhất 10 ký tự.';
        } else if (formData.changeReason.trim().length > 500) {
            newErrors.changeReason = 'Lý do không được vượt quá 500 ký tự.';
        }
        if (!formData.changeSummary.trim()) {
            newErrors.changeSummary = 'Vui lòng nhập tóm tắt thay đổi.';
        } else if (formData.changeSummary.trim().length < 20) {
            newErrors.changeSummary = 'Tóm tắt phải có ít nhất 20 ký tự.';
        } else if (formData.changeSummary.trim().length > 1000) {
            newErrors.changeSummary = 'Tóm tắt không được vượt quá 1000 ký tự.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear the specific error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        createVersionMutation.mutate({
            versionType: formData.versionType,
            changeReason: formData.changeReason.trim(),
            changeSummary: formData.changeSummary.trim()
        });
    };

    const handleClose = (force = false) => {
        if (createVersionMutation.isLoading && !force) return; // Prevent closing while creating
        setFormData({ versionType: 'minor', changeReason: '', changeSummary: '' });
        setErrors({});
        onClose();
    };

    // 7. MAIN RENDER
    // -----------------------------------------------------------------
    return (
        <Modal isOpen={isOpen} onClose={() => handleClose()} title="Tạo Phiên bản Mới" size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* --- Current Document Info --- */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                        <FiGitBranch className="h-5 w-5 text-blue-600 mr-2" />
                        <h4 className="font-medium text-gray-900">Thông tin phiên bản</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-600">Tài liệu:</span><p className="font-medium text-gray-900 truncate">{document?.title}</p></div>
                        <div><span className="text-gray-600">Mã:</span><p className="font-medium text-gray-900">{document?.document_code}</p></div>
                        <div><span className="text-gray-600">Phiên bản hiện tại:</span><p className="font-medium text-gray-900">{document?.version}</p></div>
                        <div><span className="text-gray-600">Phiên bản mới:</span><p className="font-bold text-blue-600">{nextVersion}</p></div>
                    </div>
                </div>

                {/* --- Version Type Selection --- */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Loại thay đổi <span className="text-red-500">*</span></label>
                    <div className="space-y-3">
                        {/* Minor Change */}
                        <div className="flex items-start"><input id="version-minor" type="radio" name="versionType" value="minor" checked={formData.versionType === 'minor'} onChange={(e) => handleInputChange('versionType', e.target.value)} className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" /><div className="ml-3"><label htmlFor="version-minor" className="text-sm font-medium text-gray-900">Thay đổi nhỏ (Minor)</label><p className="text-xs text-gray-500 mt-1">Sửa lỗi, cải tiến nhỏ, cập nhật định dạng, làm rõ nội dung.</p></div></div>
                        {/* Major Change */}
                        <div className="flex items-start"><input id="version-major" type="radio" name="versionType" value="major" checked={formData.versionType === 'major'} onChange={(e) => handleInputChange('versionType', e.target.value)} className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" /><div className="ml-3"><label htmlFor="version-major" className="text-sm font-medium text-gray-900">Thay đổi lớn (Major)</label><p className="text-xs text-gray-500 mt-1">Thay đổi cấu trúc, quy trình, phạm vi, trách nhiệm chính.</p></div></div>
                    </div>
                    {errors.versionType && <p className="mt-2 text-sm text-red-600 flex items-center"><FiAlertCircle className="h-4 w-4 mr-1" />{errors.versionType}</p>}
                </div>

                {/* --- Change Reason --- */}
                <div>
                    <label htmlFor="changeReason" className="block text-sm font-medium text-gray-700 mb-2">Lý do thay đổi <span className="text-red-500">*</span></label>
                    <textarea id="changeReason" rows={3} value={formData.changeReason} onChange={(e) => handleInputChange('changeReason', e.target.value)} className={`block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.changeReason ? 'border-red-300' : 'border-gray-300'}`} placeholder="Mô tả lý do cần tạo phiên bản mới..."></textarea>
                    <div className="mt-1 flex justify-between text-xs">
                        {errors.changeReason ? <p className="text-red-600 flex items-center"><FiAlertCircle className="h-3 w-3 mr-1" />{errors.changeReason}</p> : <p className="text-gray-500">Tối thiểu 10 ký tự</p>}
                        <p className="text-gray-500">{formData.changeReason.length}/500</p>
                    </div>
                </div>

                {/* --- Change Summary --- */}
                <div>
                    <label htmlFor="changeSummary" className="block text-sm font-medium text-gray-700 mb-2">Tóm tắt các thay đổi <span className="text-red-500">*</span></label>
                    <textarea id="changeSummary" rows={4} value={formData.changeSummary} onChange={(e) => handleInputChange('changeSummary', e.target.value)} className={`block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.changeSummary ? 'border-red-300' : 'border-gray-300'}`} placeholder="Liệt kê chi tiết những thay đổi đã được thực hiện trong phiên bản này..."></textarea>
                    <div className="mt-1 flex justify-between text-xs">
                        {errors.changeSummary ? <p className="text-red-600 flex items-center"><FiAlertCircle className="h-3 w-3 mr-1" />{errors.changeSummary}</p> : <p className="text-gray-500">Tối thiểu 20 ký tự</p>}
                        <p className="text-gray-500">{formData.changeSummary.length}/1000</p>
                    </div>
                </div>

                {/* --- Version Preview --- */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center mb-2"><FiInfo className="h-5 w-5 text-blue-600 mr-2" /><h4 className="font-medium text-blue-900">Xem trước</h4></div>
                    <div className="text-sm text-blue-800">
                        <p>Phiên bản <strong>{nextVersion}</strong> sẽ được tạo và chuyển cho bạn chỉnh sửa.</p>
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>Loại thay đổi: <strong>{formData.versionType === 'major' ? 'Lớn (Major)' : 'Nhỏ (Minor)'}</strong></li>
                            <li>Trạng thái ban đầu: <strong>Bản nháp (Draft)</strong></li>
                        </ul>
                    </div>
                </div>

                {/* --- Action Buttons --- */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={() => handleClose()} disabled={createVersionMutation.isLoading} className="btn btn-outline">Hủy</button>
                    <button type="submit" disabled={createVersionMutation.isLoading} className="btn btn-primary flex items-center min-w-[120px] justify-center">
                        {createVersionMutation.isLoading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div><span>Đang tạo...</span></>) : (<><FiCheck className="h-4 w-4 mr-2" /><span>Tạo phiên bản</span></>)}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// 8. EXPORT
// -----------------------------------------------------------------
export default NewVersionModal;
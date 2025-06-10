// src/components/documents/ChangeStatusModal.js
/**
 * =================================================================
 * EDMS 1CAR - Change Status Modal Component
 * Administrative status change functionality
 * Compliant with Plan 10.6
 * =================================================================
 */

// 1. IMPORTS
// -----------------------------------------------------------------
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    FiRefreshCw, FiAlertTriangle, FiEdit, FiEye, FiCheckCircle, FiArchive,
    FiTrash2, FiAlertCircle, FiMessageSquare, FiShield, FiInfo
} from 'react-icons/fi';
import { documentAPI } from '../../api/documentApi';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../common/Modal';

// 2. COMPONENT DEFINITION
// -----------------------------------------------------------------
function ChangeStatusModal({ document, isOpen, onClose, onSuccess }) {

    // 3. HOOKS & STATE MANAGEMENT
    // -----------------------------------------------------------------
    const queryClient = useQueryClient();
    const { user, hasPermission } = useAuth(); // Giả định useAuth có hasPermission
    const [formData, setFormData] = useState({
        newStatus: '',
        reason: '',
        notifyStakeholders: true
    });
    const [errors, setErrors] = useState({});

    // 4. DATA MUTATION (React Query)
    // -----------------------------------------------------------------
    const statusChangeMutation = useMutation({
        mutationFn: (statusData) => documentAPI.changeDocumentStatus(document.id, statusData),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['document', document.id] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast.success('Trạng thái tài liệu đã được thay đổi thành công.');
            onSuccess?.(data);
            handleClose(true);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Lỗi khi thay đổi trạng thái.');
            console.error('Status change error:', error);
        }
    });

    // 5. HELPER FUNCTIONS & BUSINESS LOGIC
    // -----------------------------------------------------------------
    const getStatusInfo = (status) => {
        const statusMap = {
            'draft': { icon: FiEdit, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Bản nháp', description: 'Tài liệu đang được soạn thảo.' },
            'review': { icon: FiEye, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Đang xem xét', description: 'Tài liệu đang chờ được xem xét và phê duyệt.' },
            'published': { icon: FiCheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Đã ban hành', description: 'Tài liệu đã được phê duyệt và có hiệu lực.' },
            'archived': { icon: FiArchive, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Đã lưu trữ', description: 'Tài liệu không còn hiệu lực nhưng vẫn được lưu trữ.' },
            'disposed': { icon: FiTrash2, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Đã hủy', description: 'Tài liệu đã được hủy vĩnh viễn theo quy định.' }
        };
        return statusMap[status] || statusMap.draft;
    };

    const requiresSpecialPermission = (fromStatus, toStatus) => {
        const specialTransitions = [
            { from: 'published', to: 'draft' },
            { from: 'published', to: 'archived' },
            { from: 'archived', to: 'disposed' }
        ];
        return specialTransitions.some(t => t.from === fromStatus && t.to === toStatus);
    };

    const getAvailableStatuses = (currentStatus) => {
        const transitions = {
            'draft': ['review', 'archived'],
            'review': ['draft', 'published'],
            'published': ['archived', 'draft'], // Requires special permission to revert
            'archived': ['published', 'disposed'], // Requires special permission to dispose
            'disposed': []
        };
        const available = transitions[currentStatus] || [];
        return available.map(status => ({
            value: status,
            isSpecial: requiresSpecialPermission(currentStatus, status),
            ...getStatusInfo(status)
        }));
    };

    // 6. DERIVED STATE & MEMOIZATION
    // -----------------------------------------------------------------
    const availableStatuses = useMemo(() => getAvailableStatuses(document?.status), [document?.status]);
    const currentStatusInfo = useMemo(() => getStatusInfo(document?.status), [document?.status]);
    const newStatusInfo = useMemo(() => getStatusInfo(formData.newStatus), [formData.newStatus]);

    // 7. VALIDATION & EVENT HANDLERS
    // -----------------------------------------------------------------
    const validateForm = () => {
        const newErrors = {};
        if (!formData.newStatus) {
            newErrors.newStatus = 'Vui lòng chọn trạng thái mới.';
        } else if (formData.newStatus === document.status) {
            newErrors.newStatus = 'Trạng thái mới phải khác với trạng thái hiện tại.';
        }
        if (!formData.reason.trim()) {
            newErrors.reason = 'Vui lòng nhập lý do thay đổi.';
        } else if (formData.reason.trim().length < 10) {
            newErrors.reason = 'Lý do phải có ít nhất 10 ký tự.';
        }
        if (requiresSpecialPermission(document.status, formData.newStatus) && !hasPermission('manage_documents')) {
            newErrors.permission = 'Bạn không có quyền thực hiện thay đổi trạng thái này.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        statusChangeMutation.mutate({
            newStatus: formData.newStatus,
            reason: formData.reason.trim(),
            notifyStakeholders: formData.notifyStakeholders,
            changedBy: user.id
        });
    };

    const handleClose = (force = false) => {
        if (statusChangeMutation.isLoading && !force) return;
        setFormData({ newStatus: '', reason: '', notifyStakeholders: true });
        setErrors({});
        onClose();
    };

    // 8. MAIN RENDER
    // -----------------------------------------------------------------
    const isCriticalChange = (formData.newStatus === 'disposed' || (document.status === 'published' && formData.newStatus === 'archived'));

    return (
        <Modal isOpen={isOpen} onClose={() => handleClose()} title="Thay đổi Trạng thái Tài liệu" size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* --- Document Information --- */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Thông tin tài liệu</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div><span className="text-gray-600">Tài liệu:</span><p className="font-medium text-gray-900 truncate">{document?.title}</p></div>
                        <div><span className="text-gray-600">Mã:</span><p className="font-medium text-gray-900">{document?.document_code}</p></div>
                        <div><span className="text-gray-600">Phiên bản:</span><p className="font-medium text-gray-900">{document?.version}</p></div>
                        <div><span className="text-gray-600">Trạng thái hiện tại:</span><div className="flex items-center mt-1"><currentStatusInfo.icon className={`h-4 w-4 mr-2 ${currentStatusInfo.color}`} /><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatusInfo.bgColor} ${currentStatusInfo.color}`}>{currentStatusInfo.label}</span></div></div>
                    </div>
                </div>

                {/* --- Status Selection --- */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Chuyển sang trạng thái mới <span className="text-red-500">*</span></label>
                    {availableStatuses.length === 0 ? (
                        <div className="text-center py-4 text-gray-500"><FiAlertTriangle className="h-8 w-8 mx-auto mb-2" /><p>Không có trạng thái nào có thể chuyển đổi từ trạng thái hiện tại.</p></div>
                    ) : (
                        <div className="space-y-3">{availableStatuses.map((status) => (<div key={status.value} className="flex items-start"><input id={`status-${status.value}`} type="radio" name="newStatus" value={status.value} checked={formData.newStatus === status.value} onChange={(e) => handleInputChange('newStatus', e.target.value)} className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" /><div className="ml-3 flex-1"><label htmlFor={`status-${status.value}`} className="flex items-center text-sm font-medium text-gray-900"><status.icon className={`h-4 w-4 mr-2 ${status.color}`} />{status.label}{status.isSpecial && <FiShield className="h-3 w-3 ml-2 text-orange-500" title="Yêu cầu quyền đặc biệt" />}</label><p className="text-xs text-gray-500 mt-1">{status.description}</p></div></div>))}</div>
                    )}
                    {errors.newStatus && <p className="mt-2 text-sm text-red-600 flex items-center"><FiAlertCircle className="h-4 w-4 mr-1" />{errors.newStatus}</p>}
                    {errors.permission && <p className="mt-1 text-sm text-red-600 flex items-center"><FiAlertCircle className="h-4 w-4 mr-1" />{errors.permission}</p>}
                </div>

                {/* --- Reason for Change --- */}
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">Lý do thay đổi <span className="text-red-500">*</span></label>
                    <div className="relative"><FiMessageSquare className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><textarea id="reason" rows={4} value={formData.reason} onChange={(e) => handleInputChange('reason', e.target.value)} className={`pl-10 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.reason ? 'border-red-300' : 'border-gray-300'}`} placeholder="Mô tả lý do thay đổi trạng thái..." /></div>
                    <div className="mt-1 flex justify-between text-xs">
                        {errors.reason ? <p className="text-red-600 flex items-center"><FiAlertCircle className="h-3 w-3 mr-1" />{errors.reason}</p> : <p className="text-gray-500">Tối thiểu 10 ký tự.</p>}
                        <p className="text-gray-500">{formData.reason.length}/1000</p>
                    </div>
                </div>

                {/* --- Notification Option --- */}
                <div className="flex items-center"><input id="notifyStakeholders" type="checkbox" checked={formData.notifyStakeholders} onChange={(e) => handleInputChange('notifyStakeholders', e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /><label htmlFor="notifyStakeholders" className="ml-2 text-sm text-gray-900">Thông báo cho các bên liên quan (nếu có)</label></div>

                {/* --- Previews & Warnings --- */}
                {formData.newStatus && formData.newStatus !== document.status && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center mb-2"><FiInfo className="h-5 w-5 text-blue-600 mr-2" /><h4 className="font-medium text-blue-900">Xem trước thay đổi</h4></div>
                        <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center"><currentStatusInfo.icon className={`h-4 w-4 mr-2 ${currentStatusInfo.color}`} /><span className={`px-2 py-0.5 rounded-full text-xs ${currentStatusInfo.bgColor} ${currentStatusInfo.color}`}>{currentStatusInfo.label}</span></div>
                            <FiRefreshCw className="h-4 w-4 text-gray-400" />
                            <div className="flex items-center"><newStatusInfo.icon className={`h-4 w-4 mr-2 ${newStatusInfo.color}`} /><span className={`px-2 py-0.5 rounded-full text-xs ${newStatusInfo.bgColor} ${newStatusInfo.color}`}>{newStatusInfo.label}</span></div>
                        </div>
                    </div>
                )}
                {isCriticalChange && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm flex items-start"><FiAlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" /><div><p><strong>Cảnh báo quan trọng:</strong> {formData.newStatus === 'disposed' ? 'Hành động này sẽ hủy vĩnh viễn tài liệu và không thể hoàn tác.' : 'Hành động này sẽ làm tài liệu không còn hiệu lực và có thể ảnh hưởng đến các quy trình đang sử dụng.'}</p></div></div>
                )}

                {/* --- Action Buttons --- */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={() => handleClose()} disabled={statusChangeMutation.isLoading} className="btn btn-outline">Hủy</button>
                    <button type="submit" disabled={statusChangeMutation.isLoading || availableStatuses.length === 0 || !formData.newStatus} className={`btn flex items-center min-w-[160px] justify-center ${isCriticalChange ? 'btn-danger' : 'btn-primary'}`}>
                        {statusChangeMutation.isLoading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div><span>Đang thay đổi...</span></>) : (<><FiRefreshCw className="h-4 w-4 mr-2" /><span>Xác nhận thay đổi</span></>)}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// 9. EXPORT
// -----------------------------------------------------------------
export default ChangeStatusModal;
// src/components/documents/ApprovalModal.js
/**
 * =================================================================
 * EDMS 1CAR - Approval Modal Component
 * Document approval workflow modal
 * Compliant with Plan 10.2 and C-PR-VM-001
 * =================================================================
 */

// 1. IMPORTS
// -----------------------------------------------------------------
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiEdit, FiAlertCircle, FiCalendar, FiMessageSquare, FiUser } from 'react-icons/fi';
import { documentAPI } from '../../api/documentApi';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../common/Modal';
// 2. COMPONENT DEFINITION
// -----------------------------------------------------------------
function ApprovalModal({ document, isOpen, onClose, onSuccess }) {

    // 3. HOOKS & STATE MANAGEMENT
    // -----------------------------------------------------------------
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        decision: 'approve',
        comment: '',
        effectiveDate: ''
    });
    const [errors, setErrors] = useState({});

    // 4. DATA MUTATION (React Query)
    // -----------------------------------------------------------------
    const approvalMutation = useMutation({
        mutationFn: (approvalData) => documentAPI.updateDocumentStatus(document.id, approvalData),
        onSuccess: (data) => {
            // Invalidate relevant queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['document', document.id] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });

            const messages = {
                approve: 'Tài liệu đã được phê duyệt thành công.',
                reject: 'Tài liệu đã bị từ chối.',
                request_changes: 'Đã gửi yêu cầu chỉnh sửa đến tác giả.'
            };
            toast.success(messages[formData.decision] || 'Cập nhật trạng thái thành công.');
            onSuccess?.(data);
            handleClose(true); // Close modal on success
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Lỗi khi cập nhật trạng thái.');
            console.error('Approval error:', error);
        }
    });

    // 5. HELPER FUNCTIONS & DERIVED STATE
    // -----------------------------------------------------------------
    const getDecisionInfo = (decision) => {
        const decisionMap = {
            approve: { icon: FiCheckCircle, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', btnClass: 'btn-success', label: 'Phê duyệt', description: 'Tài liệu sẽ được ban hành và có hiệu lực.' },
            reject: { icon: FiXCircle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', btnClass: 'btn-danger', label: 'Từ chối', description: 'Tài liệu sẽ bị hủy và trả về trạng thái nháp.' },
            request_changes: { icon: FiEdit, color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200', btnClass: 'btn-warning', label: 'Yêu cầu Chỉnh sửa', description: 'Tài liệu sẽ được trả về cho tác giả để chỉnh sửa.' }
        };
        return decisionMap[decision] || decisionMap.approve;
    };

    // Memoize derived state to avoid re-calculation
    const decisionInfo = useMemo(() => getDecisionInfo(formData.decision), [formData.decision]);
    const DecisionIcon = decisionInfo.icon;

    // 6. VALIDATION & EVENT HANDLERS
    // -----------------------------------------------------------------
    const validateForm = () => {
        const newErrors = {};
        if (!formData.decision) {
            newErrors.decision = 'Vui lòng chọn một quyết định.';
        }
        if (formData.decision === 'reject' || formData.decision === 'request_changes') {
            if (!formData.comment.trim()) {
                newErrors.comment = 'Vui lòng nhập ý kiến khi từ chối hoặc yêu cầu chỉnh sửa.';
            } else if (formData.comment.trim().length < 10) {
                newErrors.comment = 'Ý kiến phải có ít nhất 10 ký tự.';
            }
        }
        if (formData.decision === 'approve' && formData.effectiveDate) {
            const effective = new Date(formData.effectiveDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (effective < today) {
                newErrors.effectiveDate = 'Ngày hiệu lực không được nằm trong quá khứ.';
            }
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
        approvalMutation.mutate({
            decision: formData.decision,
            comment: formData.comment.trim(),
            effectiveDate: formData.effectiveDate || null,
            reviewerId: user.id
        });
    };

    const handleClose = (force = false) => {
        if (approvalMutation.isLoading && !force) return;
        setFormData({ decision: 'approve', comment: '', effectiveDate: '' });
        setErrors({});
        onClose();
    };

    // 7. MAIN RENDER
    // -----------------------------------------------------------------
    return (
        <Modal isOpen={isOpen} onClose={() => handleClose()} title="Phê duyệt Tài liệu" size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* --- Document Information --- */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Thông tin tài liệu</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div><span className="text-gray-600">Tài liệu:</span><p className="font-medium text-gray-900 truncate">{document?.title}</p></div>
                        <div><span className="text-gray-600">Mã:</span><p className="font-medium text-gray-900">{document?.document_code}</p></div>
                        <div><span className="text-gray-600">Phiên bản:</span><p className="font-medium text-gray-900">{document?.version}</p></div>
                        <div><span className="text-gray-600">Tác giả:</span><p className="font-medium text-gray-900">{document?.author_name || 'N/A'}</p></div>
                    </div>
                </div>

                {/* --- Decision Selection --- */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Quyết định <span className="text-red-500">*</span></label>
                    <div className="space-y-3">
                        {[{ value: 'approve' }, { value: 'reject' }, { value: 'request_changes' }].map(({ value }) => {
                            const optionInfo = getDecisionInfo(value);
                            const OptionIcon = optionInfo.icon;
                            return (
                                <div key={value} className="flex items-start">
                                    <input id={`decision-${value}`} type="radio" name="decision" value={value} checked={formData.decision === value} onChange={(e) => handleInputChange('decision', e.target.value)} className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                    <div className="ml-3 flex-1"><label htmlFor={`decision-${value}`} className="flex items-center text-sm font-medium text-gray-900"><OptionIcon className={`h-4 w-4 mr-2 ${optionInfo.color}`} />{optionInfo.label}</label><p className="text-xs text-gray-500 mt-1">{optionInfo.description}</p></div>
                                </div>
                            );
                        })}
                    </div>
                    {errors.decision && <p className="mt-2 text-sm text-red-600 flex items-center"><FiAlertCircle className="h-4 w-4 mr-1" />{errors.decision}</p>}
                </div>

                {/* --- Effective Date (Conditional) --- */}
                {formData.decision === 'approve' && (
                    <div>
                        <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700 mb-2">Ngày hiệu lực (tùy chọn)</label>
                        <div className="relative"><FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="date" id="effectiveDate" value={formData.effectiveDate} onChange={(e) => handleInputChange('effectiveDate', e.target.value)} min={new Date().toISOString().split('T')[0]} className={`pl-10 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.effectiveDate ? 'border-red-300' : 'border-gray-300'}`} /></div>
                        {errors.effectiveDate ? <p className="mt-1 text-sm text-red-600 flex items-center"><FiAlertCircle className="h-4 w-4 mr-1" />{errors.effectiveDate}</p> : <p className="mt-1 text-xs text-gray-500">Để trống nếu muốn tài liệu có hiệu lực ngay lập tức.</p>}
                    </div>
                )}

                {/* --- Comment --- */}
                <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">Ý kiến {(formData.decision !== 'approve') && <span className="text-red-500">*</span>}</label>
                    <div className="relative"><FiMessageSquare className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><textarea id="comment" rows={4} value={formData.comment} onChange={(e) => handleInputChange('comment', e.target.value)} className={`pl-10 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.comment ? 'border-red-300' : 'border-gray-300'}`} placeholder={formData.decision === 'approve' ? 'Ghi chú về việc phê duyệt (tùy chọn)...' : 'Lý do từ chối hoặc yêu cầu chỉnh sửa cụ thể...'} /></div>
                    <div className="mt-1 flex justify-between text-xs">
                        {errors.comment ? <p className="text-red-600 flex items-center"><FiAlertCircle className="h-3 w-3 mr-1" />{errors.comment}</p> : <p className="text-gray-500">{(formData.decision !== 'approve') ? 'Tối thiểu 10 ký tự.' : 'Tùy chọn.'}</p>}
                        <p className="text-gray-500">{formData.comment.length}/1000</p>
                    </div>
                </div>

                {/* --- Reviewer & Decision Preview --- */}
                <div className={`border rounded-lg p-4 space-y-4 ${decisionInfo.bgColor}`}>
                    <div>
                        <div className="flex items-center mb-1"><DecisionIcon className={`h-5 w-5 mr-2 ${decisionInfo.color}`} /><h4 className={`font-medium ${decisionInfo.color}`}>Xác nhận: {decisionInfo.label}</h4></div>
                        {formData.decision === 'approve' && formData.effectiveDate && <p className={`text-sm ${decisionInfo.color}`}>Ngày hiệu lực: <strong>{new Date(formData.effectiveDate).toLocaleDateString('vi-VN')}</strong></p>}
                    </div>
                    <div className="text-sm text-blue-800 bg-blue-50 p-3 rounded-md border border-blue-200">
                        <div className="flex items-center mb-1"><FiUser className="h-4 w-4 mr-2" /><strong className="text-blue-900">Người phê duyệt: {user?.name} ({user?.department})</strong></div>
                        <p>Thời gian ghi nhận: {new Date().toLocaleString('vi-VN')}</p>
                    </div>
                </div>

                {/* --- Action Buttons --- */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={() => handleClose()} disabled={approvalMutation.isLoading} className="btn btn-outline">Hủy</button>
                    <button type="submit" disabled={approvalMutation.isLoading} className={`btn flex items-center min-w-[130px] justify-center ${decisionInfo.btnClass}`}>
                        {approvalMutation.isLoading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div><span>Đang xử lý...</span></>) : (<><DecisionIcon className="h-4 w-4 mr-2" /><span>{decisionInfo.label}</span></>)}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// 8. EXPORT
// -----------------------------------------------------------------
export default ApprovalModal;
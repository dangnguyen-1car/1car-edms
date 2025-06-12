// src/frontend/src/components/documents/CreateDocumentModal.js
import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiSave, FiLoader, FiAlertCircle, FiPlus, FiMinus, FiCheck, FiCpu, FiSend, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useDocumentForm } from '../../hooks/useDocumentForm';
import LoadingSpinner from '../common/LoadingSpinner';
import FileUploadArea from './FileUploadArea'; // Đảm bảo bạn đã có component này
import DocumentPreview from './DocumentPreview'; // Đảm bảo bạn đã có component này

function CreateDocumentModal({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  isEditMode = false,
  initialData = null,
  documentTypeOptions = [],
  departmentOptions = [],
  priorityOptionsProp = [
    { value: 'low', label: 'Thấp' }, { value: 'normal', label: 'Bình thường' },
    { value: 'high', label: 'Cao' }, { value: 'urgent', label: 'Khẩn cấp' },
  ],
  securityLevelOptionsProp = [
    { value: 'public', label: 'Công khai' }, { value: 'internal', label: 'Nội bộ' },
    { value: 'confidential', label: 'Bảo mật' }, { value: 'restricted', label: 'Hạn chế' },
  ],
  isLoadingOptions = false,
}) {
  const {
    formData, loading, errors, touched, setTouched, recipientInput, setRecipientInput,
    addRecipient, removeRecipient, codeAvailable, generateDocumentCode,
    isCodeChecking, isSuggestingCode, uploadedFile, isUploading, handleFileUpload,
    removeUploadedFile, previewData, setPreviewData, handleChange, handleBlur,
    handleSubmit, resetForm, validateStep
  } = useDocumentForm(initialData, isEditMode);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        resetForm();
        setCurrentStep(1);
      }, 300);
    } else {
      setCurrentStep(1);
    }
  }, [isOpen, resetForm]);

  const nextStep = useCallback(() => {
    let isStepValid = true;
    if (currentStep === 1) {
      const step1Fields = ['title', 'document_code', 'type', 'department', 'scope_of_application'];
      isStepValid = validateStep(step1Fields);
      
      const touchUpdates = {};
      step1Fields.forEach(field => { touchUpdates[field] = true; });
      setTouched(prev => ({ ...prev, ...touchUpdates }));
      
      if (!isStepValid || (!isEditMode && codeAvailable === false)) {
        toast.error("Vui lòng điền đầy đủ và chính xác các thông tin bắt buộc.");
        return;
      }
    }
    if (currentStep === 2) {
      setPreviewData({ ...formData, file_info: uploadedFile });
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep, setTouched, isEditMode, codeAvailable, setPreviewData, formData, uploadedFile]);

  const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const handleFormSubmit = async (status) => {
    const result = await handleSubmit(status);
    if (result.success) {
      if (isEditMode && onUpdated) onUpdated(result.document);
      else if (!isEditMode && onCreated) onCreated(result.document);
      onClose();
    }
  };
  
  if (!isOpen) return null;

  const renderCodeStatusIcon = () => {
    if (isCodeChecking || isSuggestingCode) return <FiLoader className="animate-spin text-gray-400" />;
    if (codeAvailable === true) return <FiCheck className="text-green-500" />;
    if (errors.document_code) return <FiAlertCircle className="text-red-500" />;
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header với thanh tiến trình */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Chỉnh sửa Tài liệu' : 'Tạo Tài liệu Mới'}</h2>
            <div className="flex items-center mt-2 space-x-2">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {step}
                  </div>
                  {step < totalSteps && <div className={`w-8 h-1 mx-2 ${step < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-500 mt-1 font-medium">
              {currentStep === 1 && 'Bước 1: Thông tin cơ bản'}
              {currentStep === 2 && 'Bước 2: Metadata & File đính kèm'}
              {currentStep === 3 && 'Bước 3: Xem trước & Xác nhận'}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}><FiX size={24} /></button>
        </div>
        
        {/* Nội dung Form */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoadingOptions ? <div className="flex justify-center items-center h-full"><LoadingSpinner /></div> : (
            <>
              {/* ======================= NỘI DUNG BƯỚC 1 ======================= */}
              <div className={currentStep !== 1 ? 'hidden' : 'space-y-6'}>
                <div>
                  <label className="form-label">Mã tài liệu <span className="text-red-500">*</span></label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-grow relative">
                      <input name="document_code" value={formData.document_code} onChange={handleChange} onBlur={handleBlur} className={`form-input pr-10 ${touched.document_code && errors.document_code ? 'border-red-500' : codeAvailable ? 'border-green-500' : ''}`} disabled={isEditMode || loading} />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">{renderCodeStatusIcon()}</div>
                    </div>
                    {!isEditMode && <button type="button" onClick={generateDocumentCode} className="btn btn-secondary" disabled={!formData.type || !formData.department || loading}><FiCpu className="mr-1.5" />Tạo mã</button>}
                  </div>
                  {touched.document_code && errors.document_code && <p className="form-error">{errors.document_code}</p>}
                </div>
                <div>
                  <label className="form-label">Tiêu đề <span className="text-red-500">*</span></label>
                  <input name="title" value={formData.title} onChange={handleChange} onBlur={handleBlur} className={`form-input ${touched.title && errors.title ? 'border-red-500' : ''}`} disabled={loading}/>
                  {touched.title && errors.title && <p className="form-error">{errors.title}</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Loại tài liệu <span className="text-red-500">*</span></label>
                    <select name="type" value={formData.type} onChange={handleChange} onBlur={handleBlur} className={`form-select ${touched.type && errors.type ? 'border-red-500' : ''}`} disabled={isEditMode || loading}>
                      <option value="">--- Chọn loại ---</option>
                      {documentTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {touched.type && errors.type && <p className="form-error">{errors.type}</p>}
                  </div>
                  <div>
                    <label className="form-label">Phòng ban <span className="text-red-500">*</span></label>
                    <select name="department" value={formData.department} onChange={handleChange} onBlur={handleBlur} className={`form-select ${touched.department && errors.department ? 'border-red-500' : ''}`} disabled={isEditMode || loading}>
                      <option value="">--- Chọn phòng ban ---</option>
                      {departmentOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {touched.department && errors.department && <p className="form-error">{errors.department}</p>}
                  </div>
                </div>
                <div>
                  <label className="form-label">Phạm vi áp dụng <span className="text-red-500">*</span></label>
                  <textarea name="scope_of_application" value={formData.scope_of_application} onChange={handleChange} onBlur={handleBlur} rows="3" className={`form-input ${touched.scope_of_application && errors.scope_of_application ? 'border-red-500' : ''}`} disabled={loading}/>
                  {touched.scope_of_application && errors.scope_of_application && <p className="form-error">{errors.scope_of_application}</p>}
                </div>
              </div>

              {/* ======================= NỘI DUNG BƯỚC 2 ======================= */}
              <div className={currentStep !== 2 ? 'hidden' : 'space-y-6'}>
                <div>
                  <label className="form-label">Mô tả</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} onBlur={handleBlur} rows="3" className="form-input" disabled={loading}/>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Chu kỳ rà soát (tháng)</label>
                    <input type="number" name="review_cycle" value={formData.review_cycle} onChange={handleChange} onBlur={handleBlur} className={`form-input ${errors.review_cycle ? 'border-red-500' : ''}`} disabled={loading}/>
                  </div>
                  <div>
                    <label className="form-label">Thời gian lưu trữ (tháng)</label>
                    <input type="number" name="retention_period" value={formData.retention_period} onChange={handleChange} onBlur={handleBlur} className={`form-input ${errors.retention_period ? 'border-red-500' : ''}`} disabled={loading}/>
                  </div>
                </div>
                <div>
                  <label className="form-label">File đính kèm</label>
                  <FileUploadArea onFileUpload={handleFileUpload} uploadedFile={uploadedFile} onRemoveFile={removeUploadedFile} isUploading={isUploading} disabled={loading} />
                </div>
              </div>

              {/* ======================= NỘI DUNG BƯỚC 3 ======================= */}
              <div className={currentStep !== 3 ? 'hidden' : ''}>
                {previewData ? <DocumentPreview data={previewData} /> : <div className="text-center p-8 text-gray-500">Không có dữ liệu để xem trước.</div>}
              </div>
            </>
          )}
        </div>
        
        {/* Footer với các nút điều hướng */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {currentStep > 1 && <button type="button" onClick={prevStep} className="btn btn-secondary-outline" disabled={loading}><FiArrowLeft className="mr-2" /> Quay lại</button>}
          </div>
          <div className="flex items-center space-x-3">
            <button type="button" onClick={onClose} className="btn btn-secondary-outline" disabled={loading}>Hủy</button>
            {currentStep < totalSteps ? <button type="button" onClick={nextStep} className="btn btn-primary" disabled={loading}>Tiếp theo <FiArrowRight className="ml-2" /></button> : (
              <>
                <button type="button" onClick={() => handleFormSubmit('draft')} className="btn btn-secondary" disabled={loading}>{loading ? <LoadingSpinner size="sm" /> : <FiSave className="mr-2" />} Lưu nháp</button>
                <button type="button" onClick={() => handleFormSubmit(isEditMode ? formData.status : 'review')} className="btn btn-primary" disabled={loading}>{loading ? <LoadingSpinner size="sm" /> : <FiSend className="mr-2" />} {isEditMode ? 'Cập nhật' : 'Gửi duyệt'}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateDocumentModal;
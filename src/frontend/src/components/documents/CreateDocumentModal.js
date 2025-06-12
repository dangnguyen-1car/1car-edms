// src/frontend/src/components/documents/CreateDocumentModal.js
import React from 'react';
import { FiX, FiPlus, FiChevronLeft, FiChevronRight, FiCheck, FiCpu, FiSend, FiSave, FiLoader, FiAlertCircle, FiInfo } from 'react-icons/fi';
import Modal from '../common/Modal';
import { useDocumentForm } from '../../hooks/useDocumentForm';
import FileUploadArea from './FileUploadArea';
import DocumentPreview from './DocumentPreview';
import ErrorMessage from '../common/ErrorMessage';
import LoadingSpinner from '../common/LoadingSpinner';

const CreateDocumentModal = ({
  isOpen, onClose, onSave, isEditMode = false, initialData = null,
  documentTypeOptions = [], departmentOptions = [],
  priorityOptions = [ { value: 'low', label: 'Thấp' }, { value: 'normal', label: 'Bình thường' }, { value: 'high', label: 'Cao' }, { value: 'urgent', label: 'Khẩn cấp' }],
  securityLevelOptions = [ { value: 'public', label: 'Công khai' }, { value: 'internal', label: 'Nội bộ' }, { value: 'confidential', label: 'Bảo mật' }, { value: 'restricted', label: 'Hạn chế' }]
}) => {
  const {
    formData, errors, touched, loading, isUploading, uploadedFile, currentStep,
    isCodeAvailable, isCheckingCode, isSuggestingCode,
    recipientInput, setRecipientInput, addRecipient, removeRecipient,
    handleChange, handleBlur, handleFileUpload, removeUploadedFile,
    handleSubmit, nextStep, prevStep, generateDocumentCode,
  } = useDocumentForm(initialData, isEditMode, onSave, onClose);

  const renderCodeStatusIcon = () => {
    if (isCheckingCode || isSuggestingCode) return <FiLoader className="animate-spin text-gray-400" />;
    if (isCodeAvailable === true) return <FiCheck className="text-green-500" />;
    if (errors.document_code) return <FiAlertCircle className="text-red-500" />;
    return null;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="form-label required">Tiêu đề</label>
              <input id="title" name="title" value={formData.title} onChange={handleChange} onBlur={handleBlur} className={`form-input ${touched.title && errors.title ? 'border-red-500' : ''}`} />
              <ErrorMessage error={touched.title && errors.title} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="type" className="form-label required">Loại tài liệu</label>
                <select id="type" name="type" value={formData.type} onChange={handleChange} onBlur={handleBlur} className={`form-select ${touched.type && errors.type ? 'border-red-500' : ''}`} disabled={isEditMode}>
                  <option value="">--- Chọn loại tài liệu ---</option>
                  {documentTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <ErrorMessage error={touched.type && errors.type} />
              </div>
              <div>
                <label htmlFor="department" className="form-label required">Phòng ban</label>
                <select id="department" name="department" value={formData.department} onChange={handleChange} onBlur={handleBlur} className={`form-select ${touched.department && errors.department ? 'border-red-500' : ''}`} disabled={isEditMode}>
                  <option value="">--- Chọn phòng ban ---</option>
                  {departmentOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <ErrorMessage error={touched.department && errors.department} />
              </div>
            </div>

            <div>
              <label htmlFor="document_code" className="form-label required">Mã tài liệu</label>
              <div className="flex gap-2 items-start">
                  <div className="flex-grow relative">
                    <input id="document_code" name="document_code" value={formData.document_code} onChange={handleChange} onBlur={handleBlur} className={`form-input pr-10 ${touched.document_code && errors.document_code ? 'border-red-500' : (isCodeAvailable ? 'border-green-500' : '')}`} disabled={isEditMode || isSuggestingCode}/>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">{renderCodeStatusIcon()}</div>
                  </div>
                  {!isEditMode && (
                    <button type="button" onClick={generateDocumentCode} className="btn btn-secondary" disabled={isSuggestingCode || !formData.type || !formData.department}>
                      <FiCpu className="mr-1.5" />
                      Tạo mã
                    </button>
                  )}
              </div>
              <ErrorMessage error={touched.document_code && errors.document_code} />
            </div>
            
            <div>
              <label htmlFor="scope_of_application" className="form-label required">Phạm vi áp dụng</label>
              <textarea id="scope_of_application" name="scope_of_application" value={formData.scope_of_application} onChange={handleChange} onBlur={handleBlur} rows="3" className={`form-textarea ${touched.scope_of_application && errors.scope_of_application ? 'border-red-500' : ''}`}></textarea>
              <ErrorMessage error={touched.scope_of_application && errors.scope_of_application} />
            </div>

            <div>
              <label htmlFor="description" className="form-label">Mô tả chi tiết</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="3" className="form-textarea"></textarea>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="form-label">Người/Phòng ban nhận</label>
              <div className="flex gap-2 mb-2">
                <select value={recipientInput} onChange={(e) => setRecipientInput(e.target.value)} className="form-select flex-grow">
                  <option value="">--- Chọn phòng ban nhận ---</option>
                  {departmentOptions.filter(d => !formData.recipients.includes(d.value)).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <button type="button" onClick={addRecipient} className="btn btn-secondary flex-shrink-0"><FiPlus/></button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {formData.recipients.map(value => {
                  const dept = departmentOptions.find(d => d.value === value);
                  return (
                    <span key={value} className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                      {dept ? dept.label : value}
                      <button type="button" onClick={() => removeRecipient(value)} className="ml-2 text-blue-600 hover:text-blue-800"><FiX size={14}/></button>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Độ ưu tiên</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="form-select">
                  {priorityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Mức bảo mật</label>
                <select name="security_level" value={formData.security_level} onChange={handleChange} className="form-select">
                  {securityLevelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Chu kỳ rà soát (tháng)</label>
                <input type="number" name="review_cycle" value={formData.review_cycle} onChange={handleChange} className="form-input"/>
              </div>
              <div>
                <label className="form-label">Thời gian lưu trữ (tháng)</label>
                <input type="number" name="retention_period" value={formData.retention_period} onChange={handleChange} className="form-input"/>
              </div>
            </div>
            <div>
              <label className="form-label required">File đính kèm</label>
              <FileUploadArea onFileUpload={handleFileUpload} uploadedFile={uploadedFile} onRemoveFile={removeUploadedFile} isUploading={isUploading} disabled={loading || (isEditMode && !!initialData?.file_id)} />
              <ErrorMessage error={touched.file_id && errors.file_id} />
              {isEditMode && initialData?.file_id && (
                <div className="mt-2 text-sm text-gray-600 flex items-center">
                  <FiInfo className="mr-2"/> Tệp hiện tại đã được đính kèm. Để thay đổi, cần tạo phiên bản mới.
                </div>
              )}
            </div>
          </div>
        );
      case 3:
        return <DocumentPreview formData={formData} departmentOptions={departmentOptions} uploadedFile={uploadedFile} />;
      default:
        return null;
    }
  };

  const title = isEditMode ? 'Chỉnh sửa Tài liệu' : 'Tạo Tài liệu Mới';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={24} /></button>
        </div>
        
        <div className="my-6">
          <div className="flex items-center justify-center">
            <div className={`step ${currentStep >= 1 ? 'step-active' : ''}`}><div className="step-circle">1</div><p className="step-text">Thông tin cơ bản</p></div>
            <div className={`flex-auto border-t-2 transition duration-500 ease-in-out ${currentStep > 1 ? 'border-blue-600' : 'border-gray-300'}`}></div>
            <div className={`step ${currentStep >= 2 ? 'step-active' : ''}`}><div className="step-circle">2</div><p className="step-text">Metadata & File</p></div>
            <div className={`flex-auto border-t-2 transition duration-500 ease-in-out ${currentStep > 2 ? 'border-blue-600' : 'border-gray-300'}`}></div>
            <div className={`step ${currentStep >= 3 ? 'step-active' : ''}`}><div className="step-circle">3</div><p className="step-text">Xem trước</p></div>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>{renderStepContent()}</form>

        <div className="mt-8 pt-4 border-t flex justify-between items-center">
          <div>
            {currentStep > 1 && <button onClick={prevStep} className="btn btn-secondary-outline" disabled={loading}><FiChevronLeft className="mr-2"/> Quay lại</button>}
          </div>
          <div className="flex gap-4">
            {currentStep < 3 ? (
              <button onClick={nextStep} className="btn btn-primary" disabled={loading}>Tiếp theo <FiChevronRight className="ml-2"/></button>
            ) : (
              <>
                {!isEditMode && <button onClick={() => handleSubmit('draft')} className="btn btn-secondary" disabled={loading || isUploading}>{loading ? <LoadingSpinner size="sm" /> : <FiSave className="mr-2" />} Lưu Nháp</button>}
                <button onClick={() => handleSubmit(isEditMode ? 'update' : 'review')} className="btn btn-primary" disabled={loading || isUploading}>
                  {loading ? <LoadingSpinner size="sm" /> : <FiSend className="mr-2" />} 
                  {isEditMode ? 'Lưu Thay đổi' : 'Gửi duyệt'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateDocumentModal;
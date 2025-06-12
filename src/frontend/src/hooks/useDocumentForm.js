// src/frontend/src/hooks/useDocumentForm.js
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { documentService } from '../services/documentService';
import { uploadService } from '../services/uploadService';
import { useAuth } from '../contexts/AuthContext';

export function useDocumentForm(initialData = null, isEditMode = false) {
  const { user: currentUser } = useAuth();

  const getInitialFormData = useCallback((data = null) => ({
    title: data?.title || '',
    document_code: data?.document_code || '',
    type: data?.type || '',
    department: data?.department || currentUser?.department || '',
    description: data?.description || '',
    scope_of_application: data?.scope_of_application || '',
    recipients: data?.recipients || [],
    priority: data?.priority || 'normal',
    security_level: data?.security_level || 'internal',
    review_cycle: data?.review_cycle ?? 12,
    retention_period: data?.retention_period ?? 60,
    keywords: data?.keywords || '',
    author_id: currentUser?.id,
    uploaded_file_id: data?.file_id || null,
    file_info: data?.file_info || null,
    status: data?.status || 'draft',
  }), [currentUser]);

  const [formData, setFormData] = useState(getInitialFormData());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [recipientInput, setRecipientInput] = useState('');
  const [isCodeChecking, setIsCodeChecking] = useState(false);
  const [isSuggestingCode, setIsSuggestingCode] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const validateField = useCallback((name, value) => {
    const fieldErrors = {};
    switch (name) {
      case 'title':
        if (!value.trim() || value.length < 5) fieldErrors.title = 'Tiêu đề là bắt buộc (tối thiểu 5 ký tự).';
        break;
      case 'document_code':
        if (!value.trim()) fieldErrors.document_code = 'Mã tài liệu là bắt buộc.';
        break;
      case 'type':
        if (!value) fieldErrors.type = 'Loại tài liệu là bắt buộc.';
        break;
      case 'department':
        if (!value) fieldErrors.department = 'Phòng ban là bắt buộc.';
        break;
      case 'scope_of_application':
        if (!value.trim()) fieldErrors.scope_of_application = 'Phạm vi áp dụng là bắt buộc.';
        break;
      default:
        break;
    }
    return fieldErrors;
  }, []);

  const validateForm = useCallback(() => {
    const allErrors = {};
    Object.keys(formData).forEach(key => {
      if (!['recipients', 'author_id', 'uploaded_file_id', 'file_info'].includes(key)) {
        const fieldErrors = validateField(key, formData[key]);
        Object.assign(allErrors, fieldErrors);
      }
    });
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  }, [formData, validateField]);
  
  const validateStep = useCallback((fieldsToValidate) => {
      let isStepValid = true;
      const stepErrors = {};
      fieldsToValidate.forEach(field => {
          const fieldError = validateField(field, formData[field]);
          if(Object.keys(fieldError).length > 0) {
              isStepValid = false;
              Object.assign(stepErrors, fieldError);
          }
      });
      setErrors(prev => ({ ...prev, ...stepErrors }));
      return isStepValid;
  }, [formData, validateField]);

  const checkDocumentCodeAvailability = useCallback(async (code) => {
    if (!code || isEditMode) {
      setCodeAvailable(isEditMode ? true : null); return;
    }
    setIsCodeChecking(true);
    try {
      const response = await documentService.checkCodeAvailability(code);
      const isAvailable = response.success && response.data.available;
      setCodeAvailable(isAvailable);
      if (!isAvailable) {
        setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu đã tồn tại.' }));
      } else {
        setErrors(prev => ({ ...prev, document_code: null }));
      }
    } catch (error) {
      setCodeAvailable(null);
      setErrors(prev => ({ ...prev, document_code: 'Lỗi kiểm tra mã tài liệu.' }));
    } finally {
      setIsCodeChecking(false);
    }
  }, [isEditMode]);

  const generateDocumentCode = useCallback(async () => {
    if (!formData.type || !formData.department) {
      toast.error("Vui lòng chọn Loại và Phòng ban trước khi tạo mã."); return;
    }
    setIsSuggestingCode(true);
    try {
      const response = await documentService.getSuggestedCode(formData.type, formData.department);
      if (response.success && response.data.suggestedCode) {
        const suggestedCode = response.data.suggestedCode;
        setFormData(prev => ({ ...prev, document_code: suggestedCode }));
        setTouched(prev => ({ ...prev, document_code: true }));
        await checkDocumentCodeAvailability(suggestedCode);
        toast.success(`Đã tạo mã gợi ý: ${suggestedCode}`);
      } else {
        throw new Error(response.message || 'Không thể lấy mã gợi ý.');
      }
    } catch (error) {
      toast.error(error.message || 'Lỗi khi tạo mã gợi ý.');
    } finally {
      setIsSuggestingCode(false);
    }
  }, [formData.type, formData.department, checkDocumentCodeAvailability]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'document_code') {
      setCodeAvailable(null);
    }
  }, []);
  
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldErrors = validateField(name, value);
    setErrors(prev => ({ ...prev, ...fieldErrors }));
    
    if (name === 'document_code' && Object.keys(fieldErrors).length === 0 && value.trim() && !isEditMode) {
      checkDocumentCodeAvailability(value);
    }
  }, [validateField, checkDocumentCodeAvailability, isEditMode]);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
    setErrors({});
    setTouched({});
    setLoading(false);
    setCodeAvailable(null);
    setUploadedFile(null);
    setRecipientInput('');
    setPreviewData(null);
  }, [getInitialFormData]);
  
  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({ ...getInitialFormData(), ...initialData });
      setUploadedFile(initialData.file_info || null);
      setCodeAvailable(true);
    } else {
      resetForm();
    }
  }, [isEditMode, initialData, resetForm, getInitialFormData]);

  const addRecipient = useCallback(() => {
    if (recipientInput && !formData.recipients.includes(recipientInput)) {
      setFormData(prev => ({ ...prev, recipients: [...prev.recipients, recipientInput] }));
      setRecipientInput('');
    }
  }, [recipientInput, formData.recipients]);

  const removeRecipient = useCallback((recipientToRemove) => {
    setFormData(prev => ({ ...prev, recipients: prev.recipients.filter(r => r !== recipientToRemove) }));
  }, []);

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    try {
        const response = await uploadService.uploadFile(file);
        if (response.success) {
            setUploadedFile(response.data);
            toast.success(`Đã tải lên tệp: ${response.data.original_name}`);
        } else {
            throw new Error(response.message || 'Tải lên thất bại.');
        }
    } catch (error) {
        toast.error(error.message);
    } finally {
        setIsUploading(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    toast.success('Đã xóa tệp đính kèm.');
  };

  const handleSubmit = useCallback(async (status) => {
    if (!validateForm()) {
        toast.error('Vui lòng kiểm tra lại các trường thông tin bắt buộc.');
        return { success: false };
    }
    if (!isEditMode && codeAvailable === false) {
      setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu đã tồn tại. Vui lòng tạo mã khác.' }));
      return { success: false };
    }
    setLoading(true);
    try {
      const payload = { ...formData, status, uploaded_file_id: uploadedFile?.id };
      delete payload.file_info; // Không gửi lại thông tin file thừa

      const response = isEditMode
        ? await documentService.updateDocument(initialData.id, payload)
        : await documentService.createDocument(payload);
      if (response.success) {
        toast.success(isEditMode ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
        return { success: true, document: response.document || response.data };
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      toast.error(err.message || 'Thao tác thất bại.');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, isEditMode, codeAvailable, uploadedFile, initialData]);

  return {
    formData, setFormData, loading, errors, touched, setTouched,
    recipientInput, setRecipientInput, addRecipient, removeRecipient,
    isCodeChecking, isSuggestingCode, codeAvailable, generateDocumentCode,
    uploadedFile, isUploading, handleFileUpload, removeUploadedFile,
    previewData, setPreviewData,
    handleChange, handleBlur, handleSubmit,
    validateForm, resetForm, validateStep
  };
}
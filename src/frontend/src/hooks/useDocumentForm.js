// src/frontend/src/hooks/useDocumentForm.js
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { documentService } from '../services/documentService';
import { uploadService } from '../services/uploadService';
import { useAuth } from '../contexts/AuthContext';

export function useDocumentForm(initialData, isEditMode, onSave, onClose) {
  const { user: currentUser } = useAuth();

  const getInitialFormData = useCallback(() => ({
    title: initialData?.title || '',
    document_code: initialData?.document_code || '',
    type: initialData?.type || '',
    department: initialData?.department || currentUser?.department || '',
    description: initialData?.description || '',
    scope_of_application: initialData?.scope_of_application || '',
    recipients: initialData?.recipients || [],
    priority: initialData?.priority || 'normal',
    security_level: initialData?.security_level || 'internal',
    review_cycle: initialData?.review_cycle ?? 12,
    retention_period: initialData?.retention_period ?? 60,
    keywords: initialData?.keywords || '',
    file_id: initialData?.file_id || null,
  }), [initialData, currentUser]);

  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(initialData?.file_info || null);
  const [isCodeAvailable, setIsCodeAvailable] = useState(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isSuggestingCode, setIsSuggestingCode] = useState(false);
  const [recipientInput, setRecipientInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  
  const validateField = useCallback((name, value) => {
    switch (name) {
      case 'title':
        return value.trim() ? null : 'Tiêu đề là bắt buộc.';
      case 'type':
        return value ? null : 'Loại tài liệu là bắt buộc.';
      case 'document_code':
        return value.trim() ? null : 'Mã tài liệu là bắt buộc.';
      case 'department':
        return value ? null : 'Phòng ban là bắt buộc.';
      case 'scope_of_application':
        return value.trim() ? null : 'Phạm vi áp dụng là bắt buộc.';
      case 'file_id':
        return (isEditMode || value) ? null : 'File đính kèm là bắt buộc.';
      default:
        return null;
    }
  }, [isEditMode]);

  const validateStep = useCallback((fields) => {
    const stepErrors = {};
    let isValid = true;
    fields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        stepErrors[field] = error;
        isValid = false;
      }
    });
    setErrors(prev => ({ ...prev, ...stepErrors }));
    return isValid;
  }, [formData, validateField]);

  const nextStep = useCallback(() => {
    if (currentStep < 3) {
      if (currentStep === 1) {
        const step1Fields = ['title', 'type', 'document_code', 'department', 'scope_of_application'];
        if (!validateStep(step1Fields) || isCodeAvailable === false) {
          toast.error("Vui lòng điền đúng và đủ các trường bắt buộc.");
          return;
        }
      }
      setCurrentStep(s => s + 1);
    }
  }, [currentStep, validateStep, isCodeAvailable]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (name === 'document_code') setIsCodeAvailable(null);
  };
  
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({...prev, [name]: error}));
  };
  
  const checkDocumentCodeAvailability = useCallback(async (code) => {
    if (!code || isEditMode) {
      setIsCodeAvailable(true);
      return;
    }
    setIsCheckingCode(true);
    try {
      const res = await documentService.checkCodeAvailability(code);
      setIsCodeAvailable(res.data.available);
      if (!res.data.available) {
        setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu này đã tồn tại.' }));
      }
    } catch (error) {
      toast.error('Lỗi khi kiểm tra mã tài liệu.');
    } finally {
      setIsCheckingCode(false);
    }
  }, [isEditMode]);

  // SỬA LỖI: Hoàn thiện code tạo mã tài liệu thật
  const generateDocumentCode = useCallback(async () => {
    if (!formData.type || !formData.department) {
      toast.error("Vui lòng chọn Loại tài liệu và Phòng ban trước.");
      return;
    }
    setIsSuggestingCode(true);
    try {
      const response = await documentService.getSuggestedCode(formData.type, formData.department);
      if (response.success && response.data.suggestedCode) {
        const suggestedCode = response.data.suggestedCode;
        setFormData(prev => ({ ...prev, document_code: suggestedCode }));
        toast.success("Đã tạo mã gợi ý!");
        await checkDocumentCodeAvailability(suggestedCode);
      } else {
        toast.error(response.message || "Không thể tạo mã gợi ý.");
      }
    } catch (error) {
      toast.error(error.message || "Lỗi hệ thống khi tạo mã.");
    } finally {
      setIsSuggestingCode(false);
    }
  }, [formData.type, formData.department, checkDocumentCodeAvailability]);

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    setErrors(prev => ({ ...prev, file_id: null }));
    try {
      const res = await uploadService.uploadFile(file);
      if (res.success) {
        setUploadedFile(res.data);
        setFormData(prev => ({ ...prev, file_id: res.data.id }));
        toast.success('Tải tệp lên thành công.');
      } else {
        toast.error(res.message || 'Tải tệp lên thất bại.');
      }
    } catch (error) {
      toast.error(error.message || 'Lỗi khi tải tệp.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setFormData(prev => ({ ...prev, file_id: null }));
  };

  const addRecipient = () => {
    if (recipientInput && !formData.recipients.includes(recipientInput)) {
      setFormData(prev => ({ ...prev, recipients: [...prev.recipients, recipientInput] }));
      setRecipientInput('');
    }
  };

  const removeRecipient = (recipient) => {
    setFormData(prev => ({ ...prev, recipients: prev.recipients.filter(r => r !== recipient) }));
  };

  const handleSubmit = async (status) => {
    const allFields = ['title', 'type', 'document_code', 'department', 'scope_of_application', 'file_id'];
    if (!validateStep(allFields) || isCodeAvailable === false) {
      toast.error("Vui lòng kiểm tra lại các trường thông tin bắt buộc.");
      setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
      return;
    }
    setLoading(true);
    const payload = { ...formData, status, author_id: currentUser?.id };
    try {
      const result = isEditMode
        ? await documentService.updateDocument(initialData.id, payload)
        : await documentService.createDocument(payload);

      if (result.success) {
        toast.success(`Tài liệu đã được ${isEditMode ? 'cập nhật' : 'tạo'} thành công!`);
        if (onSave) onSave(result.data);
        onClose();
      } else {
        toast.error(result.message || 'Đã xảy ra lỗi.');
        setErrors(result.errors || {});
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const newFormData = getInitialFormData();
    setFormData(newFormData);
    setUploadedFile(initialData?.file_info || null);
    setCurrentStep(1);
    setErrors({});
    setTouched({});
  }, [initialData, getInitialFormData]);

  return {
    formData, errors, touched, loading, isUploading, uploadedFile,
    currentStep, isCodeAvailable, isCheckingCode, isSuggestingCode,
    recipientInput, setRecipientInput, addRecipient, removeRecipient,
    handleChange, handleBlur, handleFileUpload, removeUploadedFile,
    handleSubmit, nextStep, prevStep, generateDocumentCode
  };
}
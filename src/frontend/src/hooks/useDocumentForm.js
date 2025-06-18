// src/frontend/src/hooks/useDocumentForm.js
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { documentService } from '../services/documentService';
import { uploadService } from '../services/uploadService';
import { useAuth } from '../contexts/AuthContext';

export function useDocumentForm(
  initialData, 
  isEditMode, 
  onSave, 
  onClose,
  documentTypeOptions,
  departmentOptions
) {
  const { user: currentUser } = useAuth();

  const getInitialFormData = useCallback(() => {
    // Hàm tiện ích để chuyển đổi Tên phòng ban (label) sang Mã (value)
    const getDepartmentValue = (departmentLabel) => {
        if (!departmentOptions || !departmentLabel) return '';
        const option = departmentOptions.find(opt => opt.label === departmentLabel);
        return option ? option.value : '';
    };

    // --- LOGIC KHI CHỈNH SỬA TÀI LIỆU ---
    if (isEditMode && initialData) {
        return {
            title: initialData.title || '',
            document_code: initialData.document_code || '',
            // SỬA LỖI: API trả về mã (value), nên ta sử dụng trực tiếp.
            type: initialData.type || '',
            department: getDepartmentValue(initialData.department) || '', 
            description: initialData.description || '',
            scope_of_application: initialData.scope_of_application || '',
            recipients: initialData.recipients || [],
            priority: initialData.priority || 'normal',
            security_level: initialData.security_level || 'internal',
            review_cycle: initialData.review_cycle ?? 12,
            retention_period: initialData.retention_period ?? 60,
            keywords: initialData.keywords || '',
            file_id: initialData.file_id || null,
        };
    }

    // --- LOGIC KHI TẠO MỚI TÀI LIỆU ---
    return {
        title: '',
        document_code: '',
        type: '',
        // SỬA LỖI: Chuyển đổi tên phòng ban của người dùng sang mã phòng ban để form chọn đúng.
        department: getDepartmentValue(currentUser?.department) || '',
        description: '',
        scope_of_application: '',
        recipients: [],
        priority: 'normal',
        security_level: 'internal',
        review_cycle: 12,
        retention_period: 60,
        keywords: '',
        file_id: null,
    };
  }, [
    initialData, 
    isEditMode, 
    currentUser, 
    departmentOptions
  ]);

  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isCodeAvailable, setIsCodeAvailable] = useState(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isSuggestingCode, setIsSuggestingCode] = useState(false);
  const [recipientInput, setRecipientInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  
  const validateField = useCallback((name, value) => {
    switch (name) {
      case 'title': return value.trim() ? null : 'Tiêu đề là bắt buộc.';
      case 'type': return value ? null : 'Loại tài liệu là bắt buộc.';
      case 'document_code': return value.trim() ? null : 'Mã tài liệu là bắt buộc.';
      case 'department': return value ? null : 'Phòng ban là bắt buộc.';
      case 'scope_of_application': return value.trim() ? null : 'Phạm vi áp dụng là bắt buộc.';
      case 'file_id': return (isEditMode || value) ? null : 'File đính kèm là bắt buộc.';
      default: return null;
    }
  }, [isEditMode]);

  const validateStep = useCallback((stepFields) => {
    const stepErrors = {};
    let isValid = true;
    for (const field of stepFields) {
      const error = validateField(field, formData[field]);
      if (error) {
        stepErrors[field] = error;
        isValid = false;
      }
    }
    setTouched(prev => ({...prev, ...stepErrors}));
    setErrors(prev => ({ ...prev, ...stepErrors }));
    return isValid;
  }, [formData, validateField]);

  const nextStep = useCallback(() => {
    if (currentStep < 3) {
      if (currentStep === 1) {
        if (!validateStep(['title', 'type', 'document_code', 'department', 'scope_of_application']) || isCodeAvailable === false) {
          toast.error("Vui lòng điền đúng và đủ các trường bắt buộc.");
          return;
        }
      }
      if (currentStep === 2) {
        if (!validateStep(['file_id'])) {
           toast.error("Vui lòng đính kèm file cho tài liệu.");
           return;
        }
      }
      setCurrentStep(s => s + 1);
    }
  }, [currentStep, validateStep, isCodeAvailable]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  }, [currentStep]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
    if (name === 'document_code') setIsCodeAvailable(null);
  };
  
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({...prev, [name]: error}));
    if (name === 'document_code' && value.trim() && !error && !isEditMode) {
      checkDocumentCode(value);
    }
  };
  
  const checkDocumentCode = useCallback(async (code) => {
    if (!code || isEditMode) return setIsCodeAvailable(true);
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

  const generateDocumentCode = useCallback(async () => {
    if (!formData.type || !formData.department) return toast.error("Vui lòng chọn Loại tài liệu và Phòng ban trước.");
    setIsSuggestingCode(true);
    try {
      const response = await documentService.getSuggestedCode(formData.type, formData.department);
      if (response.success && response.data.suggestedCode) {
        const suggestedCode = response.data.suggestedCode;
        setFormData(prev => ({ ...prev, document_code: suggestedCode }));
        toast.success("Đã tạo mã gợi ý!");
        await checkDocumentCode(suggestedCode);
      } else {
        toast.error(response.message || "Không thể tạo mã gợi ý.");
      }
    } catch (error) {
      toast.error(error.message || "Lỗi hệ thống khi tạo mã.");
    } finally {
      setIsSuggestingCode(false);
    }
  }, [formData.type, formData.department, checkDocumentCode]);

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
    if (!validateStep(allFields) || (isCodeAvailable === false && !isEditMode)) {
      toast.error("Vui lòng kiểm tra lại các trường thông tin bắt buộc.");
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
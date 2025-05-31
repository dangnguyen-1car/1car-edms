// src/components/documents/CreateDocumentModal.js

import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiLoader, FiAlertCircle, FiPlus, FiMinus, FiCheck } from 'react-icons/fi';
// import { documentAPI } from '../../api/documentApi'; // Giả sử bạn sẽ dùng API thực tế

function CreateDocumentModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    document_code: '',
    type: '',
    department: '',
    description: '',
    scope_of_application: '',
    recipients: [],
    priority: 'normal',
    security_level: 'internal',
    review_cycle: 12, // Mặc định 12 tháng
    retention_period: 60, // Mặc định 60 tháng (5 năm)
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [recipientInput, setRecipientInput] = useState('');
  const [isCodeChecking, setIsCodeChecking] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState(null); // null: chưa kiểm tra, true: khả dụng, false: đã tồn tại
  const [touched, setTouched] = useState({});

  // Danh sách các lựa chọn theo chuẩn C-TD-MG-005
  const documentTypes = [
    { code: 'PL', name: 'Chính sách' },
    { code: 'PR', name: 'Quy trình' },
    { code: 'WI', name: 'Hướng dẫn' },
    { code: 'FM', name: 'Biểu mẫu' },
    { code: 'TD', name: 'Tài liệu kỹ thuật' },
    { code: 'TR', name: 'Tài liệu đào tạo' },
    { code: 'RC', name: 'Hồ sơ' },
  ];

  const departments = [
    'Ban Giám đốc',
    'Phòng Phát triển Nhượng quyền',
    'Phòng Đào tạo Tiêu chuẩn',
    'Phòng Marketing',
    'Phòng Kỹ thuật QC',
    'Phòng Tài chính',
    'Phòng Công nghệ Hệ thống',
    'Phòng Pháp lý',
    'Bộ phận Tiếp nhận CSKH',
    'Bộ phận Kỹ thuật Garage',
    'Bộ phận QC Garage',
    'Bộ phận Kho/Kế toán Garage',
    'Bộ phận Marketing Garage',
    'Quản lý Garage',
  ];

  const securityLevels = [
    { code: 'public', name: 'Công khai (P)' },
    { code: 'internal', name: 'Nội bộ (I)' },
    { code: 'confidential', name: 'Bảo mật (C)' },
    { code: 'restricted', name: 'Hạn chế (R)' },
  ];

  const priorities = [
    { code: 'low', name: 'Thấp' },
    { code: 'normal', name: 'Bình thường' },
    { code: 'high', name: 'Cao' },
    { code: 'urgent', name: 'Khẩn cấp' },
  ];

  // Hook 1: Reset form khi modal đóng/mở
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        document_code: '',
        type: '',
        department: '',
        description: '',
        scope_of_application: '',
        recipients: [],
        priority: 'normal',
        security_level: 'internal',
        review_cycle: 12,
        retention_period: 60,
      });
      setErrors({});
      setTouched({});
      setRecipientInput('');
      setCodeAvailable(null);
    }
  }, [isOpen]);

  // Validation functions (giữ nguyên như bạn đã cung cấp)
  const validateField = (name, value) => {
    const fieldErrors = {};

    switch (name) {
      case 'title':
        if (!value.trim()) {
          fieldErrors.title = 'Tiêu đề là bắt buộc';
        } else if (value.length < 5) {
          fieldErrors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
        } else if (value.length > 200) {
          fieldErrors.title = 'Tiêu đề không được vượt quá 200 ký tự';
        } else if (!/^[a-zA-ZÀ-ỹ0-9\s\-\(\)\[\]\.,:;!?]+$/.test(value)) {
          fieldErrors.title = 'Tiêu đề chứa ký tự không hợp lệ';
        }
        break;

      case 'document_code':
        if (!value.trim()) {
          fieldErrors.document_code = 'Mã tài liệu là bắt buộc';
        } else if (!/^C-[A-Z]{2}-[A-Z0-9]{2,6}-\d{3}$/.test(value)) { // Cập nhật regex cho department code linh hoạt hơn
          fieldErrors.document_code = 'Mã tài liệu phải theo định dạng C-XX-YYY(YY)-ZZZ (VD: C-PR-BGD-001)';
        }
        break;

      case 'type':
        if (!value) {
          fieldErrors.type = 'Loại tài liệu là bắt buộc';
        }
        break;

      case 'department':
        if (!value) {
          fieldErrors.department = 'Phòng ban là bắt buộc';
        }
        break;

      case 'description':
        if (value && value.length > 1000) {
          fieldErrors.description = 'Mô tả không được vượt quá 1000 ký tự';
        }
        break;

      case 'scope_of_application':
        if (value && value.length > 500) {
          fieldErrors.scope_of_application = 'Phạm vi áp dụng không được vượt quá 500 ký tự';
        }
        break;

      case 'review_cycle':
        const reviewCycle = parseInt(value);
        if (isNaN(reviewCycle) || reviewCycle < 1 || reviewCycle > 60) {
          fieldErrors.review_cycle = 'Chu kỳ rà soát phải từ 1-60 tháng';
        }
        break;

      case 'retention_period':
        const retentionPeriod = parseInt(value);
        if (isNaN(retentionPeriod) || retentionPeriod < 12 || retentionPeriod > 120) {
          fieldErrors.retention_period = 'Thời hạn lưu trữ phải từ 12-120 tháng';
        }
        break;

      default:
        break;
    }
    return fieldErrors;
  };

  const validateForm = () => {
    const allErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'recipients') { // recipients sẽ được validate riêng
        const fieldErrors = validateField(key, formData[key]);
        Object.assign(allErrors, fieldErrors);
      }
    });

    if (formData.recipients.length === 0) {
      allErrors.recipients = 'Phải có ít nhất một người nhận tài liệu';
    }
    
    if (formData.review_cycle && formData.retention_period) {
        const reviewCycle = parseInt(formData.review_cycle);
        const retentionPeriod = parseInt(formData.retention_period);
        if (!isNaN(reviewCycle) && !isNaN(retentionPeriod) && reviewCycle >= retentionPeriod) {
             allErrors.review_cycle = 'Chu kỳ rà soát phải nhỏ hơn thời hạn lưu trữ';
        }
    }


    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };
  
  const checkDocumentCodeAvailability = async (code) => {
    if (!code || !/^C-[A-Z]{2}-[A-Z0-9]{2,6}-\d{3}$/.test(code)) { // Cập nhật regex
      setCodeAvailable(null);
      return;
    }
    setIsCodeChecking(true);
    try {
      // TODO: Thay thế bằng API call thực tế đến documentAPI.checkCodeAvailability(code)
      const response = await new Promise((resolve) => {
        setTimeout(() => {
          const exists = code.toUpperCase().includes("EXIST"); // Giả lập mã "EXIST" đã tồn tại
          resolve({ data: { isAvailable: !exists } });
        }, 500);
      });
      
      setCodeAvailable(response.data.isAvailable);
      if (!response.data.isAvailable) {
        setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu đã tồn tại trong hệ thống' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          if (newErrors.document_code === 'Mã tài liệu đã tồn tại trong hệ thống') {
            delete newErrors.document_code;
          }
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error checking document code:', error);
      setCodeAvailable(null); // Lỗi thì coi như không xác định được
      setErrors(prev => ({ ...prev, document_code: 'Không thể kiểm tra mã tài liệu. Vui lòng thử lại.' }));
    } finally {
      setIsCodeChecking(false);
    }
  };

  // Hook 2: Debounce cho việc kiểm tra mã tài liệu
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.document_code && touched.document_code) {
        checkDocumentCodeAvailability(formData.document_code);
      }
    }, 700); // Tăng thời gian debounce một chút

    return () => clearTimeout(timeoutId);
  }, [formData.document_code, touched.document_code]);


  // >>> PHẦN SỬA LỖI CHÍNH: Di chuyển `if (!isOpen) return null;` xuống dưới đây <<<
  if (!isOpen) {
    return null;
  }
  // >>> KẾT THÚC PHẦN SỬA LỖI CHÍNH <<<


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));

    if (errors[name]) {
      const fieldErrors = validateField(name, value); // Validate lại để xóa lỗi nếu hợp lệ
      if (Object.keys(fieldErrors).length === 0) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      } else {
        setErrors(prev => ({ ...prev, ...fieldErrors }));
      }
    } else { // Validate ngay khi nhập nếu field đó chưa có lỗi và đã touched
        if (touched[name]) {
            const fieldErrors = validateField(name, value);
             if (Object.keys(fieldErrors).length > 0) {
                setErrors(prev => ({ ...prev, ...fieldErrors }));
            }
        }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldErrors = validateField(name, value);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...fieldErrors }));
    }
  };
  
  const generateDocumentCode = async () => {
    if (formData.type && formData.department) {
      const typeCode = formData.type;
      // Lấy 2-3 chữ cái đầu của phòng ban làm mã phòng ban, chuẩn hóa
      const deptWords = formData.department.split(' ');
      let deptCodeGuess = '';
      if (deptWords.length > 1 && deptWords[0].length > 1 && deptWords[1].length > 0) {
        deptCodeGuess = (deptWords[0].substring(0,1) + deptWords[1].substring(0,1)).toUpperCase();
      } else {
        deptCodeGuess = deptWords[0].substring(0, Math.min(deptWords[0].length, 3)).toUpperCase();
      }
      
      // Nên có API để lấy sequence number tiếp theo dựa trên type và deptCode
      // Tạm thời generate random
      const randomNum = Math.floor(Math.random() * 899) + 100;
      const code = `C-${typeCode}-${deptCodeGuess}-${randomNum.toString().padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, document_code: code }));
      setTouched(prev => ({ ...prev, document_code: true }));
      // Sau khi generate, tự động kiểm tra
      await checkDocumentCodeAvailability(code);
    } else {
        setErrors(prev => ({...prev, document_code: "Vui lòng chọn Loại tài liệu và Phòng ban trước khi tạo mã."}))
    }
  };

  const addRecipient = () => {
    if (recipientInput.trim() && !formData.recipients.includes(recipientInput.trim())) {
      setFormData(prev => ({
        ...prev,
        recipients: [...prev.recipients, recipientInput.trim()]
      }));
      setRecipientInput('');
      if (errors.recipients) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.recipients;
          return newErrors;
        });
      }
    }
  };

  const removeRecipient = (recipientToRemove) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter(recipient => recipient !== recipientToRemove)
    }));
  };

  const handleRecipientKeyPress = (e) => {
    if (e.key === 'Enter' && recipientInput.trim()) {
      e.preventDefault();
      addRecipient();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allCurrentTouched = {};
    Object.keys(formData).forEach(key => allCurrentTouched[key] = true);
    setTouched(allCurrentTouched);

    if (!validateForm()) {
      return;
    }

    if (codeAvailable === false) { // Kiểm tra lại vì người dùng có thể sửa sau khi check
      setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu đã tồn tại hoặc chưa được kiểm tra.' }));
      return;
    }
    if (codeAvailable === null && formData.document_code) { // Nếu có mã nhưng chưa check (ví dụ dán vào)
        await checkDocumentCodeAvailability(formData.document_code);
        // Sau khi check, nếu codeAvailable vẫn là false hoặc null thì không submit
        // Cần state để biết check xong chưa nếu check là async
        if(isCodeChecking) return; // Đợi check xong
        if(codeAvailable === false || codeAvailable === null) {
             setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu cần được xác thực.' }));
            return;
        }
    }


    setLoading(true);
    try {
      const documentData = {
        ...formData,
        review_cycle: parseInt(formData.review_cycle),
        retention_period: parseInt(formData.retention_period),
        version: '01.00', 
        status: 'draft',
        // author_id: currentUser.id // Cần lấy user ID từ context hoặc props
      };

      // console.log('Submitting document:', documentData);
      // const response = await documentAPI.createDocument(documentData); // API call thật
      
      // Giả lập API call thành công
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = { success: true, data: { id: Date.now(), ...documentData } };

      if (response.success) {
        alert('Tạo tài liệu thành công!'); // Thay bằng toast notification
        if (onCreated) onCreated(response.data);
        onClose();
      }
    } catch (err) {
      console.error('Create document error:', err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      } else {
        setErrors({ general: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Tạo tài liệu mới</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <FiAlertCircle size={16} />
              {errors.general}
            </div>
          )}

          {/* Tiêu đề */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Tiêu đề tài liệu <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Nhập tiêu đề tài liệu (5-200 ký tự)"
              disabled={loading}
              maxLength={200}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FiAlertCircle size={14} />
                {errors.title}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.title.length}/200 ký tự
            </p>
          </div>

          {/* Loại tài liệu và Phòng ban */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Loại tài liệu <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.type ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="">-- Chọn loại tài liệu --</option>
                {documentTypes.map(type => (
                  <option key={type.code} value={type.code}>
                    {type.code} - {type.name}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <FiAlertCircle size={14} />
                  {errors.type}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                Phòng ban <span className="text-red-500">*</span>
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.department ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="">-- Chọn phòng ban --</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {errors.department && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <FiAlertCircle size={14} />
                  {errors.department}
                </p>
              )}
            </div>
          </div>

          {/* Mã tài liệu */}
          <div>
            <label htmlFor="document_code" className="block text-sm font-medium text-gray-700 mb-1">
              Mã tài liệu <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  id="document_code"
                  type="text"
                  name="document_code"
                  value={formData.document_code}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.document_code ? 'border-red-300 bg-red-50' : 
                    codeAvailable === true ? 'border-green-300 bg-green-50 text-green-700' :
                    codeAvailable === false ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-300'
                  }`}
                  placeholder="VD: C-PR-BGD-001"
                  disabled={loading}
                />
                {isCodeChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <FiLoader className="animate-spin text-gray-400" size={16} />
                  </div>
                )}
                {codeAvailable === true && !isCodeChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <FiCheck className="text-green-500" size={16} />
                  </div>
                )}
                 {codeAvailable === false && !isCodeChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <FiAlertCircle className="text-red-500" size={16} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={generateDocumentCode}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!formData.type || !formData.department || loading}
              >
                Tạo mã
              </button>
            </div>
            {errors.document_code && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FiAlertCircle size={14} />
                {errors.document_code}
              </p>
            )}
            {codeAvailable === true && !errors.document_code && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <FiCheck size={14} />
                Mã tài liệu khả dụng.
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Định dạng: C-[Loại]-[Mã Phòng Ban]-[Số thứ tự]. Ví dụ: C-PL-BGD-001.
            </p>
          </div>

          {/* Mô tả */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical ${
                errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Mô tả ngắn gọn về tài liệu (tối đa 1000 ký tự)"
              disabled={loading}
              maxLength={1000}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FiAlertCircle size={14} />
                {errors.description}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.description.length}/1000 ký tự
            </p>
          </div>

          {/* Phạm vi áp dụng */}
          <div>
            <label htmlFor="scope_of_application" className="block text-sm font-medium text-gray-700 mb-1">
              Phạm vi áp dụng
            </label>
            <input
              id="scope_of_application"
              type="text"
              name="scope_of_application"
              value={formData.scope_of_application}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.scope_of_application ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Phạm vi áp dụng của tài liệu (tối đa 500 ký tự)"
              disabled={loading}
              maxLength={500}
            />
            {errors.scope_of_application && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FiAlertCircle size={14} />
                {errors.scope_of_application}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.scope_of_application.length}/500 ký tự
            </p>
          </div>

          {/* Người nhận tài liệu */}
          <div>
            <label htmlFor="recipientInput" className="block text-sm font-medium text-gray-700 mb-1">
              Người nhận tài liệu <span className="text-red-500">*</span> (Chọn từ danh sách, nhấn Enter hoặc nút + để thêm)
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  id="recipientInput"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyPress={handleRecipientKeyPress}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">-- Chọn phòng ban nhận --</option>
                  {departments.filter(dept => !formData.recipients.includes(dept)).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addRecipient}
                  disabled={!recipientInput.trim() || loading}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <FiPlus size={16} />
                </button>
              </div>
              
              {formData.recipients.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {formData.recipients.map((recipient, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full"
                    >
                      {recipient}
                      <button
                        type="button"
                        onClick={() => removeRecipient(recipient)}
                        className="text-blue-500 hover:text-blue-700 disabled:text-gray-400"
                        disabled={loading}
                        aria-label={`Xóa ${recipient}`}
                      >
                        <FiMinus size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {errors.recipients && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FiAlertCircle size={14} />
                {errors.recipients}
              </p>
            )}
          </div>

          {/* Mức ưu tiên và Mức bảo mật */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Mức ưu tiên
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                {priorities.map(priority => (
                  <option key={priority.code} value={priority.code}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="security_level" className="block text-sm font-medium text-gray-700 mb-1">
                Mức bảo mật
              </label>
              <select
                id="security_level"
                name="security_level"
                value={formData.security_level}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                {securityLevels.map(level => (
                  <option key={level.code} value={level.code}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chu kỳ rà soát và Thời hạn lưu trữ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="review_cycle" className="block text-sm font-medium text-gray-700 mb-1">
                Chu kỳ rà soát (tháng)
              </label>
              <input
                id="review_cycle"
                type="number"
                name="review_cycle"
                value={formData.review_cycle}
                onChange={handleChange}
                onBlur={handleBlur}
                min="1"
                max="60"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.review_cycle ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.review_cycle && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <FiAlertCircle size={14} />
                  {errors.review_cycle}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="retention_period" className="block text-sm font-medium text-gray-700 mb-1">
                Thời hạn lưu trữ (tháng)
              </label>
              <input
                id="retention_period"
                type="number"
                name="retention_period"
                value={formData.retention_period}
                onChange={handleChange}
                onBlur={handleBlur}
                min="12"
                max="120"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.retention_period ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.retention_period && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <FiAlertCircle size={14} />
                  {errors.retention_period}
                </p>
              )}
            </div>
          </div>
        </form>
        
        {/* Buttons */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="button" // Thay đổi type thành "button" và gọi handleSubmit trong onClick
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || Object.keys(errors).some(key => errors[key]) || codeAvailable === false || isCodeChecking}
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" size={16} />
                Đang tạo...
              </>
            ) : (
              <>
                <FiSave size={16} />
                Tạo tài liệu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateDocumentModal;
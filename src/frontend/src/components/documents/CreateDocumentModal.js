// src/frontend/src/components/documents/CreateDocumentModal.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiX, FiSave, FiLoader, FiAlertCircle, FiPlus, FiMinus, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { documentService } from '../../services/documentService'; // Sử dụng documentService thống nhất
import { useAuth } from '../../contexts/AuthContext'; // Để lấy author_id
import LoadingSpinner from '../common/LoadingSpinner';

function CreateDocumentModal({
  isOpen,
  onClose,
  onCreated,
  // Props mới để nhận options từ component cha
  documentTypeOptions = [], // [{ value: 'PL', label: 'Chính sách' }, ...]
  departmentOptions = [],   // [{ value: 'Ban Giám đốc', label: 'Ban Giám đốc' }, ...]
  // Giữ lại securityLevels và priorities hardcode nếu chưa có API,
  // hoặc cũng có thể truyền vào từ props nếu có API cho chúng
  securityLevelOptionsProp = [
    { value: 'public', label: 'Công khai (P)' },
    { value: 'internal', label: 'Nội bộ (I)' },
    { value: 'confidential', label: 'Bảo mật (C)' },
    { value: 'restricted', label: 'Hạn chế (R)' },
  ],
  priorityOptionsProp = [
    { value: 'low', label: 'Thấp' },
    { value: 'normal', label: 'Bình thường' },
    { value: 'high', label: 'Cao' },
    { value: 'urgent', label: 'Khẩn cấp' },
  ],
  isLoadingOptions = false,
}) {
  const { user: currentUser } = useAuth(); // Lấy thông tin người dùng hiện tại

  const initialFormData = {
    title: '',
    document_code: '',
    type: '',
    department: '',
    description: '',
    scope_of_application: '',
    recipients: [], // Sẽ là mảng các string (tên phòng ban)
    priority: 'normal',
    security_level: 'internal',
    review_cycle: 12,
    retention_period: 60,
    keywords: '', // Thêm keywords
    // author_id sẽ được gán khi submit
  };

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [recipientInput, setRecipientInput] = useState('');
  const [isCodeChecking, setIsCodeChecking] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState(null);
  const [touched, setTouched] = useState({});

  // Sử dụng options từ props, có fallback
  const documentTypesForSelect = [{ value: '', label: '--- Chọn loại tài liệu ---' }, ...documentTypeOptions];
  const departmentsForSelect = [{ value: '', label: '--- Chọn phòng ban ---' }, ...departmentOptions.map(d => ({ value: d, label: d }))]; // Giả sử departmentOptions là mảng string
  const departmentsForRecipients = departmentOptions.map(d => ({ value: d, label: d }));

  const securityLevelsForSelect = [{ value: '', label: '--- Chọn mức bảo mật ---' }, ...securityLevelOptionsProp.map(sl => ({ value: sl.code, label: sl.name }))];
  const prioritiesForSelect = [{ value: '', label: '--- Chọn mức ưu tiên ---' }, ...priorityOptionsProp.map(p => ({ value: p.code, label: p.name }))];


  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setTouched({});
      setRecipientInput('');
      setCodeAvailable(null);
    } else {
      // Set default department and type if options are available and form is empty
      if (!formData.department && departmentOptions.length > 0) {
        // setFormData(prev => ({ ...prev, department: departmentOptions[0] })); // Or keep it empty
      }
      if (!formData.type && documentTypeOptions.length > 0) {
        // setFormData(prev => ({ ...prev, type: documentTypeOptions[0].value })); // Or keep it empty
      }
    }
  }, [isOpen, documentTypeOptions, departmentOptions]); // Thêm dependency

  const validateField = (name, value) => {
    // ... (logic validateField của bạn giữ nguyên) ...
    const fieldErrors = {};
    switch (name) {
      case 'title':
        if (!value.trim()) fieldErrors.title = 'Tiêu đề là bắt buộc';
        else if (value.length < 5) fieldErrors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
        else if (value.length > 200) fieldErrors.title = 'Tiêu đề không được vượt quá 200 ký tự';
        break;
      case 'document_code':
        if (!value.trim()) fieldErrors.document_code = 'Mã tài liệu là bắt buộc';
        else if (!/^C-[A-Z]{2,3}-[A-Z0-9]{2,6}-\d{3}$/.test(value)) fieldErrors.document_code = 'Mã: C-[LOẠI]-[P.BAN]-[STT] (VD: C-PL-BGD-001)';
        break;
      case 'type':
        if (!value) fieldErrors.type = 'Loại tài liệu là bắt buộc';
        break;
      case 'department':
        if (!value) fieldErrors.department = 'Phòng ban là bắt buộc';
        break;
      case 'description':
        if (value && value.length > 1000) fieldErrors.description = 'Mô tả tối đa 1000 ký tự';
        break;
      case 'scope_of_application':
        if (value && value.length > 500) fieldErrors.scope_of_application = 'Phạm vi áp dụng tối đa 500 ký tự';
        break;
      case 'review_cycle':
        const reviewCycle = parseInt(value);
        if (value && (isNaN(reviewCycle) || reviewCycle < 1 || reviewCycle > 60)) fieldErrors.review_cycle = 'Chu kỳ rà soát: 1-60 tháng';
        break;
      case 'retention_period':
        const retentionPeriod = parseInt(value);
        if (value && (isNaN(retentionPeriod) || retentionPeriod < 12 || retentionPeriod > 120)) fieldErrors.retention_period = 'Thời hạn lưu trữ: 12-120 tháng';
        break;
      default: break;
    }
    return fieldErrors;
  };

  const validateForm = () => {
    const allErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'recipients') {
        const fieldErrors = validateField(key, formData[key]);
        Object.assign(allErrors, fieldErrors);
      }
    });
    if (formData.recipients.length === 0) {
      // allErrors.recipients = 'Phải có ít nhất một người nhận tài liệu'; // Có thể bỏ nếu không bắt buộc
    }
     if (formData.review_cycle && formData.retention_period) {
        const reviewCycle = parseInt(formData.review_cycle);
        const retentionPeriod = parseInt(formData.retention_period);
        if (!isNaN(reviewCycle) && !isNaN(retentionPeriod) && reviewCycle >= retentionPeriod) {
             allErrors.review_cycle = 'Chu kỳ rà soát phải nhỏ hơn thời hạn lưu trữ.';
        }
    }
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const checkDocumentCodeAvailability = useCallback(async (code) => {
    if (!code || !/^C-[A-Z]{2,3}-[A-Z0-9]{2,6}-\d{3}$/.test(code)) {
      setCodeAvailable(null);
      return;
    }
    setIsCodeChecking(true);
    try {
      // TODO: Cần API backend /api/documents/check-code?code=...
      // Giả sử documentService có hàm này
      // const response = await documentService.checkDocumentCode(code);
      // setCodeAvailable(response.data.isAvailable);
      // if (!response.data.isAvailable) {
      //   setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu đã tồn tại.' }));
      // } else {
      //    setErrors(prev => ({ ...prev, document_code: null }));
      // }
      
      // GIẢ LẬP API CALL
      await new Promise(resolve => setTimeout(resolve, 500));
      const exists = code.toUpperCase().includes("EXIST");
      setCodeAvailable(!exists);
      if (exists) {
        setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu đã tồn tại.' }));
      } else {
        setErrors(prev => ({ ...prev, document_code: null }));
      }

    } catch (error) {
      console.error('Error checking document code:', error);
      setCodeAvailable(null);
      setErrors(prev => ({ ...prev, document_code: 'Lỗi kiểm tra mã tài liệu.' }));
    } finally {
      setIsCodeChecking(false);
    }
  }, []); // Thêm mảng dependencies rỗng

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.document_code && touched.document_code) {
        checkDocumentCodeAvailability(formData.document_code);
      }
    }, 700);
    return () => clearTimeout(timeoutId);
  }, [formData.document_code, touched.document_code, checkDocumentCodeAvailability]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
    if (errors[name]) {
        const fieldErrors = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: fieldErrors[name] || null }));
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
      // TODO: Lý tưởng là gọi API backend để generate code theo logic của DocumentCodeGenerator.js
      // Ví dụ: const suggestedCode = await documentService.suggestDocumentCode(formData.type, formData.department);
      // Hiện tại, giữ lại logic frontend cũ để demo
      const typeCode = formData.type;
      const deptWords = formData.department.split(' ');
      let deptCodeGuess = '';
      if (deptWords.length > 1 && deptWords[0].length > 1 && deptWords[1].length > 0) {
        deptCodeGuess = (deptWords[0].substring(0,1) + deptWords[1].substring(0,1)).toUpperCase();
      } else {
        deptCodeGuess = deptWords[0].substring(0, Math.min(deptWords[0].length, 3)).toUpperCase();
      }
      const randomNum = Math.floor(Math.random() * 899) + 100; // Tạm thời random
      const code = `C-${typeCode}-${deptCodeGuess}-${randomNum.toString().padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, document_code: code }));
      setTouched(prev => ({ ...prev, document_code: true }));
      await checkDocumentCodeAvailability(code);
    } else {
        setErrors(prev => ({...prev, document_code: "Chọn Loại và Phòng ban để tạo mã."}));
    }
  };

  const addRecipient = () => {
    if (recipientInput.trim() && !formData.recipients.includes(recipientInput.trim())) {
      setFormData(prev => ({ ...prev, recipients: [...prev.recipients, recipientInput.trim()] }));
      setRecipientInput('');
      if (errors.recipients) setErrors(prev => ({ ...prev, recipients: null }));
    }
  };

  const removeRecipient = (recipientToRemove) => {
    setFormData(prev => ({ ...prev, recipients: prev.recipients.filter(r => r !== recipientToRemove) }));
  };

  const handleRecipientKeyPress = (e) => {
    if (e.key === 'Enter' && recipientInput.trim()) { e.preventDefault(); addRecipient(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = Object.keys(formData).reduce((acc, key) => ({...acc, [key]: true}), {});
    setTouched(allTouched);

    if (!validateForm()) return;

    if (codeAvailable === false) {
      setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu đã tồn tại hoặc chưa được kiểm tra.' }));
      return;
    }
    if (codeAvailable === null && formData.document_code) {
      await checkDocumentCodeAvailability(formData.document_code);
      if(isCodeChecking) return; 
      if(codeAvailable === false || codeAvailable === null) {
        setErrors(prev => ({ ...prev, document_code: 'Mã tài liệu cần được xác thực.' }));
        return;
      }
    }

    setLoading(true);
    try {
      const documentPayload = {
        ...formData,
        author_id: currentUser?.id, // Gán author_id từ người dùng đang đăng nhập
        review_cycle: formData.review_cycle ? parseInt(formData.review_cycle) : null,
        retention_period: formData.retention_period ? parseInt(formData.retention_period) : null,
        version: '01.00', // Version khởi tạo
        status: 'draft',  // Trạng thái khởi tạo
      };
      
      // Loại bỏ các trường không cần thiết hoặc rỗng không muốn gửi
      if (!documentPayload.description) delete documentPayload.description;
      if (!documentPayload.scope_of_application) delete documentPayload.scope_of_application;
      if (documentPayload.recipients.length === 0) delete documentPayload.recipients;


      const response = await documentService.createDocument(documentPayload);

      if (response.success) {
        toast.success('Tạo tài liệu thành công!');
        if (onCreated) onCreated(response.document); // Giả sử backend trả về document đã tạo trong response.document
        onClose();
      } else {
        throw new Error(response.message || "Lỗi không xác định từ server");
      }
    } catch (err) {
      console.error('Create document error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
      toast.error(errorMsg);
      if (err.response?.data?.errors) { // Nếu backend trả về lỗi cụ thể cho từng trường
        setErrors(prev => ({ ...prev, ...err.response.data.errors }));
      } else {
        setErrors(prev => ({ ...prev, general: errorMsg }));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4"> {/* Tăng z-index */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800">Tạo tài liệu mới</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 rounded-md" disabled={loading} aria-label="Đóng modal">
            <FiX size={22} />
          </button>
        </div>

        {isLoadingOptions ? (
            <div className="p-6 flex justify-center items-center h-64">
                <LoadingSpinner message="Đang tải tùy chọn..." />
            </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-grow">
          {errors.general && (
            <div className="alert alert-danger"><FiAlertCircle className="mr-2" />{errors.general}</div>
          )}

          <div>
            <label htmlFor="title-create" className="form-label">Tiêu đề <span className="text-red-500">*</span></label>
            <input id="title-create" type="text" name="title" value={formData.title} onChange={handleChange} onBlur={handleBlur}
                   className={`form-input ${errors.title ? 'border-red-500' : ''}`} placeholder="Nhập tiêu đề (5-200 ký tự)" disabled={loading} maxLength={200}/>
            {errors.title && <p className="form-error"><FiAlertCircle size={14} className="mr-1"/>{errors.title}</p>}
            <p className="text-xs text-gray-500 mt-1">{formData.title.length}/200</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="type-create" className="form-label">Loại tài liệu <span className="text-red-500">*</span></label>
              <select id="type-create" name="type" value={formData.type} onChange={handleChange} onBlur={handleBlur}
                      className={`form-select ${errors.type ? 'border-red-500' : ''}`} disabled={loading || documentTypesForSelect.length <= 1}>
                {documentTypesForSelect.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {errors.type && <p className="form-error"><FiAlertCircle size={14} className="mr-1"/>{errors.type}</p>}
            </div>
            <div>
              <label htmlFor="department-create" className="form-label">Phòng ban <span className="text-red-500">*</span></label>
              <select id="department-create" name="department" value={formData.department} onChange={handleChange} onBlur={handleBlur}
                      className={`form-select ${errors.department ? 'border-red-500' : ''}`} disabled={loading || departmentsForSelect.length <=1}>
                {departmentsForSelect.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {errors.department && <p className="form-error"><FiAlertCircle size={14} className="mr-1"/>{errors.department}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="document_code-create" className="form-label">Mã tài liệu <span className="text-red-500">*</span></label>
            <div className="flex gap-2 items-center">
              <div className="flex-grow relative">
                <input id="document_code-create" type="text" name="document_code" value={formData.document_code} onChange={handleChange} onBlur={handleBlur}
                       className={`form-input pr-10 ${errors.document_code ? 'border-red-500' : codeAvailable === true ? 'border-green-500' : codeAvailable === false ? 'border-red-500' : ''}`}
                       placeholder="VD: C-PL-BGD-001" disabled={loading}/>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {isCodeChecking && <FiLoader className="animate-spin text-gray-400" />}
                  {codeAvailable === true && !isCodeChecking && <FiCheck className="text-green-500" />}
                  {codeAvailable === false && !isCodeChecking && <FiAlertCircle className="text-red-500" />}
                </div>
              </div>
              <button type="button" onClick={generateDocumentCode} className="btn btn-secondary flex-shrink-0"
                      disabled={!formData.type || !formData.department || loading || isCodeChecking}>
                {isCodeChecking ? <FiLoader className="animate-spin" /> : "Tạo mã"}
              </button>
            </div>
            {errors.document_code && <p className="form-error"><FiAlertCircle size={14} className="mr-1"/>{errors.document_code}</p>}
            {codeAvailable === true && !errors.document_code && <p className="text-sm text-green-600 mt-1">Mã tài liệu có thể sử dụng.</p>}
            <p className="text-xs text-gray-500 mt-1">Định dạng: C-[LOẠI]-[P.BAN]-[STT].</p>
          </div>
          
          <div>
            <label htmlFor="keywords-create" className="form-label">Từ khóa (phân cách bằng dấu phẩy)</label>
            <input id="keywords-create" type="text" name="keywords" value={formData.keywords} onChange={handleChange}
                   className="form-input" placeholder="VD: tuyển dụng, quy trình nhân sự, onboard" disabled={loading}/>
          </div>

          <div>
            <label htmlFor="description-create" className="form-label">Mô tả</label>
            <textarea id="description-create" name="description" value={formData.description} onChange={handleChange} onBlur={handleBlur} rows={3}
                      className={`form-input resize-vertical ${errors.description ? 'border-red-500' : ''}`} placeholder="Mô tả ngắn gọn (tối đa 1000 ký tự)" disabled={loading} maxLength={1000}/>
            {errors.description && <p className="form-error"><FiAlertCircle size={14} className="mr-1"/>{errors.description}</p>}
            <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000</p>
          </div>

          <div>
            <label htmlFor="scope_of_application-create" className="form-label">Phạm vi áp dụng</label>
            <input id="scope_of_application-create" type="text" name="scope_of_application" value={formData.scope_of_application} onChange={handleChange} onBlur={handleBlur}
                   className={`form-input ${errors.scope_of_application ? 'border-red-500' : ''}`} placeholder="Phạm vi áp dụng (tối đa 500 ký tự)" disabled={loading} maxLength={500}/>
            {errors.scope_of_application && <p className="form-error"><FiAlertCircle size={14} className="mr-1"/>{errors.scope_of_application}</p>}
             <p className="text-xs text-gray-500 mt-1">{formData.scope_of_application.length}/500</p>
          </div>

          <div>
            <label htmlFor="recipient-select-create" className="form-label">Người/Phòng ban nhận</label>
            <div className="flex gap-2">
              <select id="recipient-select-create" value={recipientInput} onChange={(e) => setRecipientInput(e.target.value)} onKeyPress={handleRecipientKeyPress}
                      className="form-select flex-grow" disabled={loading || departmentsForRecipients.length === 0}>
                <option value="">-- Chọn phòng ban nhận --</option>
                {departmentsForRecipients.filter(dept => !formData.recipients.includes(dept.value)).map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
              <button type="button" onClick={addRecipient} className="btn btn-outline flex-shrink-0" disabled={!recipientInput.trim() || loading}><FiPlus className="mr-1"/>Thêm</button>
            </div>
            {formData.recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 p-2 bg-gray-50 rounded border">
                {formData.recipients.map((recipient, index) => (
                  <span key={index} className="badge-item bg-blue-100 text-blue-700">
                    {recipient}
                    <button type="button" onClick={() => removeRecipient(recipient)} className="ml-1.5 text-blue-500 hover:text-blue-700" disabled={loading}><FiMinus size={12}/></button>
                  </span>
                ))}
              </div>
            )}
            {errors.recipients && <p className="form-error"><FiAlertCircle size={14} className="mr-1"/>{errors.recipients}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="priority-create" className="form-label">Mức ưu tiên</label>
              <select id="priority-create" name="priority" value={formData.priority} onChange={handleChange} className="form-select" disabled={loading}>
                 {prioritiesForSelect.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="security_level-create" className="form-label">Mức bảo mật</label>
              <select id="security_level-create" name="security_level" value={formData.security_level} onChange={handleChange} className="form-select" disabled={loading}>
                {securityLevelsForSelect.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="review_cycle-create" className="form-label">Chu kỳ rà soát (tháng)</label>
              <input id="review_cycle-create" type="number" name="review_cycle" value={formData.review_cycle} onChange={handleChange} onBlur={handleBlur} min="1" max="60"
                     className={`form-input ${errors.review_cycle ? 'border-red-500' : ''}`} disabled={loading}/>
              {errors.review_cycle && <p className="form-error"><FiAlertCircle size={14} className="mr-1"/>{errors.review_cycle}</p>}
            </div>
            <div>
              <label htmlFor="retention_period-create" className="form-label">Thời hạn lưu trữ (tháng)</label>
              <input id="retention_period-create" type="number" name="retention_period" value={formData.retention_period} onChange={handleChange} onBlur={handleBlur} min="12" max="120"
                     className={`form-input ${errors.retention_period ? 'border-red-500' : ''}`} disabled={loading}/>
              {errors.retention_period && <p className="form-error"><FiAlertCircle size={14} className="mr-1"/>{errors.retention_period}</p>}
            </div>
          </div>
        </form>
        )}
        
        <div className="flex justify-end items-center space-x-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white z-10">
          <button type="button" onClick={onClose} className="btn btn-secondary-outline" disabled={loading}>Hủy</button>
          <button type="button" onClick={handleSubmit} className="btn btn-primary min-w-[120px]"
                  disabled={loading || isCodeChecking || Object.values(errors).some(e => e) || codeAvailable === false || isLoadingOptions}>
            {loading ? <LoadingSpinner size="sm" /> : <><FiSave className="mr-2"/>Tạo tài liệu</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateDocumentModal;
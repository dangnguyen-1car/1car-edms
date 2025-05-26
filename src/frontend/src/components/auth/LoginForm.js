/**
 * =================================================================
 * EDMS 1CAR - Login Form Component
 * Authentication form based on C-FM-MG-004 role matrix
 * =================================================================
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiEye, FiEyeOff, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, error, clearError } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        toast.success('Đăng nhập thành công!');
      } else {
        toast.error(result.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi đăng nhập');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-md shadow-sm space-y-4">
        {/* Email field */}
        <div>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="form-input"
            placeholder="Nhập email của bạn"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        {/* Password field */}
        <div>
          <label htmlFor="password" className="form-label">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="form-input pr-10"
              placeholder="Nhập mật khẩu của bạn"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <FiEyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <FiEye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Submit button */}
      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full flex justify-center items-center"
        >
          {isLoading ? (
            <>
              <FiLoader className="animate-spin -ml-1 mr-3 h-5 w-5" />
              Đang đăng nhập...
            </>
          ) : (
            'Đăng nhập'
          )}
        </button>
      </div>

      {/* Demo credentials info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Thông tin đăng nhập demo:
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Admin:</strong> admin@1car.vn / admin123</p>
          <p><strong>14 phòng ban:</strong> Theo cấu trúc C-FM-MG-004</p>
        </div>
      </div>
    </form>
  );
}

export default LoginForm;

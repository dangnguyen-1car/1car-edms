// src/frontend/src/components/dashboard/PendingApprovalsWidget.js - PHIÊN BẢN HOÀN THIỆN
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiClock, FiUser, FiFileText, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { documentService } from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';
import SkeletonLoader from '../common/SkeletonLoader';

// =================================================================
// I18N (Internationalization) - Phần giả lập cho bản địa hóa
// =================================================================
const translations = {
  vi: {
    widgetTitle: 'Tài liệu cần xử lý',
    totalPending: 'Tổng số đang chờ',
    reviewNeeded: 'Cần kiểm tra',
    approvalNeeded: 'Cần phê duyệt',
    adminCanHandleAll: 'Quyền xử lý',
    adminAllLabel: 'Tất cả',
    viewAll: 'Xem tất cả',
    noPendingDocuments: 'Không có tài liệu nào cần xử lý',
    latestDocuments: 'Tài liệu mới nhất',
    approveAction: 'Phê duyệt',
    daysAgo: 'ngày',
  },
  // Thêm en: { ... } cho tiếng Anh sau này
};

const useTranslation = (lang = 'vi') => {
  return (key) => translations[lang][key] || key;
};

// =================================================================
// Component con để đồng bộ giao diện
// =================================================================
const StatBox = ({ icon, title, value, colorScheme = 'blue' }) => {
  const IconComponent = icon;
  const colors = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      value: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      title: 'text-green-900',
      value: 'text-green-600',
    },
  };
  const color = colors[colorScheme];

  return (
    <div className={`${color.bg} rounded-lg p-4`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <IconComponent className={`h-5 w-5 ${color.icon}`} />
        </div>
        <div className="ml-3">
          <p className={`text-sm font-medium ${color.title}`}>{title}</p>
          <p className={`text-lg font-semibold ${color.value}`}>{value}</p>
        </div>
      </div>
    </div>
  );
};


// =================================================================
// Component chính
// =================================================================
function PendingApprovalsWidget() {
  const { user } = useAuth();
  const t = useTranslation('vi'); // Hook bản địa hóa

  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ['pendingApprovalStats'],
    queryFn: () => documentService.getPendingApprovalStats(),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: recentPendingData } = useQuery({
    queryKey: ['recentPendingApprovals'],
    queryFn: () => documentService.getPendingApproval({ limit: 3, sortBy: 'updated_at', sortOrder: 'desc' }),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  if (isLoading) return <div className="bg-white rounded-lg shadow p-6"><SkeletonLoader type="card" /></div>;
  if (error || !statsData?.success) return null;

  const stats = statsData.data || {};
  const recentDocuments = recentPendingData?.data || [];
  const isAdmin = user?.role === 'admin';

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FiClock className="mr-2 text-blue-600" />
            {t('widgetTitle')}
          </h3>
          {stats.total_pending > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {stats.total_pending}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {stats.total_pending === 0 ? (
          <div className="text-center py-8">
            <FiCheckCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h4 className="mt-2 text-sm font-medium text-gray-900">{t('noPendingDocuments')}</h4>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <StatBox
                icon={FiUser}
                title={isAdmin ? t('totalPending') : t('reviewNeeded')}
                value={isAdmin ? (stats.total_pending || 0) : (stats.pending_review || 0)}
                colorScheme="blue"
              />
              <StatBox
                icon={FiFileText}
                title={isAdmin ? t('adminCanHandleAll') : t('approvalNeeded')}
                value={isAdmin ? t('adminAllLabel') : (stats.pending_approval || 0)}
                colorScheme="green"
              />
            </div>
            
            {/* Recent Documents List */}
            {recentDocuments.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">{t('latestDocuments')}</h4>
                <div className="space-y-2">
                  {recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="min-w-0 flex-1">
                        <Link to={`/documents/${doc.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block">{doc.title}</Link>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <span>{doc.author_name} • {Math.round(doc.days_pending || 0)} {t('daysAgo')}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{t('approveAction')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <Link to="/documents/pending-approval" className="flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-800">
          {t('viewAll')} <FiArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default PendingApprovalsWidget;
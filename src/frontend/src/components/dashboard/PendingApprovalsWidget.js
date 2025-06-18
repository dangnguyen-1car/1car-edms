// src/frontend/src/components/dashboard/PendingApprovalsWidget.js
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiClock, FiAlertTriangle, FiArrowRight, FiUser, FiFileText } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { documentService } from '../../services/documentService';
import { useAuth } from '../../contexts/AuthContext';

function PendingApprovalsWidget() {
  const { user } = useAuth();

  // =================================================================
  // Data Fetching (TanStack Query)
  // =================================================================
  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ['pendingApprovalStats'],
    queryFn: () => documentService.getPendingApprovalStats(),
    enabled: !!user && user.role !== 'guest',
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    staleTime: 60 * 1000
  });

  const { data: recentPendingData } = useQuery({
    queryKey: ['recentPendingApprovals'],
    queryFn: () => documentService.getPendingApproval({ limit: 3, sortBy: 'updated_at', sortOrder: 'desc' }),
    enabled: !!user && user.role !== 'guest',
    refetchInterval: 2 * 60 * 1000
  });

  // =================================================================
  // Early Exit Conditions (User Roles, Loading, Error)
  // =================================================================
  // Don't show widget for guests
  if (!user || user.role === 'guest') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-6 bg-gray-200 rounded-full w-8"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FiClock className="mr-2 text-gray-400" />
            Tài liệu cần xử lý
          </h3>
        </div>
        <div className="text-center py-4">
          <div className="text-red-500 text-sm">
            Không thể tải dữ liệu
          </div>
        </div>
      </div>
    );
  }

  // =================================================================
  // Data Extraction
  // =================================================================
  const stats = statsData?.data || {};
  const recentDocuments = recentPendingData?.data || [];

  // =================================================================
  // Render JSX
  // =================================================================
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FiClock className="mr-2 text-blue-600" />
            Tài liệu cần xử lý
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
            <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
            <h4 className="mt-2 text-sm font-medium text-gray-900">
              Không có tài liệu nào cần xử lý
            </h4>
            <p className="mt-1 text-sm text-gray-500">
              Tất cả tài liệu đã được xử lý hoặc bạn không có quyền xem.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FiUser className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">
                      Cần kiểm tra
                    </p>
                    <p className="text-lg font-semibold text-blue-600">
                      {stats.pending_review || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FiFileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">
                      Cần phê duyệt
                    </p>
                    <p className="text-lg font-semibold text-green-600">
                      {stats.pending_approval || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Urgent Items */}
            {stats.urgent_count > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FiAlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      {stats.urgent_count} tài liệu khẩn cấp
                    </p>
                    <p className="text-xs text-red-600">
                      Cần xử lý ngay lập tức
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* Average Days Pending */}
            {stats.avg_days_pending > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Thời gian chờ trung bình:</span>
                <span className={`font-medium ${
                  stats.avg_days_pending > 7 ? 'text-red-600' :
                  stats.avg_days_pending > 3 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {Math.round(stats.avg_days_pending)} ngày
                </span>
              </div>
            )}
            {/* Recent Documents */}
            {recentDocuments.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Tài liệu mới nhất
                </h4>
                <div className="space-y-2">
                  {recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                        >
                          {doc.title}
                        </Link>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <span>{doc.author_name}</span>
                          <span className="mx-1">•</span>
                          <span>{Math.round(doc.days_pending || 0)} ngày</span>
                          {doc.priority === 'urgent' && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="text-red-500 font-medium">Khẩn cấp</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          doc.user_role_in_workflow === 'reviewer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {doc.user_role_in_workflow === 'reviewer' ? 'Kiểm tra' : 'Phê duyệt'}
                        </span>
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
        <Link
          to="/documents/pending-approval"
          className="flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Xem tất cả
          <FiArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default PendingApprovalsWidget;
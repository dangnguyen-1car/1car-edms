// src/frontend/src/pages/ComplianceReportsPage.js

import React from 'react';
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Giả định LoadingSpinner là một thành phần được truyền vào hoặc import từ một tệp khác.
// const LoadingSpinner = () => <div>Loading...</div>;

const ComplianceReportsPage = ({ overdue, workflow, isLoadingOverdue, LoadingSpinner }) => {
  // Để tránh lỗi "cannot read properties of undefined",
  // ta cung cấp các giá trị mặc định nếu props không được truyền vào.
  const safeOverdue = overdue || { summary: {}, overdueDocuments: [], overdueByDept: [] };
  const safeWorkflow = workflow || { workflowStats: [], approvalTimes: [], bottlenecks: [] };

  return (
    <div className="p-6 bg-gray-50">
      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiClock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Trung bình quá hạn</p>
              <p className="text-2xl font-bold text-gray-900">
                {safeOverdue.summary?.avg_days_overdue
                  ? Math.round(safeOverdue.summary.avg_days_overdue) + " ngày"
                  : "0 ngày"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiCheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tỷ lệ phê duyệt</p>
              <p className="text-2xl font-bold text-gray-900">
                {safeWorkflow.workflowStats && safeWorkflow.workflowStats.length > 0
                  ? Math.round(
                      safeWorkflow.workflowStats.reduce(
                        (sum, stat) => sum + (stat.approval_rate || 0),
                        0
                      ) / safeWorkflow.workflowStats.length
                    ) + "%"
                  : "0%"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiXCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Workflow vi phạm</p>
              <p className="text-2xl font-bold text-gray-900">
                {safeWorkflow.bottlenecks ? safeWorkflow.bottlenecks.length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Documents Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FiAlertTriangle className="mr-2 text-red-600" />
            Tài liệu quá hạn review
          </h3>
        </div>
        {isLoadingOverdue ? (
          <div className="p-8">
            <LoadingSpinner />
          </div>
        ) : safeOverdue.overdueDocuments && safeOverdue.overdueDocuments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã tài liệu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiêu đề
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phòng ban
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày hết hạn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quá hạn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tác giả
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {safeOverdue.overdueDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {doc.document_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{doc.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(doc.next_review_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          doc.days_overdue > 30
                            ? "bg-red-100 text-red-800"
                            : doc.days_overdue > 7
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {Math.round(doc.days_overdue)} ngày
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.author_name || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <FiCheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Không có tài liệu quá hạn
            </h3>
            <p className="text-gray-500">Tất cả tài liệu đều được review đúng hạn.</p>
          </div>
        )}
      </div>

      {/* Workflow Adherence Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Approval Rates by Document Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tỷ lệ phê duyệt theo loại tài liệu
          </h3>
          {safeWorkflow.workflowStats && safeWorkflow.workflowStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safeWorkflow.workflowStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === "approval_rate" ? `${value}%` : value,
                    name === "approval_rate"
                      ? "Tỷ lệ phê duyệt"
                      : name === "published_count"
                      ? "Đã phê duyệt"
                      : name === "rejected_count"
                      ? "Bị từ chối"
                      : "Tổng số",
                  ]}
                />
                <Bar dataKey="approval_rate" fill="#10b981" name="approval_rate" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Không có dữ liệu
            </div>
          )}
        </div>
        {/* Average Approval Time */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Thời gian phê duyệt trung bình
          </h3>
          {safeWorkflow.approvalTimes && safeWorkflow.approvalTimes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                {/* Thuộc tính `layout` được đặt thành "vertical" để tạo biểu đồ thanh ngang */}
              <BarChart data={safeWorkflow.approvalTimes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="type" type="category" width={80} />
                <Tooltip
                  formatter={(value) => [`${Math.round(value)} ngày`, "Thời gian trung bình"]}
                />
                <Bar dataKey="avg_approval_days" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Không có dữ liệu
            </div>
          )}
        </div>
      </div>

      {/* Overdue by Department */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Tài liệu quá hạn theo phòng ban
          </h3>
        </div>
        <div className="p-6">
          {safeOverdue.overdueByDept && safeOverdue.overdueByDept.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={safeOverdue.overdueByDept}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" name="Số tài liệu quá hạn" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Không có dữ liệu
            </div>
          )}
        </div>
      </div>

      {/* Workflow Bottlenecks */}
      {safeWorkflow.bottlenecks && safeWorkflow.bottlenecks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FiAlertTriangle className="mr-2 text-yellow-600" />
              Điểm nghẽn trong workflow
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Từ trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Đến trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số lần chuyển
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian TB
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {safeWorkflow.bottlenecks.map((bottleneck, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bottleneck.from_status || "Bắt đầu"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bottleneck.to_status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bottleneck.transition_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          bottleneck.avg_duration_days > 7
                            ? "bg-red-100 text-red-800"
                            : bottleneck.avg_duration_days > 3
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {Math.round(bottleneck.avg_duration_days || 0)} ngày
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceReportsPage;
// src/components/documents/RelatedDocuments.js
/**
 * =================================================================
 * EDMS 1CAR - Related Documents Component
 * Display related documents based on references and relationships
 * =================================================================
 */

// 1. IMPORTS
// -----------------------------------------------------------------
import React, { useState, useEffect } from 'react'; // Bỏ useMemo, thêm useEffect
import { useQuery } from '@tanstack/react-query';
import {
    FiFile, FiExternalLink, FiEye, FiDownload, FiClock, FiUser,
    FiTag, FiSearch, FiRefreshCw, FiAlertCircle
} from 'react-icons/fi';
import { documentAPI } from '../../api/documentApi';
import { dateTime, numeric } from '../../utils/formatters';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

// SỬA LỖI 2.1: Tạo một custom hook (hoặc hàm) để debounce giá trị
// Giúp trì hoãn việc gọi API khi người dùng đang gõ
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}


// 2. COMPONENT DEFINITION
// -----------------------------------------------------------------
function RelatedDocuments({ documentId, onDocumentSelect }) {

    // 3. STATE MANAGEMENT
    // -----------------------------------------------------------------
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('relevance');

    // SỬA LỖI 2.2: Sử dụng giá trị đã được debounce để gọi API
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // 4. DATA FETCHING (React Query)
    // -----------------------------------------------------------------
    const {
        data: relatedDocsData, // Đổi tên để rõ ràng hơn
        isLoading,
        error,
        refetch
    } = useQuery({
        // SỬA LỖI 2.3: Thêm debouncedSearchTerm vào queryKey
        // Để React Query tự động fetch lại khi người dùng tìm kiếm
        queryKey: ['relatedDocuments', documentId, filterType, sortBy, debouncedSearchTerm],
        queryFn: () => documentAPI.getRelatedDocuments(documentId, {
            type: filterType,
            sort: sortBy,
            search: debouncedSearchTerm, // Gửi từ khóa tìm kiếm lên server
            limit: 20
        }),
        enabled: !!documentId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // SỬA LỖI 2.4: Lấy dữ liệu trực tiếp từ API, không cần lọc phía client
    // Giả sử API trả về cấu trúc { data: [...] }
    const documents = relatedDocsData?.data || [];


    // 5. HELPER & UTILITY FUNCTIONS
    // -----------------------------------------------------------------
    const getDocumentTypeDisplay = (type) => {
        const types = { 'PL': 'Chính sách', 'PR': 'Quy trình', 'WI': 'Hướng dẫn', 'FM': 'Biểu mẫu', 'TD': 'Tài liệu kỹ thuật', 'TR': 'Tài liệu đào tạo', 'RC': 'Hồ sơ' };
        return types[type] || type;
    };

    const getRelationshipDisplay = (relationship) => {
        const relationships = { 'references': 'Tham chiếu', 'referenced_by': 'Được tham chiếu bởi', 'replaces': 'Thay thế', 'replaced_by': 'Được thay thế bởi', 'related_to': 'Liên quan đến', 'same_category': 'Cùng danh mục', 'same_department': 'Cùng phòng ban', 'same_author': 'Cùng tác giả' };
        return relationships[relationship] || relationship;
    };

    const getRelationshipColor = (relationship) => {
        const colors = { 'references': 'bg-blue-100 text-blue-800', 'referenced_by': 'bg-green-100 text-green-800', 'replaces': 'bg-yellow-100 text-yellow-800', 'replaced_by': 'bg-red-100 text-red-800', 'related_to': 'bg-purple-100 text-purple-800', 'same_category': 'bg-gray-100 text-gray-800', 'same_department': 'bg-indigo-100 text-indigo-800', 'same_author': 'bg-pink-100 text-pink-800' };
        return colors[relationship] || 'bg-gray-100 text-gray-800';
    };


    // 6. DERIVED STATE & MEMOIZATION (Đã xóa)
    // -----------------------------------------------------------------
    // SỬA LỖI 2.5: Xóa bỏ `useMemo` để lọc client-side vì logic này đã được chuyển lên server


    // 7. EVENT HANDLERS
    // -----------------------------------------------------------------
    const handleDownload = async (docId, e) => {
        e.stopPropagation();
        try {
            await documentAPI.downloadDocument(docId);
        } catch (downloadError) {
            console.error('Download error:', downloadError);
        }
    };

    const handleOpenInNewTab = (docId, e) => {
        e.stopPropagation();
        window.open(`/documents/${docId}`, '_blank');
    };


    // 8. CONDITIONAL RENDERING (LOADING & ERROR STATES)
    // -----------------------------------------------------------------
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner message="Đang tải tài liệu liên quan..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <FiAlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Không thể tải tài liệu liên quan
                </h3>
                <p className="text-gray-500 mb-4">{error.message}</p>
                <button onClick={() => refetch()} className="btn btn-outline btn-sm flex items-center mx-auto">
                    <FiRefreshCw className="mr-2 h-4 w-4" />
                    Thử lại
                </button>
            </div>
        );
    }


    // 9. MAIN RENDER
    // -----------------------------------------------------------------
    return (
        <div className="space-y-6">
            {/* --- Search and Filter Controls --- */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm trong các tài liệu liên quan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex space-x-2">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Tất cả mối quan hệ</option>
                        <option value="references">Tham chiếu</option>
                        <option value="referenced_by">Được tham chiếu</option>
                        <option value="replaces">Thay thế</option>
                        <option value="related_to">Liên quan</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="relevance">Độ liên quan</option>
                        <option value="date_desc">Mới nhất</option>
                        <option value="date_asc">Cũ nhất</option>
                        <option value="title">Tên A-Z</option>
                    </select>
                </div>
            </div>

            {/* --- Results Summary --- */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                    {/* Sửa lại để dùng `documents.length` */}
                    Tìm thấy <span className="font-medium">{documents.length}</span> tài liệu.
                </p>
                {documents.length > 0 && (
                    <button onClick={() => refetch()} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                        <FiRefreshCw className="mr-1 h-3 w-3" />
                        Làm mới
                    </button>
                )}
            </div>

            {/* --- Documents List --- */}
            {documents.length === 0 ? (
                <div className="text-center py-12">
                    <FiFile className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Không có tài liệu nào</h3>
                    <p className="text-gray-500">
                        {debouncedSearchTerm
                            ? 'Không tìm thấy tài liệu nào phù hợp với từ khóa của bạn.'
                            : 'Chưa có tài liệu nào liên quan đến tài liệu này.'
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Sửa lại để map qua `documents` */}
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            onClick={() => onDocumentSelect?.(doc)}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center mb-2 flex-wrap gap-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRelationshipColor(doc.relationship_type)}`}>
                                            {getRelationshipDisplay(doc.relationship_type)}
                                        </span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {getDocumentTypeDisplay(doc.type)}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-1 hover:text-blue-600">{doc.title}</h4>
                                    <p className="text-sm text-gray-600 mb-2">
                                        Mã: <span className="font-medium">{doc.document_code}</span>
                                        {doc.version && <span className="ml-2">Phiên bản: <span className="font-medium">{doc.version}</span></span>}
                                    </p>
                                    {doc.description && <p className="text-sm text-gray-700 mb-3 line-clamp-2">{doc.description}</p>}
                                    <div className="flex flex-wrap items-center text-xs text-gray-500 gap-x-4 gap-y-1">
                                        <span className="flex items-center"><FiUser className="mr-1 h-3 w-3" />{doc.author_name || 'N/A'}</span>
                                        <span className="flex items-center"><FiTag className="mr-1 h-3 w-3" />{doc.department}</span>
                                        {/* SỬA LỖI 1: Xóa bỏ các dấu ** xung quanh dateTime */}
                                        <span className="flex items-center"><FiClock className="mr-1 h-3 w-3" />{dateTime.formatRelativeTime(doc.updated_at)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1 sm:space-x-2 ml-4 flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); onDocumentSelect?.(doc); }} className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50" title="Xem chi tiết">
                                        <FiEye className="h-4 w-4" />
                                    </button>
                                    <button onClick={(e) => handleDownload(doc.id, e)} className="p-2 text-gray-400 hover:text-green-600 rounded-md hover:bg-green-50" title="Tải xuống">
                                        <FiDownload className="h-4 w-4" />
                                    </button>
                                    <button onClick={(e) => handleOpenInNewTab(doc.id, e)} className="p-2 text-gray-400 hover:text-purple-600 rounded-md hover:bg-purple-50" title="Mở trong tab mới">
                                        <FiExternalLink className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {doc.relationship_details && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-600"><span className="font-medium">Chi tiết:</span> {doc.relationship_details}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* --- Load More Button --- */}
            {/* Logic này có thể cần được phát triển thêm nếu muốn có tính năng "Tải thêm" thực sự */}
            {documents.length >= 20 && (
                <div className="text-center mt-6">
                    <button className="btn btn-outline">
                        Xem thêm
                    </button>
                </div>
            )}
        </div>
    );
}

// 10. EXPORT
// -----------------------------------------------------------------
export default RelatedDocuments;
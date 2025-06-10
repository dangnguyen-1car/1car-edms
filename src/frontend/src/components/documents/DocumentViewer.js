// src/components/documents/DocumentViewer.js
/**
 * =================================================================
 * EDMS 1CAR - Document Viewer Component
 * Support PDF, DOC, DOCX file viewing
 * Integrated with react-pdf and mammoth.js
 * =================================================================
 */

// 1. IMPORTS
// -----------------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import mammoth from 'mammoth';
import {
    FiFile, FiZoomIn, FiZoomOut, FiRotateCw, FiDownload, FiMaximize,
    FiMinimize, FiChevronLeft, FiChevronRight, FiAlertCircle, FiLoader
} from 'react-icons/fi';
import { documentAPI } from '../../api/documentApi';
import LoadingSpinner from '../common/LoadingSpinner';

// 2. CONFIGURATION
// -----------------------------------------------------------------
// Configure PDF.js worker to ensure it can run in the background
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// 3. COMPONENT DEFINITION
// -----------------------------------------------------------------
function DocumentViewer({ document, onError }) {

    // 4. STATE MANAGEMENT
    // -----------------------------------------------------------------
    const [fileContent, setFileContent] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- PDF specific states ---
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 5. SIDE EFFECTS (useEffect)
    // -----------------------------------------------------------------
    // Load document content whenever the document ID changes
    useEffect(() => {
        loadDocumentContent();
    }, [document?.id]);

    // 6. CORE LOGIC & ASYNC FUNCTIONS
    // -----------------------------------------------------------------
    const loadDocumentContent = async () => {
        if (!document?.id) return;

        setLoading(true);
        setError(null);
        setFileContent(null); // Reset content on new load

        try {
            // Determine file type from mime_type or file extension
            const mimeType = document.mime_type || '';
            const fileName = document.file_name || '';
            const extension = fileName.split('.').pop()?.toLowerCase();
            let detectedType = 'unknown';

            if (mimeType.includes('pdf') || extension === 'pdf') {
                detectedType = 'pdf';
            } else if (mimeType.includes('msword') || extension === 'doc') {
                detectedType = 'doc';
            } else if (mimeType.includes('wordprocessingml') || extension === 'docx') {
                detectedType = 'docx';
            }
            setFileType(detectedType);

            // Fetch and process content based on file type
            if (detectedType === 'pdf') {
                const fileUrl = await documentAPI.getDocumentFileUrl(document.id);
                setFileContent(fileUrl);
            } else if (detectedType === 'docx') {
                const arrayBuffer = await documentAPI.getDocumentFileBuffer(document.id);
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setFileContent(result.value);
            } else if (detectedType === 'doc') {
                setError('Định dạng DOC cần được chuyển đổi. Vui lòng tải xuống để xem.');
            } else {
                setError('Định dạng file không được hỗ trợ xem trực tuyến.');
            }
        } catch (err) {
            console.error('Error loading document content:', err);
            const errorMessage = 'Không thể tải nội dung tài liệu.';
            setError(errorMessage);
            onError?.(new Error(errorMessage));
        } finally {
            setLoading(false);
        }
    };

    // 7. EVENT HANDLERS
    // -----------------------------------------------------------------
    // --- PDF Event Handlers ---
    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1); // Reset to first page on new document load
    };

    const onDocumentLoadError = (error) => {
        console.error('PDF load error:', error);
        const errorMessage = 'Không thể tải file PDF. File có thể bị lỗi hoặc không được hỗ trợ.';
        setError(errorMessage);
        onError?.(new Error(errorMessage));
    };

    // --- UI Control Handlers ---
    const goToPrevPage = () => setPageNumber(prev => Math.max(1, prev - 1));
    const goToNextPage = () => setPageNumber(prev => Math.min(numPages, prev + 1));
    const handleZoomIn = () => setScale(prev => Math.min(3.0, prev + 0.2));
    const handleZoomOut = () => setScale(prev => Math.max(0.5, prev - 0.2));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const handleDownload = async () => {
        try {
            await documentAPI.downloadDocument(document.id);
        } catch (downloadError) {
            console.error('Download error:', downloadError);
            onError?.(new Error('Tải xuống tài liệu thất bại.'));
        }
    };

    // 8. CONDITIONAL RENDERING (LOADING & ERROR STATES)
    // -----------------------------------------------------------------
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <LoadingSpinner size="large" message="Đang tải nội dung tài liệu..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4">
                <FiAlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
                    Không thể hiển thị tài liệu
                </h3>
                <p className="text-gray-500 text-center mb-4 max-w-md">
                    {error}
                </p>
                <div className="flex space-x-3">
                    <button onClick={loadDocumentContent} className="btn btn-outline btn-sm flex items-center">
                        <FiLoader className="mr-2 h-4 w-4" />
                        Thử lại
                    </button>
                    <button onClick={handleDownload} className="btn btn-primary btn-sm flex items-center">
                        <FiDownload className="mr-2 h-4 w-4" />
                        Tải xuống
                    </button>
                </div>
            </div>
        );
    }

    // 9. MAIN RENDER
    // -----------------------------------------------------------------
    return (
        <div className={`document-viewer border border-gray-200 rounded-lg ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}>
            {/* --- Toolbar --- */}
            <div className="flex items-center justify-between p-2 sm:p-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                <div className="flex items-center space-x-2 min-w-0">
                    <FiFile className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 truncate">
                        {document.file_name || document.title}
                    </span>
                    {fileType && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {fileType.toUpperCase()}
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-1 sm:space-x-2">
                    {fileType === 'pdf' && (
                        <>
                            {/* PDF Navigation */}
                            <div className="flex items-center space-x-1 sm:space-x-2 border-r border-gray-300 pr-1 sm:pr-2">
                                <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Trang trước">
                                    <FiChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="text-sm text-gray-600 min-w-max">
                                    {pageNumber} / {numPages || '...'}
                                </span>
                                <button onClick={goToNextPage} disabled={!numPages || pageNumber >= numPages} className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Trang sau">
                                    <FiChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                            {/* PDF Controls */}
                            <div className="flex items-center space-x-1 sm:space-x-2 border-r border-gray-300 pr-1 sm:pr-2">
                                <button onClick={handleZoomOut} className="p-1 rounded hover:bg-gray-200" title="Thu nhỏ">
                                    <FiZoomOut className="h-4 w-4" />
                                </button>
                                <span className="text-sm text-gray-600 min-w-max">{Math.round(scale * 100)}%</span>
                                <button onClick={handleZoomIn} className="p-1 rounded hover:bg-gray-200" title="Phóng to">
                                    <FiZoomIn className="h-4 w-4" />
                                </button>
                                <button onClick={handleRotate} className="p-1 rounded hover:bg-gray-200" title="Xoay">
                                    <FiRotateCw className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    )}
                    {/* Common Controls */}
                    <button onClick={toggleFullscreen} className="p-1 rounded hover:bg-gray-200" title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
                        {isFullscreen ? <FiMinimize className="h-4 w-4" /> : <FiMaximize className="h-4 w-4" />}
                    </button>
                    <button onClick={handleDownload} className="p-1 rounded hover:bg-gray-200" title="Tải xuống">
                        <FiDownload className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* --- Content Area --- */}
            <div className={`overflow-auto bg-gray-100 ${isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-96'}`}>
                {fileType === 'pdf' && fileContent && (
                    <div className="flex justify-center p-4">
                        <Document
                            file={fileContent}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={<div className="flex items-center justify-center h-64"><LoadingSpinner message="Đang tải PDF..." /></div>}
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                rotate={rotation}
                                className="shadow-lg"
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </Document>
                    </div>
                )}
                {fileType === 'docx' && fileContent && (
                    <div className="max-w-4xl mx-auto p-6 bg-white shadow-sm my-4">
                        <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: fileContent }}
                        />
                    </div>
                )}
                {fileType === 'unknown' && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <FiFile className="h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Không thể xem trước</h3>
                        <p className="text-gray-500 mb-4">Định dạng file này không hỗ trợ xem trực tuyến.</p>
                        <button onClick={handleDownload} className="btn btn-primary flex items-center">
                            <FiDownload className="mr-2 h-4 w-4" />
                            Tải xuống để xem
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// 10. EXPORT
// -----------------------------------------------------------------
export default DocumentViewer;
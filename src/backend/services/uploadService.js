/**
 * =================================================================
 * EDMS 1CAR - Upload Service
 * File upload and management for document attachments
 * Based on security requirements and file handling best practices
 * =================================================================
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const mime = require('mime-types');
const { upload } = require('../config');
const AuditLog = require('../models/AuditLog');
const { logError, logSystem } = require('../utils/logger');
const { createError } = require('../middleware/errorHandler');

class UploadService {
    /**
     * Configure multer storage
     */
    static getMulterStorage() {
        return multer.diskStorage({
            destination: async (req, file, cb) => {
                try {
                    // Ensure upload directory exists
                    await fs.ensureDir(upload.path);
                    await fs.ensureDir(upload.tempPath);
                    
                    // Use temp directory for initial upload
                    cb(null, upload.tempPath);
                } catch (error) {
                    cb(error);
                }
            },
            
            filename: (req, file, cb) => {
                try {
                    // Generate unique filename
                    const timestamp = Date.now();
                    const randomString = crypto.randomBytes(8).toString('hex');
                    const extension = path.extname(file.originalname).toLowerCase();
                    const baseName = path.basename(file.originalname, extension);
                    
                    // Sanitize filename
                    const sanitizedBaseName = baseName
                        .replace(/[^a-zA-Z0-9\-_]/g, '_')
                        .substring(0, 50);
                    
                    const filename = `${timestamp}_${randomString}_${sanitizedBaseName}${extension}`;
                    cb(null, filename);
                } catch (error) {
                    cb(error);
                }
            }
        });
    }

    /**
     * File filter for multer
     */
    static fileFilter(req, file, cb) {
        try {
            // Check MIME type
            const allowedMimeTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            if (!allowedMimeTypes.includes(file.mimetype)) {
                return cb(createError('Chỉ chấp nhận tệp PDF, DOC, DOCX', 400, 'INVALID_FILE_TYPE'), false);
            }

            // Check file extension
            const allowedExtensions = ['.pdf', '.doc', '.docx'];
            const fileExtension = path.extname(file.originalname).toLowerCase();
            
            if (!allowedExtensions.includes(fileExtension)) {
                return cb(createError('Phần mở rộng tệp không hợp lệ', 400, 'INVALID_FILE_EXTENSION'), false);
            }

            // Additional security checks
            if (file.originalname.includes('..') || file.originalname.includes('/')) {
                return cb(createError('Tên tệp không hợp lệ', 400, 'INVALID_FILENAME'), false);
            }

            cb(null, true);
        } catch (error) {
            cb(error, false);
        }
    }

    /**
     * Get configured multer instance
     */
    static getMulterInstance() {
        return multer({
            storage: this.getMulterStorage(),
            fileFilter: this.fileFilter,
            limits: {
                fileSize: upload.maxSize, // 10MB
                files: 1, // Single file upload
                fieldSize: 1024 * 1024, // 1MB field size
                fieldNameSize: 100,
                fields: 10
            }
        });
    }

    /**
     * Process uploaded file
     * @param {Object} file - Multer file object
     * @param {Object} user - Current user
     * @param {Object} context - Request context
     * @returns {Promise<Object>} - Processed file info
     */
    static async processUpload(file, user, context = {}) {
        try {
            if (!file) {
                throw createError('Không có tệp được tải lên', 400, 'NO_FILE_UPLOADED');
            }

            // Validate file size
            if (file.size > upload.maxSize) {
                await this.cleanupFile(file.path);
                throw createError(`Kích thước tệp vượt quá giới hạn ${upload.maxSize / (1024 * 1024)}MB`, 400, 'FILE_TOO_LARGE');
            }

            // Validate file type again (defense in depth)
            const detectedMimeType = mime.lookup(file.originalname);
            if (!upload.allowedTypes.includes(path.extname(file.originalname).substring(1))) {
                await this.cleanupFile(file.path);
                throw createError('Loại tệp không được phép', 400, 'INVALID_FILE_TYPE');
            }

            // Scan file for security (basic checks)
            await this.performSecurityScan(file);

            // Generate final filename and move to permanent location
            const finalPath = await this.moveToFinalLocation(file, user);

            // Create file metadata
            const fileMetadata = {
                originalName: file.originalname,
                filename: path.basename(finalPath),
                path: finalPath,
                size: file.size,
                mimeType: file.mimetype,
                extension: path.extname(file.originalname).toLowerCase(),
                uploadedBy: user.id,
                uploadedAt: new Date().toISOString(),
                checksum: await this.calculateChecksum(finalPath)
            };

            // Log file upload
            await AuditLog.create({
                user_id: user.id,
                action: 'FILE_UPLOADED',
                resource_type: 'file',
                details: {
                    originalName: file.originalname,
                    filename: fileMetadata.filename,
                    size: file.size,
                    mimeType: file.mimetype,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

            logSystem('FILE_UPLOADED', {
                filename: fileMetadata.filename,
                size: file.size,
                userId: user.id,
                ip: context.ip
            });

            return {
                success: true,
                message: 'Tệp đã được tải lên thành công',
                file: fileMetadata
            };

        } catch (error) {
            // Cleanup file on error
            if (file && file.path) {
                await this.cleanupFile(file.path);
            }
            
            logError(error, null, { operation: 'UploadService.processUpload', userId: user.id });
            throw error;
        }
    }

    /**
     * Move file from temp to final location
     * @param {Object} file - Multer file object
     * @param {Object} user - Current user
     * @returns {Promise<string>} - Final file path
     */
    static async moveToFinalLocation(file, user) {
        try {
            // Create user-specific directory structure
            const userDir = path.join(upload.path, user.department.replace(/[^a-zA-Z0-9]/g, '_'));
            const yearMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
            const finalDir = path.join(userDir, yearMonth);
            
            await fs.ensureDir(finalDir);

            // Generate final filename
            const timestamp = Date.now();
            const extension = path.extname(file.originalname).toLowerCase();
            const baseName = path.basename(file.originalname, extension)
                .replace(/[^a-zA-Z0-9\-_]/g, '_')
                .substring(0, 50);
            
            const finalFilename = `${timestamp}_${baseName}${extension}`;
            const finalPath = path.join(finalDir, finalFilename);

            // Move file from temp to final location
            await fs.move(file.path, finalPath);

            // Set appropriate file permissions
            await fs.chmod(finalPath, 0o644);

            return finalPath;
        } catch (error) {
            logError(error, null, { operation: 'UploadService.moveToFinalLocation' });
            throw createError('Lỗi di chuyển tệp', 500, 'FILE_MOVE_ERROR');
        }
    }

    /**
     * Perform basic security scan on uploaded file
     * @param {Object} file - Multer file object
     * @returns {Promise<boolean>} - Scan result
     */
    static async performSecurityScan(file) {
        try {
            // Read first few bytes to check file signature
            const buffer = await fs.readFile(file.path, { start: 0, end: 10 });
            
            // Check for common malicious patterns
            const maliciousPatterns = [
                Buffer.from('MZ'), // PE executable
                Buffer.from('PK'), // ZIP-based files (could be malicious)
                Buffer.from('\x7fELF'), // ELF executable
            ];

            // PDF should start with %PDF
            if (file.mimetype === 'application/pdf') {
                if (!buffer.toString().startsWith('%PDF')) {
                    throw createError('Tệp PDF không hợp lệ', 400, 'INVALID_PDF_SIGNATURE');
                }
            }

            // DOC files should start with specific signatures
            if (file.mimetype === 'application/msword') {
                const docSignature = Buffer.from([0xD0, 0xCF, 0x11, 0xE0]);
                if (!buffer.subarray(0, 4).equals(docSignature)) {
                    throw createError('Tệp DOC không hợp lệ', 400, 'INVALID_DOC_SIGNATURE');
                }
            }

            // DOCX files are ZIP-based but should be validated differently
            if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const zipSignature = Buffer.from([0x50, 0x4B]);
                if (!buffer.subarray(0, 2).equals(zipSignature)) {
                    throw createError('Tệp DOCX không hợp lệ', 400, 'INVALID_DOCX_SIGNATURE');
                }
            }

            // Check file size vs content
            const stats = await fs.stat(file.path);
            if (stats.size !== file.size) {
                throw createError('Kích thước tệp không khớp', 400, 'FILE_SIZE_MISMATCH');
            }

            return true;
        } catch (error) {
            if (error.code && error.code.startsWith('INVALID_')) {
                throw error;
            }
            logError(error, null, { operation: 'UploadService.performSecurityScan' });
            throw createError('Lỗi quét bảo mật tệp', 500, 'SECURITY_SCAN_ERROR');
        }
    }

    /**
     * Calculate file checksum
     * @param {string} filePath - File path
     * @returns {Promise<string>} - SHA256 checksum
     */
    static async calculateChecksum(filePath) {
        try {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            
            return new Promise((resolve, reject) => {
                stream.on('data', data => hash.update(data));
                stream.on('end', () => resolve(hash.digest('hex')));
                stream.on('error', reject);
            });
        } catch (error) {
            logError(error, null, { operation: 'UploadService.calculateChecksum', filePath });
            return null;
        }
    }

    /**
     * Get file information
     * @param {string} filePath - File path
     * @param {Object} user - Current user
     * @returns {Promise<Object>} - File information
     */
    static async getFileInfo(filePath, user) {
        try {
            // Validate file path security
            const normalizedPath = path.normalize(filePath);
            const uploadDir = path.normalize(upload.path);
            
            if (!normalizedPath.startsWith(uploadDir)) {
                throw createError('Đường dẫn tệp không hợp lệ', 400, 'INVALID_FILE_PATH');
            }

            // Check if file exists
            const exists = await fs.pathExists(normalizedPath);
            if (!exists) {
                throw createError('Không tìm thấy tệp', 404, 'FILE_NOT_FOUND');
            }

            // Get file stats
            const stats = await fs.stat(normalizedPath);
            
            return {
                path: normalizedPath,
                size: stats.size,
                mtime: stats.mtime,
                ctime: stats.ctime,
                exists: true
            };
        } catch (error) {
            logError(error, null, { operation: 'UploadService.getFileInfo', filePath, userId: user.id });
            throw error;
        }
    }

    /**
     * Download file
     * @param {string} filePath - File path
     * @param {Object} user - Current user
     * @param {Object} context - Request context
     * @returns {Promise<Object>} - File stream info
     */
    static async downloadFile(filePath, user, context = {}) {
        try {
            // Validate and get file info
            const fileInfo = await this.getFileInfo(filePath, user);

            // Log file download
            await AuditLog.create({
                user_id: user.id,
                action: 'FILE_DOWNLOADED',
                resource_type: 'file',
                details: {
                    filePath: filePath,
                    fileSize: fileInfo.size,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

            return {
                success: true,
                filePath: fileInfo.path,
                size: fileInfo.size,
                mimeType: mime.lookup(fileInfo.path) || 'application/octet-stream'
            };
        } catch (error) {
            logError(error, null, { operation: 'UploadService.downloadFile', filePath, userId: user.id });
            throw error;
        }
    }

    /**
     * Delete file
     * @param {string} filePath - File path
     * @param {Object} user - Current user
     * @param {Object} context - Request context
     * @returns {Promise<Object>} - Delete result
     */
    static async deleteFile(filePath, user, context = {}) {
        try {
            // Validate file path and permissions
            const fileInfo = await this.getFileInfo(filePath, user);

            // Check if user has permission to delete file
            // This would typically check if user owns the file or is admin
            if (user.role !== 'admin') {
                // Additional permission checks would go here
                // For now, allow users to delete files in their department folder
                const userDirPattern = user.department.replace(/[^a-zA-Z0-9]/g, '_');
                if (!filePath.includes(userDirPattern)) {
                    throw createError('Bạn không có quyền xóa tệp này', 403, 'DELETE_PERMISSION_DENIED');
                }
            }

            // Delete file
            await fs.remove(fileInfo.path);

            // Log file deletion
            await AuditLog.create({
                user_id: user.id,
                action: 'FILE_DELETED',
                resource_type: 'file',
                details: {
                    filePath: filePath,
                    fileSize: fileInfo.size,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

            return {
                success: true,
                message: 'Tệp đã được xóa thành công'
            };
        } catch (error) {
            logError(error, null, { operation: 'UploadService.deleteFile', filePath, userId: user.id });
            throw error;
        }
    }

    /**
     * Cleanup temporary files
     * @param {string} filePath - File path to cleanup
     */
    static async cleanupFile(filePath) {
        try {
            if (filePath && await fs.pathExists(filePath)) {
                await fs.remove(filePath);
            }
        } catch (error) {
            logError(error, null, { operation: 'UploadService.cleanupFile', filePath });
        }
    }

    /**
     * Cleanup old temporary files
     * @param {number} maxAge - Maximum age in milliseconds
     * @returns {Promise<number>} - Number of files cleaned
     */
    static async cleanupTempFiles(maxAge = upload.tempFileMaxAge) {
        try {
            const tempDir = upload.tempPath;
            const files = await fs.readdir(tempDir);
            let cleanedCount = 0;

            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                const age = Date.now() - stats.mtime.getTime();

                if (age > maxAge) {
                    await fs.remove(filePath);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                logSystem('TEMP_FILES_CLEANED', {
                    cleanedCount: cleanedCount,
                    maxAge: maxAge
                });
            }

            return cleanedCount;
        } catch (error) {
            logError(error, null, { operation: 'UploadService.cleanupTempFiles' });
            return 0;
        }
    }

    /**
     * Get upload statistics
     * @param {Object} user - Current user
     * @returns {Promise<Object>} - Upload statistics
     */
    static async getUploadStats(user) {
        try {
            const stats = {
                totalFiles: 0,
                totalSize: 0,
                fileTypes: {},
                recentUploads: []
            };

            // Get user's upload directory
            const userDir = path.join(upload.path, user.department.replace(/[^a-zA-Z0-9]/g, '_'));
            
            if (await fs.pathExists(userDir)) {
                const files = await this.getFilesRecursive(userDir);
                
                stats.totalFiles = files.length;
                stats.totalSize = files.reduce((sum, file) => sum + file.size, 0);
                
                // Count file types
                files.forEach(file => {
                    const ext = path.extname(file.name).toLowerCase();
                    stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
                });

                // Get recent uploads (last 10)
                stats.recentUploads = files
                    .sort((a, b) => b.mtime - a.mtime)
                    .slice(0, 10)
                    .map(file => ({
                        name: file.name,
                        size: file.size,
                        uploadedAt: file.mtime
                    }));
            }

            return {
                success: true,
                statistics: stats
            };
        } catch (error) {
            logError(error, null, { operation: 'UploadService.getUploadStats', userId: user.id });
            throw error;
        }
    }

    /**
     * Get files recursively from directory
     * @param {string} dir - Directory path
     * @returns {Promise<Array>} - Array of file info
     */
    static async getFilesRecursive(dir) {
        try {
            const files = [];
            const items = await fs.readdir(dir);

            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = await fs.stat(itemPath);

                if (stats.isFile()) {
                    files.push({
                        name: item,
                        path: itemPath,
                        size: stats.size,
                        mtime: stats.mtime,
                        ctime: stats.ctime
                    });
                } else if (stats.isDirectory()) {
                    const subFiles = await this.getFilesRecursive(itemPath);
                    files.push(...subFiles);
                }
            }

            return files;
        } catch (error) {
            logError(error, null, { operation: 'UploadService.getFilesRecursive', dir });
            return [];
        }
    }
}

// Start cleanup interval for temporary files
setInterval(() => {
    UploadService.cleanupTempFiles().catch(error => {
        logError(error, null, { operation: 'UploadService.cleanupInterval' });
    });
}, upload.cleanupInterval);

module.exports = UploadService;

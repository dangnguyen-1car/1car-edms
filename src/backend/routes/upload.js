/**
 * =================================================================
 * EDMS 1CAR - Upload Routes (Fixed)
 * Handle file upload endpoints
 * =================================================================
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow specific file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(createError('Loại file không được hỗ trợ', 400, 'INVALID_FILE_TYPE'));
    }
  }
});

/**
 * POST /api/upload/document
 * Upload document file
 */
router.post('/document', authenticateToken, requirePermission('upload_files'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError('Không có file được upload', 400, 'NO_FILE_UPLOADED');
    }

    const fileInfo = {
      id: Date.now(),
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedBy: req.user.id,
      uploadedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Upload file thành công',
      data: fileInfo,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/upload/files/:filename
 * Download uploaded file
 */
router.get('/files/:filename', authenticateToken, async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    res.download(filePath, (err) => {
      if (err) {
        next(createError('File không tồn tại', 404, 'FILE_NOT_FOUND'));
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;

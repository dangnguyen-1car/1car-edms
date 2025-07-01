// src/backend/routes/upload.js - PHIÊN BẢN SỬA LỖI CUỐI CÙNG

const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')
const { authenticateToken, requirePermission } = require('../middleware/auth')
const { createError } = require('../middleware/errorHandler')
const { dbManager } = require('../config/database')

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', '..', 'uploads', 'documents')
    fs.ensureDirSync(uploadPath)
    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const originalNameWithoutExt = path.parse(file.originalname).name
    const extension = path.parse(file.originalname).ext
    cb(null, `${originalNameWithoutExt}-${uniqueSuffix}${extension}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(createError('Loại file không được hỗ trợ', 400, 'INVALID_FILE_TYPE'))
    }
  }
})

/**
 * POST /api/upload/document
 * Upload document file and record to database
 */
router.post('/document', authenticateToken, requirePermission('upload_files'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError('Không có file được upload', 400, 'NO_FILE_UPLOADED')
    }

    const { filename, originalname, mimetype, size, path: filePath } = req.file
    const relativePath = path.relative(path.join(__dirname, '..', '..'), filePath).replace(/\\/g, '/')

    // SỬA LỖI: Sắp xếp lại thứ tự các tham số cho đúng với các cột
    const result = await dbManager.run(
      `INSERT INTO file_uploads (original_name, file_name, mime_type, file_path, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [originalname, filename, mimetype, relativePath, size, req.user.id]
    )

    const insertedId = result.lastID

    const fileInfo = {
      id: insertedId,
      filename,
      originalname,
      mimetype,
      size,
      path: relativePath,
      uploadedBy: req.user.id,
      uploadedAt: new Date().toISOString()
    }

    res.status(200).json({
      success: true,
      message: 'Upload file và ghi nhận vào CSDL thành công',
      data: fileInfo,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    })
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path)
    }
    next(error)
  }
})

/**
 * GET /api/upload/files/:filename
 * Download uploaded file
 */
router.get('/files/:filename', authenticateToken, async (req, res, next) => {
  try {
    const { filename } = req.params
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'documents', filename)

    res.download(filePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          next(createError('File không tồn tại', 404, 'FILE_NOT_FOUND'))
        } else {
          next(err)
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router

// src/backend/services/backupService.js

/**
 * =================================================================
 * EDMS 1CAR - Database Backup Service
 * Database backup and recovery management
 * Based on C-PR-AR-001 requirements and system configuration
 * =================================================================
 */

const fs = require('fs-extra');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const cron = require('node-cron'); // Để lập lịch tự động
const { dbManager } = require('../config/database');
const config = require('../config/index'); // File config chính
const { logError, appLogger } = require('../utils/logger');
const AuditService = require('./auditService');

class BackupService {
  constructor() {
    this.dbPath = config.database.path;
    this.backupConfig = config.database.backup;
    this.baseBackupDir = this.backupConfig.path || path.join(config.database.path, '../backups'); // Đảm bảo backupDir được lấy từ config

    // Tạo các thư mục con nếu chưa có
    this.dailyDir = path.join(this.baseBackupDir, 'daily');
    this.weeklyDir = path.join(this.baseBackupDir, 'weekly');
    this.monthlyDir = path.join(this.baseBackupDir, 'monthly');
    this.manualDir = path.join(this.baseBackupDir, 'manual');

    this._ensureBackupDirectories();
  }

  async _ensureBackupDirectories() {
    try {
      await fs.ensureDir(this.dailyDir);
      await fs.ensureDir(this.weeklyDir);
      await fs.ensureDir(this.monthlyDir);
      await fs.ensureDir(this.manualDir);
      appLogger.info('Backup directories ensured.', { base: this.baseBackupDir });
    } catch (error) {
      logError(error, null, { operation: 'BackupService._ensureBackupDirectories' });
      // Không throw lỗi ở đây để service vẫn có thể khởi tạo
    }
  }

  _getBackupPath(type = 'manual') {
    switch (type.toLowerCase()) {
      case 'daily':
      case 'scheduled': // 'scheduled' thường là daily
        return this.dailyDir;
      case 'weekly':
        return this.weeklyDir;
      case 'monthly':
        return this.monthlyDir;
      case 'manual':
      case 'pre_restore_safety':
        return this.manualDir;
      default:
        return this.manualDir;
    }
  }

  /**
   * Create a backup of the database
   */
  async createBackup(reason = 'manual', userId = null, requestContext = {}) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupTypeDir = this._getBackupPath(reason);
    let backupFileName = `edms_backup_${timestamp}.db`;
    let targetPath = path.join(backupTypeDir, backupFileName);
    let originalFileSize = 0;
    let finalFileSize = 0;
    let checksum = null;

    try {
      appLogger.info('Starting database backup...', { reason, userId, targetPath });

      // Kiểm tra dung lượng đĩa (đơn giản hóa)
      // Trong thực tế, cần một hàm kiểm tra dung lượng thực tế
      if (!(await fs.pathExists(this.baseBackupDir))) {
         await this._ensureBackupDirectories(); // Thử tạo lại nếu chưa có
         if(!(await fs.pathExists(this.baseBackupDir))) {
            throw new Error(`Backup directory ${this.baseBackupDir} does not exist and cannot be created.`);
         }
      }

      // Sử dụng API backup của SQLite để đảm bảo tính nhất quán
      // await dbManager.backup(targetPath); // dbManager cần có phương thức backup
      // Hoặc copy file thủ công (cần đảm bảo DB không bị ghi trong lúc copy)
      // Tạm thời dùng copy file, dbManager.backup cần được implement
      if (!await fs.pathExists(this.dbPath)) {
          throw new Error(`Source database file not found: ${this.dbPath}`);
      }
      await fs.copy(this.dbPath, targetPath);
      originalFileSize = (await fs.stat(targetPath)).size;
      finalFileSize = originalFileSize;

      let currentPath = targetPath;

      // Nén file backup nếu được cấu hình
      if (this.backupConfig.compression) {
        const compressedPath = `${currentPath}.gz`;
        const readStream = fs.createReadStream(currentPath);
        const writeStream = fs.createWriteStream(compressedPath);
        const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

        await new Promise((resolve, reject) => {
          readStream.pipe(gzip).pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
        });
        await fs.remove(currentPath); // Xóa file chưa nén
        currentPath = compressedPath;
        backupFileName += '.gz'; // Cập nhật tên file
        finalFileSize = (await fs.stat(currentPath)).size;
        appLogger.info('Backup file compressed.', { path: currentPath });
      }

      // Mã hóa file backup nếu được cấu hình và có key
      if (this.backupConfig.encrypt && this.backupConfig.encryptionKey) {
        const encryptedPath = `${currentPath}.enc`;
        const key = crypto.scryptSync(this.backupConfig.encryptionKey, 'salt-for-backup', 32); // Nên dùng salt ngẫu nhiên và lưu lại
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const readStream = fs.createReadStream(currentPath);
        const writeStream = fs.createWriteStream(encryptedPath);

        // Ghi IV vào đầu file mã hóa
        writeStream.write(iv);

        await new Promise((resolve, reject) => {
          readStream.pipe(cipher).pipe(writeStream)
            .on('finish', () => {
              const authTag = cipher.getAuthTag();
              writeStream.write(authTag); // Ghi authTag vào cuối
              writeStream.end(resolve);
            })
            .on('error', reject);
        });
        await fs.remove(currentPath); // Xóa file chưa mã hóa
        currentPath = encryptedPath;
        backupFileName += '.enc'; // Cập nhật tên file
        finalFileSize = (await fs.stat(currentPath)).size;
        appLogger.info('Backup file encrypted.', { path: currentPath });
      }

      // Tính checksum của file backup cuối cùng
      checksum = await this._calculateFileChecksum(currentPath);

      const backupRecord = {
        id: crypto.randomUUID(),
        fileName: backupFileName,
        filePath: currentPath, // Lưu đường dẫn của file cuối cùng (có thể đã nén, mã hóa)
        timestamp: new Date(startTime).toISOString(), // Thời điểm bắt đầu backup
        reason,
        size: finalFileSize,
        originalSize: originalFileSize, // Kích thước trước khi nén/mã hóa
        compressed: this.backupConfig.compression,
        encrypted: this.backupConfig.encrypt && !!this.backupConfig.encryptionKey,
        checksum,
        createdBy: userId,
        status: 'completed',
      };

      await this._saveBackupRecord(backupRecord);

      await AuditService.log({
        action: 'SYSTEM_BACKUP',
        userId,
        resourceType: 'system', // Hoặc 'database'
        details: {
          backupId: backupRecord.id,
          fileName: backupFileName,
          size: finalFileSize,
          reason,
          path: currentPath,
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        sessionId: requestContext.sessionId
      });

      appLogger.info('Database backup created successfully.', backupRecord);
      return { success: true, data: backupRecord };

    } catch (error) {
      logError(error, null, { operation: 'BackupService.createBackup', reason, userId });
      // Ghi nhận trạng thái thất bại nếu có thể
      const backupRecord = {
        fileName: backupFileName,
        filePath: targetPath,
        timestamp: new Date(startTime).toISOString(),
        reason,
        status: 'failed',
        error: error.message,
        createdBy: userId,
      };
      await this._saveBackupRecord(backupRecord); // Ghi lại thông tin backup thất bại
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(filters = {}) {
    try {
      const records = await this._loadBackupRecords();
      let filteredRecords = records;

      if (filters.reason) {
        filteredRecords = filteredRecords.filter(r => r.reason === filters.reason);
      }
      if (filters.status) {
        filteredRecords = filteredRecords.filter(r => r.status === filters.status);
      }
      // Thêm các filter khác nếu cần (ví dụ: date range)

      // Sắp xếp theo thời gian tạo, mới nhất trước
      filteredRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return { success: true, data: filteredRecords };
    } catch (error) {
      logError(error, null, { operation: 'BackupService.listBackups', filters });
      throw error;
    }
  }

  /**
   * Restore database from a backup file
   */
  async restoreBackup(backupId, userId = null, requestContext = {}) {
    const records = await this._loadBackupRecords();
    const backupRecord = records.find(r => r.id === backupId && r.status === 'completed');

    if (!backupRecord) {
      throw new Error(`Backup record not found or not completed for ID: ${backupId}`);
    }
    if (!await fs.pathExists(backupRecord.filePath)) {
         throw new Error(`Backup file not found at path: ${backupRecord.filePath}`);
    }


    appLogger.info('Starting database restore...', { backupId, fileName: backupRecord.fileName, userId });

    // 0. (Quan trọng) Đóng kết nối DB hiện tại để giải phóng file lock
    await dbManager.close();
    appLogger.info('Current database connection closed for restore.');


    // 1. Tạo bản sao lưu an toàn cho DB hiện tại (nếu có)
    const safetyBackupName = `edms_safety_restore_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    const safetyBackupPath = path.join(this._getBackupPath('manual'), safetyBackupName);
    let safetyBackupCreated = false;
    if (await fs.pathExists(this.dbPath)) {
      await fs.copy(this.dbPath, safetyBackupPath);
      safetyBackupCreated = true;
      appLogger.info('Safety backup of current database created.', { path: safetyBackupPath });
    }

    try {
      let restoreSourcePath = backupRecord.filePath;
      const tempRestoreDir = path.join(this.baseBackupDir, 'temp_restore');
      await fs.ensureDir(tempRestoreDir);
      let tempDecryptedPath = null;
      let tempExtractedPath = null;

      // 2. Giải mã (nếu cần)
      if (backupRecord.encrypted) {
        if (!this.backupConfig.encryptionKey) throw new Error('Encryption key not configured for decryption.');
        tempDecryptedPath = path.join(tempRestoreDir, path.basename(backupRecord.fileName.replace('.enc', '')));
        const key = crypto.scryptSync(this.backupConfig.encryptionKey, 'salt-for-backup', 32);
        const readStream = fs.createReadStream(backupRecord.filePath);
        const writeStream = fs.createWriteStream(tempDecryptedPath);

        const iv = await new Promise((resolve, reject) => {
            readStream.once('readable', () => {
                const ivBuffer = readStream.read(16);
                if (!ivBuffer || ivBuffer.length < 16) return reject(new Error('Failed to read IV from encrypted file.'));
                resolve(ivBuffer);
            });
            readStream.once('error', reject);
        });

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        // AuthTag được đọc từ cuối file
        const fileSize = (await fs.stat(backupRecord.filePath)).size;
        const authTag = await new Promise((resolve, reject) => {
            const tagReadStream = fs.createReadStream(backupRecord.filePath, { start: fileSize - 16 });
            let tagBuffer = Buffer.alloc(0);
            tagReadStream.on('data', chunk => tagBuffer = Buffer.concat([tagBuffer, chunk]));
            tagReadStream.on('end', () => resolve(tagBuffer));
            tagReadStream.on('error', reject);
        });
        decipher.setAuthTag(authTag);


        const dataReadStream = fs.createReadStream(backupRecord.filePath, { start: 16, end: fileSize - 17 });

        await new Promise((resolve, reject) => {
          dataReadStream.pipe(decipher).pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
        });
        restoreSourcePath = tempDecryptedPath;
        appLogger.info('Backup file decrypted.', { path: restoreSourcePath });
      }

      // 3. Giải nén (nếu cần)
      if (backupRecord.compressed) {
        tempExtractedPath = path.join(tempRestoreDir, path.basename(restoreSourcePath.replace('.gz', '')));
        const readStream = fs.createReadStream(restoreSourcePath);
        const writeStream = fs.createWriteStream(tempExtractedPath);
        const gunzip = zlib.createGunzip();
        await new Promise((resolve, reject) => {
          readStream.pipe(gunzip).pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
        });
        restoreSourcePath = tempExtractedPath;
        appLogger.info('Backup file decompressed.', { path: restoreSourcePath });
      }

      // 4. Kiểm tra checksum của file nguồn restore (nếu có)
      const currentChecksum = await this._calculateFileChecksum(restoreSourcePath);
      if (backupRecord.checksum && backupRecord.checksum !== currentChecksum && !(backupRecord.compressed || backupRecord.encrypted)) {
        // Chỉ kiểm tra checksum gốc nếu file không bị nén/mã hóa sau khi checksum
        // Vì checksum được tính trên file cuối cùng (có thể đã nén/mã hóa)
         throw new Error(`Checksum mismatch for restore source. Expected: ${backupRecord.checksum}, Actual: ${currentChecksum}. Restore aborted.`);
      }


      // 5. Thực hiện restore (thay thế file DB hiện tại)
      await fs.copy(restoreSourcePath, this.dbPath, { overwrite: true });
      appLogger.info('Database file restored.', { from: backupRecord.fileName, to: this.dbPath });


      // Xóa file tạm sau khi restore thành công
      if (tempDecryptedPath) await fs.remove(tempDecryptedPath);
      if (tempExtractedPath) await fs.remove(tempExtractedPath);
      await fs.remove(tempRestoreDir);


      // 6. (Quan trọng) Khởi tạo lại kết nối DB
      await dbManager.initialize();
      appLogger.info('Database connection re-initialized after restore.');


      // 7. Xác minh DB sau restore (ví dụ: chạy PRAGMA integrity_check)
      const integrity = await dbManager.get("PRAGMA integrity_check;");
      if (integrity.integrity_check !== 'ok') {
        appLogger.error('Restored database integrity check failed.', integrity);
        // Cân nhắc rollback về safety backup ở đây
        if (safetyBackupCreated) {
            appLogger.warn('Attempting to restore safety backup due to integrity check failure...');
            await dbManager.close();
            await fs.copy(safetyBackupPath, this.dbPath, { overwrite: true });
            await dbManager.initialize();
            appLogger.info('Restored from safety backup.');
        }
        throw new Error(`Restored database failed integrity check: ${integrity.integrity_check}`);
      }
      appLogger.info('Restored database integrity check passed.');


      await AuditService.log({
        action: 'SYSTEM_RESTORE',
        userId,
        resourceType: 'system',
        details: { backupId, fileName: backupRecord.fileName, restoredFromPath: backupRecord.filePath },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        sessionId: requestContext.sessionId
      });

      appLogger.info('Database restored successfully.', { backupId, fileName: backupRecord.fileName });
      return { success: true, message: `Database restored successfully from ${backupRecord.fileName}` };

    } catch (error) {
      logError(error, null, { operation: 'BackupService.restoreBackup', backupId, userId });
      // Nếu lỗi, cố gắng khôi phục lại kết nối DB ban đầu
      try {
        if (!dbManager.isInitialized) { // dbManager cần có cờ isInitialized
             await dbManager.initialize();
             appLogger.info('Database connection re-initialized after restore failure.');
        }
      } catch (initError){
          logError(initError, null, { operation: 'BackupService.restoreBackup.reInitializeAfterError' });
      }
      throw error;
    }
  }


  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(userId = null, requestContext = {}) {
    try {
      const records = await this._loadBackupRecords();
      const retentionDays = this.backupConfig.retentionDays || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;
      let totalFreedSpace = 0;
      const remainingRecords = [];

      for (const record of records) {
        if (new Date(record.timestamp) < cutoffDate && record.status === 'completed') { // Chỉ xóa các backup đã hoàn thành
          try {
            if (await fs.pathExists(record.filePath)) {
              const fileSize = (await fs.stat(record.filePath)).size;
              await fs.remove(record.filePath);
              deletedCount++;
              totalFreedSpace += fileSize;
              appLogger.info('Old backup file deleted.', { file: record.fileName, path: record.filePath });
            } else {
                appLogger.warn('Backup file not found for deletion, removing record.', {file: record.fileName});
            }
          } catch (fileError) {
            logError(fileError, null, { operation: 'BackupService.cleanupOldBackups.deleteFile', file: record.fileName });
            remainingRecords.push(record); // Giữ lại record nếu không xóa được file
          }
        } else {
          remainingRecords.push(record);
        }
      }

      await this._saveBackupRecords(remainingRecords);

      if (deletedCount > 0) {
        await AuditService.log({
          action: 'SYSTEM_MAINTENANCE',
          userId,
          resourceType: 'system',
          details: { operation: 'backup_cleanup', deletedCount, totalFreedSpace, retentionDays },
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          sessionId: requestContext.sessionId
        });
        appLogger.info('Old backups cleaned up.', { deletedCount, totalFreedSpace });
      } else {
        appLogger.info('No old backups to cleanup.');
      }

      return { success: true, deletedCount, totalFreedSpace };
    } catch (error) {
      logError(error, null, { operation: 'BackupService.cleanupOldBackups' });
      throw error;
    }
  }

  /**
   * Schedule automatic backups
   */
  scheduleBackups() {
    const schedule = this.backupConfig.schedule;
    if (schedule && cron.validate(schedule)) {
      cron.schedule(schedule, async () => {
        appLogger.info('Running scheduled backup job...');
        try {
          await this.createBackup('scheduled'); // userId có thể là null hoặc một user hệ thống
          await this.cleanupOldBackups();
        } catch (error) {
          logError(error, null, { operation: 'BackupService.scheduledBackupJob' });
        }
      });
      appLogger.info(`Database backup scheduled: ${schedule}`);
    } else {
      appLogger.warn('Automatic backup scheduling is disabled or misconfigured.', { schedule });
    }
  }

  // --- Helper Private Methods ---

  async _calculateFileChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async _getMetadataFilePath() {
    return path.join(this.baseBackupDir, 'backup_records.json');
  }

  async _loadBackupRecords() {
    const filePath = await this._getMetadataFilePath();
    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        return Array.isArray(data.backups) ? data.backups : [];
      } catch (error) {
        logError(error, null, { operation: 'BackupService._loadBackupRecords.readJsonError' });
        return []; // Trả về mảng rỗng nếu file lỗi
      }
    }
    return [];
  }

  async _saveBackupRecords(records) {
    const filePath = await this._getMetadataFilePath();
    await fs.writeJson(filePath, { backups: records }, { spaces: 2 });
  }

  async _saveBackupRecord(newRecord) {
    const records = await this._loadBackupRecords();
    const existingIndex = records.findIndex(r => r.id === newRecord.id);
    if (existingIndex > -1) {
      records[existingIndex] = { ...records[existingIndex], ...newRecord }; // Update if exists
    } else {
      records.push(newRecord);
    }
    await this._saveBackupRecords(records);
  }
}

module.exports = BackupService;
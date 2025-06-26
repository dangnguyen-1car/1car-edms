/**
 * EDMS 1CAR - Database Seeding Script
 * Nạp dữ liệu mẫu cho người dùng và tài liệu.
 */

const fs = require('fs').promises // Sử dụng fs.promises để làm việc với async/await
const path = require('path')
const { dbManager } = require('../src/backend/config/database') // Đảm bảo đường dẫn này đúng
const { appLogger } = require('../src/backend/utils/logger') // Để ghi log

const SEEDS_DIR = path.join(__dirname, '../database/seeds')

/**
 * Thực thi một file SQL.
 * @param {string} filePath Đường dẫn đến file SQL.
 */
async function executeSqlFile (filePath) {
  try {
    const sql = await fs.readFile(filePath, 'utf-8')
    // SQLite có thể thực thi nhiều câu lệnh trong một chuỗi,
    // nhưng để an toàn và dễ debug hơn, ta có thể tách chúng ra.
    // Tuy nhiên, với sqlite3, db.exec() có thể chạy nhiều câu lệnh.
    // Hoặc, nếu dbManager.run chỉ chạy một lệnh, ta cần tách lệnh.
    // Giả định dbManager.run có thể xử lý nhiều lệnh hoặc db.exec được dùng bên trong.
    // Nếu dbManager.run chỉ chạy 1 lệnh, bạn cần parse file SQL thành từng lệnh riêng.
    // Cách đơn giản nhất là dbManager có một phương thức execScript hoặc tương tự.
    // Hiện tại, dbManager không có, nên ta dùng cách chia theo dấu ; và chạy từng lệnh.

    const statements = sql.split(';\n').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0)

    for (const stmt of statements) {
      if (stmt.toUpperCase().startsWith('SELECT')) {
        // Bỏ qua các lệnh SELECT trong file seed (nếu có, ví dụ để verify)
        appLogger.info(`Skipping SELECT statement in seed: ${stmt.substring(0, 50)}...`)
        continue
      }
      if (stmt.toUpperCase().startsWith('--')) {
        // Bỏ qua comment
        appLogger.info(`Skipping comment in seed: ${stmt.substring(0, 50)}...`)
        continue
      }
      await dbManager.run(stmt) // Giả sử dbManager.run có thể thực thi từng lệnh
    }
    appLogger.info(`Successfully executed seed file: ${path.basename(filePath)}`)
  } catch (error) {
    appLogger.error(`Error executing SQL file ${filePath}: ${error.message}`)
    throw error // Ném lỗi để dừng quá trình seed nếu có lỗi
  }
}

/**
 * Hàm chính để chạy seed.
 */
async function seedDatabase () {
  appLogger.info('🌱 Starting database seeding process...')

  try {
    // Khởi tạo kết nối database (quan trọng!)
    await dbManager.initialize()
    appLogger.info('Database initialized for seeding.')

    // Lấy danh sách các file seed theo thứ tự mong muốn
    // Ví dụ: users trước, sau đó đến documents
    const seedFiles = [
      'users.sql',
      'documents.sql'
      // Thêm các file seed khác nếu có
    ]

    for (const fileName of seedFiles) {
      const filePath = path.join(SEEDS_DIR, fileName)
      try {
        await fs.access(filePath) // Kiểm tra file tồn tại
        appLogger.info(`Seeding data from ${fileName}...`)
        await executeSqlFile(filePath)
      } catch (error) {
        // Nếu lỗi là ENOENT (file không tồn tại), bỏ qua file đó và log cảnh báo
        if (error.code === 'ENOENT') {
          appLogger.warn(`Seed file not found: ${fileName}. Skipping.`)
        } else {
          // Nếu là lỗi khác, ném lại để dừng
          throw error
        }
      }
    }

    appLogger.info('✅ Database seeding completed successfully!')
  } catch (error) {
    appLogger.error('❌ Database seeding failed:', error)
    process.exitCode = 1 // Báo lỗi khi thoát
  } finally {
    // Đóng kết nối database
    if (dbManager.db) {
      try {
        await dbManager.close()
        appLogger.info('Database connection closed after seeding.')
      } catch (closeError) {
        appLogger.error('Error closing database connection after seeding:', closeError)
      }
    }
  }
}

// Chạy hàm seed
seedDatabase()

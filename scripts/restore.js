#!/usr/bin/env node
/**
EDMS 1CAR - Database Restore CLI Script
Script dòng lệnh để phục hồi cơ sở dữ liệu từ backup
Sử dụng: node scripts/restore.js [options]
*/

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const readline = require('readline')

// Import BackupService và cấu hình
const BackupService = require('../src/backend/services/backupService')
const { dbManager } = require('../src/backend/config/database')

// Tạo interface để đọc input từ console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
Hàm hiển thị danh sách backup dưới dạng bảng
*/
function displayBackupList (backups) {
  if (backups.length === 0) {
    console.log('📋 Không có bản sao lưu nào được tìm thấy.')
    return
  }

  console.log('\n📋 Danh sách các bản sao lưu có sẵn:')
  console.log('='.repeat(120))

  // Tạo dữ liệu cho bảng
  const tableData = backups.map(backup => ({
    ID: backup.id,
    'Tên File': backup.fileName,
    'Thời gian': new Date(backup.timestamp).toLocaleString('vi-VN'),
    'Lý do': backup.reason || 'N/A',
    'Kích thước': formatFileSize(backup.size),
    'Trạng thái': backup.status === 'completed' ? '✅ Hoàn thành' : '❌ Thất bại',
    Nén: backup.compressed ? '✅' : '❌',
    'Mã hóa': backup.encrypted ? '🔒' : '❌'
  }))

  console.table(tableData)
  console.log('='.repeat(120))
}

/**
Hàm format kích thước file
*/
function formatFileSize (bytes) {
  if (!bytes) return 'N/A'
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

/**
Hàm yêu cầu xác nhận từ người dùng
*/
function askConfirmation (message) {
  return new Promise((resolve) => {
    rl.question(`${message} (nhập "YES" để xác nhận): `, (answer) => {
      resolve(answer.trim() === 'YES')
    })
  })
}

/**
Hàm hiển thị thông tin chi tiết backup trước khi restore
*/
function displayBackupDetails (backup) {
  console.log('\n📄 Thông tin chi tiết bản sao lưu:')
  console.log('─'.repeat(60))
  console.log(`🆔 ID: ${backup.id}`)
  console.log(`📁 Tên file: ${backup.fileName}`)
  console.log(`📅 Thời gian tạo: ${new Date(backup.timestamp).toLocaleString('vi-VN')}`)
  console.log(`📝 Lý do: ${backup.reason || 'Không có'}`)
  console.log(`📊 Kích thước: ${formatFileSize(backup.size)}`)
  console.log(`🗜️ Đã nén: ${backup.compressed ? 'Có' : 'Không'}`)
  console.log(`🔒 Đã mã hóa: ${backup.encrypted ? 'Có' : 'Không'}`)
  console.log(`✅ Trạng thái: ${backup.status}`)
  if (backup.createdBy) {
    console.log(`👤 Tạo bởi: User ID ${backup.createdBy}`)
  }
  console.log('─'.repeat(60))
}

/**
Hàm chính để liệt kê backup
*/
async function listBackups () {
  try {
    console.log('🔍 Đang tìm kiếm các bản sao lưu...')

    const backupService = new BackupService()
    const result = await backupService.listBackups()

    if (!result.success) {
      console.error('❌ Lỗi khi lấy danh sách backup:', result.message)
      return
    }

    displayBackupList(result.data)

    console.log(`\n📊 Tổng cộng: ${result.data.length} bản sao lưu`)
    console.log('💡 Sử dụng: node scripts/restore.js --id <backup_id> để phục hồi')
  } catch (error) {
    console.error('❌ Lỗi khi liệt kê backup:', error.message)
    process.exit(1)
  }
}

/**
Hàm chính để thực hiện restore
*/
async function performRestore (backupId, skipConfirmation = false) {
  try {
    console.log(`🔄 Đang chuẩn bị phục hồi từ backup ID: ${backupId}`)

    const backupService = new BackupService()

    // Lấy danh sách backup để tìm backup cần restore
    console.log('  Dep Đang tìm bản ghi sao lưu...')
    const listResult = await backupService.listBackups()

    if (!listResult.success) {
      console.error('❌ Lỗi khi lấy danh sách backup:', listResult.message)
      return
    }

    const backup = listResult.data.find(b => b.id === backupId)

    if (!backup) {
      console.error(`❌ Không tìm thấy backup với ID: ${backupId}`)
      console.log('💡 Sử dụng --list để xem danh sách backup có sẵn')
      return
    }

    if (backup.status !== 'completed') {
      console.error(`❌ Backup này không thể sử dụng. Trạng thái: ${backup.status}`)
      return
    }

    // Hiển thị thông tin backup
    displayBackupDetails(backup)

    // Yêu cầu xác nhận nếu không skip
    if (!skipConfirmation) {
      console.log('\n⚠️ CẢNH BÁO: Thao tác này sẽ thay thế hoàn toàn cơ sở dữ liệu hiện tại!')
      console.log('📋 Một bản sao lưu an toàn sẽ được tạo trước khi phục hồi.')

      const confirmed = await askConfirmation('\n❓ Bạn có chắc chắn muốn tiếp tục?')

      if (!confirmed) {
        console.log('🚫 Hủy bỏ thao tác phục hồi.')
        return
      }
    }

    // Thực hiện restore
    console.log('\n🔄 Bắt đầu quá trình phục hồi...')
    console.log('📝 Đang tạo bản sao lưu an toàn...')
    console.log('🔌 Đang đóng kết nối cơ sở dữ liệu...')
    console.log('📂 Đang thực hiện phục hồi...')

    const context = {
      ipAddress: '127.0.0.1',
      userAgent: 'EDMS-CLI-Restore-Script',
      sessionId: `restore-${Date.now()}`
    }

    const result = await backupService.restoreBackup(backupId, null, context)

    if (result.success) {
      console.log('\n✅ Phục hồi cơ sở dữ liệu thành công!')
      console.log(`📁 Đã phục hồi từ: ${backup.fileName}`)
      console.log(`📅 Thời gian backup: ${new Date(backup.timestamp).toLocaleString('vi-VN')}`)
      console.log('🔄 Hệ thống đã sẵn sàng hoạt động.')
    } else {
      console.error('❌ Phục hồi thất bại:', result.message)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Lỗi trong quá trình phục hồi:', error.message)
    console.error('📋 Chi tiết lỗi:', error.stack)
    process.exit(1)
  }
}

/**
Cấu hình yargs CLI
*/
const argv = yargs(hideBin(process.argv))
  .scriptName('restore')
  .usage('$0 [options]', 'Script phục hồi cơ sở dữ liệu EDMS 1CAR')
  .option('list', {
    alias: 'l',
    type: 'boolean',
    description: 'Hiển thị danh sách các bản sao lưu có sẵn'
  })
  .option('id', {
    type: 'string',
    description: 'ID của bản sao lưu cần phục hồi'
  })
  .option('yes', {
    alias: 'y',
    type: 'boolean',
    description: 'Bỏ qua bước xác nhận (sử dụng cẩn thận!)'
  })
  .example('$0 --list', 'Hiển thị danh sách backup')
  .example('$0 --id abc123', 'Phục hồi từ backup có ID abc123')
  .example('$0 --id abc123 --yes', 'Phục hồi mà không cần xác nhận')
  .help('help')
  .alias('help', 'h')
  .version('1.0.0')
  .alias('version', 'v')
  .check((argv) => {
    if (!argv.list && !argv.id) {
      throw new Error('Vui lòng chỉ định --list để xem danh sách hoặc --id để phục hồi')
    }
    if (argv.list && argv.id) {
      throw new Error('Không thể sử dụng --list và --id cùng lúc')
    }
    return true
  })
  .argv

/**
Hàm main
*/
async function main () {
  try {
    console.log('🚀 EDMS 1CAR - Database Restore Tool')
    console.log('='.repeat(50))

    // Khởi tạo database manager
    await dbManager.initialize()

    if (argv.list) {
      await listBackups()
    } else if (argv.id) {
      await performRestore(argv.id, argv.yes)
    }
  } catch (error) {
    console.error('❌ Lỗi khởi tạo:', error.message)
    process.exit(1)
  } finally {
    // Đóng readline interface
    rl.close()

    // Đóng database connection
    try {
      await dbManager.close()
    } catch (error) {
      console.warn('⚠️  Cảnh báo: Không thể đóng kết nối database:', error.message)
    }

    process.exit(0)
  }
}

// Xử lý tín hiệu ngắt
process.on('SIGINT', () => {
  console.log('\n🛑 Nhận tín hiệu ngắt. Đang dọn dẹp...')
  rl.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Nhận tín hiệu kết thúc. Đang dọn dẹp...')
  rl.close()
  process.exit(0)
})

// Chạy script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Lỗi không mong đợi:', error)
    process.exit(1)
  })
}

module.exports = { main, listBackups, performRestore }

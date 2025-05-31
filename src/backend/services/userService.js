// src/backend/services/userService.js
const bcrypt = require('bcrypt');
const { dbManager } = require('../config/database');
const User = require('../models/User');
// Đảm bảo createAuditLog được import từ logger (nếu chưa có) hoặc logAudit từ loggerUtils (nếu dùng loggerUtils)
const { logAudit, logError, createAuditLog } = require('../utils/logger'); // Thêm createAuditLog nếu logAudit không đủ
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class UserService {
  // ... (VALID_DEPARTMENTS, VALID_ROLES, createUser, findById, findByEmail) ...
  static get VALID_DEPARTMENTS() { //
    return [ //
      'Ban Giám đốc', //
      'Phòng Phát triển Nhượng quyền', //
      'Phòng Đào tạo Tiêu chuẩn', //
      'Phòng Marketing', //
      'Phòng Kỹ thuật QC', //
      'Phòng Tài chính', //
      'Phòng Công nghệ Hệ thống', //
      'Phòng Pháp lý', //
      'Bộ phận Tiếp nhận CSKH', //
      'Bộ phận Kỹ thuật Garage', //
      'Bộ phận QC Garage', //
      'Bộ phận Kho/Kế toán Garage', //
      'Bộ phận Marketing Garage', //
      'Quản lý Garage' //
    ]; //
  } //

  static get VALID_ROLES() { //
    return ['admin', 'user']; //
  } //

  static async createUser(userData, createdBy = null) { //
    try { //
      const { email, password, name, department, role = 'user', position, phone } = userData; //
      
      if (!email || !password || !name || !department) { //
        throw new ValidationError('Missing required fields: email, password, name, department'); //
      } //

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //
      if (!emailRegex.test(email)) { //
        throw new ValidationError('Invalid email format'); //
      } //

      if (password.length < 8) { //
        throw new ValidationError('Password must be at least 8 characters long'); //
      } //

      if (!this.VALID_ROLES.includes(role)) { //
        throw new ValidationError(`Invalid role. Must be one of: ${this.VALID_ROLES.join(', ')}`); //
      } //

      if (!this.VALID_DEPARTMENTS.includes(department)) { //
        throw new ValidationError('Invalid department'); //
      } //

      const existingUser = await this.findByEmail(email); //
      if (existingUser) { //
        throw new ConflictError('Email already exists'); //
      } //

      const password_hash = await bcrypt.hash(password, 12); //

      const result = await dbManager.run(`
        INSERT INTO users (
          email, password_hash, name, department, role, position, phone, 
          is_active, failed_login_attempts, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, CURRENT_TIMESTAMP)
      `, [email, password_hash, name, department, role, position, phone, createdBy]); //

      const newUser = await this.findById(result.lastID); //

      // Sử dụng createAuditLog thay vì logAudit nếu logAudit không tồn tại hoặc không phù hợp
      await createAuditLog({ //
        user_id: result.lastID, //
        action: 'USER_CREATED', //
        resource_type: 'user', //
        details: { //
           email: email, //
           department: department, //
           role: role, //
           createdBy: createdBy //
        } //
      }); //

      return newUser; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.createUser', userData }); //
      throw error; //
    } //
  } //

  static async findById(id) { //
    try { //
      const userData = await dbManager.get( //
        'SELECT * FROM users WHERE id = ?', //
        [id] //
      ); //
      
      return userData ? new User(userData) : null; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.findById', id }); //
      throw error; //
    } //
  } //

  static async findByEmail(email) { //
    try { //
      // Trong UserService, findByEmail không nên tự động chỉ lấy active user
      // trừ khi đó là yêu cầu cụ thể của hàm này.
      // AuthService.login sẽ kiểm tra is_active sau.
      const userData = await dbManager.get( //
        'SELECT * FROM users WHERE email = ?', // Bỏ AND is_active = 1 để lấy cả user inactive nếu cần cho mục đích khác
        [email] //
      ); //
      
      return userData ? new User(userData) : null; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.findByEmail', email }); //
      throw error; //
    } //
  } //


  /**
   * Update user information
   */
  static async updateUser(id, updateData, updatedBy = null) {
    try {
      const userToUpdate = await this.findById(id);
      if (!userToUpdate) {
        throw new NotFoundError('User not found for update.');
      }

      const { name, department, role, position, phone, is_active } = updateData;
      
      const fieldsToUpdate = {};
      if (name !== undefined) fieldsToUpdate.name = name;
      if (department !== undefined) {
        if (!this.VALID_DEPARTMENTS.includes(department)) {
          throw new ValidationError('Invalid department for update.');
        }
        fieldsToUpdate.department = department;
      }
      if (role !== undefined) {
        if (!this.VALID_ROLES.includes(role)) {
          throw new ValidationError('Invalid role for update.');
        }
        fieldsToUpdate.role = role;
      }
      if (position !== undefined) fieldsToUpdate.position = position;
      if (phone !== undefined) fieldsToUpdate.phone = phone;
      if (is_active !== undefined) fieldsToUpdate.is_active = is_active ? 1 : 0;

      if (Object.keys(fieldsToUpdate).length === 0) {
        return userToUpdate; // Không có gì để cập nhật, trả về user hiện tại
      }

      const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
      const params = [...Object.values(fieldsToUpdate), id];

      await dbManager.run(
        `UPDATE users SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        params
      );

      // Log audit event (sử dụng createAuditLog nếu logAudit là alias cũ)
      await createAuditLog({
        user_id: updatedBy, // Người thực hiện hành động
        action: 'USER_UPDATED',
        resource_type: 'user',
        resource_id: id, // ID của user được cập nhật
        details: {
          updatedFields: Object.keys(fieldsToUpdate),
          targetUserId: id,
          // oldValues: ... (có thể query lại user cũ trước khi update để lấy oldValues)
          newValues: fieldsToUpdate
        }
      });

      return this.findById(id); // Trả về user đã cập nhật
    } catch (error) {
      logError(error, null, { operation: 'UserService.updateUser', userId: id, updateData });
      throw error;
    }
  }

  // ... (các phương thức khác như resetPassword, deactivateUser, activateUser, getAllUsers, ...)
  // ... (authenticate, updateLastLogin, incrementFailedLoginAttempts, resetFailedLoginAttempts)
  // ... (getUserStats, getDepartmentStats, getSystemStats, unlockAccount, getLockedUsers)

  static async resetPassword(id, newPassword, updatedBy = null) { //
    try { //
      if (!newPassword || newPassword.length < 8) { //
        throw new ValidationError('Password must be at least 8 characters long'); //
      } //

      const password_hash = await bcrypt.hash(newPassword, 12); //
      
      await dbManager.run(`
        UPDATE users 
        SET password_hash = ?, 
            password_changed_at = CURRENT_TIMESTAMP, 
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [password_hash, id]); //

      await createAuditLog({ //
        user_id: updatedBy, //
        action: 'PASSWORD_RESET', //
        resource_type: 'user', //
        resource_id: id, //
        details: { //
            targetUserId: id //
        } //
      }); //

      return { success: true, message: 'Password reset successfully' }; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.resetPassword', userId: id }); //
      throw error; //
    } //
  } //

  static async deactivateUser(id, deactivatedBy = null) { //
    try { //
      await dbManager.run(`
        UPDATE users 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]); //

      await createAuditLog({ //
        user_id: deactivatedBy, //
        action: 'USER_DEACTIVATED', //
        resource_type: 'user', //
        resource_id: id, //
        details: { //
            targetUserId: id //
        } //
      }); //

      return { success: true, message: 'User deactivated successfully' }; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.deactivateUser', userId: id }); //
      throw error; //
    } //
  } //

  static async activateUser(id, activatedBy = null) { //
    try { //
      await dbManager.run(`
        UPDATE users 
        SET is_active = 1, 
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]); //

      await createAuditLog({ //
        user_id: activatedBy, //
        action: 'USER_ACTIVATED', //
        resource_type: 'user', //
        resource_id: id, //
        details: { //
            targetUserId: id //
        } //
      }); //

      return { success: true, message: 'User activated successfully' }; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.activateUser', userId: id }); //
      throw error; //
    } //
  } //

  static async getAllUsers(filters = {}) { //
    try { //
      const {  //
        department, role, is_active, search,  //
        page = 1, limit = 20  //
      } = filters; //

      let whereConditions = []; //
      let params = []; //

      if (department) { //
        whereConditions.push('department = ?'); //
        params.push(department); //
      } //

      if (role) { //
        whereConditions.push('role = ?'); //
        params.push(role); //
      } //

      if (is_active !== undefined) { //
        whereConditions.push('is_active = ?'); //
        params.push(is_active ? 1 : 0); //
      } //

      if (search) { //
        whereConditions.push('(name LIKE ? OR email LIKE ?)'); //
        const searchTerm = `%${search}%`; //
        params.push(searchTerm, searchTerm); //
      } //

      const whereClause = whereConditions.length > 0  //
        ? 'WHERE ' + whereConditions.join(' AND ')  //
        : ''; //

      const countResult = await dbManager.get( //
        `SELECT COUNT(*) as total FROM users ${whereClause}`, //
        params //
      ); //

      const offset = (page - 1) * limit; //
      const users = await dbManager.all( //
        `SELECT * FROM users ${whereClause} ORDER BY name LIMIT ? OFFSET ?`, //
        [...params, limit, offset] //
      ); //

      const total = countResult.total; //
      const totalPages = Math.ceil(total / limit); //

      return { //
        data: users.map(userData => new User(userData)), //
        pagination: { //
          page: parseInt(page), //
          limit: parseInt(limit), //
          total, //
          totalPages, //
          hasNextPage: page < totalPages, //
          hasPrevPage: page > 1 //
        } //
      }; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.getAllUsers', filters }); //
      throw error; //
    } //
  } //

  static async authenticate(email, password) { //
    try { //
      // Gọi findByEmail đã sửa, không lọc is_active ở đây.
      const user = await User.findByEmail(email); // Sửa lại: không dùng this.findByEmail vì đang trong static method của User
      if (!user) { //
        return null; //
      } //

      // Việc kiểm tra user.is_active sẽ do AuthService.login đảm nhiệm.
      // Việc kiểm tra locked_until cũng do AuthService.login đảm nhiệm.

      const isValidPassword = await bcrypt.compare(password, user.password_hash); //
      if (!isValidPassword) { //
        await this.incrementFailedLoginAttempts(user.id); //
        return null; //
      } //

      await this.updateLastLogin(user.id); //
      await this.resetFailedLoginAttempts(user.id); //

      return user; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.authenticate', email }); //
      throw error; //
    } //
  } //

  static async updateLastLogin(userId) { //
    try { //
      await dbManager.run( //
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', //
        [userId] //
      ); //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.updateLastLogin', userId }); //
      throw error; //
    } //
  } //

  static async incrementFailedLoginAttempts(userId) { //
    try { //
      await dbManager.run(`
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
              WHEN failed_login_attempts >= 4 THEN datetime('now', '+30 minutes')
              ELSE locked_until 
            END
        WHERE id = ?
      `, [userId]); //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.incrementFailedLoginAttempts', userId }); //
      throw error; //
    } //
  } //

  static async resetFailedLoginAttempts(userId) { //
    try { //
      await dbManager.run(`
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE id = ?
      `, [userId]); //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.resetFailedLoginAttempts', userId }); //
      throw error; //
    } //
  } //

  static async getUserStats(userId) { //
    try { //
      const stats = await dbManager.get(`
        SELECT
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(DISTINCT CASE WHEN d.status = 'published' THEN d.id END) as published_documents,
          COUNT(DISTINCT CASE WHEN d.status = 'draft' THEN d.id END) as draft_documents,
          COUNT(DISTINCT dv.id) as versions_created,
          COUNT(DISTINCT wt.id) as workflow_actions
        FROM users u
        LEFT JOIN documents d ON u.id = d.author_id
        LEFT JOIN document_versions dv ON u.id = dv.created_by
        LEFT JOIN workflow_transitions wt ON u.id = wt.transitioned_by
        WHERE u.id = ?
      `, [userId]); //

      return stats; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.getUserStats', userId }); //
      throw error; //
    } //
  } //

  static async getDepartmentStats() { //
    try { //
      const stats = await dbManager.all(`
        SELECT
          department,
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
          COUNT(CASE WHEN failed_login_attempts >= 3 THEN 1 END) as locked_users,
          COUNT(CASE WHEN last_login >= date('now', '-30 days') THEN 1 END) as recent_active_users
        FROM users
        GROUP BY department
        ORDER BY total_users DESC
      `); //

      return stats; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.getDepartmentStats' }); //
      throw error; //
    } //
  } //

  static async getSystemStats() { //
    try { //
      const stats = await dbManager.get(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
          COUNT(CASE WHEN last_login >= date('now', '-7 days') THEN 1 END) as recent_logins,
          COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as new_users_month,
          COUNT(CASE WHEN failed_login_attempts >= 3 THEN 1 END) as locked_accounts,
          COUNT(CASE WHEN locked_until > datetime('now') THEN 1 END) as currently_locked
        FROM users
      `); //

      return stats; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.getSystemStats' }); //
      throw error; //
    } //
  } //

  static async unlockAccount(userId, unlockedBy = null) { //
    try { //
      await dbManager.run(`
        UPDATE users 
        SET failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [userId]); //

      await createAuditLog({ //
        user_id: unlockedBy, //
        action: 'ACCOUNT_UNLOCKED', //
        resource_type: 'user', //
        resource_id: userId, //
        details: { //
            targetUserId: userId //
        } //
      }); //

      return { success: true, message: 'Account unlocked successfully' }; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.unlockAccount', userId }); //
      throw error; //
    } //
  } //

  static async getLockedUsers() { //
    try { //
      const lockedUsers = await dbManager.all(`
        SELECT 
          id, email, name, department, failed_login_attempts, locked_until
        FROM users 
        WHERE locked_until > datetime('now') OR failed_login_attempts >= 5
        ORDER BY locked_until DESC
      `); //

      return lockedUsers; //
    } catch (error) { //
      logError(error, null, { operation: 'UserService.getLockedUsers' }); //
      throw error; //
    } //
  } //
}

module.exports = UserService;
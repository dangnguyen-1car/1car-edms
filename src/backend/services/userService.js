// src/backend/services/userService.js - Updated with correct roles and table names
const bcrypt = require('bcrypt');
const { dbManager } = require('../config/database');
const User = require('../models/User');
const { logAudit, logError } = require('../utils/logger');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class UserService {
  /**
   * Valid departments for 1CAR system (based on C-FM-MG-004)
   */
  static get VALID_DEPARTMENTS() {
    return [
      'Ban Giám đốc',
      'Phòng Phát triển Nhượng quyền',
      'Phòng Đào tạo Tiêu chuẩn',
      'Phòng Marketing',
      'Phòng Kỹ thuật QC',
      'Phòng Tài chính',
      'Phòng Công nghệ Hệ thống',
      'Phòng Pháp lý',
      'Bộ phận Tiếp nhận CSKH',
      'Bộ phận Kỹ thuật Garage',
      'Bộ phận QC Garage',
      'Bộ phận Kho/Kế toán Garage',
      'Bộ phận Marketing Garage',
      'Quản lý Garage'
    ];
  }

  /**
   * Valid roles for system (based on current schema and C-FM-MG-004)
   * Only 'admin' and 'user' are supported in current implementation
   */
  static get VALID_ROLES() {
    return ['admin', 'user'];
  }

  /**
   * Create new user with comprehensive validation
   */
  static async createUser(userData, createdBy = null) {
    try {
      const { email, password, name, department, role = 'user', position, phone } = userData;
      
      // Validate required fields
      if (!email || !password || !name || !department) {
        throw new ValidationError('Missing required fields: email, password, name, department');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }

      // Validate role
      if (!this.VALID_ROLES.includes(role)) {
        throw new ValidationError(`Invalid role. Must be one of: ${this.VALID_ROLES.join(', ')}`);
      }

      // Validate department
      if (!this.VALID_DEPARTMENTS.includes(department)) {
        throw new ValidationError('Invalid department');
      }

      // Check if email already exists
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new ConflictError('Email already exists');
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Insert user into database
      const result = await dbManager.run(`
        INSERT INTO users (
          email, password_hash, name, department, role, position, phone, 
          is_active, failed_login_attempts, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, CURRENT_TIMESTAMP)
      `, [email, password_hash, name, department, role, position, phone, createdBy]);

      // Get created user
      const newUser = await this.findById(result.lastID);

      // Log audit event
      await logAudit('USER_CREATED', {
        userId: result.lastID,
        email: email,
        department: department,
        role: role,
        createdBy: createdBy
      });

      return newUser;
    } catch (error) {
      logError(error, null, { operation: 'UserService.createUser', userData });
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    try {
      const userData = await dbManager.get(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      return userData ? new User(userData) : null;
    } catch (error) {
      logError(error, null, { operation: 'UserService.findById', id });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    try {
      const userData = await dbManager.get(
        'SELECT * FROM users WHERE email = ? AND is_active = 1',
        [email]
      );
      
      return userData ? new User(userData) : null;
    } catch (error) {
      logError(error, null, { operation: 'UserService.findByEmail', email });
      throw error;
    }
  }

  /**
   * Update user information
   */
  static async updateUser(id, updateData, updatedBy = null) {
    try {
      const { name, department, role, position, phone, is_active } = updateData;
      
      // Validate department if provided
      if (department && !this.VALID_DEPARTMENTS.includes(department)) {
        throw new ValidationError('Invalid department');
      }
      
      // Validate role if provided
      if (role && !this.VALID_ROLES.includes(role)) {
        throw new ValidationError('Invalid role');
      }

      await dbManager.run(`
        UPDATE users 
        SET name = COALESCE(?, name),
            department = COALESCE(?, department),
            role = COALESCE(?, role),
            position = COALESCE(?, position),
            phone = COALESCE(?, phone),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [name, department, role, position, phone, is_active, id]);

      // Log audit event
      await logAudit('USER_UPDATED', {
        userId: id,
        updateData: updateData,
        updatedBy: updatedBy
      });

      return this.findById(id);
    } catch (error) {
      logError(error, null, { operation: 'UserService.updateUser', userId: id, updateData });
      throw error;
    }
  }

  /**
   * Reset user password
   */
  static async resetPassword(id, newPassword, updatedBy = null) {
    try {
      if (!newPassword || newPassword.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }

      const password_hash = await bcrypt.hash(newPassword, 12);
      
      await dbManager.run(`
        UPDATE users 
        SET password_hash = ?, 
            password_changed_at = CURRENT_TIMESTAMP, 
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [password_hash, id]);

      // Log audit event
      await logAudit('PASSWORD_RESET', {
        userId: id,
        updatedBy: updatedBy
      });

      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      logError(error, null, { operation: 'UserService.resetPassword', userId: id });
      throw error;
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  static async deactivateUser(id, deactivatedBy = null) {
    try {
      await dbManager.run(`
        UPDATE users 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]);

      // Log audit event
      await logAudit('USER_DEACTIVATED', {
        userId: id,
        deactivatedBy: deactivatedBy
      });

      return { success: true, message: 'User deactivated successfully' };
    } catch (error) {
      logError(error, null, { operation: 'UserService.deactivateUser', userId: id });
      throw error;
    }
  }

  /**
   * Activate user
   */
  static async activateUser(id, activatedBy = null) {
    try {
      await dbManager.run(`
        UPDATE users 
        SET is_active = 1, 
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]);

      // Log audit event
      await logAudit('USER_ACTIVATED', {
        userId: id,
        activatedBy: activatedBy
      });

      return { success: true, message: 'User activated successfully' };
    } catch (error) {
      logError(error, null, { operation: 'UserService.activateUser', userId: id });
      throw error;
    }
  }

  /**
   * Get all users with advanced filtering and pagination
   */
  static async getAllUsers(filters = {}) {
    try {
      const { 
        department, role, is_active, search, 
        page = 1, limit = 20 
      } = filters;

      let whereConditions = [];
      let params = [];

      // Apply filters
      if (department) {
        whereConditions.push('department = ?');
        params.push(department);
      }

      if (role) {
        whereConditions.push('role = ?');
        params.push(role);
      }

      if (is_active !== undefined) {
        whereConditions.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }

      if (search) {
        whereConditions.push('(name LIKE ? OR email LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ') 
        : '';

      // Get total count
      const countResult = await dbManager.get(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        params
      );

      // Get paginated data
      const offset = (page - 1) * limit;
      const users = await dbManager.all(
        `SELECT * FROM users ${whereClause} ORDER BY name LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Calculate pagination metadata
      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      return {
        data: users.map(userData => new User(userData)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logError(error, null, { operation: 'UserService.getAllUsers', filters });
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticate(email, password) {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        return null;
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new Error('Account is temporarily locked due to multiple failed login attempts');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        // Log failed attempt
        await this.incrementFailedLoginAttempts(user.id);
        return null;
      }

      // Reset failed attempts and update last login
      await this.updateLastLogin(user.id);
      await this.resetFailedLoginAttempts(user.id);

      return user;
    } catch (error) {
      logError(error, null, { operation: 'UserService.authenticate', email });
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId) {
    try {
      await dbManager.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );
    } catch (error) {
      logError(error, null, { operation: 'UserService.updateLastLogin', userId });
      throw error;
    }
  }

  /**
   * Increment failed login attempts
   */
  static async incrementFailedLoginAttempts(userId) {
    try {
      await dbManager.run(`
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
              WHEN failed_login_attempts >= 4 THEN datetime('now', '+30 minutes')
              ELSE locked_until 
            END
        WHERE id = ?
      `, [userId]);
    } catch (error) {
      logError(error, null, { operation: 'UserService.incrementFailedLoginAttempts', userId });
      throw error;
    }
  }

  /**
   * Reset failed login attempts
   */
  static async resetFailedLoginAttempts(userId) {
    try {
      await dbManager.run(`
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE id = ?
      `, [userId]);
    } catch (error) {
      logError(error, null, { operation: 'UserService.resetFailedLoginAttempts', userId });
      throw error;
    }
  }

  /**
   * Get user statistics (corrected table names)
   */
  static async getUserStats(userId) {
    try {
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
      `, [userId]);

      return stats;
    } catch (error) {
      logError(error, null, { operation: 'UserService.getUserStats', userId });
      throw error;
    }
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStats() {
    try {
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
      `);

      return stats;
    } catch (error) {
      logError(error, null, { operation: 'UserService.getDepartmentStats' });
      throw error;
    }
  }

  /**
   * Get system-wide user statistics
   */
  static async getSystemStats() {
    try {
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
      `);

      return stats;
    } catch (error) {
      logError(error, null, { operation: 'UserService.getSystemStats' });
      throw error;
    }
  }

  /**
   * Unlock user account
   */
  static async unlockAccount(userId, unlockedBy = null) {
    try {
      await dbManager.run(`
        UPDATE users 
        SET failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [userId]);

      // Log audit event
      await logAudit('ACCOUNT_UNLOCKED', {
        userId: userId,
        unlockedBy: unlockedBy
      });

      return { success: true, message: 'Account unlocked successfully' };
    } catch (error) {
      logError(error, null, { operation: 'UserService.unlockAccount', userId });
      throw error;
    }
  }

  /**
   * Get locked users
   */
  static async getLockedUsers() {
    try {
      const lockedUsers = await dbManager.all(`
        SELECT 
          id, email, name, department, failed_login_attempts, locked_until
        FROM users 
        WHERE locked_until > datetime('now') OR failed_login_attempts >= 5
        ORDER BY locked_until DESC
      `);

      return lockedUsers;
    } catch (error) {
      logError(error, null, { operation: 'UserService.getLockedUsers' });
      throw error;
    }
  }
}

module.exports = UserService;

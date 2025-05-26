/**
 * =================================================================
 * EDMS 1CAR - User Model
 * User data management for 40 users with role-based access
 * Based on C-FM-MG-004 role matrix and C-PL-MG-005 permission policy
 * =================================================================
 */

const bcrypt = require('bcrypt');
const { dbManager } = require('../config/database');
const { logAudit, logError } = require('../utils/logger');
const { security } = require('../config');

class User {
    constructor(userData = {}) {
        this.id = userData.id || null;
        this.email = userData.email || null;
        this.name = userData.name || null;
        this.department = userData.department || null;
        this.role = userData.role || 'user';
        this.password_hash = userData.password_hash || null;
        this.is_active = userData.is_active !== undefined ? userData.is_active : true;
        this.last_login = userData.last_login || null;
        this.created_at = userData.created_at || null;
        this.updated_at = userData.updated_at || null;
        this.created_by = userData.created_by || null;
    }

    /**
     * Create new user
     * @param {Object} userData - User data
     * @param {number} createdBy - ID of user creating this user
     * @returns {Promise<User>} - Created user instance
     */
    static async create(userData, createdBy = null) {
        try {
            // Validate required fields
            const { email, name, department, role, password } = userData;
            
            if (!email || !name || !department || !password) {
                throw new Error('Missing required fields: email, name, department, password');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Invalid email format');
            }

            // Validate role
            const validRoles = ['admin', 'user'];
            if (!validRoles.includes(role)) {
                throw new Error('Invalid role. Must be admin or user');
            }

            // Validate department
            const validDepartments = [
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
            
            if (!validDepartments.includes(department)) {
                throw new Error('Invalid department');
            }

            // Check if email already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                throw new Error('Email already exists');
            }

            // Hash password
            const password_hash = await bcrypt.hash(password, security.bcrypt.rounds);

            // Insert user into database
            const result = await dbManager.run(`
                INSERT INTO users (email, name, department, role, password_hash, is_active, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [email, name, department, role, password_hash, true, createdBy]);

            // Get created user
            const newUser = await User.findById(result.lastID);
            
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
            logError(error, null, { operation: 'User.create', userData });
            throw error;
        }
    }

    /**
     * Find user by ID
     * @param {number} id - User ID
     * @returns {Promise<User|null>} - User instance or null
     */
    static async findById(id) {
        try {
            const userData = await dbManager.get(
                'SELECT * FROM users WHERE id = ?',
                [id]
            );
            
            return userData ? new User(userData) : null;
        } catch (error) {
            logError(error, null, { operation: 'User.findById', id });
            throw error;
        }
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<User|null>} - User instance or null
     */
    static async findByEmail(email) {
        try {
            const userData = await dbManager.get(
                'SELECT * FROM users WHERE email = ? AND is_active = 1',
                [email]
            );
            
            return userData ? new User(userData) : null;
        } catch (error) {
            logError(error, null, { operation: 'User.findByEmail', email });
            throw error;
        }
    }

    /**
     * Find users by department
     * @param {string} department - Department name
     * @param {boolean} activeOnly - Return only active users
     * @returns {Promise<Array>} - Array of User instances
     */
    static async findByDepartment(department, activeOnly = true) {
        try {
            const whereClause = activeOnly ? 
                'WHERE department = ? AND is_active = 1' : 
                'WHERE department = ?';
                
            const users = await dbManager.all(
                `SELECT * FROM users ${whereClause} ORDER BY name`,
                [department]
            );
            
            return users.map(userData => new User(userData));
        } catch (error) {
            logError(error, null, { operation: 'User.findByDepartment', department });
            throw error;
        }
    }

    /**
     * Find users by role
     * @param {string} role - User role
     * @param {boolean} activeOnly - Return only active users
     * @returns {Promise<Array>} - Array of User instances
     */
    static async findByRole(role, activeOnly = true) {
        try {
            const whereClause = activeOnly ? 
                'WHERE role = ? AND is_active = 1' : 
                'WHERE role = ?';
                
            const users = await dbManager.all(
                `SELECT * FROM users ${whereClause} ORDER BY name`,
                [role]
            );
            
            return users.map(userData => new User(userData));
        } catch (error) {
            logError(error, null, { operation: 'User.findByRole', role });
            throw error;
        }
    }

    /**
     * Get all users with pagination
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Items per page
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} - Paginated users with metadata
     */
    static async findAll(page = 1, limit = 20, filters = {}) {
        try {
            let whereConditions = [];
            let params = [];

            // Apply filters
            if (filters.department) {
                whereConditions.push('department = ?');
                params.push(filters.department);
            }

            if (filters.role) {
                whereConditions.push('role = ?');
                params.push(filters.role);
            }

            if (filters.is_active !== undefined) {
                whereConditions.push('is_active = ?');
                params.push(filters.is_active ? 1 : 0);
            }

            if (filters.search) {
                whereConditions.push('(name LIKE ? OR email LIKE ?)');
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? 
                'WHERE ' + whereConditions.join(' AND ') : '';

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
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            logError(error, null, { operation: 'User.findAll', page, limit, filters });
            throw error;
        }
    }

    /**
     * Authenticate user with email and password
     * @param {string} email - User email
     * @param {string} password - Plain text password
     * @returns {Promise<User|null>} - Authenticated user or null
     */
    static async authenticate(email, password) {
        try {
            const user = await User.findByEmail(email);
            if (!user) {
                return null;
            }

            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return null;
            }

            // Update last login
            await user.updateLastLogin();

            return user;
        } catch (error) {
            logError(error, null, { operation: 'User.authenticate', email });
            throw error;
        }
    }

    /**
     * Update user information
     * @param {Object} updateData - Data to update
     * @param {number} updatedBy - ID of user making the update
     * @returns {Promise<User>} - Updated user instance
     */
    async update(updateData, updatedBy = null) {
        try {
            const allowedFields = ['name', 'department', 'role', 'is_active'];
            const updateFields = [];
            const params = [];

            // Build update query
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key)) {
                    updateFields.push(`${key} = ?`);
                    params.push(value);
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            // Add updated_at
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(this.id);

            await dbManager.run(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                params
            );

            // Log audit event
            await logAudit('USER_UPDATED', {
                userId: this.id,
                updateData: updateData,
                updatedBy: updatedBy
            });

            // Refresh user data
            const updatedUser = await User.findById(this.id);
            Object.assign(this, updatedUser);

            return this;
        } catch (error) {
            logError(error, null, { operation: 'User.update', userId: this.id, updateData });
            throw error;
        }
    }

    /**
     * Update user password
     * @param {string} newPassword - New plain text password
     * @param {number} updatedBy - ID of user making the update
     * @returns {Promise<boolean>} - Success status
     */
    async updatePassword(newPassword, updatedBy = null) {
        try {
            if (!newPassword || newPassword.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            const password_hash = await bcrypt.hash(newPassword, security.bcrypt.rounds);

            await dbManager.run(
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [password_hash, this.id]
            );

            // Log audit event
            await logAudit('PASSWORD_UPDATED', {
                userId: this.id,
                updatedBy: updatedBy
            });

            return true;
        } catch (error) {
            logError(error, null, { operation: 'User.updatePassword', userId: this.id });
            throw error;
        }
    }

    /**
     * Update last login timestamp
     * @returns {Promise<boolean>} - Success status
     */
    async updateLastLogin() {
        try {
            await dbManager.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [this.id]
            );

            this.last_login = new Date().toISOString();
            return true;
        } catch (error) {
            logError(error, null, { operation: 'User.updateLastLogin', userId: this.id });
            throw error;
        }
    }

    /**
     * Deactivate user (soft delete)
     * @param {number} deactivatedBy - ID of user performing deactivation
     * @returns {Promise<boolean>} - Success status
     */
    async deactivate(deactivatedBy = null) {
        try {
            await dbManager.run(
                'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [this.id]
            );

            // Log audit event
            await logAudit('USER_DEACTIVATED', {
                userId: this.id,
                deactivatedBy: deactivatedBy
            });

            this.is_active = false;
            return true;
        } catch (error) {
            logError(error, null, { operation: 'User.deactivate', userId: this.id });
            throw error;
        }
    }

    /**
     * Activate user
     * @param {number} activatedBy - ID of user performing activation
     * @returns {Promise<boolean>} - Success status
     */
    async activate(activatedBy = null) {
        try {
            await dbManager.run(
                'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [this.id]
            );

            // Log audit event
            await logAudit('USER_ACTIVATED', {
                userId: this.id,
                activatedBy: activatedBy
            });

            this.is_active = true;
            return true;
        } catch (error) {
            logError(error, null, { operation: 'User.activate', userId: this.id });
            throw error;
        }
    }

    /**
     * Check if user has specific role
     * @param {string} role - Role to check
     * @returns {boolean} - True if user has role
     */
    hasRole(role) {
        return this.role === role;
    }

    /**
     * Check if user is admin
     * @returns {boolean} - True if user is admin
     */
    isAdmin() {
        return this.role === 'admin';
    }

    /**
     * Check if user belongs to specific department
     * @param {string} department - Department to check
     * @returns {boolean} - True if user belongs to department
     */
    belongsToDepartment(department) {
        return this.department === department;
    }

    /**
     * Check if user can access document based on department
     * @param {Object} document - Document object
     * @returns {boolean} - True if user can access document
     */
    canAccessDocument(document) {
        // Admin can access all documents
        if (this.isAdmin()) {
            return true;
        }

        // User can access documents from their department
        if (this.belongsToDepartment(document.department)) {
            return true;
        }

        // Check if document has cross-department permissions
        // This would be implemented based on document_permissions table
        return false;
    }

    /**
     * Get user's document statistics
     * @returns {Promise<Object>} - User's document statistics
     */
    async getDocumentStats() {
        try {
            const stats = await dbManager.get(`
                SELECT 
                    COUNT(*) as total_documents,
                    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_documents,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_documents,
                    COUNT(CASE WHEN status = 'review' THEN 1 END) as review_documents
                FROM documents 
                WHERE author_id = ?
            `, [this.id]);

            return stats;
        } catch (error) {
            logError(error, null, { operation: 'User.getDocumentStats', userId: this.id });
            throw error;
        }
    }

    /**
     * Get user's recent activity
     * @param {number} limit - Number of activities to return
     * @returns {Promise<Array>} - Recent activities
     */
    async getRecentActivity(limit = 10) {
        try {
            const activities = await dbManager.all(`
                SELECT 
                    action,
                    resource_type,
                    resource_id,
                    details,
                    timestamp
                FROM audit_logs 
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            `, [this.id, limit]);

            return activities;
        } catch (error) {
            logError(error, null, { operation: 'User.getRecentActivity', userId: this.id });
            throw error;
        }
    }

    /**
     * Convert user to safe JSON (without password hash)
     * @returns {Object} - Safe user object
     */
    toJSON() {
        const { password_hash, ...safeUser } = this;
        return safeUser;
    }

    /**
     * Convert user to public JSON (minimal info)
     * @returns {Object} - Public user object
     */
    toPublicJSON() {
        return {
            id: this.id,
            name: this.name,
            department: this.department,
            role: this.role
        };
    }

    /**
     * Get department statistics
     * @returns {Promise<Object>} - Department statistics
     */
    static async getDepartmentStats() {
        try {
            const stats = await dbManager.all(`
                SELECT 
                    department,
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
                    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
                FROM users 
                GROUP BY department
                ORDER BY total_users DESC
            `);

            return stats;
        } catch (error) {
            logError(error, null, { operation: 'User.getDepartmentStats' });
            throw error;
        }
    }

    /**
     * Get system-wide user statistics
     * @returns {Promise<Object>} - System user statistics
     */
    static async getSystemStats() {
        try {
            const stats = await dbManager.get(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
                    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
                    COUNT(CASE WHEN last_login >= date('now', '-7 days') THEN 1 END) as recent_logins
                FROM users
            `);

            return stats;
        } catch (error) {
            logError(error, null, { operation: 'User.getSystemStats' });
            throw error;
        }
    }
}

module.exports = User;

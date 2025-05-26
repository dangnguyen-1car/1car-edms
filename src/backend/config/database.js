/**
 * =================================================================
 * EDMS 1CAR - Database Configuration (Fixed Export Error)
 * SQLite database setup for 40 users system
 * Based on C-PR-AR-001, C-TD-VM-001, C-WI-AR-001 requirements
 * =================================================================
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

// Database configuration
const DB_PATH = process.env.DB_PATH || './database/edms.db';
const DB_DIR = path.dirname(DB_PATH);

/**
 * Database Manager Class
 */
class DatabaseManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database connection and tables
   */
  async initialize() {
    try {
      // Ensure database directory exists
      await fs.ensureDir(DB_DIR);
      console.log('Database directories ensured');

      // Connect to SQLite database
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          throw new Error(`Failed to connect to database: ${err.message}`);
        }
        console.log(`Connected to SQLite database: ${DB_PATH}`);
      });

      // Configure database settings
      await this.configurePragma();
      
      // Create tables if they don't exist
      await this.createTables();
      
      // Initialize default data
      await this.initializeDefaultData();
      
      this.isInitialized = true;
      console.log('Database initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Configure SQLite PRAGMA settings
   */
  async configurePragma() {
    const pragmaSettings = [
      'PRAGMA foreign_keys = ON',
      'PRAGMA journal_mode = WAL',
      'PRAGMA synchronous = NORMAL',
      'PRAGMA cache_size = 1000',
      'PRAGMA temp_store = MEMORY'
    ];

    for (const pragma of pragmaSettings) {
      await this.run(pragma);
    }
    
    console.log('Database PRAGMA settings configured');
  }

  /**
   * Create all required tables
   */
  async createTables() {
    try {
      // Check if tables already exist
      const tableCheck = await this.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='users'
      `);

      if (tableCheck) {
        console.log('Database tables already exist');
        return;
      }

      // Users table - Based on C-FM-MG-004 role matrix
      await this.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          department TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          is_active INTEGER DEFAULT 1,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Documents table - Based on C-PR-VM-001, C-TD-VM-001
      await this.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_code TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          department TEXT NOT NULL,
          status TEXT DEFAULT 'draft',
          version TEXT DEFAULT '01.00',
          author_id INTEGER NOT NULL,
          reviewer_id INTEGER,
          approver_id INTEGER,
          file_path TEXT,
          file_name TEXT,
          file_size INTEGER,
          mime_type TEXT,
          scope_of_application TEXT,
          recipients TEXT,
          review_cycle INTEGER,
          retention_period INTEGER,
          change_reason TEXT,
          change_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          published_at DATETIME,
          archived_at DATETIME,
          FOREIGN KEY (author_id) REFERENCES users(id),
          FOREIGN KEY (reviewer_id) REFERENCES users(id),
          FOREIGN KEY (approver_id) REFERENCES users(id)
        )
      `);

      // Document versions table - Based on C-TD-VM-001
      await this.run(`
        CREATE TABLE IF NOT EXISTS document_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          version TEXT NOT NULL,
          file_path TEXT,
          file_name TEXT,
          file_size INTEGER,
          change_reason TEXT,
          change_summary TEXT,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Workflow history table - Based on C-PR-VM-001
      await this.run(`
        CREATE TABLE IF NOT EXISTS workflow_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          from_status TEXT,
          to_status TEXT NOT NULL,
          comment TEXT,
          transitioned_by INTEGER NOT NULL,
          transitioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip_address TEXT,
          user_agent TEXT,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (transitioned_by) REFERENCES users(id)
        )
      `);

      // Audit logs table - Based on C-PR-AR-001
      await this.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id INTEGER,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Document permissions table - Based on C-PL-MG-005
      await this.run(`
        CREATE TABLE IF NOT EXISTS document_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          user_id INTEGER,
          department TEXT,
          permission_type TEXT NOT NULL,
          granted_by INTEGER NOT NULL,
          granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (granted_by) REFERENCES users(id)
        )
      `);

      // File uploads table
      await this.run(`
        CREATE TABLE IF NOT EXISTS file_uploads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_name TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          uploaded_by INTEGER NOT NULL,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (uploaded_by) REFERENCES users(id)
        )
      `);

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * Initialize default data
   */
  async initializeDefaultData() {
    try {
      // Check if admin user exists
      const adminUser = await this.get(`
        SELECT id FROM users WHERE email = 'admin@1car.vn'
      `);

      if (!adminUser) {
        // Create default admin user
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await this.run(`
          INSERT INTO users (email, password_hash, name, department, role, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          'admin@1car.vn',
          hashedPassword,
          'System Administrator',
          'Ban Giám đốc',
          'admin',
          1
        ]);

        console.log('Default admin user created');
      }

      // Create initial audit log
      await this.run(`
        INSERT INTO audit_logs (user_id, action, resource_type, details, timestamp)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        1,
        'SYSTEM_INITIALIZED',
        'system',
        JSON.stringify({
          message: 'EDMS 1CAR system initialized',
          version: '1.0.0',
          compliance: ['C-PR-VM-001', 'C-TD-VM-001', 'C-PR-AR-001', 'C-WI-AR-001']
        })
      ]);

      console.log('Default data initialized');
    } catch (error) {
      console.error('Failed to initialize default data:', error);
      throw error;
    }
  }

  /**
   * Execute SQL query with parameters
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get single row from database
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get all rows from database
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  async transaction(queries) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        const results = [];
        let error = null;

        const executeNext = (index) => {
          if (index >= queries.length) {
            if (error) {
              this.db.run('ROLLBACK', () => reject(error));
            } else {
              this.db.run('COMMIT', () => resolve(results));
            }
            return;
          }

          const { sql, params } = queries[index];
          this.db.run(sql, params, function(err) {
            if (err) {
              error = err;
            } else {
              results.push({ lastID: this.lastID, changes: this.changes });
            }
            executeNext(index + 1);
          });
        };

        executeNext(0);
      });
    });
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Check database health
   */
  async healthCheck() {
    try {
      const result = await this.get('SELECT 1 as test');
      const integrity = await this.get('PRAGMA integrity_check');
      
      return {
        connected: !!result,
        integrity: integrity.integrity_check === 'ok',
        status: 'healthy'
      };
    } catch (error) {
      return {
        connected: false,
        integrity: false,
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// FIXED: Export both the class and instance
module.exports = {
  DatabaseManager,
  dbManager
};

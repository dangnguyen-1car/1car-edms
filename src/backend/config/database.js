/**
 * =================================================================
 * EDMS 1CAR - Database Configuration (FINAL REVISED & ALIGNED)
 * SQLite database setup aligned with the latest 003-align-schema-definition.sql (SQL_vD)
 * This file creates the FINAL schema structure if the database is new.
 * =================================================================
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const bcrypt = require('bcrypt');
const { security } = require('./index'); 
const AuditLogModel = require('../models/AuditLog'); // Import AuditLogModel

// Database configuration
const DB_PATH = process.env.DB_PATH || './database/edms.db';
const DB_DIR = path.dirname(DB_PATH);

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            await fs.ensureDir(DB_DIR);
            console.log('Database directories ensured');
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) throw new Error(`Failed to connect to database: ${err.message}`);
                console.log(`Connected to SQLite database: ${DB_PATH}`);
            });
            await this.configurePragma();
            await this.createTables();
            await this.createIndexes();
            await this.createFTSTable();
            await this.createViews();
            await this.initializeDefaultData();
            this.isInitialized = true;
            console.log('Database initialized successfully');
            return true;
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async configurePragma() {
        const pragmaSettings = [
            'PRAGMA foreign_keys = ON', 'PRAGMA journal_mode = WAL',
            'PRAGMA synchronous = NORMAL', 'PRAGMA cache_size = 10000', 
            'PRAGMA temp_store = MEMORY'
        ];
        for (const pragma of pragmaSettings) await this.run(pragma);
        console.log('Database PRAGMA settings configured');
    }

    async createTables() {
        try {
            await this.run(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, description TEXT, executed_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            await this.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
                    name TEXT NOT NULL, department TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
                    position TEXT, phone TEXT, is_active INTEGER DEFAULT 1, last_login DATETIME,
                    password_changed_at DATETIME, failed_login_attempts INTEGER DEFAULT 0, locked_until DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_by INTEGER,
                    FOREIGN KEY (created_by) REFERENCES users(id), CHECK (role IN ('admin', 'user')),
                    CHECK (department IN (
                        'Ban Giám đốc', 'Phòng Phát triển Nhượng quyền', 'Phòng Đào tạo Tiêu chuẩn',
                        'Phòng Marketing', 'Phòng Kỹ thuật QC', 'Phòng Tài chính',
                        'Phòng Công nghệ Hệ thống', 'Phòng Pháp lý', 'Bộ phận Tiếp nhận CSKH',
                        'Bộ phận Kỹ thuật Garage', 'Bộ phận QC Garage', 'Bộ phận Kho/Kế toán Garage',
                        'Bộ phận Marketing Garage', 'Quản lý Garage'
                    )), CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10)
                )`);
            await this.run(`
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, document_code TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
                    description TEXT, type TEXT NOT NULL, department TEXT NOT NULL, status TEXT DEFAULT 'draft',
                    version TEXT DEFAULT '01.00', priority TEXT DEFAULT 'normal', security_level TEXT DEFAULT 'internal',
                    author_id INTEGER NOT NULL, reviewer_id INTEGER, approver_id INTEGER, file_path TEXT,
                    file_name TEXT, file_size INTEGER, mime_type TEXT, scope_of_application TEXT, recipients TEXT,
                    review_cycle INTEGER DEFAULT 365, retention_period INTEGER DEFAULT 2555, next_review_date DATE,
                    disposal_date DATE, change_reason TEXT, change_summary TEXT, keywords TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    published_at DATETIME, archived_at DATETIME,
                    FOREIGN KEY (author_id) REFERENCES users(id), FOREIGN KEY (reviewer_id) REFERENCES users(id),
                    FOREIGN KEY (approver_id) REFERENCES users(id),
                    CHECK (type IN ('PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC')),
                    CHECK (status IN ('draft', 'review', 'published', 'archived', 'disposed')),
                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
                    CHECK (security_level IN ('public', 'internal', 'confidential', 'restricted'))
                )`);
            await this.run(`
                CREATE TABLE IF NOT EXISTS document_versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, version TEXT NOT NULL,
                    file_path TEXT, file_name TEXT, file_size INTEGER, change_reason TEXT, change_summary TEXT,
                    change_type TEXT, status TEXT DEFAULT 'current', created_by INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES users(id),
                    CHECK (change_type IN ('major', 'minor', 'patch')),
                    CHECK (status IN ('current', 'superseded', 'archived')),
                    UNIQUE(document_id, version)
                )`);
            await this.run(`
                CREATE TABLE IF NOT EXISTS workflow_transitions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, from_status TEXT,
                    to_status TEXT NOT NULL, comment TEXT, decision TEXT, transitioned_by INTEGER NOT NULL,
                    transitioned_at DATETIME DEFAULT CURRENT_TIMESTAMP, ip_address TEXT, user_agent TEXT,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (transitioned_by) REFERENCES users(id),
                    CHECK (decision IN ('approved', 'rejected', 'returned', NULL))
                )`);

            const validAuditActions = AuditLogModel.VALID_ACTIONS.map(action => `'${action}'`).join(', ');
            const validAuditResourceTypes = AuditLogModel.VALID_RESOURCE_TYPES.map(type => `'${type}'`).join(', ');
            await this.run(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL,
                    resource_type TEXT NOT NULL, resource_id INTEGER, details TEXT, ip_address TEXT,
                    user_agent TEXT, session_id TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    CHECK (action IN (${validAuditActions})),
                    CHECK (resource_type IN (${validAuditResourceTypes}))
                )
            `);

            await this.run(`
                CREATE TABLE IF NOT EXISTS document_permissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, user_id INTEGER,
                    department TEXT, permission_type TEXT NOT NULL, granted_by INTEGER NOT NULL,
                    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME, is_active INTEGER DEFAULT 1,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (granted_by) REFERENCES users(id),
                    CHECK (permission_type IN ('read', 'write', 'approve', 'admin')),
                    CHECK ((user_id IS NOT NULL AND department IS NULL) OR (user_id IS NULL AND department IS NOT NULL))
                )`);
            await this.run(`
                CREATE TABLE IF NOT EXISTS file_uploads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, original_name TEXT NOT NULL, file_name TEXT NOT NULL,
                    file_path TEXT NOT NULL, file_size INTEGER NOT NULL, mime_type TEXT NOT NULL, checksum TEXT,
                    uploaded_by INTEGER NOT NULL, document_id INTEGER, version_id INTEGER,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (uploaded_by) REFERENCES users(id), FOREIGN KEY (document_id) REFERENCES documents(id),
                    FOREIGN KEY (version_id) REFERENCES document_versions(id)
                )`);
            await this.run(`
                CREATE TABLE IF NOT EXISTS document_relationships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, parent_document_id INTEGER NOT NULL,
                    child_document_id INTEGER NOT NULL, relationship_type TEXT NOT NULL, created_by INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (child_document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES users(id),
                    CHECK (relationship_type IN ('references', 'supersedes', 'implements', 'related')),
                    UNIQUE(parent_document_id, child_document_id, relationship_type)
                )`);
            console.log('Database tables ensured (created if not exist with final schema).');
        } catch (error) {
            console.error('Failed to create/ensure tables:', error);
            throw error;
        }
    }

    async createIndexes() { // Giữ nguyên nội dung hàm này
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)',
            'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
            'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_users_position ON users(position)',
            'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
            'CREATE INDEX IF NOT EXISTS idx_users_failed_attempts ON users(failed_login_attempts)',
            'CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until)',
            'CREATE INDEX IF NOT EXISTS idx_users_department_role ON users(department, role)',
            'CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)',
            'CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department)',
            'CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)',
            'CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id)',
            'CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_documents_code ON documents(document_code)',
            'CREATE INDEX IF NOT EXISTS idx_documents_priority ON documents(priority)',
            'CREATE INDEX IF NOT EXISTS idx_documents_security_level ON documents(security_level)',
            'CREATE INDEX IF NOT EXISTS idx_documents_next_review_date ON documents(next_review_date)',
            'CREATE INDEX IF NOT EXISTS idx_documents_disposal_date ON documents(disposal_date)',
            'CREATE INDEX IF NOT EXISTS idx_documents_keywords ON documents(keywords)',
            'CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions(document_id)',
            'CREATE INDEX IF NOT EXISTS idx_versions_created_at ON document_versions(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_versions_created_by ON document_versions(created_by)',
            'CREATE INDEX IF NOT EXISTS idx_versions_change_type ON document_versions(change_type)',
            'CREATE INDEX IF NOT EXISTS idx_versions_status ON document_versions(status)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_document ON workflow_transitions(document_id)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_user ON workflow_transitions(transitioned_by)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_timestamp ON workflow_transitions(transitioned_at)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_decision ON workflow_transitions(decision)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_ip_address ON workflow_transitions(ip_address)',
            'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)',
            'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_session_id ON audit_logs(session_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_ip_address ON audit_logs(ip_address)',
            'CREATE INDEX IF NOT EXISTS idx_permissions_document ON document_permissions(document_id)',
            'CREATE INDEX IF NOT EXISTS idx_permissions_user ON document_permissions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_permissions_active ON document_permissions(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_permissions_expires_at ON document_permissions(expires_at)',
            'CREATE INDEX IF NOT EXISTS idx_uploads_document ON file_uploads(document_id)',
            'CREATE INDEX IF NOT EXISTS idx_uploads_version ON file_uploads(version_id)',
            'CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON file_uploads(uploaded_by)',
            'CREATE INDEX IF NOT EXISTS idx_relationships_parent ON document_relationships(parent_document_id)',
            'CREATE INDEX IF NOT EXISTS idx_relationships_child ON document_relationships(child_document_id)',
            'CREATE INDEX IF NOT EXISTS idx_relationships_type ON document_relationships(relationship_type)'
        ];
        for (const indexSQL of indexes) await this.run(indexSQL);
        console.log('Database indexes created/ensured successfully');
    }

    async createFTSTable() { // Giữ nguyên nội dung hàm này
        try {
            await this.run(`CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(document_code, title, description, keywords, content='documents', content_rowid='id', tokenize = "unicode61")`);
            await this.run(`CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN INSERT INTO documents_fts(rowid, document_code, title, description, keywords) VALUES (new.id, new.document_code, new.title, new.description, new.keywords); END`);
            await this.run(`CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN UPDATE documents_fts SET document_code = new.document_code, title = new.title, description = new.description, keywords = new.keywords WHERE rowid = new.id; END`);
            await this.run(`CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN DELETE FROM documents_fts WHERE rowid = old.id; END`);
            console.log('FTS table and triggers created/ensured successfully');
        } catch (error) {
            console.error('Failed to create FTS table:', error);
            throw error;
        }
    }

    async createViews() { // Giữ nguyên nội dung hàm này
        try {
            await this.run(`DROP VIEW IF EXISTS v_document_summary;`);
            await this.run(`DROP VIEW IF EXISTS document_summary;`);
            await this.run(`
                CREATE VIEW IF NOT EXISTS v_document_summary AS
                SELECT d.id, d.document_code, d.title, d.type, d.department, d.status, d.version,
                    d.priority, d.security_level, u.name as author_name, u.department as author_department,
                    d.created_at, d.updated_at, d.published_at,
                    (SELECT COUNT(*) FROM document_versions dv WHERE dv.document_id = d.id) as version_count,
                    (SELECT COUNT(*) FROM workflow_transitions wt WHERE wt.document_id = d.id) as workflow_steps
                FROM documents d LEFT JOIN users u ON d.author_id = u.id`);
            await this.run(`DROP VIEW IF EXISTS v_user_activity;`);
            await this.run(`DROP VIEW IF EXISTS user_activity;`);
            await this.run(`
                CREATE VIEW IF NOT EXISTS v_user_activity AS
                SELECT u.id, u.name, u.department, u.role,
                    COUNT(DISTINCT d.id) as documents_created, COUNT(DISTINCT dv.id) as versions_created,
                    COUNT(DISTINCT wt.id) as workflow_actions, MAX(al.timestamp) as last_activity
                FROM users u LEFT JOIN documents d ON u.id = d.author_id
                LEFT JOIN document_versions dv ON u.id = dv.created_by
                LEFT JOIN workflow_transitions wt ON u.id = wt.transitioned_by
                LEFT JOIN audit_logs al ON u.id = al.user_id
                GROUP BY u.id, u.name, u.department, u.role`);
            console.log('Database views created/ensured successfully');
        } catch (error) {
            console.error('Failed to create views:', error);
            throw error;
        }
    }

    async initializeDefaultData() { // Giữ nguyên nội dung hàm này
        try {
            const adminUser = await this.get(`SELECT id FROM users WHERE email = 'admin@1car.vn'`);
            let adminId = adminUser ? adminUser.id : null;
            if (!adminUser) {
                const hashedPassword = await bcrypt.hash('admin123', security.bcrypt.rounds);
                const result = await this.run(`INSERT INTO users (email, password_hash, name, department, role, position, is_active, password_changed_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)`,
                    ['admin@1car.vn', hashedPassword, 'System Administrator', 'Ban Giám đốc', 'admin', 'System Administrator', 1]);
                adminId = result.lastID;
                if (adminId) await this.run(`UPDATE users SET created_by = ? WHERE id = ?`, [adminId, adminId]);
                console.log('Default admin user created');
            }
            const migrationRecord = await this.get(`SELECT version FROM schema_migrations WHERE version = '003'`);
            if (!migrationRecord) {
                 await this.run(`INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (?, ?)`,
                    ['003', 'Initial schema creation aligned with final migration (003-align-schema-definition.sql)']);
                console.log('Schema version 003 (as baseline) recorded in schema_migrations');
            }
            if (adminId) {
                 const startupLogExists = await this.get(`SELECT id FROM audit_logs WHERE action = 'SYSTEM_STARTUP' ORDER BY timestamp DESC LIMIT 1`);
                 if (!startupLogExists) { 
                    await this.run(`INSERT INTO audit_logs (user_id, action, resource_type, details, timestamp) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [adminId, 'SYSTEM_STARTUP', 'system', JSON.stringify({ message: 'EDMS 1CAR system initialized/started', version: '1.0.0', schema_aligned_to_migration: '003' })]);
                    console.log('SYSTEM_STARTUP audit log created.');
                 }
            } else console.warn('Admin user ID not available for initial SYSTEM_STARTUP audit log.');
            console.log('Default data initialization checked/completed');
        } catch (error) {
            console.error('Failed to initialize default data:', error);
        }
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized for run operation"));
            this.db.run(sql, params, function (err) {
                if (err) { console.error(`SQL Error (run): ${err.message} - SQL: ${sql} - Params: ${JSON.stringify(params)}`); reject(err); } 
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized for get operation"));
            this.db.get(sql, params, (err, row) => {
                if (err) { console.error(`SQL Error (get): ${err.message} - SQL: ${sql} - Params: ${JSON.stringify(params)}`); reject(err); } 
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized for all operation"));
            this.db.all(sql, params, (err, rows) => {
                if (err) { console.error(`SQL Error (all): ${err.message} - SQL: ${sql} - Params: ${JSON.stringify(params)}`); reject(err); } 
                else resolve(rows);
            });
        });
    }

    async transaction(queriesCallback) { 
        if (!this.db) throw new Error("Database not initialized for transaction");
        return new Promise(async (resolve, reject) => { // Make outer promise async
            this.db.serialize(async () => { 
                try {
                    await this.run('BEGIN TRANSACTION');
                    // queriesCallback should be an async function that accepts the dbManager (this)
                    // and performs operations using this.run, this.get, this.all
                    const result = await queriesCallback(this); 
                    await this.run('COMMIT');
                    resolve(result);
                } catch (error) {
                    try {
                        await this.run('ROLLBACK');
                    } catch (rollbackError) {
                        console.error('Failed to rollback transaction:', rollbackError);
                    }
                    reject(error);
                }
            });
        });
    }

    close() { // Giữ nguyên nội dung hàm này
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) { console.error('Failed to close database connection:', err); reject(err); } 
                    else { console.log('Database connection closed'); this.db = null; this.isInitialized = false; resolve(); }
                });
            } else resolve();
        });
    }

    async healthCheck() { // Giữ nguyên nội dung hàm này
        try {
            if (!this.db || !this.isInitialized) return { connected: false, integrity: false, status: 'unhealthy', error: 'Database not initialized', timestamp: new Date().toISOString() };
            const result = await this.get('SELECT 1 as test');
            const integrity = await this.get('PRAGMA integrity_check');
            return { connected: !!result, integrity: integrity.integrity_check === 'ok', status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { connected: false, integrity: false, status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
        }
    }

    async getStatistics() { // Giữ nguyên nội dung hàm này
        try {
            if (!this.db || !this.isInitialized) throw new Error("Database not initialized for statistics");
            const stats = await this.get(`
                SELECT (SELECT COUNT(*) FROM users) as total_users, (SELECT COUNT(*) FROM documents) as total_documents,
                    (SELECT COUNT(*) FROM document_versions) as total_versions, (SELECT COUNT(*) FROM audit_logs) as total_audit_logs,
                    (SELECT COUNT(*) FROM workflow_transitions) as total_workflow_transitions`);
            const dbSize = await this.get('PRAGMA page_count');
            const pageSize = await this.get('PRAGMA page_size');
            return { ...stats, database_size_bytes: dbSize.page_count * pageSize.page_size,
                database_size_mb: Math.round((dbSize.page_count * pageSize.page_size) / (1024 * 1024) * 100) / 100 };
        } catch (error) {
            console.error('Failed to get database statistics:', error);
            throw error;
        }
    }
}

const dbManager = new DatabaseManager();

module.exports = {
    DatabaseManager,
    dbManager
};
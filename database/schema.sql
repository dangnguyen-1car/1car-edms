-- database/schema.sql - Updated complete schema
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY, description TEXT, executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
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
);
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
);
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
);
CREATE TABLE IF NOT EXISTS workflow_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, from_status TEXT,
    to_status TEXT NOT NULL, comment TEXT, decision TEXT, transitioned_by INTEGER NOT NULL,
    transitioned_at DATETIME DEFAULT CURRENT_TIMESTAMP, ip_address TEXT, user_agent TEXT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (transitioned_by) REFERENCES users(id),
    CHECK (decision IN ('approved', 'rejected', 'returned', NULL))
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL,
    resource_type TEXT NOT NULL, resource_id INTEGER, details TEXT, ip_address TEXT,
    user_agent TEXT, session_id TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    CHECK (action IN (
        'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET',
        'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'TOKEN_REFRESHED',
        'USER_CREATED', 'USER_UPDATED', 'USER_PROFILE_UPDATED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
        'USER_DELETED', 'USER_VIEWED', 'USERS_LISTED', 'USER_PASSWORD_RESET',
        'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_VIEWED',
        'DOCUMENT_DOWNLOADED', 'DOCUMENT_UPLOADED', 'DOCUMENT_SEARCHED',
        'DOCUMENTS_SEARCHED',
        'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'DOCUMENT_PUBLISHED', 'DOCUMENT_ARCHIVED', 'DOCUMENT_STATUS_CHANGED',
        'VERSION_CREATED', 'VERSION_COMPARED', 'VERSION_RESTORED', 'VERSION_HISTORY_VIEWED',
        'WORKFLOW_TRANSITION', 'WORKFLOW_APPROVED', 'WORKFLOW_REJECTED', 'WORKFLOW_RETURNED',
        'WORKFLOW_HISTORY_VIEWED', 'WORKFLOW_TRANSITIONS_QUERIED', 'WORKFLOW_STATS_VIEWED',
        'FILE_UPLOADED', 'FILE_DOWNLOADED', 'FILE_DELETED', 'FILE_ATTACHED', 'DOCUMENT_FILE_ATTACHED',
        'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'PERMISSION_CHECKED', 'PERMISSION_DENIED',
        'SYSTEM_BACKUP', 'SYSTEM_RESTORE', 'SYSTEM_MAINTENANCE', 'SYSTEM_ERROR', 'SYSTEM_STARTUP',
        'SYSTEM_SHUTDOWN', 'SYSTEM_SETTINGS_UPDATED', 'ENDPOINT_NOT_FOUND', 'ERROR_OCCURRED',
        'DOCUMENT_STATISTICS_VIEWED', 'DOCUMENTS_DUE_REVIEW_VIEWED', 'SEARCH_FILTERS_VIEWED',
        'LOCKED_USERS_VIEWED', 'SYSTEM_STATS_VIEWED', 'DEPARTMENT_STATS_VIEWED', 'USER_STATS_VIEWED',
        'SYSTEM_DATA_VIEWED', 
        'SYSTEM_VIEWED',
        'AUDIT_LOGS_VIEWED'
    )),
    CHECK (resource_type IN ('user', 'document', 'version', 'file', 'workflow', 'permission', 'system', 'audit_log'))
);
CREATE TABLE IF NOT EXISTS document_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, user_id INTEGER,
    department TEXT, permission_type TEXT NOT NULL, granted_by INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME, is_active INTEGER DEFAULT 1,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (granted_by) REFERENCES users(id),
    CHECK (permission_type IN ('read', 'write', 'approve', 'admin')),
    CHECK ((user_id IS NOT NULL AND department IS NULL) OR (user_id IS NULL AND department IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS file_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT, original_name TEXT NOT NULL, file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, file_size INTEGER NOT NULL, mime_type TEXT NOT NULL, checksum TEXT,
    uploaded_by INTEGER NOT NULL, document_id INTEGER, version_id INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id), FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (version_id) REFERENCES document_versions(id)
);
CREATE TABLE IF NOT EXISTS document_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT, parent_document_id INTEGER NOT NULL,
    child_document_id INTEGER NOT NULL, relationship_type TEXT NOT NULL, created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (child_document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    CHECK (relationship_type IN ('references', 'supersedes', 'implements', 'related')),
    UNIQUE(parent_document_id, child_document_id, relationship_type)
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_position ON users(position);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_failed_attempts ON users(failed_login_attempts);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_users_department_role ON users(department, role);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_code ON documents(document_code);
CREATE INDEX IF NOT EXISTS idx_documents_priority ON documents(priority);
CREATE INDEX IF NOT EXISTS idx_documents_security_level ON documents(security_level);
CREATE INDEX IF NOT EXISTS idx_documents_next_review_date ON documents(next_review_date);
CREATE INDEX IF NOT EXISTS idx_documents_disposal_date ON documents(disposal_date);
CREATE INDEX IF NOT EXISTS idx_documents_keywords ON documents(keywords);
CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON document_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_versions_created_by ON document_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_versions_change_type ON document_versions(change_type);
CREATE INDEX IF NOT EXISTS idx_versions_status ON document_versions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_document ON workflow_transitions(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_user ON workflow_transitions(transitioned_by);
CREATE INDEX IF NOT EXISTS idx_workflow_timestamp ON workflow_transitions(transitioned_at);
CREATE INDEX IF NOT EXISTS idx_workflow_decision ON workflow_transitions(decision);
CREATE INDEX IF NOT EXISTS idx_workflow_ip_address ON workflow_transitions(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_permissions_document ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_permissions_user ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON document_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_expires_at ON document_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_uploads_document ON file_uploads(document_id);
CREATE INDEX IF NOT EXISTS idx_uploads_version ON file_uploads(version_id);
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_relationships_parent ON document_relationships(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_relationships_child ON document_relationships(child_document_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON document_relationships(relationship_type);
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(document_code, title, description, keywords, content='documents', content_rowid='id', tokenize = "unicode61");
CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN INSERT INTO documents_fts(rowid, document_code, title, description, keywords) VALUES (new.id, new.document_code, new.title, new.description, new.keywords); END;
CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN UPDATE documents_fts SET document_code = new.document_code, title = new.title, description = new.description, keywords = new.keywords WHERE rowid = new.id; END;
CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN DELETE FROM documents_fts WHERE rowid = old.id; END;
CREATE VIEW IF NOT EXISTS v_document_summary AS SELECT d.id, d.document_code, d.title, d.type, d.department, d.status, d.version, d.priority, d.security_level, u.name as author_name, u.department as author_department, d.created_at, d.updated_at, d.published_at, (SELECT COUNT(*) FROM document_versions dv WHERE dv.document_id = d.id) as version_count, (SELECT COUNT(*) FROM workflow_transitions wt WHERE wt.document_id = d.id) as workflow_steps FROM documents d LEFT JOIN users u ON d.author_id = u.id;
CREATE VIEW IF NOT EXISTS v_user_activity AS SELECT u.id, u.name, u.department, u.role, COUNT(DISTINCT d.id) as documents_created, COUNT(DISTINCT dv.id) as versions_created, COUNT(DISTINCT wt.id) as workflow_actions, MAX(al.timestamp) as last_activity FROM users u LEFT JOIN documents d ON u.id = d.author_id LEFT JOIN document_versions dv ON u.id = dv.created_by LEFT JOIN workflow_transitions wt ON u.id = wt.transitioned_by LEFT JOIN audit_logs al ON u.id = al.user_id GROUP BY u.id, u.name, u.department, u.role;
INSERT OR IGNORE INTO schema_migrations (version, description) VALUES ('003', 'Schema aligned with final definition including comprehensive audit actions and FTS.');
-- database/schema.sql - Updated complete schema
-- 1CAR - EDMS Database Schema
-- SQLite database for 40 users, 14 departments, 7 document types
-- Compliant with IATF 16949 and internal standards

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- Schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    description TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table - Based on C-FM-MG-004 role matrix
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    position TEXT,
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    last_login DATETIME,
    password_changed_at DATETIME,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id),
    CHECK (role IN ('admin', 'user')),
    CHECK (department IN (
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
    )),
    CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10)
);

-- Documents table - Based on C-PR-VM-001, C-TD-VM-001
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    department TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    version TEXT DEFAULT '01.00',
    priority TEXT DEFAULT 'normal',
    security_level TEXT DEFAULT 'internal',
    author_id INTEGER NOT NULL,
    reviewer_id INTEGER,
    approver_id INTEGER,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    scope_of_application TEXT,
    recipients TEXT, -- JSON array of departments
    review_cycle INTEGER, -- days
    retention_period INTEGER, -- days
    next_review_date DATE,
    disposal_date DATE,
    change_reason TEXT,
    change_summary TEXT,
    keywords TEXT, -- Comma-separated for search
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    archived_at DATETIME,
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (approver_id) REFERENCES users(id),
    CHECK (type IN ('PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC')),
    CHECK (status IN ('draft', 'review', 'published', 'archived', 'disposed')),
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CHECK (security_level IN ('public', 'internal', 'confidential', 'restricted'))
);

-- Document versions table - Based on C-TD-VM-001
CREATE TABLE document_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    version TEXT NOT NULL,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    change_reason TEXT,
    change_summary TEXT,
    change_type TEXT, -- major, minor, patch
    status TEXT DEFAULT 'current',
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    CHECK (change_type IN ('major', 'minor', 'patch')),
    CHECK (status IN ('current', 'superseded', 'archived')),
    UNIQUE(document_id, version)
);

-- Workflow transitions table - Based on C-PR-VM-001
CREATE TABLE workflow_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    comment TEXT,
    decision TEXT, -- approved, rejected, returned
    transitioned_by INTEGER NOT NULL,
    transitioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (transitioned_by) REFERENCES users(id),
    CHECK (decision IN ('approved', 'rejected', 'returned', NULL))
);

-- Audit logs table - Based on C-PR-AR-001
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id INTEGER,
    details TEXT, -- JSON object with additional details
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    CHECK (action IN (
        'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET',
        'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'USER_CREATED', 'USER_UPDATED', 
        'USER_ACTIVATED', 'USER_DEACTIVATED', 'USER_DELETED', 'USER_VIEWED', 'USERS_LISTED',
        'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_VIEWED',
        'DOCUMENT_DOWNLOADED', 'DOCUMENT_UPLOADED', 'DOCUMENT_SEARCHED', 'DOCUMENT_APPROVED',
        'DOCUMENT_REJECTED', 'DOCUMENT_PUBLISHED', 'DOCUMENT_ARCHIVED', 'VERSION_CREATED',
        'VERSION_COMPARED', 'VERSION_RESTORED', 'WORKFLOW_TRANSITION', 'WORKFLOW_APPROVED',
        'WORKFLOW_REJECTED', 'WORKFLOW_RETURNED', 'FILE_UPLOADED', 'FILE_DOWNLOADED',
        'FILE_DELETED', 'FILE_ATTACHED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED',
        'PERMISSION_CHECKED', 'SYSTEM_BACKUP', 'SYSTEM_RESTORE', 'SYSTEM_MAINTENANCE',
        'SYSTEM_ERROR', 'SYSTEM_STARTUP', 'SYSTEM_SHUTDOWN'
    )),
    CHECK (resource_type IN ('user', 'document', 'version', 'file', 'workflow', 'permission', 'system'))
);

-- Document permissions table - Based on C-PL-MG-005
CREATE TABLE document_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    user_id INTEGER,
    department TEXT,
    permission_type TEXT NOT NULL,
    granted_by INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (granted_by) REFERENCES users(id),
    CHECK (permission_type IN ('read', 'write', 'approve', 'admin')),
    CHECK ((user_id IS NOT NULL AND department IS NULL) OR (user_id IS NULL AND department IS NOT NULL))
);

-- File uploads table
CREATE TABLE file_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    checksum TEXT, -- SHA-256 hash for integrity
    uploaded_by INTEGER NOT NULL,
    document_id INTEGER,
    version_id INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (version_id) REFERENCES document_versions(id)
);

-- Document relationships table for related documents
CREATE TABLE document_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_document_id INTEGER NOT NULL,
    child_document_id INTEGER NOT NULL,
    relationship_type TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (child_document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    CHECK (relationship_type IN ('references', 'supersedes', 'implements', 'related')),
    UNIQUE(parent_document_id, child_document_id, relationship_type)
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_failed_attempts ON users(failed_login_attempts);
CREATE INDEX idx_users_locked_until ON users(locked_until);

CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_department ON documents(department);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_author ON documents(author_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_code ON documents(document_code);
CREATE INDEX idx_documents_keywords ON documents(keywords);

CREATE INDEX idx_versions_document ON document_versions(document_id);
CREATE INDEX idx_versions_created_at ON document_versions(created_at);
CREATE INDEX idx_versions_created_by ON document_versions(created_by);

CREATE INDEX idx_workflow_document ON workflow_transitions(document_id);
CREATE INDEX idx_workflow_user ON workflow_transitions(transitioned_by);
CREATE INDEX idx_workflow_timestamp ON workflow_transitions(transitioned_at);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX idx_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_permissions_user ON document_permissions(user_id);
CREATE INDEX idx_permissions_active ON document_permissions(is_active);

-- Create views for common queries
CREATE VIEW v_document_summary AS
SELECT 
    d.id,
    d.document_code,
    d.title,
    d.type,
    d.department,
    d.status,
    d.version,
    d.priority,
    d.security_level,
    u.name as author_name,
    u.department as author_department,
    d.created_at,
    d.updated_at,
    d.published_at,
    (SELECT COUNT(*) FROM document_versions dv WHERE dv.document_id = d.id) as version_count,
    (SELECT COUNT(*) FROM workflow_transitions wt WHERE wt.document_id = d.id) as workflow_steps
FROM documents d
LEFT JOIN users u ON d.author_id = u.id;

CREATE VIEW v_user_activity AS
SELECT 
    u.id,
    u.name,
    u.department,
    u.role,
    COUNT(DISTINCT d.id) as documents_created,
    COUNT(DISTINCT dv.id) as versions_created,
    COUNT(DISTINCT wt.id) as workflow_actions,
    MAX(al.timestamp) as last_activity
FROM users u
LEFT JOIN documents d ON u.id = d.author_id
LEFT JOIN document_versions dv ON u.id = dv.created_by
LEFT JOIN workflow_transitions wt ON u.id = wt.transitioned_by
LEFT JOIN audit_logs al ON u.id = al.user_id
GROUP BY u.id, u.name, u.department, u.role;

-- Insert initial migration record
INSERT OR IGNORE INTO schema_migrations (version, description) 
VALUES ('001', 'Initial schema creation with enhanced user management');

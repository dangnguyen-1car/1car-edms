-- =================================================================
-- EDMS 1CAR Database Schema
-- Electronic Document Management System for 1CAR
-- Supporting 40 users with simplified workflow
-- Based on C-PR-VM-001, C-TD-VM-001, C-PR-AR-001 requirements
-- =================================================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- =================================================================
-- USERS TABLE
-- Manages user authentication and basic profile information
-- Supports Admin/User roles (simplified from R,C,I,P levels)
-- =================================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =================================================================
-- DOCUMENTS TABLE
-- Core document management with metadata
-- Based on C-TD-VM-001 metadata requirements
-- Supports 7 document types: PL, PR, WI, FM, TD, TR, RC
-- =================================================================

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    document_code TEXT UNIQUE, -- Format: X-YY-ZZ-AAA-BBB based on C-TD-MG-005
    type TEXT NOT NULL CHECK (type IN ('PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC')),
    department TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0', -- Format: X.Y based on C-PR-VM-001
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    description TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    mime_type TEXT,
    
    -- Metadata fields based on C-TD-VM-001
    author_id INTEGER NOT NULL,
    reviewer_id INTEGER,
    approver_id INTEGER,
    
    -- Version control fields
    change_reason TEXT,
    change_summary TEXT,
    status_before TEXT,
    status_after TEXT,
    
    -- Lifecycle management based on C-PR-AR-001
    review_cycle INTEGER DEFAULT 365, -- days
    next_review_date DATE,
    retention_period INTEGER DEFAULT 2555, -- days (7 years)
    disposal_date DATE,
    
    -- Scope and distribution
    scope_of_application TEXT,
    recipients TEXT, -- JSON array of recipient departments/roles
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    archived_at DATETIME,
    
    -- Foreign keys
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(version);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_code ON documents(document_code);

-- Full-text search index
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title,
    description,
    document_code,
    content='documents',
    content_rowid='id'
);

-- Triggers to maintain FTS index
CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents
BEGIN
    INSERT INTO documents_fts(rowid, title, description, document_code)
    VALUES (new.id, new.title, new.description, new.document_code);
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents
BEGIN
    UPDATE documents_fts SET 
        title = new.title,
        description = new.description,
        document_code = new.document_code
    WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents
BEGIN
    DELETE FROM documents_fts WHERE rowid = old.id;
END;

-- =================================================================
-- DOCUMENT_VERSIONS TABLE
-- Track version history based on C-PR-VM-001
-- Maintains complete version lineage
-- =================================================================

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
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    UNIQUE(document_id, version)
);

-- Index for version queries
CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_versions_created ON document_versions(created_at);

-- =================================================================
-- WORKFLOW_TRANSITIONS TABLE
-- Track workflow state changes
-- Supports 3-state workflow: draft → review → published
-- =================================================================

CREATE TABLE IF NOT EXISTS workflow_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    comment TEXT,
    transitioned_by INTEGER NOT NULL,
    transitioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (transitioned_by) REFERENCES users(id)
);

-- Index for workflow queries
CREATE INDEX IF NOT EXISTS idx_workflow_document ON workflow_transitions(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_date ON workflow_transitions(transitioned_at);

-- =================================================================
-- AUDIT_LOGS TABLE
-- Comprehensive audit trail for compliance
-- Based on security requirements from documents
-- =================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL, -- CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT
    resource_type TEXT NOT NULL, -- document, user, system
    resource_id INTEGER,
    details TEXT, -- JSON string with additional details
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

-- =================================================================
-- DOCUMENT_PERMISSIONS TABLE
-- Department-based access control
-- Simplified from 4-level security (R,C,I,P) to department-based
-- =================================================================

CREATE TABLE IF NOT EXISTS document_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    department TEXT NOT NULL,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
    granted_by INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id),
    
    UNIQUE(document_id, department)
);

-- Index for permission queries
CREATE INDEX IF NOT EXISTS idx_permissions_document ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_permissions_department ON document_permissions(department);

-- =================================================================
-- SYSTEM_SETTINGS TABLE
-- Application configuration and settings
-- =================================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- =================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =================================================================

-- Update timestamps automatically
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_documents_timestamp 
AFTER UPDATE ON documents
BEGIN
    UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-generate document code if not provided
CREATE TRIGGER IF NOT EXISTS generate_document_code
AFTER INSERT ON documents
WHEN NEW.document_code IS NULL
BEGIN
    UPDATE documents 
    SET document_code = NEW.type || '-' || 
                       substr('00' || NEW.id, -3) || '-' ||
                       strftime('%Y', 'now') || '-' ||
                       substr(NEW.department, 1, 3) || '-' ||
                       '001'
    WHERE id = NEW.id;
END;

-- =================================================================
-- VIEWS FOR COMMON QUERIES
-- =================================================================

-- Active documents with author information
CREATE VIEW IF NOT EXISTS v_active_documents AS
SELECT 
    d.*,
    u.name as author_name,
    u.department as author_department,
    r.name as reviewer_name,
    a.name as approver_name
FROM documents d
LEFT JOIN users u ON d.author_id = u.id
LEFT JOIN users r ON d.reviewer_id = r.id
LEFT JOIN users a ON d.approver_id = a.id
WHERE d.status != 'archived';

-- Document statistics by department
CREATE VIEW IF NOT EXISTS v_document_stats AS
SELECT 
    department,
    type,
    status,
    COUNT(*) as count,
    AVG(file_size) as avg_file_size
FROM documents
GROUP BY department, type, status;

-- Recent activity view
CREATE VIEW IF NOT EXISTS v_recent_activity AS
SELECT 
    'document' as activity_type,
    d.title as description,
    d.updated_at as activity_date,
    u.name as user_name
FROM documents d
JOIN users u ON d.author_id = u.id
WHERE d.updated_at > datetime('now', '-7 days')
UNION ALL
SELECT 
    'audit' as activity_type,
    a.action || ' - ' || a.resource_type as description,
    a.timestamp as activity_date,
    u.name as user_name
FROM audit_logs a
LEFT JOIN users u ON a.user_id = u.id
WHERE a.timestamp > datetime('now', '-7 days')
ORDER BY activity_date DESC;

-- =================================================================
-- INITIAL SYSTEM SETTINGS
-- =================================================================

INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('app_version', '1.0.0', 'Application version'),
('max_file_size', '10485760', 'Maximum file size in bytes (10MB)'),
('allowed_file_types', 'pdf,doc,docx', 'Allowed file extensions'),
('default_retention_period', '2555', 'Default document retention period in days'),
('auto_backup_enabled', 'true', 'Enable automatic backups'),
('version_format', 'X.Y', 'Document version format'),
('workflow_states', 'draft,review,published,archived', 'Available workflow states'),
('departments', 'Ban Giám đốc,Phòng Phát triển Nhượng quyền,Phòng Đào tạo Tiêu chuẩn,Phòng Marketing,Phòng Kỹ thuật QC,Phòng Tài chính,Phòng Công nghệ Hệ thống,Phòng Pháp lý,Bộ phận Tiếp nhận CSKH,Bộ phận Kỹ thuật Garage,Bộ phận QC Garage,Bộ phận Kho/Kế toán Garage,Bộ phận Marketing Garage,Quản lý Garage', '1CAR departments'),
('document_types', 'PL,PR,WI,FM,TD,TR,RC', 'Available document types');

-- =================================================================
-- END OF SCHEMA
-- =================================================================

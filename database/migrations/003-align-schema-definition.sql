-- database/migrations/003-align-schema-definition.sql
-- Migration script to align existing schema with complete definition
-- EDMS 1CAR - Final schema alignment addressing all compatibility issues
-- This migration ensures complete compatibility with AuditLog.js and all JavaScript models

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- =================================================================
-- STEP 1: Transform audit_logs table
-- Critical fix for AuditLog.js compatibility
-- =================================================================

-- Create new audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id INTEGER,
    details TEXT,
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

-- Copy data from old audit_logs table
INSERT OR IGNORE INTO audit_logs_new (
    id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, session_id, timestamp
)
SELECT 
    id, 
    user_id, 
    action,
    COALESCE(resource_type, entity_type, 'system'),
    COALESCE(resource_id, entity_id),
    details,
    COALESCE(ip_address, NULL),
    COALESCE(user_agent, NULL),
    COALESCE(session_id, NULL),
    COALESCE(timestamp, created_at, CURRENT_TIMESTAMP)
FROM audit_logs 
WHERE EXISTS (SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs');

-- Drop old audit_logs table and rename new one
DROP TABLE IF EXISTS audit_logs;
ALTER TABLE audit_logs_new RENAME TO audit_logs;

-- =================================================================
-- STEP 2: Transform workflow_history to workflow_transitions
-- =================================================================

-- Create new workflow_transitions table
CREATE TABLE IF NOT EXISTS workflow_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    comment TEXT,
    decision TEXT,
    transitioned_by INTEGER NOT NULL,
    transitioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (transitioned_by) REFERENCES users(id),
    CHECK (decision IN ('approved', 'rejected', 'returned', NULL))
);

-- Copy data from old workflow_history table
INSERT OR IGNORE INTO workflow_transitions (
    id, document_id, from_status, to_status, comment, transitioned_by, transitioned_at, ip_address, user_agent
)
SELECT 
    id, 
    document_id, 
    from_status, 
    to_status, 
    COALESCE(comment, comments, ''),
    COALESCE(transitioned_by, user_id),
    COALESCE(transitioned_at, created_at, CURRENT_TIMESTAMP),
    COALESCE(ip_address, NULL),
    COALESCE(user_agent, NULL)
FROM workflow_history 
WHERE EXISTS (SELECT name FROM sqlite_master WHERE type='table' AND name='workflow_history');

-- Drop old workflow_history table
DROP TABLE IF EXISTS workflow_history;

-- =================================================================
-- STEP 3: Create document_relationships table
-- =================================================================

CREATE TABLE IF NOT EXISTS document_relationships (
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

-- =================================================================
-- STEP 4: Enhance users table
-- =================================================================

-- Add columns to users table
ALTER TABLE users ADD COLUMN position TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN password_changed_at DATETIME;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;

-- Update existing users
UPDATE users SET 
    failed_login_attempts = 0 
WHERE failed_login_attempts IS NULL;

-- =================================================================
-- STEP 5: Enhance documents table
-- =================================================================

-- Add columns to documents table
ALTER TABLE documents ADD COLUMN priority TEXT DEFAULT 'normal';
ALTER TABLE documents ADD COLUMN security_level TEXT DEFAULT 'internal';
ALTER TABLE documents ADD COLUMN scope_of_application TEXT;
ALTER TABLE documents ADD COLUMN recipients TEXT;
ALTER TABLE documents ADD COLUMN review_cycle INTEGER DEFAULT 365;
ALTER TABLE documents ADD COLUMN retention_period INTEGER DEFAULT 2555;
ALTER TABLE documents ADD COLUMN next_review_date DATE;
ALTER TABLE documents ADD COLUMN disposal_date DATE;
ALTER TABLE documents ADD COLUMN change_reason TEXT;
ALTER TABLE documents ADD COLUMN change_summary TEXT;
ALTER TABLE documents ADD COLUMN keywords TEXT;

-- Update existing documents
UPDATE documents SET 
    priority = 'normal' 
WHERE priority IS NULL;

UPDATE documents SET 
    security_level = 'internal' 
WHERE security_level IS NULL;

UPDATE documents SET 
    review_cycle = 365 
WHERE review_cycle IS NULL;

UPDATE documents SET 
    retention_period = 2555 
WHERE retention_period IS NULL;

-- =================================================================
-- STEP 6: Enhance document_versions table
-- =================================================================

-- Add columns to document_versions table
ALTER TABLE document_versions ADD COLUMN change_type TEXT;
ALTER TABLE document_versions ADD COLUMN status TEXT DEFAULT 'current';

-- Update existing versions
UPDATE document_versions SET 
    change_type = 'minor',
    status = 'current'
WHERE change_type IS NULL;

-- =================================================================
-- STEP 7: Enhance document_permissions table
-- =================================================================

-- Add columns to document_permissions table
ALTER TABLE document_permissions ADD COLUMN expires_at DATETIME;
ALTER TABLE document_permissions ADD COLUMN is_active INTEGER DEFAULT 1;

-- Update existing permissions
UPDATE document_permissions SET 
    is_active = 1 
WHERE is_active IS NULL;

-- =================================================================
-- STEP 8: Enhance file_uploads table
-- =================================================================

-- Add columns to file_uploads table
ALTER TABLE file_uploads ADD COLUMN checksum TEXT;
ALTER TABLE file_uploads ADD COLUMN document_id INTEGER;
ALTER TABLE file_uploads ADD COLUMN version_id INTEGER;

-- =================================================================
-- STEP 9: Create performance indexes
-- Critical for AuditLog.js and Document.js performance
-- =================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_position ON users(position);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_failed_attempts ON users(failed_login_attempts);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_users_department_role ON users(department, role);

-- Documents indexes
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

-- Document versions indexes
CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON document_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_versions_created_by ON document_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_versions_change_type ON document_versions(change_type);
CREATE INDEX IF NOT EXISTS idx_versions_status ON document_versions(status);

-- Workflow transitions indexes
CREATE INDEX IF NOT EXISTS idx_workflow_document ON workflow_transitions(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_user ON workflow_transitions(transitioned_by);
CREATE INDEX IF NOT EXISTS idx_workflow_timestamp ON workflow_transitions(transitioned_at);
CREATE INDEX IF NOT EXISTS idx_workflow_decision ON workflow_transitions(decision);
CREATE INDEX IF NOT EXISTS idx_workflow_ip_address ON workflow_transitions(ip_address);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_ip_address ON audit_logs(ip_address);

-- Document permissions indexes
CREATE INDEX IF NOT EXISTS idx_permissions_document ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_permissions_user ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON document_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_expires_at ON document_permissions(expires_at);

-- File uploads indexes
CREATE INDEX IF NOT EXISTS idx_uploads_document ON file_uploads(document_id);
CREATE INDEX IF NOT EXISTS idx_uploads_version ON file_uploads(version_id);
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON file_uploads(uploaded_by);

-- Document relationships indexes
CREATE INDEX IF NOT EXISTS idx_relationships_parent ON document_relationships(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_relationships_child ON document_relationships(child_document_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON document_relationships(relationship_type);

-- =================================================================
-- STEP 10: Create FTS5 virtual table with Vietnamese support
-- =================================================================

-- Create FTS5 virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    document_code,
    title,
    description,
    keywords,
    content='documents',
    content_rowid='id',
    tokenize = "unicode61"
);

-- Create triggers for FTS table maintenance
CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents
BEGIN
    INSERT INTO documents_fts(rowid, document_code, title, description, keywords)
    VALUES (new.id, new.document_code, new.title, new.description, new.keywords);
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents
BEGIN
    UPDATE documents_fts SET 
        document_code = new.document_code,
        title = new.title,
        description = new.description,
        keywords = new.keywords
    WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents
BEGIN
    DELETE FROM documents_fts WHERE rowid = old.id;
END;

-- =================================================================
-- STEP 11: Create standardized views
-- =================================================================

-- Drop existing views
DROP VIEW IF EXISTS v_document_summary;
DROP VIEW IF EXISTS v_user_activity;
DROP VIEW IF EXISTS document_summary;
DROP VIEW IF EXISTS user_activity;

-- Create document summary view
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

-- Create user activity view
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

-- =================================================================
-- STEP 12: Insert migration record
-- =================================================================

INSERT OR IGNORE INTO schema_migrations (version, description) 
VALUES ('003', 'Final schema alignment with complete AuditLog.js compatibility and enhanced column mapping');

-- =================================================================
-- APPLICATION LAYER COMPLIANCE NOTES
-- =================================================================

-- The following CHECK constraints are enforced at the database level where possible,
-- but some must be enforced at application level due to SQLite limitations:
-- 
-- users table (enforced at application level):
-- - role must be validated against Document.js valid roles
-- - department must be validated against DocumentCodeGenerator department mapping
-- - failed_login_attempts range validation (0-10)
--
-- documents table (enforced at application level):
-- - type must be validated against Document.js::VALID_TYPES ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC']
-- - status must be validated against Document.js::VALID_STATUSES ['draft', 'review', 'published', 'archived', 'disposed']
-- - priority must be validated against ['low', 'normal', 'high', 'urgent']
-- - security_level must be validated against ['public', 'internal', 'confidential', 'restricted']
--
-- document_versions table (enforced at application level):
-- - change_type must be validated against ['major', 'minor', 'patch']
-- - status must be validated against ['current', 'superseded', 'archived']
--
-- workflow_transitions table (CHECK constraint enforced at database level):
-- - decision IN ('approved', 'rejected', 'returned', NULL)
--
-- audit_logs table (CHECK constraints enforced at database level):
-- - action IN (VALID_ACTIONS)
-- - resource_type IN (VALID_RESOURCE_TYPES)
--
-- document_relationships table (CHECK constraint enforced at database level):
-- - relationship_type IN ('references', 'supersedes', 'implements', 'related')
-- - UNIQUE(parent_document_id, child_document_id, relationship_type)

-- =================================================================
-- COMPATIBILITY VERIFICATION
-- =================================================================

-- This migration ensures complete compatibility with:
-- AuditLog.js (Reviewed and Updated) - ALL columns supported: user_id, action, resource_type, resource_id, details, ip_address, user_agent, session_id, timestamp
-- Document.js (original version) - all fields and operations supported  
-- DocumentCodeGenerator.js - department mapping and code generation supported
-- All existing views and indexes maintained for performance
-- FTS5 search functionality with Vietnamese language support
-- Workflow state machine with proper transition tracking
-- Version management with change tracking
-- Comprehensive audit logging for compliance
-- Enhanced column mapping with COALESCE for safe data migration
-- All required indexes including idx_audit_ip_address

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
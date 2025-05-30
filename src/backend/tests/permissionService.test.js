// src/backend/tests/permissionService.test.js
const PermissionService = require('../services/permissionService');
const User = require('../models/User');
const Document = require('../models/Document');
const { dbManager } = require('../config/database');

// Mock dbManager
jest.mock('../config/database', () => ({
  dbManager: {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
  },
}));

// Mock AuditService
jest.mock('../services/auditService', () => ({
  log: jest.fn().mockResolvedValue({ success: true }),
}));
const AuditService = require('../services/auditService'); // Require sau khi mock

// Mock Models
jest.mock('../models/AuditLog', () => ({
  VALID_ACTIONS: [
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
    'SYSTEM_ERROR', 'SYSTEM_STARTUP', 'SYSTEM_SHUTDOWN',
    'SUBMIT_FOR_REVIEW', 'REVIEW_DOCUMENT', 'APPROVE_WORKFLOW', 'REJECT_WORKFLOW',
    'CHECK_PERMISSION_INTERNAL'
  ],
  VALID_RESOURCE_TYPES: [
    'user', 'document', 'version', 'file', 'workflow', 'permission', 'system',
    'permission_check', 'permission_grant', 'permission_revoke', 'effective_permission_query'
  ],
}));

jest.mock('../models/Document', () => ({
  VALID_TYPES: ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC'],
  VALID_STATUSES: ['draft', 'review', 'published', 'archived', 'disposed'],
}));

jest.mock('../models/User', () => {
    const ActualUser = jest.requireActual('../models/User');
    return {
        ...ActualUser,
        VALID_ROLES: ['admin', 'user', 'guest'],
        VALID_DEPARTMENTS: [
            'Ban Giám đốc', 'Phòng Phát triển Nhượng quyền', 'Phòng Đào tạo Tiêu chuẩn',
            'Phòng Marketing', 'Phòng Kỹ thuật QC', 'Phòng Tài chính',
            'Phòng Công nghệ Hệ thống', 'Phòng Pháp lý', 'Bộ phận Tiếp nhận CSKH',
            'Bộ phận Kỹ thuật Garage', 'Bộ phận QC Garage', 'Bộ phận Kho/Kế toán Garage',
            'Bộ phận Marketing Garage', 'Quản lý Garage',
        ],
        // Giả sử User.js định nghĩa USER_SECURITY_CLEARANCE là một static property
        USER_SECURITY_CLEARANCE: {
            'admin': 3,
            'user': 1,
            'guest': 0
        }
    };
});


describe('PermissionService.checkPermission', () => {
  const mockContext = { ipAddress: '127.0.0.1', userAgent: 'TestAgent', sessionId: 'test-session' };
  let deptPermsSpy;

  beforeEach(() => {
    dbManager.get.mockReset();
    dbManager.all.mockReset();
    dbManager.run.mockReset();
    AuditService.log.mockReset();
    AuditService.log.mockResolvedValue({ success: true });

    // Spy on the static getter 'DEPARTMENT_DOCUMENT_PERMISSIONS'
    deptPermsSpy = jest.spyOn(PermissionService, 'DEPARTMENT_DOCUMENT_PERMISSIONS', 'get');
  });

  afterEach(() => {
    // Restore the original static getter after each test
    if (deptPermsSpy) {
      deptPermsSpy.mockRestore();
    }
  });

  test('admin should have all permissions', async () => {
    dbManager.get.mockResolvedValueOnce({ id: 1, role: 'admin', department: 'Ban Giám đốc', is_active: 1, email: 'admin@example.com' });
    const result = await PermissionService.checkPermission(1, 'MANAGE_SYSTEM', 'system', null, mockContext);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('Admin access');
    expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'PERMISSION_CHECKED',
      userId: 1,
      resourceType: 'system',
      details: expect.objectContaining({
        action_attempted: 'MANAGE_SYSTEM',
        reason: 'admin_role',
        user_email: 'admin@example.com'
      }),
      ...mockContext
    }));
  });

  test('user should not have MANAGE_SYSTEM permission', async () => {
    dbManager.get.mockResolvedValueOnce({ id: 2, role: 'user', department: 'Phòng Kỹ thuật QC', is_active: 1, email: 'user@example.com' });
    const result = await PermissionService.checkPermission(2, 'MANAGE_SYSTEM', 'system', null, mockContext);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Insufficient role permissions');
    expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'PERMISSION_DENIED',
      userId: 2,
      resourceType: 'system',
      details: expect.objectContaining({
        reason: 'Insufficient role permissions',
        action_attempted: 'MANAGE_SYSTEM',
        user_role: 'user',
        user_email: 'user@example.com'
      }),
      ...mockContext
    }));
  });

  test('user should be able to VIEW_DOCUMENT if author', async () => {
    const mockUserData = { id: 2, role: 'user', department: 'Phòng Kỹ thuật QC', is_active: 1, email: 'author@example.com' };
    const mockDocumentData = { id: 10, author_id: 2, department: 'Phòng Kỹ thuật QC', type: 'TD', security_level: 'internal', status: 'published', document_code: 'TD-001' };

    // Mock the static getter for DEPARTMENT_DOCUMENT_PERMISSIONS to return the actual values
    // or specific values if needed for other parts of this test (though not directly used for author check)
    deptPermsSpy.mockReturnValue(PermissionService.constructor.DEPARTMENT_DOCUMENT_PERMISSIONS);


    dbManager.get.mockImplementation((sql, params) => {
      if (sql.includes('FROM users WHERE id = ?') && params.includes(2)) return Promise.resolve(mockUserData);
      if (sql.includes('FROM documents WHERE id = ?') && params.includes(10)) return Promise.resolve(mockDocumentData);
      return Promise.resolve(null);
    });
     dbManager.all.mockResolvedValue([]); // For _checkExplicitGrants

    const result = await PermissionService.checkPermission(2, 'VIEW_DOCUMENT', 'document', 10, mockContext);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('Document author');
    expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'PERMISSION_CHECKED',
      userId: 2,
      resourceId: 10,
      details: expect.objectContaining({
        final_reason: 'Document author',
        action_attempted: 'VIEW_DOCUMENT',
        user_email: 'author@example.com'
      }),
      ...mockContext
    }));
  });

  test('user from different department should not VIEW_DOCUMENT (internal) without explicit permission and default dept access denied', async () => {
    const mockUserViewingData = { id: 3, role: 'user', department: 'Phòng Marketing', is_active: 1, email: 'marketing_user@example.com' };
    const mockDocumentData = { id: 11, author_id: 2, department: 'Phòng Kỹ thuật QC', type: 'TD', security_level: 'internal', status: 'published', document_code: 'TD-002' };

    // Mock the getter to return specific permissions for this test
    deptPermsSpy.mockReturnValue({
        // Provide a minimal set or the full set with modifications
        'Ban Giám đốc': ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC'], // Example
        'Phòng Marketing': ['PL', 'PR'], // Crucial mock: Marketing cannot view 'TD'
        'Phòng Kỹ thuật QC': ['PR', 'WI', 'FM', 'TD', 'RC'], // For the document's department
        // Add other departments if their default permissions are involved in the logic path for this test
        // For this specific test, only 'Phòng Marketing' is strictly necessary to be different from default
        // and 'Phòng Kỹ thuật QC' to be present for the document context.
    });

    dbManager.get.mockImplementation((sql, params) => {
      if (sql.includes('FROM users WHERE id = ?') && params.includes(3)) return Promise.resolve(mockUserViewingData);
      if (sql.includes('FROM documents WHERE id = ?') && params.includes(11)) return Promise.resolve(mockDocumentData);
      return Promise.resolve(null);
    });
    dbManager.all.mockResolvedValue([]); // For _checkExplicitGrants (no explicit permissions)

    const result = await PermissionService.checkPermission(3, 'VIEW_DOCUMENT', 'document', 11, mockContext);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("User's department (Phòng Marketing) has no default access to document type (TD).");

    expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'PERMISSION_DENIED',
      userId: 3,
      resourceId: 11,
      details: expect.objectContaining({
        action_attempted: 'VIEW_DOCUMENT',
        final_reason: expect.stringContaining("User's department (Phòng Marketing) has no default access to document type (TD)."),
        user_email: 'marketing_user@example.com'
      }),
      ...mockContext
    }));
  });

  // Thêm nhiều test case hơn cho:
  // - Quyền tường minh (grant/revoke)
  // - Quyền theo security level
  // - Quyền theo document status
  // - Các actions khác nhau (EDIT, DELETE, APPROVE...)
  // - User không active
  // - Document không tồn tại
  // - Các hàm grantPermission, revokePermission, getEffectivePermissions...
});
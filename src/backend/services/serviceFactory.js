// src/backend/services/serviceFactory.js
/**

=================================================================

EDMS 1CAR - Service Factory

Factory pattern để khởi tạo services với dependency injection

=================================================================
*/

const DocumentService = require('./documentService');
const PermissionService = require('./permissionService');
const WorkflowService = require('./workflowService');
const AuditService = require('./auditService');

class ServiceFactory {
constructor() {
this._documentService = null;
this._permissionService = null;
this._workflowService = null;
this._auditService = null;
}

/**

Lấy instance của PermissionService (singleton)
*/
getPermissionService() {
if (!this._permissionService) {
this._permissionService = PermissionService;
}
return this._permissionService;
}

/**

Lấy instance của WorkflowService (singleton)
*/
getWorkflowService() {
if (!this._workflowService) {
this._workflowService = WorkflowService;
}
return this._workflowService;
}

/**

Lấy instance của AuditService (singleton)
*/
getAuditService() {
if (!this._auditService) {
this._auditService = AuditService;
}
return this._auditService;
}

/**

Lấy instance của DocumentService với dependency injection
*/
getDocumentService() {
if (!this._documentService) {
const permissionService = this.getPermissionService();
const workflowService = this.getWorkflowService();
const auditService = this.getAuditService();

this._documentService = new DocumentService(
permissionService,
workflowService,
auditService
);
}
return this._documentService;
}

/**

Reset tất cả services (dùng cho testing)
*/
reset() {
this._documentService = null;
this._permissionService = null;
this._workflowService = null;
this._auditService = null;
}
}

// Export singleton instance
module.exports = new ServiceFactory();
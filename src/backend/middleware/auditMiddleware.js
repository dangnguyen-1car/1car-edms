// src/backend/middleware/auditMiddleware.js
/**

=================================================================

EDMS 1CAR - Audit Middleware

Tự động ghi nhật ký audit cho các hành động thành công

Based on C-PR-AR-001 requirements

=================================================================
*/

const AuditService = require('../services/auditService');
const { logError } = require('../utils/logger');

/**

Middleware tự động ghi audit log sau khi response được gửi

Controller/service sẽ gắn thông tin audit vào res.locals.auditDetails

Cấu trúc res.locals.auditDetails:

{

action: 'DOCUMENT_CREATED',

resourceType: 'document',

resourceId: 123,

details: { title: 'Document Title', ... }

}
*/
const auditMiddleware = (req, res, next) => {
// Lắng nghe sự kiện finish khi response đã được gửi hoàn toàn
res.on('finish', async () => {
try {
const { auditDetails } = res.locals;
const user = req.user;

// Chỉ ghi log nếu có auditDetails, user, và request thành công
if (auditDetails && user && res.statusCode >= 200 && res.statusCode < 300) {
// Tạo context từ request
const context = {
ipAddress: req.ip,
userAgent: req.get('user-agent'),
sessionId: req.sessionID
};

// Chuẩn bị dữ liệu audit
const auditData = {
userId: user.id,
action: auditDetails.action,
resourceType: auditDetails.resourceType,
resourceId: auditDetails.resourceId,
details: auditDetails.details || {},
...context
};

// Ghi log qua AuditService (không await để không block response)
AuditService.log(auditData).catch(error => {
logError(error, null, {
operation: 'auditMiddleware.log',
auditData,
message: 'Failed to log audit event in middleware'
});
});
}
} catch (error) {
// Log lỗi nhưng không throw để không ảnh hưởng đến response
logError(error, null, {
operation: 'auditMiddleware.finish',
message: 'Error in audit middleware finish handler'
});
}
});

next();
};

/**

Helper function để controller/service set audit details

@param {Object} res - Express response object

@param {string} action - Action được thực hiện

@param {string} resourceType - Loại tài nguyên

@param {number|string} resourceId - ID của tài nguyên

@param {Object} details - Chi tiết bổ sung
*/
const setAuditDetails = (res, action, resourceType, resourceId, details = {}) => {
res.locals.auditDetails = {
action,
resourceType,
resourceId,
details
};
};

/**

Middleware wrapper để tự động set audit details cho các action cơ bản

@param {string} action - Action cố định

@param {string} resourceType - Resource type cố định

@param {Function} getResourceId - Function để lấy resourceId từ req

@param {Function} getDetails - Function để lấy details từ req, res
*/
const autoAudit = (action, resourceType, getResourceId, getDetails) => {
return (req, res, next) => {
// Override res.json để tự động set audit details khi success
const originalJson = res.json;

res.json = function(data) {
// Chỉ set audit details nếu response thành công
if (res.statusCode >= 200 && res.statusCode < 300 && data && data.success !== false) {
try {
const resourceId = getResourceId ? getResourceId(req, res, data) : null;
const details = getDetails ? getDetails(req, res, data) : {};
setAuditDetails(res, action, resourceType, resourceId, details);
} catch (error) {
logError(error, null, {
operation: 'autoAudit.setDetails',
action,
resourceType
});
}
}

// Gọi method json gốc
return originalJson.call(this, data);
};

next();
};
};

/**

Middleware để audit các action CRUD cơ bản
*/
const auditCRUD = {
/**

Audit cho CREATE operations

@param {string} resourceType - Loại tài nguyên
*/
create: (resourceType) => autoAudit(
`${resourceType.toUpperCase()}_CREATED`,
resourceType,
(req, res, data) => data.data?.id || data.id,
(req, res, data) => ({
title: data.datagoals?.title || data.title,
type: data.data?.type || data.type,
department: data.data?.department || data.department
})
),

/**

Audit cho READ operations

@param {string} resourceType - Loại tài nguyên
*/
read: (resourceType) => autoAudit(
`${resourceType.toUpperCase()}_VIEWED`,
resourceType,
(req) => req.params.id || req.params.documentId,
(req, res, data) => ({
title: data.data?.title || data.title,
code: data.data?.document_code || data.document_code
})
),

/**

Audit cho UPDATE operations

@param {string} resourceType - Loại tài nguyên
*/
update: (resourceType) => autoAudit(
`${resourceType.toUpperCase()}_UPDATED`,
resourceType,
(req) => req.params.id || req.params.documentId,
(req, res, data) => ({
title: data.data?.title || data.title,
updateData: req.body
})
),

/**

Audit cho DELETE operations

@param {string} resourceType - Loại tài nguyên
*/
delete: (resourceType) => autoAudit(
`${resourceType.toUpperCase()}_DELETED`,
resourceType,
(req) => req.params.id || req.params.documentId,
(req, res, data) => ({
title: data.data?.title || data.title,
reason: 'Deleted by user'
})
)
};

module.exports = {
auditMiddleware,
setAuditDetails,
autoAudit,
auditCRUD
};
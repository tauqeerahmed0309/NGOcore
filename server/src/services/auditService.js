const AuditLog = require('../models/AuditLog');

const writeAuditLog = async ({
  req,
  actor = req?.user,
  action,
  entityType,
  entityId = null,
  ngoId = actor?.ngoId || null,
  metadata = {}
}) => {
  if (action !== 'login_failed' && actor && !ngoId) {
    throw new Error('Cannot write an organization audit event without an authenticated NGO scope.');
  }
  return AuditLog.create({
  ngoId,
  actorId: actor?._id || null,
  action,
  entityType,
  entityId: entityId ? String(entityId) : null,
  ip: req?.ip || '',
  userAgent: req?.get('user-agent') || '',
  metadata
  });
};

module.exports = { writeAuditLog };

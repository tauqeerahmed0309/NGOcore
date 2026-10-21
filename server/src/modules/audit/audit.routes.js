const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requirePermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const auditController = require('./audit.controller');

const router = express.Router();

// Common middleware for all tenant audit endpoints
router.use(requireAuth, requireNgoStatus('approved'), ngoScope, requirePermission('audit:read'));

// Verify cryptographic SHA-256 hash chain integrity
router.get('/verify', auditController.verifyChainIntegrity);

// Export audit logs to CSV or JSON for compliance and grant auditors
router.get('/export', auditController.exportAuditLogs);

// Query paginated append-only audit trail
router.get('/', auditController.getAuditLogs);

// NOTE: No update (PUT/PATCH) or delete (DELETE) routes exist. Audit logs are strictly append-only.

module.exports = router;

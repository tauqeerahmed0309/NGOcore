const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requireAnyPermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const privacyController = require('./privacy.controller');

const router = express.Router();

// Enforce auth, approved NGO status, and tenant scoping
router.use(requireAuth, requireNgoStatus('approved'), ngoScope);

// Consent Endpoints
router.post('/consent', requireAnyPermission('privacy:write', 'records:update', 'records:create'), privacyController.grantConsent);
router.patch('/consent/:id/withdraw', requireAnyPermission('privacy:write', 'records:update'), privacyController.withdrawConsent);
router.get('/consent/:recordId', requireAnyPermission('records:read', 'privacy:read'), privacyController.getConsentsByRecord);

// DPDP / GDPR Right to be Forgotten (Cryptographic Erasure Certificate)
router.post('/erasure', requireAnyPermission('privacy:admin', 'records:delete', 'ngo:manage_settings'), privacyController.executeRightToBeForgotten);

// Subject Access Request (SAR Portable Data Package)
router.get('/sar/:recordId', requireAnyPermission('records:read', 'privacy:read'), privacyController.exportSubjectAccessData);

module.exports = router;

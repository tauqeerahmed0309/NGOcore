const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requirePermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const blockchainController = require('./blockchain.controller');

const router = express.Router();

// Enforce authentication, approved NGO status, and tenant scoping
router.use(requireAuth, requireNgoStatus('approved'), ngoScope);

router.post('/anchor', requirePermission('records:create'), blockchainController.anchorBatch);
router.post('/verify-leaf', requirePermission('records:read'), blockchainController.verifyLeaf);
router.get('/integrity', requirePermission('records:read'), blockchainController.checkIntegrity);
router.get('/anchors', requirePermission('records:read'), blockchainController.getAnchors);

module.exports = router;

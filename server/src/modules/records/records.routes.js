const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requirePermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const recordsController = require('./records.controller');

const router = express.Router();

// Enforce authentication, approved NGO status, and tenant scoping across all record endpoints
router.use(requireAuth, requireNgoStatus('approved'), ngoScope);

// Record Types (Schemas)
router.get('/types', requirePermission('records:read'), recordsController.getRecordTypes);
router.post('/types', requirePermission('records:create'), recordsController.createRecordType);
router.post('/types/seed', requirePermission('records:create'), recordsController.seedPredefined);

// Bulk Import & Export
router.get('/template/:recordTypeId', requirePermission('records:read'), recordsController.getTemplate);
router.post('/import/:recordTypeId', requirePermission('records:create'), recordsController.bulkImport);
router.get('/export', requirePermission('records:read'), recordsController.bulkExport);

// Record Operations (CRUD)
router.get('/', requirePermission('records:read'), recordsController.getRecords);
router.get('/:id', requirePermission('records:read'), recordsController.getRecordById);
router.post('/', requirePermission('records:create'), recordsController.createRecord);
router.patch('/:id', requirePermission('records:update'), recordsController.updateRecord);
router.delete('/:id', requirePermission('records:delete'), recordsController.deleteRecord);

module.exports = router;

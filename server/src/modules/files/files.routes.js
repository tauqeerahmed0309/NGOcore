const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requireAnyPermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const upload = require('../../middleware/upload');
const { validateUploadedFile } = require('../../middleware/fileValidation');
const filesController = require('./files.controller');

const router = express.Router();

// Enforce auth, approved NGO status, and tenant scoping
router.use(requireAuth, requireNgoStatus('approved'), ngoScope);

// File Endpoints
router.post(
  '/upload',
  requireAnyPermission('files:create', 'records:create', 'records:update'),
  upload.single('file'),
  validateUploadedFile,
  filesController.uploadFile
);

router.get('/', requireAnyPermission('files:read', 'records:read'), filesController.getFiles);
router.get('/:id', requireAnyPermission('files:read', 'records:read'), filesController.getFileById);
router.delete('/:id', requireAnyPermission('files:delete', 'records:delete'), filesController.deleteFile);

module.exports = router;

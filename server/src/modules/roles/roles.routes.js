const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requirePermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const validate = require('../../middleware/validate');
const { createRoleSchema, updateRoleSchema } = require('./roles.validation');
const rolesController = require('./roles.controller');

const router = express.Router();

// Apply auth, status, and tenant isolation guards to all role routes
router.use(requireAuth);
router.use(requireNgoStatus('approved'));
router.use(ngoScope);

// Catalog of available permissions (any authenticated NGO staff can read)
router.get('/permissions/catalog', rolesController.getPermissionsCatalog);

// List all roles (requires read permission or roles:manage)
router.get('/', rolesController.getRoles);

// Get single role
router.get('/:roleId', rolesController.getRoleById);

// Create custom role (requires roles:manage)
router.post(
  '/',
  requirePermission('roles:manage'),
  validate(createRoleSchema),
  rolesController.createRole
);

// Update custom role (requires roles:manage)
router.patch(
  '/:roleId',
  requirePermission('roles:manage'),
  validate(updateRoleSchema),
  rolesController.updateRole
);

// Delete custom role (requires roles:manage)
router.delete(
  '/:roleId',
  requirePermission('roles:manage'),
  rolesController.deleteRole
);

module.exports = router;

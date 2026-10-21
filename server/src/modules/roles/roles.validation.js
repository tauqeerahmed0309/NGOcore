const { z } = require('zod');

const PERMISSIONS_CATALOG = [
  'records:create',
  'records:read',
  'records:update',
  'records:delete',
  'records:export',
  'files:upload',
  'files:read',
  'files:delete',
  'users:invite',
  'users:read',
  'users:update',
  'roles:manage',
  'settings:manage',
  'audit:read',
  'reports:generate',
  '*'
];

const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(50),
  description: z.string().max(250).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required')
});

const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(250).optional(),
  permissions: z.array(z.string()).min(1).optional()
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  PERMISSIONS_CATALOG
};

const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createDocumentSchema = z.object({
  documentNumber: z.string().trim().min(3).max(30).optional(),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  category: z
    .enum([
      'compliance_cert',
      'governance',
      'program_mou',
      'annual_report',
      'audit_report',
      'identity_proof',
      'policy',
      'other'
    ])
    .optional()
    .default('compliance_cert'),
  fileUrl: z.string().trim().min(1, 'File URL is required'),
  fileName: z.string().trim().min(1, 'File name is required'),
  fileSize: z.coerce.number().min(1, 'File size must be positive'),
  mimeType: z.string().trim().min(1, 'MIME type is required'),
  associatedEntityType: z
    .enum(['none', 'beneficiary', 'program', 'donor', 'volunteer', 'ngo_general'])
    .optional()
    .default('ngo_general'),
  associatedEntityId: z.string().regex(objectIdRegex, 'Invalid Entity ID format').optional().nullable(),
  status: z.enum(['active', 'expired', 'pending_verification', 'archived']).optional().default('active'),
  expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/)).optional().nullable(),
  tags: z.array(z.string().trim()).optional().default([]),
  description: z.string().trim().max(2000).optional().default('')
});

const updateDocumentSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200).optional(),
  category: z
    .enum([
      'compliance_cert',
      'governance',
      'program_mou',
      'annual_report',
      'audit_report',
      'identity_proof',
      'policy',
      'other'
    ])
    .optional(),
  associatedEntityType: z
    .enum(['none', 'beneficiary', 'program', 'donor', 'volunteer', 'ngo_general'])
    .optional(),
  associatedEntityId: z.string().regex(objectIdRegex, 'Invalid Entity ID format').optional().nullable(),
  status: z.enum(['active', 'expired', 'pending_verification', 'archived']).optional(),
  expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/)).optional().nullable(),
  tags: z.array(z.string().trim()).optional(),
  description: z.string().trim().max(2000).optional()
});

const verifyDocumentSchema = z.object({
  status: z.enum(['active', 'expired', 'pending_verification', 'archived']),
  verificationNotes: z.string().trim().max(500).optional()
});

const documentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  category: z
    .enum([
      'all',
      'compliance_cert',
      'governance',
      'program_mou',
      'annual_report',
      'audit_report',
      'identity_proof',
      'policy',
      'other'
    ])
    .optional()
    .default('all'),
  status: z.enum(['all', 'active', 'expired', 'pending_verification', 'archived']).optional().default('all'),
  associatedEntityType: z
    .enum(['all', 'none', 'beneficiary', 'program', 'donor', 'volunteer', 'ngo_general'])
    .optional()
    .default('all'),
  expiredOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
  sortBy: z.enum(['title', 'createdAt', 'expiryDate', 'documentNumber']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

module.exports = {
  createDocumentSchema,
  updateDocumentSchema,
  verifyDocumentSchema,
  documentQuerySchema
};

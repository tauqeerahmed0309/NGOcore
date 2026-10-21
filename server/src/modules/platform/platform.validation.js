const { z } = require('zod');

const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
};

const verify2FASchema = {
  body: z.object({
    tempToken: z.string().min(1, 'Temporary 2FA token is required'),
    totpCode: z.string().regex(/^\d{6}$/, 'TOTP code must be a 6-digit number')
  })
};

const getNgosQuerySchema = {
  query: z.object({
    status: z.enum(['unverified', 'pending', 'approved', 'rejected', 're-upload-required', 'suspended', 'all']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10)
  })
};

const getNgoParamsSchema = {
  params: z.object({
    ngoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid NGO ID format')
  })
};

const updateNgoStatusSchema = {
  params: z.object({
    ngoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid NGO ID format')
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected', 're-upload-required', 'suspended']),
    reason: z.string().max(1000).optional()
  }).refine((data) => {
    if (data.status !== 'approved' && (!data.reason || data.reason.trim().length === 0)) {
      return false;
    }
    return true;
  }, {
    message: 'A reason must be provided when rejecting, requesting re-upload, or suspending an NGO',
    path: ['reason']
  })
};

module.exports = {
  loginSchema,
  verify2FASchema,
  getNgosQuerySchema,
  getNgoParamsSchema,
  updateNgoStatusSchema
};

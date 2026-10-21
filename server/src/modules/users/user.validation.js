const { z } = require('zod');

const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character')
  })
};

const updateProfileSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z.string().max(25).optional(),
    designation: z.string().max(100).optional(),
    avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal(''))
  })
};

module.exports = {
  changePasswordSchema,
  updateProfileSchema
};

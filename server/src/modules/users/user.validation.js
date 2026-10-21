const { z } = require('zod');
const { INDIAN_PHONE_REGEX } = require('../../utils/format');

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
    phone: z.string()
      .refine(
        (val) => !val || INDIAN_PHONE_REGEX.test(val.replace(/[\s\-]/g, '')) || /^[0-9+\-\s()]{7,25}$/.test(val),
        { message: 'Enter a valid 10-digit Indian mobile number' }
      )
      .optional(),
    designation: z.string().max(100).optional(),
    avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal(''))
  })
};

module.exports = {
  changePasswordSchema,
  updateProfileSchema
};

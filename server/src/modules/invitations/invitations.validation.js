const { z } = require('zod');

const createInvitationSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid role ID format')
});

const acceptInvitationSchema = z.object({
  token: z.string().min(10, 'Invitation token is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

module.exports = {
  createInvitationSchema,
  acceptInvitationSchema
};

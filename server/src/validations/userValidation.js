const { z } = require('zod');

// Non-admin roles allowed for creation and editing
const allowedManagedRoles = ['staff', 'volunteer', 'student'];

const createUserSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .trim()
    .min(1, 'First name cannot be empty'),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .trim()
    .min(1, 'Last name cannot be empty'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  role: z.enum(allowedManagedRoles, {
    errorMap: () => ({
      message: 'Role must be one of: staff, volunteer, or student. Admin cannot be created via User Management.'
    })
  }),
  password: z.string().min(8, 'Password must be at least 8 characters long')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number').optional(),
  avatar: z.string().optional().default('')
}).strict().superRefine((user, context) => {
  if (user.role !== 'student' && !user.password) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password is required' });
  }
});

const updateUserSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .trim()
    .min(1, 'First name cannot be empty'),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .trim()
    .min(1, 'Last name cannot be empty'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  role: z.enum(allowedManagedRoles, {
    errorMap: () => ({
      message: 'Role must be one of: staff, volunteer, or student. Role cannot be set to admin.'
    })
  }),
  avatar: z.string().optional()
}).strict();

const updateStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive must be a boolean (true or false)' })
}).strict();

const userIdParamSchema = z.object({
  id: z
    .string({ required_error: 'User ID parameter is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format. Must be a valid 24-character hexadecimal ObjectId')
});

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  role: z.enum(['all', 'admin', 'staff', 'volunteer', 'student']).optional().default('all'),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  sortBy: z.enum(['createdAt', 'email', 'firstName', 'lastName', 'role', 'lastLogin']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  userIdParamSchema,
  listUsersQuerySchema,
  allowedManagedRoles
};

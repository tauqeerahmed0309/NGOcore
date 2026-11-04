const { z } = require('zod');

const allowedStatuses = ['active', 'graduated', 'transferred', 'inactive'];
const allowedGenders = ['male', 'female', 'other', 'prefer_not_to_say', ''];

// Helper to validate optional email (either valid email, empty string, or undefined)
const optionalEmailSchema = z
  .union([
    z.string().trim().email('Invalid email address format'),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null || val === '') return '';
    return val.toLowerCase();
  });

// Helper to validate optional ObjectId (24 hex string, null, empty, or undefined)
const optionalObjectIdSchema = z
  .union([
    z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID format. Must be a 24-character hexadecimal ObjectId'),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null || val === '') return null;
    return val;
  });

// Helper for dateOfBirth
const optionalDateSchema = z
  .union([
    z.string().trim(),
    z.date(),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (!val || val === '') return null;
    return new Date(val);
  });

const createStudentSchema = z
  .object({
    registrationNumber: z
      .string({ required_error: 'Registration number is required' })
      .trim()
      .min(1, 'Registration number cannot be empty')
      .toUpperCase(),
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(1, 'First name cannot be empty'),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(1, 'Last name cannot be empty'),
    userId: optionalObjectIdSchema,
    dateOfBirth: optionalDateSchema,
    gender: z
      .enum(allowedGenders, {
        errorMap: () => ({ message: 'Gender must be male, female, other, or prefer_not_to_say' })
      })
      .optional()
      .default(''),
    email: optionalEmailSchema.default(''),
    address: z.string().trim().optional().default(''),
    guardianName: z.string().trim().optional().default(''),
    guardianRelationship: z.string().trim().optional().default(''),
    educationLevel: z.string().trim().optional().default(''),
    schoolName: z.string().trim().optional().default(''),
    status: z
      .enum(allowedStatuses, {
        errorMap: () => ({ message: 'Status must be active, graduated, transferred, or inactive' })
      })
      .optional()
      .default('active'),
    notes: z.string().optional().default('')
  })
  .strict();

const updateStudentSchema = z
  .object({
    registrationNumber: z
      .string()
      .trim()
      .min(1, 'Registration number cannot be empty')
      .toUpperCase()
      .optional(),
    firstName: z.string().trim().min(1, 'First name cannot be empty').optional(),
    lastName: z.string().trim().min(1, 'Last name cannot be empty').optional(),
    userId: optionalObjectIdSchema,
    dateOfBirth: optionalDateSchema,
    gender: z
      .enum(allowedGenders, {
        errorMap: () => ({ message: 'Gender must be male, female, other, or prefer_not_to_say' })
      })
      .optional(),
    email: optionalEmailSchema,
    address: z.string().trim().optional(),
    guardianName: z.string().trim().optional(),
    guardianRelationship: z.string().trim().optional(),
    educationLevel: z.string().trim().optional(),
    schoolName: z.string().trim().optional(),
    status: z
      .enum(allowedStatuses, {
        errorMap: () => ({ message: 'Status must be active, graduated, transferred, or inactive' })
      })
      .optional(),
    notes: z.string().optional()
  })
  .strict();

const updateStudentStatusSchema = z
  .object({
    status: z.enum(allowedStatuses, {
      errorMap: () => ({
        message: 'Invalid status. Status must be one of: active, graduated, transferred, inactive'
      })
    })
  })
  .strict();

const studentIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Student ID parameter is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID format. Must be a 24-character hexadecimal ObjectId')
});

const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(['all', ...allowedStatuses]).optional().default('all'),
  gender: z.enum(['all', 'male', 'female', 'other', 'prefer_not_to_say']).optional().default('all'),
  sortBy: z
    .enum(['createdAt', 'registrationNumber', 'firstName', 'lastName', 'status', 'educationLevel', 'schoolName'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
  studentIdParamSchema,
  listStudentsQuerySchema,
  allowedStatuses,
  allowedGenders
};

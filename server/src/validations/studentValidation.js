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

// Helper for dateOfBirth with explicit Indian DD/MM/YYYY and ISO support, future check, and age plausibility
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
    if (val instanceof Date) return val;

    const str = String(val).trim();
    // Check DD/MM/YYYY or DD-MM-YYYY format
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (month < 1 || month > 12) throw new Error('Invalid month in date of birth');
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) throw new Error('Invalid day in date of birth');
      return new Date(Date.UTC(year, month - 1, day));
    }

    // Check ISO YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);
      if (month < 1 || month > 12) throw new Error('Invalid month in date of birth');
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) throw new Error('Invalid day in date of birth');
      return new Date(Date.UTC(year, month - 1, day));
    }

    const d = new Date(str);
    if (Number.isNaN(d.getTime())) throw new Error('Invalid date format for date of birth');
    return d;
  })
  .refine((date) => {
    if (!date) return true;
    return date <= new Date();
  }, {
    message: 'Date of birth cannot be in the future'
  })
  .refine((date) => {
    if (!date) return true;
    const age = (new Date() - date) / (365.25 * 24 * 3600 * 1000);
    return age <= 120;
  }, {
    message: 'Date of birth indicates an implausible age (> 120 years)'
  });

// Helper for Indian Phone validation & normalization (+91 XXXXX XXXXX)
const optionalPhoneSchema = z
  .union([
    z.string().trim(),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null || val === '') return '';
    return String(val).trim();
  })
  .refine((val) => {
    if (!val) return true;
    const cleaned = val.replace(/[\s\-\(\)\.]/g, '');
    if (!/^\+?[0-9]+$/.test(cleaned)) return false;
    let digits = cleaned;
    if (digits.startsWith('+91')) digits = digits.slice(3);
    else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
    else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    if (/^0+$/.test(digits)) return false;
    if (digits.length !== 10) return false;
    return /^[6-9]/.test(digits);
  }, {
    message: 'Phone number must be a valid 10-digit Indian mobile number starting with digits 6-9'
  })
  .transform((val) => {
    if (!val) return '';
    const cleaned = val.replace(/[\s\-\(\)\.]/g, '');
    let digits = cleaned;
    if (digits.startsWith('+91')) digits = digits.slice(3);
    else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
    else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  });

// Helper for Indian 6-digit PIN code validation
const optionalPinCodeSchema = z
  .union([
    z.string().trim(),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null || val === '') return '';
    return String(val).replace(/\s+/g, '');
  })
  .refine((val) => {
    if (!val) return true;
    return /^[1-8][0-9]{5}$/.test(val);
  }, {
    message: 'PIN code must be a valid 6-digit Indian postal code starting with digits 1-8'
  });

// Helper for Indian State
const optionalStateSchema = z
  .union([
    z.string().trim().max(100, 'State name cannot exceed 100 characters'),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null || val === '') return '';
    return String(val).trim();
  });

// Helper for optional strings (handles string, empty string, null, or undefined safely)
const optionalStringSchema = z
  .union([
    z.string().trim(),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null) return '';
    return String(val).trim();
  });

// Helper for optional gender (handles allowed genders, empty string, null, or undefined)
const optionalGenderSchema = z
  .union([
    z.enum(allowedGenders, {
      errorMap: () => ({ message: 'Gender must be male, female, other, or prefer_not_to_say' })
    }),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null) return '';
    return val;
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
    gender: optionalGenderSchema.default(''),
    email: optionalEmailSchema.default(''),
    phone: optionalPhoneSchema.default(''),
    address: optionalStringSchema.default(''),
    pinCode: optionalPinCodeSchema.default(''),
    state: optionalStateSchema.default(''),
    guardianName: optionalStringSchema.default(''),
    guardianRelationship: optionalStringSchema.default(''),
    educationLevel: optionalStringSchema.default(''),
    schoolName: optionalStringSchema.default(''),
    status: z
      .enum(allowedStatuses, {
        errorMap: () => ({ message: 'Status must be active, graduated, transferred, or inactive' })
      })
      .optional()
      .default('active'),
    notes: optionalStringSchema.default('')
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
    gender: optionalGenderSchema,
    email: optionalEmailSchema,
    phone: optionalPhoneSchema,
    address: optionalStringSchema,
    pinCode: optionalPinCodeSchema,
    state: optionalStateSchema,
    guardianName: optionalStringSchema,
    guardianRelationship: optionalStringSchema,
    educationLevel: optionalStringSchema,
    schoolName: optionalStringSchema,
    status: z
      .enum(allowedStatuses, {
        errorMap: () => ({ message: 'Status must be active, graduated, transferred, or inactive' })
      })
      .optional(),
    notes: optionalStringSchema
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

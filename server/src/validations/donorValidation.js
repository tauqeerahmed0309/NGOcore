const { z } = require('zod');

const allowedDonorTypes = ['individual', 'organization'];
const allowedDonorCategories = [
  'individual',
  'corporate',
  'foundation',
  'major_donor',
  'regular',
  'grant_maker',
  'patron',
  'other'
];
const allowedDonorStatuses = ['active', 'inactive', 'archived'];
const allowedPreferredChannels = ['email', 'phone', 'sms', 'whatsapp', 'postal', 'none'];

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
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  });

const optionalStringSchema = z
  .union([z.string().trim(), z.literal(''), z.null(), z.undefined()])
  .optional()
  .transform((val) => (val === undefined ? undefined : val === null ? '' : val));

const communicationPreferencesSchema = z
  .object({
    preferredChannel: z
      .enum(allowedPreferredChannels, {
        errorMap: () => ({ message: 'Invalid communication channel' })
      })
      .optional()
      .default('email'),
    optOut: z.boolean().optional().default(false),
    newsletter: z.boolean().optional().default(true)
  })
  .optional();

const createDonorSchema = z
  .object({
    donorNumber: z
      .string()
      .trim()
      .min(1, 'Donor ID cannot be empty')
      .toUpperCase()
      .optional(),
    name: z
      .string({ required_error: 'Donor name is required' })
      .trim()
      .min(1, 'Donor name is required'),
    type: z
      .enum(allowedDonorTypes, {
        errorMap: () => ({ message: 'Type must be one of: individual, organization' })
      })
      .optional()
      .default('individual'),
    contactPerson: optionalStringSchema,
    email: optionalEmailSchema,
    phone: optionalStringSchema,
    alternatePhone: optionalStringSchema,
    address: optionalStringSchema,
    city: optionalStringSchema,
    state: optionalStringSchema,
    pinCode: optionalStringSchema,
    country: optionalStringSchema,
    category: z
      .enum(allowedDonorCategories, {
        errorMap: () => ({
          message: 'Category must be one of: individual, corporate, foundation, major_donor, regular, grant_maker, other'
        })
      })
      .optional()
      .default('individual'),
    registrationDate: optionalDateSchema,
    communicationPreferences: communicationPreferencesSchema,
    status: z
      .enum(allowedDonorStatuses, {
        errorMap: () => ({ message: 'Status must be one of: active, inactive, archived' })
      })
      .optional()
      .default('active'),
    notes: optionalStringSchema
  });

const updateDonorSchema = z
  .object({
    donorNumber: z
      .string()
      .trim()
      .min(1, 'Donor ID cannot be empty')
      .toUpperCase()
      .optional(),
    name: z.string().trim().min(1, 'Donor name cannot be empty').optional(),
    type: z
      .enum(allowedDonorTypes, {
        errorMap: () => ({ message: 'Type must be one of: individual, organization' })
      })
      .optional(),
    contactPerson: optionalStringSchema,
    email: optionalEmailSchema,
    phone: optionalStringSchema,
    alternatePhone: optionalStringSchema,
    address: optionalStringSchema,
    city: optionalStringSchema,
    state: optionalStringSchema,
    pinCode: optionalStringSchema,
    country: optionalStringSchema,
    category: z
      .enum(allowedDonorCategories, {
        errorMap: () => ({
          message: 'Category must be one of: individual, corporate, foundation, major_donor, regular, grant_maker, other'
        })
      })
      .optional(),
    registrationDate: optionalDateSchema,
    communicationPreferences: communicationPreferencesSchema,
    status: z
      .enum(allowedDonorStatuses, {
        errorMap: () => ({ message: 'Status must be one of: active, inactive, archived' })
      })
      .optional(),
    notes: optionalStringSchema
  });

const updateDonorStatusSchema = z
  .object({
    status: z.enum(allowedDonorStatuses, {
      errorMap: () => ({ message: 'Invalid status. Must be one of: active, inactive, archived' })
    })
  })
  .strict();

const donorIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Donor ID parameter is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid donor ID format. Must be a 24-character hexadecimal ObjectId')
});

const listDonorsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10) || 10)) : 10)),
  search: z.string().optional().default(''),
  type: z.string().optional().default('all'),
  category: z.string().optional().default('all'),
  status: z.string().optional().default('all'),
  sortBy: z
    .enum(['name', 'donorNumber', 'createdAt', 'updatedAt', 'registrationDate'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

module.exports = {
  createDonorSchema,
  updateDonorSchema,
  updateDonorStatusSchema,
  donorIdParamSchema,
  listDonorsQuerySchema,
  allowedDonorTypes,
  allowedDonorCategories,
  allowedDonorStatuses
};

const { z } = require('zod');

const allowedProgramStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];

// Helper to validate optional ObjectId (24 hex string, null, empty string, or undefined)
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

// Helper for array of ObjectIds
const objectIdArraySchema = z
  .array(
    z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID format in assignment array')
  )
  .optional()
  .default([]);

// Helper for optional Date
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
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  });

// Helper for capacity (must be positive integer if provided)
const capacitySchema = z
  .union([
    z.number().int('Capacity must be an integer').positive('Capacity must be a positive integer'),
    z.string().trim().regex(/^[1-9]\d*$/, 'Capacity must be a positive integer').transform((v) => parseInt(v, 10)),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null || val === '') return null;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  });

// Schedule schema
const scheduleSchema = z
  .object({
    days: z.array(z.string().trim().toLowerCase()).optional().default([]),
    startTime: z.string().trim().optional().default(''),
    endTime: z.string().trim().optional().default(''),
    frequency: z.string().trim().optional().default('weekly')
  })
  .optional()
  .default({});

// Custom attributes schema (flexible record / object)
const customAttributesSchema = z
  .record(z.any())
  .optional()
  .default({});

// 1. Create Program Schema
const createProgramSchema = z
  .object({
    name: z
      .string({ required_error: 'Program name is required' })
      .trim()
      .min(1, 'Program name cannot be empty'),
    code: z
      .string({ required_error: 'Program code is required' })
      .trim()
      .min(1, 'Program code cannot be empty')
      .toUpperCase(),
    // Flexible string - NO restrictive enum
    type: z
      .string({ required_error: 'Program type is required' })
      .trim()
      .min(1, 'Program type cannot be empty')
      .toLowerCase(),
    category: z.string().trim().optional().default(''),
    description: z.string().trim().optional().default(''),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    schedule: scheduleSchema,
    location: z.string().trim().optional().default(''),
    coordinator: optionalObjectIdSchema,
    assignedStaff: objectIdArraySchema,
    assignedVolunteers: objectIdArraySchema,
    capacity: capacitySchema,
    status: z
      .enum(allowedProgramStatuses, {
        errorMap: () => ({
          message: 'Status must be one of: draft, active, paused, completed, cancelled'
        })
      })
      .optional()
      .default('active'),
    customAttributes: customAttributesSchema
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date cannot be before start date',
      path: ['endDate']
    }
  );

// 2. Update Program Schema
const updateProgramSchema = z
  .object({
    name: z.string().trim().min(1, 'Program name cannot be empty').optional(),
    code: z.string().trim().min(1, 'Program code cannot be empty').toUpperCase().optional(),
    type: z.string().trim().min(1, 'Program type cannot be empty').toLowerCase().optional(),
    category: z.string().trim().optional(),
    description: z.string().trim().optional(),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    schedule: scheduleSchema.optional(),
    location: z.string().trim().optional(),
    coordinator: optionalObjectIdSchema,
    assignedStaff: z.array(z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID format')).optional(),
    assignedVolunteers: z.array(z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID format')).optional(),
    capacity: capacitySchema,
    status: z
      .enum(allowedProgramStatuses, {
        errorMap: () => ({
          message: 'Status must be one of: draft, active, paused, completed, cancelled'
        })
      })
      .optional(),
    customAttributes: z.record(z.any()).optional()
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date cannot be before start date',
      path: ['endDate']
    }
  );

// 3. Update Program Status Schema
const updateProgramStatusSchema = z
  .object({
    status: z.enum(allowedProgramStatuses, {
      errorMap: () => ({
        message: 'Invalid status. Status must be one of: draft, active, paused, completed, cancelled'
      })
    })
  })
  .strict();

// 4. Program ID Param Schema
const programIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Program ID parameter is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid program ID format. Must be a 24-character hexadecimal ObjectId')
});

// 5. List Programs Query Schema
const listProgramsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  type: z.string().trim().optional().default('all'),
  category: z.string().trim().optional().default('all'),
  status: z.enum(['all', ...allowedProgramStatuses]).optional().default('all'),
  sortBy: z
    .enum(['createdAt', 'name', 'code', 'type', 'category', 'status', 'startDate', 'capacity'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

module.exports = {
  createProgramSchema,
  updateProgramSchema,
  updateProgramStatusSchema,
  programIdParamSchema,
  listProgramsQuerySchema,
  allowedProgramStatuses
};

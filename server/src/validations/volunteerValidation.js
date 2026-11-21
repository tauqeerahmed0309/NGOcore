const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createVolunteerSchema = z.object({
  volunteerNumber: z.string().trim().min(3).max(30).optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  phone: z.string().trim().max(30).optional(),
  userId: z.string().regex(objectIdRegex, 'Invalid User ID format').optional().nullable(),
  skills: z.array(z.string().trim().max(50)).optional().default([]),
  availability: z.enum(['weekdays', 'weekends', 'flexible', 'full_time', 'evenings']).optional().default('flexible'),
  status: z.enum(['active', 'inactive', 'on_leave', 'pending_approval']).optional().default('active'),
  address: z
    .object({
      street: z.string().trim().max(200).optional(),
      city: z.string().trim().max(100).optional(),
      state: z.string().trim().max(100).optional(),
      postalCode: z.string().trim().max(20).optional()
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100).optional(),
      phone: z.string().trim().max(30).optional(),
      relationship: z.string().trim().max(50).optional()
    })
    .optional(),
  joinedDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  assignedPrograms: z.array(z.string().regex(objectIdRegex, 'Invalid Program ID format')).optional().default([]),
  notes: z.string().trim().max(2000).optional()
});

const updateVolunteerSchema = createVolunteerSchema.partial();

const logHoursSchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  programId: z.string().regex(objectIdRegex, 'Invalid Program ID format').optional().nullable(),
  hours: z.number().min(0.25, 'Hours must be at least 0.25 (15 minutes)').max(24, 'Cannot log more than 24 hours per entry'),
  activityDescription: z.string().trim().min(3, 'Activity description must be at least 3 characters').max(1000)
});

const reviewHoursSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().trim().max(500).optional()
  })
  .superRefine((val, ctx) => {
    if (val.status === 'rejected' && (!val.rejectionReason || val.rejectionReason.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejectionReason'],
        message: 'A rejection reason (at least 3 characters) is required when rejecting volunteer hours.'
      });
    }
  });

const volunteerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  status: z.enum(['all', 'active', 'inactive', 'on_leave', 'pending_approval']).optional().default('all'),
  availability: z.enum(['all', 'weekdays', 'weekends', 'flexible', 'full_time', 'evenings']).optional().default('all'),
  skill: z.string().trim().optional(),
  programId: z.string().regex(objectIdRegex, 'Invalid Program ID format').optional(),
  sortBy: z.enum(['name', 'volunteerNumber', 'totalApprovedHours', 'joinedDate', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeArchived: z.coerce.boolean().optional().default(false)
});

module.exports = {
  createVolunteerSchema,
  updateVolunteerSchema,
  logHoursSchema,
  reviewHoursSchema,
  volunteerQuerySchema
};

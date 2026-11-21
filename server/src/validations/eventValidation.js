const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const venueSchema = z.object({
  name: z.string().trim().max(150).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
  city: z.string().trim().max(100).optional().default(''),
  state: z.string().trim().max(100).optional().default(''),
  postalCode: z.string().trim().max(20).optional().default(''),
  virtualLink: z.string().trim().url('Invalid virtual meeting URL').or(z.literal('')).optional().default('')
});

const createEventSchema = z.object({
  eventNumber: z.string().trim().min(3).max(30).optional(),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().max(3000).optional().default(''),
  category: z
    .enum([
      'workshop',
      'health_camp',
      'fundraiser',
      'distribution',
      'training',
      'community_outreach',
      'meeting',
      'other'
    ])
    .optional()
    .default('workshop'),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/)),
  venue: venueSchema.optional().default({}),
  programId: z.string().regex(objectIdRegex, 'Invalid Program ID format').optional().nullable(),
  coordinatorId: z.string().regex(objectIdRegex, 'Invalid Coordinator ID format').optional().nullable(),
  assignedVolunteers: z.array(z.string().regex(objectIdRegex, 'Invalid Volunteer ID')).optional().default([]),
  capacity: z.coerce.number().int().min(0, 'Capacity cannot be negative').optional().nullable(),
  budget: z.coerce.number().min(0).optional().default(0),
  actualExpenses: z.coerce.number().min(0).optional().default(0),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional().default('scheduled'),
  notes: z.string().trim().max(2000).optional().default('')
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: 'End date must be equal to or after start date',
    path: ['endDate']
  }
);

const updateEventSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200).optional(),
  description: z.string().trim().max(3000).optional(),
  category: z
    .enum([
      'workshop',
      'health_camp',
      'fundraiser',
      'distribution',
      'training',
      'community_outreach',
      'meeting',
      'other'
    ])
    .optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/)).optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/)).optional(),
  venue: venueSchema.optional(),
  programId: z.string().regex(objectIdRegex, 'Invalid Program ID format').optional().nullable(),
  coordinatorId: z.string().regex(objectIdRegex, 'Invalid Coordinator ID format').optional().nullable(),
  assignedVolunteers: z.array(z.string().regex(objectIdRegex, 'Invalid Volunteer ID')).optional(),
  capacity: z.coerce.number().int().min(0).optional().nullable(),
  budget: z.coerce.number().min(0).optional(),
  actualExpenses: z.coerce.number().min(0).optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
  notes: z.string().trim().max(2000).optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: 'End date must be equal to or after start date',
    path: ['endDate']
  }
);

const registerAttendeeSchema = z.object({
  name: z.string().trim().min(2, 'Attendee name must be at least 2 characters').max(120),
  email: z.string().trim().email('Invalid email address').or(z.literal('')).optional().default(''),
  phone: z.string().trim().max(30).optional().default('')
});

const eventQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  status: z.enum(['all', 'scheduled', 'ongoing', 'completed', 'cancelled']).optional().default('all'),
  category: z
    .enum([
      'all',
      'workshop',
      'health_camp',
      'fundraiser',
      'distribution',
      'training',
      'community_outreach',
      'meeting',
      'other'
    ])
    .optional()
    .default('all'),
  programId: z.string().regex(objectIdRegex).optional(),
  coordinatorId: z.string().regex(objectIdRegex).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['startDate', 'createdAt', 'title', 'capacity', 'eventNumber']).optional().default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

module.exports = {
  createEventSchema,
  updateEventSchema,
  registerAttendeeSchema,
  eventQuerySchema
};

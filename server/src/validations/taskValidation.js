const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const checklistItemSchema = z.object({
  text: z.string().trim().min(1, 'Checklist item text cannot be empty').max(300),
  isCompleted: z.boolean().optional().default(false)
});

const createTaskSchema = z.object({
  taskNumber: z.string().trim().min(3).max(30).optional(),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().max(2000).optional().default(''),
  category: z
    .enum([
      'program_ops',
      'fundraising',
      'field_work',
      'administrative',
      'logistics',
      'compliance',
      'beneficiary_support',
      'other'
    ])
    .optional()
    .default('program_ops'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  status: z.enum(['todo', 'in_progress', 'review', 'completed', 'cancelled']).optional().default('todo'),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid User ID format').optional().nullable(),
  assignedVolunteerId: z.string().regex(objectIdRegex, 'Invalid Volunteer ID format').optional().nullable(),
  programId: z.string().regex(objectIdRegex, 'Invalid Program ID format').optional().nullable(),
  checklist: z.array(checklistItemSchema).optional().default([]),
  completionNotes: z.string().trim().max(1000).optional()
});

const updateTaskSchema = createTaskSchema.partial();

const updateTaskStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'review', 'completed', 'cancelled']),
  completionNotes: z.string().trim().max(1000).optional()
});

const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  status: z.enum(['all', 'todo', 'in_progress', 'review', 'completed', 'cancelled']).optional().default('all'),
  priority: z.enum(['all', 'low', 'medium', 'high', 'urgent']).optional().default('all'),
  category: z
    .enum([
      'all',
      'program_ops',
      'fundraising',
      'field_work',
      'administrative',
      'logistics',
      'compliance',
      'beneficiary_support',
      'other'
    ])
    .optional()
    .default('all'),
  assignedTo: z.string().regex(objectIdRegex).optional(),
  programId: z.string().regex(objectIdRegex).optional(),
  sortBy: z.enum(['dueDate', 'priority', 'taskNumber', 'title', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeArchived: z.coerce.boolean().optional().default(false)
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskQuerySchema
};

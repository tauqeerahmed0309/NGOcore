const { z } = require('zod');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Date must be a valid calendar date.');

const exportFormat = z.enum(['json', 'csv', 'xlsx', 'pdf']).default('json');

const beneficiaryReportQuerySchema = z.object({
  status: z.enum(['all', 'active', 'graduated', 'transferred', 'inactive']).default('all'),
  from: isoDate.optional(),
  to: isoDate.optional(),
  format: exportFormat,
  search: z.string().trim().max(100).optional().default(''),
  limit: z.coerce.number().int().min(1).max(5000).default(100)
}).strict().refine(({ from, to }) => {
  if (from && to) return from <= to;
  return true;
}, {
  message: 'The start date must be on or before the end date.',
  path: ['from']
});

const programReportQuerySchema = z.object({
  status: z.enum(['all', 'draft', 'active', 'paused', 'completed', 'cancelled']).default('all'),
  type: z.string().trim().max(50).optional().default(''),
  from: isoDate.optional(),
  to: isoDate.optional(),
  format: exportFormat,
  search: z.string().trim().max(100).optional().default(''),
  limit: z.coerce.number().int().min(1).max(5000).default(100)
}).strict().refine(({ from, to }) => {
  if (from && to) return from <= to;
  return true;
}, {
  message: 'The start date must be on or before the end date.',
  path: ['from']
});

const orgSummaryQuerySchema = z.object({
  format: exportFormat
}).strict();

module.exports = {
  beneficiaryReportQuerySchema,
  programReportQuerySchema,
  orgSummaryQuerySchema
};


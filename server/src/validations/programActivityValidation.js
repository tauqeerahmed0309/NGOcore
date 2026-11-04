const { z } = require('zod');

const programId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid program ID.');
const studentId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID.');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Date must be a valid calendar date.');

const programIdParamSchema = z.object({ id: programId });
const enrollmentParamsSchema = z.object({ id: programId, studentId });
const enrollmentSchema = z.object({ studentId }).strict();
const sessionDateQuerySchema = z.object({ date: isoDate });
const enrollmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100)
}).strict();
const attendanceSchema = z.object({
  date: isoDate,
  entries: z.array(z.object({
    studentId,
    status: z.enum(['present', 'absent', 'excused']),
    note: z.string().trim().max(300).optional().default('')
  }).strict()).max(1000)
}).strict();
const enrollmentStatusSchema = z.object({
  status: z.enum(['completed', 'withdrawn'])
}).strict();
const participationReportQuerySchema = z.object({
  from: isoDate,
  to: isoDate
}).strict().refine(({ from, to }) => from <= to, {
  message: 'The report start date must be on or before the end date.',
  path: ['from']
});

module.exports = {
  programIdParamSchema,
  enrollmentParamsSchema,
  enrollmentSchema,
  sessionDateQuerySchema,
  enrollmentListQuerySchema,
  attendanceSchema,
  enrollmentStatusSchema,
  participationReportQuerySchema
};

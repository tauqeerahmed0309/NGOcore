const { z } = require('zod');

const cleanReviewSchema = z.object({
  recordId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  issueType: z.enum(['possible_duplicate', 'missing_required', 'inconsistent_format', 'invalid_value']),
  field: z.string().max(40).optional().default(''),
  relatedRecordId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  decision: z.enum(['accept', 'reject']),
  proposedValue: z.string().max(200).optional()
}).strict();

const explainFindingRequestSchema = z.object({
  issueType: z.enum(['missing_required', 'inconsistent_format', 'invalid_value', 'possible_duplicate']),
  field: z.string().max(50).optional().default(''),
  currentValue: z.string().max(200).optional().default(''),
  suggestedValue: z.string().max(200).optional().nullable()
}).strict();

const explainDuplicateRequestSchema = z.object({
  score: z.number().min(0).max(1).optional().default(0.85),
  reason: z.string().max(200).optional().default('Algorithmic blocking and phonetic match'),
  matchedFields: z.array(z.string().max(50)).max(10).optional().default([]),
  recordLabel: z.string().max(100).optional().default('Record #1'),
  relatedRecordLabel: z.string().max(100).optional().default('Record #2')
}).strict();

const normalizeTextRequestSchema = z.object({
  text: z.string().min(1, 'Text to normalize is required').max(200, 'Text must be at most 200 characters'),
  fieldType: z.enum(['city', 'state', 'course_category', 'organization_name', 'department', 'general_text']).optional().default('general_text')
}).strict();

module.exports = {
  cleanReviewSchema,
  explainFindingRequestSchema,
  explainDuplicateRequestSchema,
  normalizeTextRequestSchema
};

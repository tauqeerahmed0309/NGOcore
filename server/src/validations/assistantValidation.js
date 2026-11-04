const { z } = require('zod');

const cleanReviewSchema = z.object({
  recordId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  issueType: z.enum(['possible_duplicate', 'missing_required', 'inconsistent_format']),
  field: z.string().max(40).optional().default(''),
  relatedRecordId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  decision: z.enum(['accept', 'reject']),
  proposedValue: z.string().max(200).optional()
}).strict();

module.exports = { cleanReviewSchema };

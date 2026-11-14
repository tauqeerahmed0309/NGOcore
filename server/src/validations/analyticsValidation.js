const { z } = require('zod');

const dashboardAnalyticsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
  timezone: z.string().trim().max(50).default('UTC')
}).strict();

module.exports = {
  dashboardAnalyticsQuerySchema
};

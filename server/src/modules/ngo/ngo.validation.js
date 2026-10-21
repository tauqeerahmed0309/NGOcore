const { z } = require('zod');

const updateNgoProfileSchema = {
  body: z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters').max(100).optional(),
    type: z.string().max(50).optional(),
    registrationNumber: z.string().max(50).optional(),
    address: z.string().max(300).optional(),
    contactPhone: z.string().max(25).optional(),
    website: z.string().url('Invalid website URL format').optional().or(z.literal('')),
    description: z.string().max(1000).optional(),
    logoUrl: z.string().url('Invalid logo URL format').optional().or(z.literal(''))
  })
};

const updateNgoSettingsSchema = {
  body: z.object({
    currency: z.string().min(2).max(10).optional(),
    timezone: z.string().max(50).optional(),
    dateFormat: z.enum(['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']).optional(),
    retentionDays: z.number().int().min(30).max(7300).optional(),
    require2FA: z.boolean().optional(),
    sessionTimeoutMinutes: z.number().int().min(15).max(1440).optional(),
    emailNotifications: z.object({
      notifyOnNewMember: z.boolean().optional(),
      notifyOnRecordExport: z.boolean().optional(),
      notifyOnSecurityAlert: z.boolean().optional()
    }).optional()
  })
};

module.exports = {
  updateNgoProfileSchema,
  updateNgoSettingsSchema
};

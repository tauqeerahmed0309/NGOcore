const { z } = require('zod');
const {
  INDIAN_PHONE_REGEX,
  INDIAN_PAN_REGEX,
  INDIAN_PINCODE_REGEX,
  INDIAN_GSTIN_REGEX
} = require('../../utils/format');

const updateNgoProfileSchema = {
  body: z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters').max(100).optional(),
    type: z.string().max(100).optional(),
    registrationType: z.string().max(100).optional(),
    registrationNumber: z.string().max(50).optional(),
    registrationYear: z.union([z.number().int().min(1800).max(2100), z.string()]).optional(),
    pan: z.string()
      .regex(INDIAN_PAN_REGEX, 'Invalid PAN format. Must be 5 uppercase letters, 4 digits, 1 letter (e.g. AABCT1234F)')
      .optional()
      .or(z.literal('')),
    registration12A: z.string().max(100).optional().or(z.literal('')),
    registration80G: z.string().max(100).optional().or(z.literal('')),
    fcraNumber: z.string().max(50).optional().or(z.literal('')),
    ngoDarpanId: z.string().max(50).optional().or(z.literal('')),
    csr1Number: z.string().max(50).optional().or(z.literal('')),
    gstin: z.string()
      .regex(INDIAN_GSTIN_REGEX, 'Invalid 15-digit GSTIN format')
      .optional()
      .or(z.literal('')),
    address: z.string().max(500).optional(),
    addressLine1: z.string().max(200).optional(),
    addressLine2: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    district: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pincode: z.string()
      .regex(INDIAN_PINCODE_REGEX, 'Invalid 6-digit Indian PIN code')
      .optional()
      .or(z.literal('')),
    country: z.string().max(50).optional(),
    contactPhone: z.string()
      .refine(
        (val) => !val || INDIAN_PHONE_REGEX.test(val.replace(/[\s\-]/g, '')) || /^[0-9+\-\s()]{7,25}$/.test(val),
        { message: 'Enter a valid 10-digit Indian mobile number' }
      )
      .optional(),
    website: z.string().url('Invalid website URL format').optional().or(z.literal('')),
    description: z.string().max(2000).optional(),
    logoUrl: z.string().url('Invalid logo URL format').optional().or(z.literal(''))
  })
};

const updateNgoSettingsSchema = {
  body: z.object({
    currency: z.string().min(2).max(10).optional().default('INR'),
    timezone: z.string().max(50).optional().default('Asia/Kolkata'),
    dateFormat: z.enum(['DD/MM/YYYY', 'YYYY-MM-DD']).optional().default('DD/MM/YYYY'),
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

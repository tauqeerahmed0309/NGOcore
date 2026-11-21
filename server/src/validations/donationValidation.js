const { z } = require('zod');

const allowedCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD'];
const allowedPaymentMethods = ['cash', 'bank_transfer', 'upi', 'cheque', 'card', 'online', 'other'];
const allowedDonationTypes = ['monetary', 'in_kind'];
const allowedCategories = [
  'general',
  'education',
  'healthcare',
  'disaster_relief',
  'corpus',
  'infrastructure',
  'women_empowerment',
  'child_welfare',
  'environment',
  'other'
];
const allowedStatuses = ['pending', 'verified', 'approved', 'cancelled', 'reversed'];

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates that a positive number has at most 2 decimal places.
 * Rejects values like 199.999, 12.3456, 0.004 while accepting 0.10, 0.20, 0.30, 199.99, 1000000.01.
 */
const hasMaxTwoDecimals = (val) => {
  if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) return false;
  const str = val.toString();
  if (str.includes('e') || str.includes('E')) {
    const cents = val * 100;
    return Math.abs(Math.round(cents) - cents) < 1e-9;
  }
  if (str.includes('.')) {
    const decimals = str.split('.')[1];
    if (decimals && decimals.length > 2) return false;
  }
  const cents = val * 100;
  return Math.abs(Math.round(cents) - cents) < 1e-9;
};

const monetaryAmountSchema = z
  .number({ required_error: 'Donation amount is required' })
  .positive('Donation amount must be strictly positive')
  .refine(hasMaxTwoDecimals, {
    message: 'Donation amount cannot have more than 2 decimal places'
  })
  .transform((val) => Math.round(Number(val) * 100) / 100);

const optionalStringSchema = z
  .union([z.string().trim(), z.literal(''), z.null(), z.undefined()])
  .optional()
  .transform((val) => (val === undefined ? undefined : val === null ? '' : val));

const optionalDateSchema = z
  .union([z.string().trim(), z.date(), z.literal(''), z.null(), z.undefined()])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (!val || val === '') return null;
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  });

const donationIdParamSchema = z.object({
  id: z.string().trim().regex(objectIdRegex, 'Invalid donation ID format. Expected 24-character hexadecimal string.')
});

const createDonationSchema = z
  .object({
    donationNumber: z
      .string()
      .trim()
      .min(1, 'Donation number cannot be empty')
      .toUpperCase()
      .optional(),
    donorId: z
      .string()
      .trim()
      .regex(objectIdRegex, 'Invalid donor ID format')
      .optional()
      .nullable(),
    donorSnapshot: z
      .object({
        name: z.string({ required_error: 'Donor name is required' }).trim().min(1, 'Donor name is required'),
        email: optionalStringSchema,
        phone: optionalStringSchema,
        donorNumber: optionalStringSchema,
        type: z.enum(['individual', 'organization']).optional().default('individual')
      })
      .optional(),
    // Fallback: direct donorName if snapshot not provided
    donorName: z.string().trim().min(1, 'Donor name is required').optional(),
    donationType: z
      .enum(allowedDonationTypes, {
        errorMap: () => ({ message: 'Donation type must be monetary or in_kind' })
      })
      .optional()
      .default('monetary'),
    amount: monetaryAmountSchema,
    currency: z
      .enum(allowedCurrencies, {
        errorMap: () => ({ message: `Supported currencies: ${allowedCurrencies.join(', ')}` })
      })
      .optional()
      .default('INR'),
    inKindDescription: optionalStringSchema,
    donationDate: optionalDateSchema,
    paymentMethod: z.enum(allowedPaymentMethods, {
      errorMap: () => ({ message: `Supported payment methods: ${allowedPaymentMethods.join(', ')}` })
    }),
    transactionReference: optionalStringSchema,
    category: z
      .enum(allowedCategories, {
        errorMap: () => ({ message: `Supported categories: ${allowedCategories.join(', ')}` })
      })
      .optional()
      .default('general'),
    purpose: optionalStringSchema,
    programId: z
      .string()
      .trim()
      .regex(objectIdRegex, 'Invalid program ID format')
      .optional()
      .nullable(),
    notes: optionalStringSchema
  })
  .refine(
    (data) => {
      // Must have either donorId or donorSnapshot.name or donorName
      return Boolean(data.donorId || data.donorSnapshot?.name || data.donorName);
    },
    {
      message: 'Either an existing donorId or donor name must be specified',
      path: ['donorName']
    }
  );

const updateDonationSchema = z.object({
  donorId: z.string().trim().regex(objectIdRegex, 'Invalid donor ID format').optional().nullable(),
  donorSnapshot: z
    .object({
      name: z.string().trim().min(1, 'Donor name is required'),
      email: optionalStringSchema,
      phone: optionalStringSchema,
      donorNumber: optionalStringSchema,
      type: z.enum(['individual', 'organization']).optional()
    })
    .optional(),
  donorName: z.string().trim().min(1).optional(),
  donationType: z.enum(allowedDonationTypes).optional(),
  amount: z
    .number()
    .positive('Donation amount must be positive')
    .refine(hasMaxTwoDecimals, {
      message: 'Donation amount cannot have more than 2 decimal places'
    })
    .transform((val) => Math.round(Number(val) * 100) / 100)
    .optional(),
  currency: z.enum(allowedCurrencies).optional(),
  inKindDescription: optionalStringSchema,
  donationDate: optionalDateSchema,
  paymentMethod: z.enum(allowedPaymentMethods).optional(),
  transactionReference: optionalStringSchema,
  category: z.enum(allowedCategories).optional(),
  purpose: optionalStringSchema,
  programId: z.string().trim().regex(objectIdRegex, 'Invalid program ID format').optional().nullable(),
  notes: optionalStringSchema
});

const reverseDonationSchema = z.object({
  reason: z
    .string({ required_error: 'Reversal or cancellation reason is required' })
    .trim()
    .min(5, 'Reversal reason must be at least 5 characters long')
});

const listDonationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: optionalStringSchema,
  donorId: optionalStringSchema,
  programId: optionalStringSchema,
  paymentMethod: optionalStringSchema,
  category: optionalStringSchema,
  status: optionalStringSchema,
  currency: optionalStringSchema,
  dateFrom: optionalStringSchema,
  dateTo: optionalStringSchema,
  sortBy: z.enum(['donationDate', 'amount', 'donationNumber', 'createdAt']).optional().default('donationDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  format: z.enum(['csv', 'xlsx', 'pdf']).optional()
});

module.exports = {
  allowedCurrencies,
  allowedPaymentMethods,
  allowedDonationTypes,
  allowedCategories,
  allowedStatuses,
  hasMaxTwoDecimals,
  monetaryAmountSchema,
  donationIdParamSchema,
  createDonationSchema,
  updateDonationSchema,
  reverseDonationSchema,
  listDonationsQuerySchema
};

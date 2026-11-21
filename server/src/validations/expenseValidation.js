const { z } = require('zod');

const allowedCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD'];
const allowedPaymentMethods = ['cash', 'bank_transfer', 'upi', 'cheque', 'card', 'online', 'other'];
const allowedExpenseCategories = [
  'programme',
  'operational',
  'travel',
  'food',
  'medical',
  'education',
  'supplies',
  'salaries',
  'other'
];
const allowedExpenseStatuses = ['pending', 'approved', 'rejected'];

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
  .number({ required_error: 'Expense amount is required' })
  .positive('Expense amount must be strictly positive')
  .refine(hasMaxTwoDecimals, {
    message: 'Expense amount cannot have more than 2 decimal places'
  })
  .transform((val) => Math.round(Number(val) * 100) / 100);

const updateMonetaryAmountSchema = z
  .number()
  .positive('Expense amount must be positive')
  .refine(hasMaxTwoDecimals, {
    message: 'Expense amount cannot have more than 2 decimal places'
  })
  .transform((val) => Math.round(Number(val) * 100) / 100)
  .optional();

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

const expenseIdParamSchema = z.object({
  id: z.string().trim().regex(objectIdRegex, 'Invalid expense ID format. Expected 24-character hexadecimal string.')
});

const createExpenseSchema = z.object({
  expenseNumber: z
    .string()
    .trim()
    .min(1, 'Expense number cannot be empty')
    .toUpperCase()
    .optional(),
  title: z
    .string({ required_error: 'Expense title is required' })
    .trim()
    .min(1, 'Expense title cannot be empty')
    .max(250, 'Title cannot exceed 250 characters'),
  description: optionalStringSchema,
  amount: monetaryAmountSchema,
  currency: z
    .enum(allowedCurrencies, {
      errorMap: () => ({ message: `Supported currencies: ${allowedCurrencies.join(', ')}` })
    })
    .optional()
    .default('INR'),
  category: z
    .enum(allowedExpenseCategories, {
      errorMap: () => ({ message: `Supported categories: ${allowedExpenseCategories.join(', ')}` })
    })
    .optional()
    .default('operational'),
  expenseDate: optionalDateSchema,
  paymentMethod: z
    .enum(allowedPaymentMethods, {
      errorMap: () => ({ message: `Supported payment methods: ${allowedPaymentMethods.join(', ')}` })
    })
    .optional()
    .default('cash'),
  vendor: optionalStringSchema,
  transactionReference: optionalStringSchema,
  programId: z
    .string()
    .trim()
    .regex(objectIdRegex, 'Invalid program ID format')
    .optional()
    .nullable(),
  receiptUrl: optionalStringSchema,
  status: z
    .enum(allowedExpenseStatuses, {
      errorMap: () => ({ message: `Supported statuses: ${allowedExpenseStatuses.join(', ')}` })
    })
    .optional()
    .default('approved'),
  notes: optionalStringSchema
});

const updateExpenseSchema = z.object({
  title: z.string().trim().min(1, 'Expense title cannot be empty').max(250).optional(),
  description: optionalStringSchema,
  amount: updateMonetaryAmountSchema,
  currency: z.enum(allowedCurrencies).optional(),
  category: z.enum(allowedExpenseCategories).optional(),
  expenseDate: optionalDateSchema,
  paymentMethod: z.enum(allowedPaymentMethods).optional(),
  vendor: optionalStringSchema,
  transactionReference: optionalStringSchema,
  programId: z.string().trim().regex(objectIdRegex, 'Invalid program ID format').optional().nullable(),
  receiptUrl: optionalStringSchema,
  status: z.enum(allowedExpenseStatuses).optional(),
  notes: optionalStringSchema
});

const rejectExpenseSchema = z.object({
  reason: z
    .string({ required_error: 'Rejection reason is required' })
    .trim()
    .min(5, 'Rejection reason must be at least 5 characters long')
});

const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: optionalStringSchema,
  category: optionalStringSchema,
  paymentMethod: optionalStringSchema,
  status: optionalStringSchema,
  currency: optionalStringSchema,
  programId: optionalStringSchema,
  dateFrom: optionalStringSchema,
  dateTo: optionalStringSchema,
  sortBy: z.enum(['expenseDate', 'amount', 'expenseNumber', 'createdAt']).optional().default('expenseDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  format: z.enum(['csv', 'xlsx', 'pdf']).optional()
});

module.exports = {
  allowedCurrencies,
  allowedPaymentMethods,
  allowedExpenseCategories,
  allowedExpenseStatuses,
  hasMaxTwoDecimals,
  monetaryAmountSchema,
  expenseIdParamSchema,
  createExpenseSchema,
  updateExpenseSchema,
  rejectExpenseSchema,
  listExpensesQuerySchema
};

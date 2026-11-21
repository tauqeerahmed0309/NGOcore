const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const storageLocationSchema = z.object({
  building: z.string().trim().max(100).optional().default(''),
  room: z.string().trim().max(100).optional().default(''),
  shelf: z.string().trim().max(100).optional().default('')
});

const createInventoryItemSchema = z.object({
  itemCode: z.string().trim().min(3).max(30).optional(),
  name: z.string().trim().min(2, 'Item name must be at least 2 characters').max(150),
  category: z
    .enum([
      'educational_materials',
      'food_rations',
      'medical_kits',
      'clothing',
      'electronics',
      'furniture',
      'general'
    ])
    .optional()
    .default('general'),
  initialQuantity: z.coerce.number().min(0, 'Initial quantity cannot be negative').optional().default(0),
  unitOfMeasure: z
    .enum(['units', 'kg', 'liters', 'boxes', 'kits', 'packets', 'pieces', 'meters', 'sets'])
    .optional()
    .default('units'),
  minThreshold: z.coerce.number().min(0, 'Minimum threshold cannot be negative').optional().default(5),
  unitCost: z.coerce.number().min(0, 'Unit cost cannot be negative').optional().default(0),
  storageLocation: storageLocationSchema.optional().default({}),
  description: z.string().trim().max(1500).optional().default('')
});

const updateInventoryItemSchema = z.object({
  name: z.string().trim().min(2, 'Item name must be at least 2 characters').max(150).optional(),
  category: z
    .enum([
      'educational_materials',
      'food_rations',
      'medical_kits',
      'clothing',
      'electronics',
      'furniture',
      'general'
    ])
    .optional(),
  unitOfMeasure: z
    .enum(['units', 'kg', 'liters', 'boxes', 'kits', 'packets', 'pieces', 'meters', 'sets'])
    .optional(),
  minThreshold: z.coerce.number().min(0).optional(),
  unitCost: z.coerce.number().min(0).optional(),
  storageLocation: storageLocationSchema.optional(),
  description: z.string().trim().max(1500).optional()
});

const stockTransactionSchema = z.object({
  type: z.enum(['inflow', 'outflow', 'adjustment']),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  reason: z.string().trim().min(2, 'Reason must be at least 2 characters').max(300),
  programId: z.string().regex(objectIdRegex, 'Invalid Program ID format').optional().nullable(),
  recipientName: z.string().trim().max(150).optional().default(''),
  donorId: z.string().regex(objectIdRegex, 'Invalid Donor ID format').optional().nullable(),
  notes: z.string().trim().max(1000).optional().default('')
});

const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  category: z
    .enum([
      'all',
      'educational_materials',
      'food_rations',
      'medical_kits',
      'clothing',
      'electronics',
      'furniture',
      'general'
    ])
    .optional()
    .default('all'),
  lowStockOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
  sortBy: z.enum(['name', 'itemCode', 'quantityOnHand', 'unitCost', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

module.exports = {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  stockTransactionSchema,
  inventoryQuerySchema
};

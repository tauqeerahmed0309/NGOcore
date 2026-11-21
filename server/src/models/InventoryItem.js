const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  transactionNumber: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['inflow', 'outflow', 'adjustment'],
    required: [true, 'Transaction type is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Transaction quantity is required'],
    min: [0.001, 'Quantity must be greater than zero']
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: [true, 'Transaction reason is required'],
    trim: true,
    maxlength: 300
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    default: null
  },
  recipientName: {
    type: String,
    trim: true,
    default: ''
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    default: null
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    default: '',
    maxlength: 1000
  }
});

const storageLocationSchema = new mongoose.Schema(
  {
    building: { type: String, trim: true, default: '' },
    room: { type: String, trim: true, default: '' },
    shelf: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const inventoryItemSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: [true, 'NGO reference is required'],
      index: true
    },
    itemCode: {
      type: String,
      required: [true, 'Item code is required'],
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: [2, 'Item name must be at least 2 characters'],
      maxlength: [150, 'Item name cannot exceed 150 characters']
    },
    category: {
      type: String,
      enum: [
        'educational_materials',
        'food_rations',
        'medical_kits',
        'clothing',
        'electronics',
        'furniture',
        'general'
      ],
      default: 'general',
      index: true
    },
    quantityOnHand: {
      type: Number,
      required: true,
      min: [0, 'Quantity on hand cannot be negative'],
      default: 0
    },
    unitOfMeasure: {
      type: String,
      enum: ['units', 'kg', 'liters', 'boxes', 'kits', 'packets', 'pieces', 'meters', 'sets'],
      default: 'units'
    },
    minThreshold: {
      type: Number,
      min: [0, 'Minimum threshold cannot be negative'],
      default: 5
    },
    unitCost: {
      type: Number,
      min: [0, 'Unit cost cannot be negative'],
      default: 0
    },
    storageLocation: {
      type: storageLocationSchema,
      default: () => ({})
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1500, 'Description cannot exceed 1500 characters']
    },
    transactions: {
      type: [stockTransactionSchema],
      default: []
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique itemCode strictly scoped per NGO
inventoryItemSchema.index({ ngoId: 1, itemCode: 1 }, { unique: true });
inventoryItemSchema.index({ ngoId: 1, category: 1 });
inventoryItemSchema.index({ ngoId: 1, isArchived: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);

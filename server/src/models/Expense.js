const mongoose = require('mongoose');

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

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: [true, 'Expense number is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: [true, 'NGO reference is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Expense title or description is required'],
      trim: true,
      maxlength: [250, 'Title cannot exceed 250 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Expense amount must be strictly positive']
    },
    currency: {
      type: String,
      enum: {
        values: allowedCurrencies,
        message: 'Invalid currency code'
      },
      default: 'INR',
      trim: true,
      uppercase: true
    },
    category: {
      type: String,
      enum: {
        values: allowedExpenseCategories,
        message: 'Invalid expense category'
      },
      default: 'operational',
      index: true
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    paymentMethod: {
      type: String,
      enum: {
        values: allowedPaymentMethods,
        message: 'Invalid payment method'
      },
      default: 'cash',
      index: true
    },
    vendor: {
      type: String,
      trim: true,
      default: ''
    },
    transactionReference: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      default: null,
      index: true
    },
    receiptUrl: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: allowedExpenseStatuses,
        message: 'Invalid expense status'
      },
      default: 'approved',
      index: true
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring uniqueness of expense numbers strictly scoped per NGO tenant
expenseSchema.index({ ngoId: 1, expenseNumber: 1 }, { unique: true });

// Performance index for tenant-scoped date queries and analytics
expenseSchema.index({ ngoId: 1, expenseDate: -1 });
expenseSchema.index({ ngoId: 1, category: 1 });
expenseSchema.index({ ngoId: 1, status: 1 });
expenseSchema.index({ ngoId: 1, isArchived: 1 });

module.exports = mongoose.model('Expense', expenseSchema);

const mongoose = require('mongoose');

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

const donationSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: [true, 'NGO reference is required'],
      index: true
    },
    donationNumber: {
      type: String,
      required: [true, 'Donation identifier is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      default: null,
      index: true
    },
    // Immutable snapshot of donor details at time of donation
    donorSnapshot: {
      name: { type: String, required: [true, 'Donor name is required in snapshot'], trim: true },
      email: { type: String, trim: true, lowercase: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      donorNumber: { type: String, trim: true, default: '' },
      type: { type: String, enum: ['individual', 'organization'], default: 'individual' }
    },
    donationType: {
      type: String,
      enum: {
        values: allowedDonationTypes,
        message: '{VALUE} is not a valid donation type'
      },
      default: 'monetary',
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Donation amount is required'],
      min: [0.01, 'Donation amount must be greater than zero'],
      set: (val) => Math.round(Number(val) * 100) / 100
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: {
        values: allowedCurrencies,
        message: '{VALUE} is not a supported currency'
      },
      default: 'INR',
      uppercase: true,
      index: true
    },
    inKindDescription: {
      type: String,
      trim: true,
      default: ''
    },
    donationDate: {
      type: Date,
      required: [true, 'Donation date is required'],
      default: Date.now,
      index: true
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: allowedPaymentMethods,
        message: '{VALUE} is not a valid payment method'
      },
      index: true
    },
    transactionReference: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    category: {
      type: String,
      required: [true, 'Donation category is required'],
      enum: {
        values: allowedCategories,
        message: '{VALUE} is not a valid donation category'
      },
      default: 'general',
      index: true
    },
    purpose: {
      type: String,
      trim: true,
      default: ''
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      default: null,
      index: true
    },
    status: {
      type: String,
      required: [true, 'Donation status is required'],
      enum: {
        values: allowedStatuses,
        message: '{VALUE} is not a valid donation status'
      },
      default: 'pending',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    receiptNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    receiptIssuedAt: {
      type: Date,
      default: null
    },
    receiptIssuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
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
    reversalReason: {
      type: String,
      trim: true,
      default: ''
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    supportingDocuments: {
      type: [
        {
          filename: { type: String, required: true },
          originalName: { type: String, required: true },
          size: { type: Number, default: 0 },
          uploadedAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded-by user is required'],
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        return ret;
      }
    }
  }
);

// Compound unique indexes scoped by NGO tenant
donationSchema.index({ ngoId: 1, donationNumber: 1 }, { unique: true });
donationSchema.index(
  { ngoId: 1, receiptNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { receiptNumber: { $type: 'string', $gt: '' } }
  }
);

// Compound indexes for searching, filtering, and sorting
donationSchema.index({ ngoId: 1, status: 1, donationDate: -1 });
donationSchema.index({ ngoId: 1, donorId: 1, donationDate: -1 });
donationSchema.index({ ngoId: 1, programId: 1 });
donationSchema.index({ ngoId: 1, paymentMethod: 1 });
donationSchema.index({ ngoId: 1, category: 1 });
donationSchema.index({ ngoId: 1, currency: 1 });
donationSchema.index({ ngoId: 1, transactionReference: 1 }, { sparse: true });
donationSchema.index({ ngoId: 1, createdAt: -1 });

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation;

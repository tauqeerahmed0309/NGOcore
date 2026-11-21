const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: [true, 'NGO reference is required'],
      index: true
    },
    donorNumber: {
      type: String,
      required: [true, 'Donor ID is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true,
      index: true
    },
    type: {
      type: String,
      required: [true, 'Donor type is required'],
      enum: {
        values: ['individual', 'organization'],
        message: '{VALUE} is not a valid donor type'
      },
      default: 'individual',
      index: true
    },
    contactPerson: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    pinCode: {
      type: String,
      trim: true,
      default: ''
    },
    country: {
      type: String,
      trim: true,
      default: 'India'
    },
    category: {
      type: String,
      required: [true, 'Donor category is required'],
      enum: {
        values: ['individual', 'corporate', 'foundation', 'major_donor', 'regular', 'grant_maker', 'patron', 'other'],
        message: '{VALUE} is not a valid donor category'
      },
      default: 'individual',
      index: true
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    communicationPreferences: {
      preferredChannel: {
        type: String,
        enum: ['email', 'phone', 'sms', 'whatsapp', 'postal', 'none'],
        default: 'email'
      },
      optOut: {
        type: Boolean,
        default: false
      },
      newsletter: {
        type: Boolean,
        default: true
      }
    },
    status: {
      type: String,
      required: [true, 'Donor status is required'],
      enum: {
        values: ['active', 'inactive', 'archived'],
        message: '{VALUE} is not a valid donor status'
      },
      default: 'active',
      index: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
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

// Compound unique index scoped by NGO tenant
donorSchema.index({ ngoId: 1, donorNumber: 1 }, { unique: true });

// Compound indexes for searching, filtering, and sorting
donorSchema.index({ ngoId: 1, status: 1, createdAt: -1 });
donorSchema.index({ ngoId: 1, type: 1 });
donorSchema.index({ ngoId: 1, category: 1 });
donorSchema.index({ ngoId: 1, name: 1 });
donorSchema.index({ ngoId: 1, email: 1 });
donorSchema.index({ ngoId: 1, phone: 1 });
donorSchema.index({ ngoId: 1, city: 1, state: 1 });
donorSchema.index({ ngoId: 1, updatedAt: -1 });

const Donor = mongoose.model('Donor', donorSchema);

module.exports = Donor;

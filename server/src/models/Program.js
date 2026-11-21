const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    days: {
      type: [String],
      default: []
    },
    startTime: {
      type: String,
      trim: true,
      default: ''
    },
    endTime: {
      type: String,
      trim: true,
      default: ''
    },
    frequency: {
      type: String,
      trim: true,
      default: 'weekly'
    }
  },
  { _id: false }
);

const programSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Program name is required'],
      trim: true,
      index: true
    },
    code: {
      type: String,
      required: [true, 'Program code is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    // Flexible string - NOT a restricted enum so any NGO program type can be created
    type: {
      type: String,
      required: [true, 'Program type is required'],
      trim: true,
      lowercase: true,
      index: true
    },
    // Flexible category grouping (e.g., Education, Skill Development, Health, etc.)
    category: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    startDate: {
      type: Date,
      default: null,
      index: true
    },
    endDate: {
      type: Date,
      default: null
    },
    schedule: {
      type: scheduleSchema,
      default: () => ({})
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    assignedStaff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
      }
    ],
    assignedVolunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
      }
    ],
    capacity: {
      type: Number,
      default: null
    },
    enrolledCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['draft', 'active', 'paused', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid program status'
      },
      default: 'active',
      index: true
    },
    // Flexible custom attributes map/object for dynamic NGO parameters
    customAttributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map()
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
        if (ret.customAttributes instanceof Map) {
          ret.customAttributes = Object.fromEntries(ret.customAttributes);
        } else if (ret.customAttributes && typeof ret.customAttributes === 'object') {
          // ensure plain object
          ret.customAttributes = { ...ret.customAttributes };
        } else {
          ret.customAttributes = {};
        }
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        if (ret.customAttributes instanceof Map) {
          ret.customAttributes = Object.fromEntries(ret.customAttributes);
        }
        return ret;
      }
    }
  }
);

// Indexes
programSchema.index({ ngoId: 1, status: 1, createdAt: -1 });
programSchema.index({ ngoId: 1, status: 1, startDate: 1 });
programSchema.index({ type: 1, status: 1 });
programSchema.index({ category: 1, status: 1 });
programSchema.index({ location: 1 });
programSchema.index({ ngoId: 1, code: 1 }, { unique: true });

const Program = mongoose.model('Program', programSchema);

module.exports = Program;

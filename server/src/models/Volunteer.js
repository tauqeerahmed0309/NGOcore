const mongoose = require('mongoose');

const hoursLogSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Log date is required'],
      default: Date.now
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      default: null
    },
    hours: {
      type: Number,
      required: [true, 'Hours spent is required'],
      min: [0.25, 'Minimum 0.25 hours (15 mins) required'],
      max: [24, 'Maximum 24 hours per entry']
    },
    activityDescription: {
      type: String,
      required: [true, 'Activity description is required'],
      trim: true,
      maxlength: [1000, 'Activity description cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const volunteerSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: [true, 'NGO reference is required'],
      index: true
    },
    volunteerNumber: {
      type: String,
      required: [true, 'Volunteer number is required'],
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Volunteer name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name cannot exceed 120 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    skills: {
      type: [String],
      default: []
    },
    availability: {
      type: String,
      enum: ['weekdays', 'weekends', 'flexible', 'full_time', 'evenings'],
      default: 'flexible'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_leave', 'pending_approval'],
      default: 'active',
      index: true
    },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      postalCode: { type: String, trim: true, default: '' }
    },
    emergencyContact: {
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      relationship: { type: String, trim: true, default: '' }
    },
    joinedDate: {
      type: Date,
      default: Date.now
    },
    totalApprovedHours: {
      type: Number,
      default: 0
    },
    assignedPrograms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Program'
      }
    ],
    hoursLogs: [hoursLogSchema],
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
volunteerSchema.index({ ngoId: 1, volunteerNumber: 1 }, { unique: true });
volunteerSchema.index({ ngoId: 1, email: 1 });
volunteerSchema.index({ ngoId: 1, status: 1, isArchived: 1 });
volunteerSchema.index({ ngoId: 1, name: 'text', email: 'text' });

module.exports = mongoose.model('Volunteer', volunteerSchema);

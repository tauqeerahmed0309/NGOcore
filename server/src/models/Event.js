const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Attendee name is required'],
    trim: true,
    maxlength: 120
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  attended: {
    type: Boolean,
    default: false
  },
  checkedInAt: {
    type: Date,
    default: null
  }
});

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    virtualLink: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: [true, 'NGO reference is required'],
      index: true
    },
    eventNumber: {
      type: String,
      required: [true, 'Event number is required'],
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [3000, 'Description cannot exceed 3000 characters']
    },
    category: {
      type: String,
      enum: [
        'workshop',
        'health_camp',
        'fundraiser',
        'distribution',
        'training',
        'community_outreach',
        'meeting',
        'other'
      ],
      default: 'workshop',
      index: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    venue: {
      type: venueSchema,
      default: () => ({})
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      default: null,
      index: true
    },
    coordinatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    assignedVolunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Volunteer'
      }
    ],
    capacity: {
      type: Number,
      min: [0, 'Capacity cannot be negative'],
      default: null
    },
    registeredAttendees: {
      type: [attendeeSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
      default: 0
    },
    actualExpenses: {
      type: Number,
      min: [0, 'Actual expenses cannot be negative'],
      default: 0
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters']
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

// Enforce unique eventNumber strictly scoped per NGO
eventSchema.index({ ngoId: 1, eventNumber: 1 }, { unique: true });
eventSchema.index({ ngoId: 1, status: 1, startDate: 1 });
eventSchema.index({ ngoId: 1, isArchived: 1 });

module.exports = mongoose.model('Event', eventSchema);

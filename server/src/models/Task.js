const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
});

const taskSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: [true, 'NGO reference is required'],
      index: true
    },
    taskNumber: {
      type: String,
      required: [true, 'Task number is required'],
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    category: {
      type: String,
      enum: [
        'program_ops',
        'fundraising',
        'field_work',
        'administrative',
        'logistics',
        'compliance',
        'beneficiary_support',
        'other'
      ],
      default: 'program_ops',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'completed', 'cancelled'],
      default: 'todo',
      index: true
    },
    dueDate: {
      type: Date,
      default: null,
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    assignedVolunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Volunteer',
      default: null,
      index: true
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      default: null,
      index: true
    },
    checklist: [checklistItemSchema],
    completedAt: {
      type: Date,
      default: null
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    completionNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Completion notes cannot exceed 1000 characters']
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
taskSchema.index({ ngoId: 1, taskNumber: 1 }, { unique: true });
taskSchema.index({ ngoId: 1, status: 1, isArchived: 1 });
taskSchema.index({ ngoId: 1, dueDate: 1 });
taskSchema.index({ ngoId: 1, assignedTo: 1, status: 1 });
taskSchema.index({ ngoId: 1, title: 'text', description: 'text' });

module.exports = mongoose.model('Task', taskSchema);

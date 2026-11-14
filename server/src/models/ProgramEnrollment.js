const mongoose = require('mongoose');

const programEnrollmentSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: true,
      index: true
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['enrolled', 'completed', 'withdrawn'],
      default: 'enrolled',
      required: true,
      index: true
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    withdrawnAt: {
      type: Date,
      default: null
    },
    withdrawalReason: {
      type: String,
      trim: true,
      default: ''
    },
    completedAt: {
      type: Date,
      default: null
    },
    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

programEnrollmentSchema.index({ ngoId: 1, programId: 1, studentId: 1 }, { unique: true });
programEnrollmentSchema.index({ ngoId: 1, programId: 1, status: 1, enrolledAt: -1 });
programEnrollmentSchema.index({ ngoId: 1, studentId: 1, status: 1, enrolledAt: -1 });

module.exports = mongoose.model('ProgramEnrollment', programEnrollmentSchema);

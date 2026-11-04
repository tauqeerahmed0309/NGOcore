const mongoose = require('mongoose');

const attendanceEntrySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'excused'],
      required: true
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    }
  },
  { _id: false }
);

const attendanceSessionSchema = new mongoose.Schema(
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
    sessionDate: {
      type: Date,
      required: true
    },
    entries: {
      type: [attendanceEntrySchema],
      default: []
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ ngoId: 1, programId: 1, sessionDate: 1 }, { unique: true });
attendanceSessionSchema.index({ ngoId: 1, sessionDate: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);

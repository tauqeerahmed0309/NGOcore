const mongoose = require('mongoose');

const passwordResetOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    codeHash: {
      type: String,
      required: true,
      select: false
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastSentAt: {
      type: Date,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    }
  },
  { timestamps: true }
);

passwordResetOtpSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);

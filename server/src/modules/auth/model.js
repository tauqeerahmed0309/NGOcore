const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  refreshToken: { type: String, required: true, unique: true },
  deviceInfo: { type: String },
  ip: { type: String },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = {
  EmailVerification: mongoose.model('EmailVerification', emailVerificationSchema),
  PasswordReset: mongoose.model('PasswordReset', passwordResetSchema),
  Session: mongoose.model('Session', sessionSchema)
};

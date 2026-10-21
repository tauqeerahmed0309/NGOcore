const mongoose = require('mongoose');

const platformAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  twoFactorSecret: { type: String },
  is2FAEnabled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = { PlatformAdmin: mongoose.model('PlatformAdmin', platformAdminSchema) };

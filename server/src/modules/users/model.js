const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  avatarUrl: { type: String },
  designation: { type: String },
  status: { type: String, enum: ['unverified', 'active', 'inactive', 'suspended'], default: 'unverified' },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
}, { timestamps: true });

// Strict Multi-Tenant Compound Indexes
userSchema.index({ ngoId: 1, email: 1 });
userSchema.index({ ngoId: 1, status: 1 });
userSchema.index({ ngoId: 1, roleId: 1 });

module.exports = { User: mongoose.model('User', userSchema) };

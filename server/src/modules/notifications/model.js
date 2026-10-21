const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'security', 'approval', 'invitation', 'system'], 
    default: 'info' 
  },
  link: { type: String },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Compound indexes for performant notification queries and count calculations
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ ngoId: 1, createdAt: -1 });

module.exports = { Notification: mongoose.model('Notification', notificationSchema) };

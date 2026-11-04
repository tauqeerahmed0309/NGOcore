const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      default: null,
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    action: {
      type: String,
      required: true,
      enum: ['login', 'login_failed', 'signup_verification_failed', 'password_reset', 'logout', 'signup', 'create', 'update', 'delete']
    },
    entityType: {
      type: String,
      required: true,
      trim: true
    },
    entityId: {
      type: String,
      default: null
    },
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    }
  },
  {
    versionKey: false,
    strict: true
  }
);

auditLogSchema.index({ ngoId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

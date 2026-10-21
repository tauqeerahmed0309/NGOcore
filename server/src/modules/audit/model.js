const mongoose = require('mongoose');
const crypto = require('crypto');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const deterministicStringify = (obj) => {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(deterministicStringify).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `"${k}":${deterministicStringify(obj[k])}`).join(',')}}`;
};

const calculateLogHash = (log, previousHash) => {
  const payload = [
    log.ngoId ? log.ngoId.toString() : 'global',
    log.userId ? log.userId.toString() : 'system',
    log.action,
    log.resource || '',
    log.resourceId ? log.resourceId.toString() : '',
    deterministicStringify(log.details || {}),
    previousHash
  ].join(':');

  return crypto.createHash('sha256').update(payload).digest('hex');
};

const auditLogSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  resource: { type: String },
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
  previousHash: { type: String, default: GENESIS_HASH },
  hash: { type: String }
}, { timestamps: true });

// Strict Multi-Tenant Compound Indexes
auditLogSchema.index({ ngoId: 1, createdAt: -1 });
auditLogSchema.index({ ngoId: 1, action: 1 });
auditLogSchema.index({ ngoId: 1, resource: 1 });

// Pre-save hook: Automatic Cryptographic Hash Chaining
auditLogSchema.pre('save', async function() {
  // Enforce document immutability
  if (!this.isNew) {
    throw new Error('Audit logs are immutable and cannot be updated');
  }

  // Calculate hash chain if not manually provided
  if (!this.hash) {
    const lastLog = await this.constructor.findOne(
      { ngoId: this.ngoId, _id: { $ne: this._id } },
      {},
      { sort: { createdAt: -1 } }
    );

    this.previousHash = lastLog && lastLog.hash ? lastLog.hash : GENESIS_HASH;
    this.hash = calculateLogHash(this, this.previousHash);
  }
});

// Guard against update queries
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate'], function() {
  throw new Error('Audit logs are strictly append-only: updates are prohibited');
});

// Guard against deletions in production
auditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete'], function() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Audit logs are strictly append-only: deletions are prohibited in production');
  }
});

module.exports = { 
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  GENESIS_HASH,
  calculateLogHash,
  deterministicStringify
};

const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true, index: true },
  purpose: {
    type: String,
    enum: [
      'Humanitarian Aid & Relief',
      'Medical & Healthcare Services',
      'Donor Grant Compliance Audit',
      'Third-Party Research & Statistics',
      'Emergency Contact Notification'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['granted', 'withdrawn', 'expired'],
    default: 'granted',
    index: true
  },
  proofType: {
    type: String,
    enum: ['Written Form', 'Verbal Witness', 'Digital OTP', 'Biometric', 'Guardian Consent'],
    default: 'Written Form'
  },
  witnessName: { type: String, trim: true },
  validUntil: { type: Date },
  ip: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

// Strict Multi-Tenant Compound Indexes
consentSchema.index({ ngoId: 1, recordId: 1, purpose: 1 });
consentSchema.index({ ngoId: 1, status: 1 });

const dataRequestSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true, index: true },
  requestType: {
    type: String,
    enum: ['Erasure', 'Access', 'Correction', 'Portability'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Rejected'],
    default: 'Completed'
  },
  requestedBy: { type: String, required: true },
  reason: { type: String },
  certificate: {
    certificateNumber: { type: String, required: true },
    sha256Proof: { type: String, required: true },
    anonymizedAt: { type: Date, default: Date.now },
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    redactedFields: [{ type: String }]
  }
}, { timestamps: true });

// Strict Multi-Tenant Compound Indexes
dataRequestSchema.index({ ngoId: 1, recordId: 1 });
dataRequestSchema.index({ ngoId: 1, requestType: 1 });

module.exports = {
  Consent: mongoose.model('Consent', consentSchema),
  DataRequest: mongoose.model('DataRequest', dataRequestSchema)
};

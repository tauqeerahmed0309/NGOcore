const mongoose = require('mongoose');

const blockchainAnchorSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  batchType: { 
    type: String, 
    enum: ['records', 'audit_logs', 'compliance_daily', 'files'], 
    default: 'audit_logs',
    index: true 
  },
  merkleRoot: { type: String, required: true, index: true },
  leafCount: { type: Number, required: true },
  leaves: [{
    hash: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityType: { type: String }
  }],
  network: { type: String, default: 'polygon-amoy' },
  contractAddress: { type: String, default: '0x1c3a37bF1451f4961D97C074Cdf8e59E15B9A47d' },
  transactionHash: { type: String, required: true, index: true },
  blockNumber: { type: Number, required: true },
  gasUsed: { type: Number, default: 45000 },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'confirmed' },
  anchoredAt: { type: Date, default: Date.now },
  anchoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationUrl: { type: String }
}, { timestamps: true });

// Strict Multi-Tenant Compound Indexes
blockchainAnchorSchema.index({ ngoId: 1, createdAt: -1 });
blockchainAnchorSchema.index({ ngoId: 1, merkleRoot: 1 });
blockchainAnchorSchema.index({ ngoId: 1, batchType: 1 });

module.exports = {
  BlockchainAnchor: mongoose.model('BlockchainAnchor', blockchainAnchorSchema)
};

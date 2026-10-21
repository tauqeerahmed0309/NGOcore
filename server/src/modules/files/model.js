const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true }, // Size in bytes
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  fileHash: { type: String, required: true, index: true }, // SHA-256 cryptographic checksum
  storageProvider: { type: String, enum: ['cloudinary', 'local', 's3'], default: 'local' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', index: true },
  tags: [{ type: String, trim: true }],
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

// Strict Multi-Tenant Compound Indexes
fileSchema.index({ ngoId: 1, recordId: 1 });
fileSchema.index({ ngoId: 1, fileHash: 1 });
fileSchema.index({ ngoId: 1, createdAt: -1 });

module.exports = { File: mongoose.model('File', fileSchema) };

const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: [
      'Text',
      'Number',
      'Date',
      'Dropdown',
      'Checkbox',
      'Email',
      'Phone',
      'File',
      'Long Text',
      'Currency',
      'Encrypted Text'
    ],
    required: true
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // Dropdown/Select options
  isSensitive: { type: Boolean, default: false }, // Enforces AES-256 field encryption
  placeholder: { type: String },
  defaultValue: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const recordTypeSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  description: { type: String, trim: true },
  icon: { type: String, default: 'FileText' },
  prefix: { type: String, default: 'REC', uppercase: true, trim: true },
  fields: [fieldSchema],
  isPredefined: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

// Strict Multi-Tenant Compound Indexes
recordTypeSchema.index({ ngoId: 1, slug: 1 }, { unique: true });
recordTypeSchema.index({ ngoId: 1, isPredefined: 1 });
recordTypeSchema.index({ ngoId: 1, isArchived: 1 });

const recordSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  recordTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecordType', required: true, index: true },
  recordNumber: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Archived'],
    default: 'Submitted',
    index: true
  },
  data: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
  encryptedFields: [{ type: String }], // Array of keys that are stored in ciphertext
  tags: [{ type: String, trim: true }],
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mergedInto: { type: mongoose.Schema.Types.ObjectId, ref: 'Record' }
}, { timestamps: true });

// Strict Multi-Tenant Compound Indexes
recordSchema.index({ ngoId: 1, recordTypeId: 1, isDeleted: 1 });
recordSchema.index({ ngoId: 1, recordNumber: 1 }, { unique: true });
recordSchema.index({ ngoId: 1, status: 1 });
recordSchema.index({ ngoId: 1, createdAt: -1 });
recordSchema.index({ ngoId: 1, isDeleted: 1 });

module.exports = {
  RecordType: mongoose.model('RecordType', recordTypeSchema),
  Record: mongoose.model('Record', recordSchema)
};

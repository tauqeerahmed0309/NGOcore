const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: [true, 'NGO reference is required'],
      index: true
    },
    documentNumber: {
      type: String,
      required: [true, 'Document number is required'],
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    category: {
      type: String,
      enum: [
        'compliance_cert',
        'governance',
        'program_mou',
        'annual_report',
        'audit_report',
        'identity_proof',
        'policy',
        'other'
      ],
      default: 'compliance_cert',
      index: true
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than zero']
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true
    },
    associatedEntityType: {
      type: String,
      enum: ['none', 'beneficiary', 'program', 'donor', 'volunteer', 'ngo_general'],
      default: 'ngo_general',
      index: true
    },
    associatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'pending_verification', 'archived'],
      default: 'active',
      index: true
    },
    expiryDate: {
      type: Date,
      default: null,
      index: true
    },
    tags: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique documentNumber strictly scoped per NGO
documentSchema.index({ ngoId: 1, documentNumber: 1 }, { unique: true });
documentSchema.index({ ngoId: 1, status: 1 });
documentSchema.index({ ngoId: 1, isArchived: 1 });

module.exports = mongoose.model('Document', documentSchema);

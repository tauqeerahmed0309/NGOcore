const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    logo: {
      type: String,
      trim: true,
      default: ''
    },
    organizationType: {
      type: String,
      trim: true,
      default: ''
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    approvalSubmitted: {
      type: Boolean,
      default: false,
      index: true
    },
    donorSequence: {
      type: Number,
      default: 0
    },
    donationSequence: {
      type: Number,
      default: 0
    },
    receiptSequence: {
      type: Number,
      default: 0
    },
    expenseSequence: {
      type: Number,
      default: 0
    },
    volunteerSequence: {
      type: Number,
      default: 0
    },
    taskSequence: {
      type: Number,
      default: 0
    },
    eventSequence: {
      type: Number,
      default: 0
    },
    inventorySequence: {
      type: Number,
      default: 0
    },
    documentSequence: {
      type: Number,
      default: 0
    },
    supportingDocuments: {
      type: [{
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        contentType: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now }
      }],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ngo', ngoSchema);

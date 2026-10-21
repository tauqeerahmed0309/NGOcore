const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String }, // Focus sector (e.g. Education, Healthcare, Disaster Relief)
  registrationType: { type: String, default: 'Trust' }, // Trust, Society, Section 8 Company
  registrationNumber: { type: String },
  registrationYear: { type: Number },
  pan: { type: String, uppercase: true, trim: true }, // Organization PAN
  registration12A: { type: String, trim: true }, // 12A Order / Unique Registration Number
  registration80G: { type: String, trim: true }, // 80G Certificate Reference
  fcraNumber: { type: String, trim: true }, // FCRA registration if applicable
  ngoDarpanId: { type: String, trim: true }, // NITI Aayog NGO Darpan portal UID
  csr1Number: { type: String, trim: true }, // MCA CSR-1 registration number
  gstin: { type: String, uppercase: true, trim: true }, // Goods & Services Tax ID
  address: { type: String }, // Legacy/Joined address
  addressLine1: { type: String },
  addressLine2: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String },
  pincode: { type: String, trim: true },
  country: { type: String, default: 'India' },
  contactEmail: { type: String, required: true, unique: true },
  contactPhone: { type: String },
  logoUrl: { type: String },
  website: { type: String },
  description: { type: String },
  settings: {
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    retentionDays: { type: Number, default: 1825 }, // 5 years DPDP retention
    require2FA: { type: Boolean, default: false },
    sessionTimeoutMinutes: { type: Number, default: 120 },
    emailNotifications: {
      notifyOnNewMember: { type: Boolean, default: true },
      notifyOnRecordExport: { type: Boolean, default: true },
      notifyOnSecurityAlert: { type: Boolean, default: true }
    }
  },
  status: { 
    type: String, 
    enum: ['unverified', 'pending', 'approved', 'rejected', 're-upload-required', 'suspended'], 
    default: 'unverified' 
  },
  statusReason: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformAdmin' },
  reviewedAt: { type: Date }
}, { timestamps: true });

const roleSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  permissions: [{ type: String }],
  isSystem: { type: Boolean, default: false } // For default roles like NGO Admin
}, { timestamps: true });

// Multi-tenant index: unique role name per NGO
roleSchema.index({ ngoId: 1, name: 1 }, { unique: true });

const invitationSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true, index: true },
  email: { type: String, required: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  token: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Multi-tenant index: fast lookups per NGO and email
invitationSchema.index({ ngoId: 1, email: 1 });
invitationSchema.index({ ngoId: 1, status: 1 });

module.exports = { 
  NGO: mongoose.model('NGO', ngoSchema),
  Role: mongoose.model('Role', roleSchema),
  Invitation: mongoose.model('Invitation', invitationSchema)
};

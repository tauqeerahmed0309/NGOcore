const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ngo',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false // Excluded by default in queries
    },
    isPasswordSetupRequired: {
      type: Boolean,
      default: false
    },
    passwordSetupTokenHash: {
      type: String,
      default: null,
      select: false
    },
    passwordSetupExpiresAt: {
      type: Date,
      default: null,
      select: false
    },
    sessionVersion: {
      type: Number,
      default: 0
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['admin', 'ngo_admin', 'staff', 'volunteer', 'student'],
        message: '{VALUE} is not a valid system role'
      },
      index: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    avatar: {
      type: String,
      default: ''
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
      index: true
    },
    emailVerifiedAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordSetupTokenHash;
        delete ret.passwordSetupExpiresAt;
        delete ret.__v;
        ret.id = ret._id;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordSetupTokenHash;
        delete ret.passwordSetupExpiresAt;
        delete ret.__v;
        ret.id = ret._id;
        return ret;
      }
    }
  }
);

// Compound Index for role queries
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ ngoId: 1, role: 1, isActive: 1, createdAt: -1 });
userSchema.index({ passwordSetupTokenHash: 1, passwordSetupExpiresAt: 1 }, { sparse: true });

const User = mongoose.model('User', userSchema);

module.exports = User;

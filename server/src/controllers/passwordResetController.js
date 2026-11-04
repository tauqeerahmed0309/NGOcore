const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const config = require('../config/env');
const { hashPassword } = require('../utils/passwordHelper');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { sendPasswordResetOtp } = require('../services/emailService');
const { writeAuditLog } = require('../services/auditService');

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const ALLOWED_ROLES = ['student', 'ngo_admin'];
const GENERIC_REQUEST_MESSAGE = 'If an eligible account exists for that email, a verification code will be sent.';

const hashOtp = (email, code) => crypto
  .createHmac('sha256', config.JWT_SECRET)
  .update(`${email}:${code}`)
  .digest('hex');

const generateOtp = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const requestPasswordReset = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const user = await User.findOne({
      email,
      role: { $in: ALLOWED_ROLES },
      isActive: true,
      isEmailVerified: true
    });

    if (!user) return successResponse(res, 200, GENERIC_REQUEST_MESSAGE);

    const existingOtp = await PasswordResetOtp.findOne({ email });
    if (existingOtp && Date.now() - existingOtp.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return successResponse(res, 200, GENERIC_REQUEST_MESSAGE);
    }

    const now = new Date();
    const code = generateOtp();
    const otp = await PasswordResetOtp.findOneAndUpdate(
      { email },
      {
        $set: {
          codeHash: hashOtp(email, code),
          attempts: 0,
          lastSentAt: now,
          expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS)
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    try {
      await sendPasswordResetOtp(email, code);
    } catch (error) {
      await PasswordResetOtp.deleteOne({ _id: otp._id });
      throw error;
    }

    return successResponse(res, 200, GENERIC_REQUEST_MESSAGE);
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const now = new Date();
    const otp = await PasswordResetOtp.findOneAndUpdate(
      { email, expiresAt: { $gt: now }, attempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' }
    ).select('+codeHash');

    if (!otp) {
      return errorResponse(res, 400, 'Verification code expired or attempt limit reached. Request a new code.');
    }

    const expected = Buffer.from(otp.codeHash, 'hex');
    const actual = Buffer.from(hashOtp(email, req.body.code), 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - otp.attempts);
      return errorResponse(
        res,
        400,
        remaining
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Attempt limit reached. Request a new code.'
      );
    }

    const user = await User.findOne({
      email,
      role: { $in: ALLOWED_ROLES },
      isActive: true,
      isEmailVerified: true
    });
    if (!user) {
      await PasswordResetOtp.deleteOne({ _id: otp._id });
      return errorResponse(res, 400, 'This account cannot reset its password. Request a new code if the account is active.');
    }

    user.password = await hashPassword(req.body.newPassword);
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    await PasswordResetOtp.deleteOne({ _id: otp._id });
    await writeAuditLog({
      req,
      actor: user,
      action: 'password_reset',
      entityType: 'auth'
    });

    return successResponse(res, 200, 'Password reset successfully. You can now sign in.');
  } catch (error) {
    return next(error);
  }
};

module.exports = { requestPasswordReset, resetPassword };

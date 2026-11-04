const crypto = require('crypto');
const fs = require('fs/promises');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const SignupOtp = require('../models/SignupOtp');
const config = require('../config/env');
const { hashPassword, validatePasswordStrength } = require('../utils/passwordHelper');
const { signToken } = require('../utils/jwtHelper');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { setSignupCookie, clearAuthCookies } = require('../utils/authCookies');
const { writeAuditLog } = require('../services/auditService');
const { uploadDirectory } = require('../middlewares/onboardingUpload');
const { sendSignupOtp } = require('../services/emailService');

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const hashOtp = (email, code) => crypto
  .createHmac('sha256', config.JWT_SECRET)
  .update(`${email}:${code}`)
  .digest('hex');

const generateOtp = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const issueOtp = async ({ email, ngoId, userId, replace = false }) => {
  const now = new Date();
  const code = generateOtp();
  const values = {
    ngoId,
    userId,
    codeHash: hashOtp(email, code),
    attempts: 0,
    lastSentAt: now,
    expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS)
  };

  let otp;
  if (replace) {
    const eligibleAt = new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS);
    otp = await SignupOtp.findOneAndUpdate(
      { email, lastSentAt: { $lte: eligibleAt } },
      { $set: values },
      { returnDocument: 'after' }
    );
    if (!otp) {
      const previous = await SignupOtp.findOne({ email });
      if (previous) {
        const retryAfter = Math.max(
          1,
          Math.ceil((OTP_RESEND_COOLDOWN_MS - (now.getTime() - previous.lastSentAt.getTime())) / 1000)
        );
        const error = new Error(`Please wait ${retryAfter} seconds before requesting another code.`);
        error.statusCode = 429;
        throw error;
      }
      otp = await SignupOtp.create({ email, ...values });
    }
  } else {
    otp = await SignupOtp.create({ email, ...values });
  }

  try {
    await sendSignupOtp(email, code);
  } catch (error) {
    await SignupOtp.deleteOne({ _id: otp._id });
    throw error;
  }
  return otp;
};

const signup = async (req, res, next) => {
  let ngo;
  let user;
  try {
    const { organizationName, firstName, lastName, email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return errorResponse(res, 409, 'This email address is already registered.');
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return errorResponse(res, 400, passwordValidation.message);
    }

    ngo = await Ngo.create({
      name: organizationName,
      contactEmail: cleanEmail,
      status: 'pending',
      approvalSubmitted: false
    });
    user = await User.create({
      ngoId: ngo._id,
      email: cleanEmail,
      password: await hashPassword(password),
      role: 'ngo_admin',
      firstName,
      lastName,
      isEmailVerified: false,
      emailVerifiedAt: null
    });

    await issueOtp({ email: cleanEmail, ngoId: ngo._id, userId: user._id });
    await writeAuditLog({
      req,
      actor: user,
      action: 'signup',
      entityType: 'ngo',
      entityId: ngo._id,
      ngoId: ngo._id
    });

    return successResponse(res, 201, 'Verification code sent to your email address.', {
      email: cleanEmail,
      expiresInSeconds: OTP_LIFETIME_MS / 1000
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 409, 'This email address is already registered.');
    }
    if (ngo) {
      if (user) {
        await SignupOtp.deleteMany({ userId: user._id });
        await User.deleteOne({ _id: user._id });
      }
      await Ngo.deleteOne({ _id: ngo._id });
    }
    return next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const user = await User.findOne({ email, role: 'ngo_admin', isEmailVerified: false });
    if (!user) {
      return errorResponse(res, 404, 'No unverified sign-up was found for this email address.');
    }
    const ngo = await Ngo.findOne({ _id: user.ngoId, status: 'pending', approvalSubmitted: false });
    if (!ngo) {
      return errorResponse(res, 409, 'This organization cannot request a verification code.');
    }

    await issueOtp({ email, ngoId: ngo._id, userId: user._id, replace: true });
    return successResponse(res, 200, 'A new verification code has been sent.');
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.statusCode, error.message);
    return next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const now = new Date();
    const otp = await SignupOtp.findOneAndUpdate(
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
      await writeAuditLog({
        req,
        action: 'signup_verification_failed',
        entityType: 'signup_otp',
        entityId: otp._id,
        ngoId: otp.ngoId,
        metadata: { reason: 'invalid_code', attempt: otp.attempts }
      });
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - otp.attempts);
      return errorResponse(
        res,
        400,
        remaining
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Attempt limit reached. Request a new verification code.'
      );
    }

    const user = await User.findOne({
      _id: otp.userId,
      ngoId: otp.ngoId,
      email,
      isEmailVerified: false
    });
    if (!user) {
      return errorResponse(res, 409, 'This sign-up can no longer be verified.');
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = now;
    await user.save();
    await SignupOtp.deleteOne({ _id: otp._id });

    const onboardingToken = signToken({
      id: user._id,
      ngoId: otp.ngoId,
      tokenType: 'onboarding'
    }, '30m');
    setSignupCookie(res, onboardingToken);
    return successResponse(res, 200, 'Email verified. Continue to organization onboarding.', {
      email: user.email
    });
  } catch (error) {
    return next(error);
  }
};

const uploadSupportingDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, 'Choose a PDF, JPEG, or PNG supporting document to upload.');
    }

    const fileBytes = await fs.readFile(req.file.path);
    const signatures = {
      'application/pdf': fileBytes.subarray(0, 5).toString() === '%PDF-',
      'image/jpeg': fileBytes.length >= 3 && fileBytes[0] === 0xff && fileBytes[1] === 0xd8 && fileBytes[2] === 0xff,
      'image/png': fileBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    };
    if (!signatures[req.file.mimetype]) {
      await fs.unlink(req.file.path);
      return errorResponse(res, 400, 'The uploaded file content does not match its declared document type.');
    }

    const document = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size
    };
    req.onboardingNgo.supportingDocuments.push(document);
    await req.onboardingNgo.save();
    await writeAuditLog({
      req,
      action: 'create',
      entityType: 'ngo_supporting_document',
      entityId: req.onboardingNgo._id,
      metadata: { originalName: document.originalName, contentType: document.contentType }
    });
    return successResponse(res, 201, 'Supporting document uploaded successfully.', {
      document: {
        originalName: document.originalName,
        contentType: document.contentType,
        size: document.size
      }
    });
  } catch (error) {
    if (req.file?.path) await fs.rm(req.file.path, { force: true });
    return next(error);
  }
};

const completeOnboarding = async (req, res, next) => {
  try {
    if (!req.onboardingNgo.supportingDocuments.length) {
      return errorResponse(res, 400, 'Upload at least one supporting document before submitting for approval.');
    }

    req.onboardingNgo.organizationType = req.body.organizationType;
    req.onboardingNgo.registrationNumber = req.body.registrationNumber;
    req.onboardingNgo.address = req.body.address;
    req.onboardingNgo.approvalSubmitted = true;
    req.onboardingNgo.status = 'pending';
    await req.onboardingNgo.save();

    await writeAuditLog({
      req,
      actor: req.onboardingUser,
      action: 'update',
      entityType: 'ngo_onboarding',
      entityId: req.onboardingNgo._id,
      ngoId: req.onboardingNgo._id,
      metadata: { approvalSubmitted: true }
    });

    clearAuthCookies(res);
    return successResponse(res, 202, 'Organization submitted for approval.', {
      status: 'pending',
      message: 'Your organization details and supporting document were received. You can sign in after platform approval.'
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  signup,
  resendOtp,
  verifyOtp,
  uploadSupportingDocument,
  completeOnboarding
};

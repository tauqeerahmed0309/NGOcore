const { verifyToken } = require('../utils/jwtHelper');
const { errorResponse } = require('../utils/apiResponse');
const { SIGNUP_COOKIE, readCookie } = require('../utils/authCookies');
const User = require('../models/User');
const Ngo = require('../models/Ngo');

const signupOnboardingMiddleware = async (req, res, next) => {
  try {
    const token = readCookie(req, SIGNUP_COOKIE);
    if (!token) {
      return errorResponse(res, 401, 'Email verification session missing or expired. Verify your email again.');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return errorResponse(res, 401, 'Email verification session expired. Verify your email again.');
    }
    if (!decoded?.id || !decoded?.ngoId || decoded.tokenType !== 'onboarding') {
      return errorResponse(res, 401, 'Invalid email verification session.');
    }

    const user = await User.findOne({
      _id: decoded.id,
      ngoId: decoded.ngoId,
      isEmailVerified: true
    });
    const ngo = await Ngo.findOne({ _id: decoded.ngoId, status: 'pending', approvalSubmitted: false });
    if (!user || !ngo) {
      return errorResponse(res, 403, 'This organization cannot continue onboarding.');
    }

    req.onboardingUser = user;
    req.onboardingNgo = ngo;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = signupOnboardingMiddleware;

const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/response');

const signup = async (req, res, next) => {
  try {
    const data = await authService.signup(req.body);
    sendSuccess(res, 201, 'Account created successfully. Please verify your email.', data);
  } catch (error) {
    next(error);
  }
};

const requestOtp = async (req, res, next) => {
  try {
    const data = await authService.requestOtp(req.body.email);
    sendSuccess(res, 200, data.message);
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const data = await authService.verifyOtp(req.body.email, req.body.otp);
    
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    sendSuccess(res, 200, 'Email verified successfully', { accessToken: data.accessToken });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const result = await authService.login(req.body, ip, userAgent);

    // Set rotating refresh token in httpOnly, secure, SameSite cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: result.expiresAt
    });

    sendSuccess(res, 200, result.statusNotice || 'Logged in successfully', {
      accessToken: result.accessToken,
      user: result.user,
      redirect: result.redirect,
      statusNotice: result.statusNotice
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const result = await authService.rotateRefreshToken(req.cookies?.refreshToken, ip, userAgent);

    // Set newly rotated refresh token cookie
    res.cookie('refreshToken', result.newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: result.expiresAt
    });

    sendSuccess(res, 200, 'Access token refreshed successfully', {
      accessToken: result.accessToken
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const result = await authService.logout(refreshToken);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    const result = await authService.logoutAll(req.user.userId);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await authService.getActiveSessions(req.user.userId, req.cookies?.refreshToken);
    sendSuccess(res, 200, 'Active sessions retrieved successfully', sessions);
  } catch (error) {
    next(error);
  }
};

const revokeSession = async (req, res, next) => {
  try {
    const result = await authService.revokeSession(req.user.userId, req.params.sessionId);
    sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const result = await authService.forgotPassword(req.body, ip, userAgent);
    sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const result = await authService.resetPassword(req.body, ip, userAgent);
    sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  requestOtp,
  verifyOtp,
  login,
  refreshToken,
  logout,
  logoutAll,
  getActiveSessions,
  revokeSession,
  forgotPassword,
  resetPassword
};

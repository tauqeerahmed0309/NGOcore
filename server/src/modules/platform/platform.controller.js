const platformService = require('./platform.service');
const { sendSuccess } = require('../../utils/response');

const login = async (req, res, next) => {
  try {
    const result = await platformService.login(req.body);
    sendSuccess(res, 200, result.message, {
      requires2FA: result.requires2FA,
      tempToken: result.tempToken
    });
  } catch (error) {
    next(error);
  }
};

const verify2FA = async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const result = await platformService.verify2FA(req.body, ip, userAgent);

    // Set rotating refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    sendSuccess(res, 200, 'Platform admin authenticated successfully', {
      accessToken: result.accessToken,
      admin: result.admin
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const profile = await platformService.getProfile(req.user.adminId || req.user.userId);
    sendSuccess(res, 200, 'Platform admin profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

const getNgos = async (req, res, next) => {
  try {
    const result = await platformService.getNgos(req.query);
    sendSuccess(res, 200, 'NGO list retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getNgoById = async (req, res, next) => {
  try {
    const ngo = await platformService.getNgoById(req.params.ngoId);
    sendSuccess(res, 200, 'NGO details retrieved successfully', ngo);
  } catch (error) {
    next(error);
  }
};

const updateNgoStatus = async (req, res, next) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    const result = await platformService.updateNgoStatus({
      ngoId: req.params.ngoId,
      status: req.body.status,
      reason: req.body.reason,
      adminId: req.user.adminId || req.user.userId,
      ip,
      userAgent
    });
    sendSuccess(res, 200, `NGO status successfully updated to "${req.body.status}"`, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  verify2FA,
  getMe,
  getNgos,
  getNgoById,
  updateNgoStatus
};

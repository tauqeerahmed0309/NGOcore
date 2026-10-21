const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateTokens = (user) => {
  const payload = {
    userId: user._id,
    ngoId: user.ngoId,
    roleId: user.roleId,
    status: user.status
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
};

const generatePlatformAdminTokens = (admin) => {
  const payload = {
    userId: admin._id,
    adminId: admin._id,
    role: 'platform_admin',
    email: admin.email
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken };
};

module.exports = { generateTokens, generatePlatformAdminTokens };

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Sign JWT Token
 * Payload format: { id: user._id, role: user.role, email: user.email }
 */
const signToken = (payload, customExpiresIn = null) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: customExpiresIn || config.JWT_EXPIRES_IN,
  });
};

/**
 * Verify JWT Token
 * Returns decoded payload or throws error
 */
const verifyToken = (token, options = {}) => {
  return jwt.verify(token, config.JWT_SECRET, options);
};

module.exports = {
  signToken,
  verifyToken,
};

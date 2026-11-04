const bcrypt = require('bcrypt');

/**
 * Validate password complexity:
 * - At least 8 characters
 * - Contains at least one letter
 * - Contains at least one number
 */
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password must be a string'
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      message: 'Password must contain both letters and numbers'
    };
  }

  return { isValid: true };
};

/**
 * Hash plain-text password with bcrypt (salt rounds = 10)
 */
const hashPassword = async (plainPassword) => {
  const saltRounds = 10;
  return await bcrypt.hash(plainPassword, saltRounds);
};

/**
 * Compare candidate password with stored bcrypt hash
 */
const comparePassword = async (candidatePassword, hashedPassword) => {
  if (!candidatePassword || !hashedPassword) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

module.exports = {
  validatePasswordStrength,
  hashPassword,
  comparePassword
};

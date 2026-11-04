const User = require('../models/User');
const { hashPassword, validatePasswordStrength } = require('../utils/passwordHelper');
const logger = require('../utils/logger');
const crypto = require('crypto');
const config = require('../config/env');
const emailService = require('./emailService');

/**
 * List users with pagination, search, role and status filtering
 */
const listUsers = async ({
  page = 1,
  limit = 10,
  search = '',
  role = 'all',
  status = 'all',
  sortBy = 'createdAt',
  sortOrder = 'desc'
}, ngoFilter) => {
  const query = ngoFilter({});

  // 1. Search across firstName, lastName, email
  if (search && search.trim() !== '') {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex }
    ];
  }

  // 2. Role filter
  if (role && role !== 'all') {
    query.role = role;
  }

  // 3. Status filter
  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  // Count total matching documents
  const totalUsers = await User.countDocuments(query);
  const totalPages = Math.ceil(totalUsers / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;

  // Execute query with sorting and pagination
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const users = await User.find(query)
    .sort({ [sortBy]: sortDirection })
    .skip(skip)
    .limit(limitNum)
    .lean({ virtuals: true });
  users.forEach((user) => { delete user.__v; });

  return {
    users,
    pagination: {
      totalUsers,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Create a new user (Staff, Volunteer, Student only)
 */
const createUser = async ({ firstName, lastName, email, role, password, avatar }, ngoId) => {
  // Reject Admin role creation
  if (role === 'admin' || role === 'ngo_admin') {
    const error = new Error('Admin accounts cannot be created through User Management.');
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.toLowerCase().trim();

  // Check duplicate email
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    const error = new Error('Email address is already registered.');
    error.statusCode = 409;
    throw error;
  }

  const setupToken = role === 'student' && !password ? crypto.randomBytes(32).toString('hex') : null;
  if (role !== 'student' || password) {
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      const error = new Error(passwordValidation.message);
      error.statusCode = 400;
      throw error;
    }
  }
  const initialPassword = password || crypto.randomBytes(48).toString('hex');
  const newUser = await User.create({
    ngoId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: cleanEmail,
    role,
    password: await hashPassword(initialPassword),
    isPasswordSetupRequired: Boolean(setupToken),
    passwordSetupTokenHash: setupToken
      ? crypto.createHash('sha256').update(setupToken).digest('hex')
      : null,
    passwordSetupExpiresAt: setupToken ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
    isEmailVerified: !setupToken,
    avatar: avatar || '',
    isActive: true
  });

  if (setupToken) {
    const clientOrigin = (config.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
    const setupUrl = new URL('/set-password', clientOrigin);
    setupUrl.searchParams.set('token', setupToken);
    try {
      await emailService.sendStudentAccountSetup(cleanEmail, setupUrl.toString());
    } catch (error) {
      await User.deleteOne({ _id: newUser._id });
      throw error;
    }
  }

  logger.info(`User created successfully by admin: ${newUser.email} [${newUser.role}]`);

  return newUser;
};

const resendStudentSetupInvite = async (id, ngoFilter) => {
  const user = await User.findOne(ngoFilter({
    _id: id,
    role: 'student',
    isPasswordSetupRequired: true,
    isActive: true
  })).select('+passwordSetupTokenHash +passwordSetupExpiresAt');
  if (!user) {
    const error = new Error('An active student account awaiting password setup was not found.');
    error.statusCode = 404;
    throw error;
  }

  const setupToken = crypto.randomBytes(32).toString('hex');
  const clientOrigin = (config.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
  const setupUrl = new URL('/set-password', clientOrigin);
  setupUrl.searchParams.set('token', setupToken);
  await emailService.sendStudentAccountSetup(user.email, setupUrl.toString());
  user.passwordSetupTokenHash = crypto.createHash('sha256').update(setupToken).digest('hex');
  user.passwordSetupExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  return User.findById(user._id);
};

/**
 * Retrieve user by ID
 */
const getUserById = async (id, ngoFilter) => {
  const user = await User.findOne(ngoFilter({ _id: id }));
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

/**
 * Update user details (no password update via this endpoint)
 */
const updateUser = async (id, { firstName, lastName, email, role, avatar }, ngoFilter) => {
  const user = await User.findOne(ngoFilter({ _id: id }));
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Prevent setting role to admin
  if (role === 'admin' || role === 'ngo_admin') {
    const error = new Error('Role cannot be changed to admin.');
    error.statusCode = 400;
    throw error;
  }

  // Prevent demoting existing admin via this endpoint
  if (['admin', 'ngo_admin'].includes(user.role) && role && role !== user.role) {
    const error = new Error('Administrator roles cannot be modified through User Management.');
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email ? email.toLowerCase().trim() : user.email;

  // Check duplicate email if changed
  if (cleanEmail !== user.email) {
    const emailConflict = await User.findOne(ngoFilter({
      email: cleanEmail,
      _id: { $ne: id }
    }));
    if (emailConflict) {
      const error = new Error('Email address is already registered.');
      error.statusCode = 409;
      throw error;
    }
    user.email = cleanEmail;
  }

  user.firstName = firstName.trim();
  user.lastName = lastName.trim();
  if (role && user.role !== 'admin') user.role = role;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();

  logger.info(`User updated successfully: ${user.email} [${user.role}]`);
  return user;
};

/**
 * Update user active status (soft deactivation)
 */
const updateUserStatus = async (id, isActive, currentAdminId, ngoFilter) => {
  // Prevent admin from deactivating their own account
  if (id.toString() === currentAdminId.toString()) {
    const error = new Error('You cannot deactivate your own admin account.');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne(ngoFilter({ _id: id }));
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isActive && ['admin', 'ngo_admin'].includes(user.role)) {
    const error = new Error('Administrator accounts cannot be deactivated through User Management.');
    error.statusCode = 400;
    throw error;
  }

  user.isActive = Boolean(isActive);
  await user.save();

  logger.info(`User status updated: ${user.email} -> isActive: ${user.isActive}`);
  return user;
};

module.exports = {
  listUsers,
  createUser,
  resendStudentSetupInvite,
  getUserById,
  updateUser,
  updateUserStatus
};

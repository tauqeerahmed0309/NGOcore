const { errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * 404 Route Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  return errorResponse(res, 404, `API route not found: [${req.method}] ${req.originalUrl}`);
};

/**
 * Centralized Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`Error on [${req.method}] ${req.originalUrl}:`, err.message || err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = `Supporting document exceeds the ${config.MAX_FILE_SIZE_MB} MB upload limit.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate entry for ${field}. A record with that value already exists.`;
    errors = [{ field, message }];
  }

  // Handle Mongoose Invalid ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format for: ${err.path}`;
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired. Please login again.';
  }

  if (statusCode >= 500 && config.NODE_ENV === 'production') {
    message = 'An unexpected server error occurred.';
    errors = null;
  } else if (config.NODE_ENV !== 'production' && statusCode === 500 && !errors) {
    errors = { stack: err.stack };
  }

  return errorResponse(res, statusCode, message, errors);
};

module.exports = {
  notFoundHandler,
  errorHandler
};

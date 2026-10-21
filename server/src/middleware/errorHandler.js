const { AppError } = require('../utils/errors');
const logger = require('../config/logger');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (!(err instanceof AppError)) {
    statusCode = 500;
    message = env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
    logger.error(err);
  } else if (env.NODE_ENV === 'development') {
    logger.error(err);
  }

  const response = {
    success: false,
    message,
    data: null,
    errors: err.errors || []
  };

  // Do not leak stack traces in production
  if (env.NODE_ENV === 'development' && !(err instanceof AppError)) {
    response.errors.push({ stack: err.stack });
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;

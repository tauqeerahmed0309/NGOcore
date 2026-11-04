/**
 * Standardized API Response Utilities
 */

const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    success: true,
    message,
    data,
    errors: null
  };
  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode = 500, message = 'An error occurred', errors = null) => {
  const response = {
    success: false,
    message,
    data: null,
    errors
  };
  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse
};

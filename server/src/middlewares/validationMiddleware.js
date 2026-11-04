const { errorResponse } = require('../utils/apiResponse');

/**
 * Validate request body against a Zod schema
 */
const formatZodErrors = (error) => {
  const issues = error?.issues || error?.errors || [];
  return issues.map((err) => ({
    field: err.path ? err.path.join('.') : '',
    message: err.message || 'Validation error'
  }));
};

/**
 * Validate request body against a Zod schema
 */
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return errorResponse(res, 400, 'Validation failed', formatZodErrors(result.error));
  }

  req.body = result.data;
  next();
};

/**
 * Validate request params against a Zod schema
 */
const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);

  if (!result.success) {
    return errorResponse(res, 400, 'Invalid URL parameter(s)', formatZodErrors(result.error));
  }

  req.params = result.data;
  next();
};

/**
 * Validate request query against a Zod schema
 */
const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);

  if (!result.success) {
    return errorResponse(res, 400, 'Invalid query parameter(s)', formatZodErrors(result.error));
  }

  req.query = result.data;
  next();
};

module.exports = {
  validateBody,
  validateParams,
  validateQuery
};

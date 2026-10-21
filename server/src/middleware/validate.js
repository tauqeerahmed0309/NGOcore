const { AppError } = require('../utils/errors');

/**
 * Validates request data against Zod schemas
 * @param {Object} schema - Zod schema (can have body, query, params)
 */
const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    next();
  } catch (error) {
    const issues = error.issues || error.errors || [];
    const formattedErrors = issues.map(err => ({
      field: Array.isArray(err.path) ? err.path.join('.') : '',
      message: err.message
    }));
    next(new AppError(400, 'Validation failed', formattedErrors));
  }
};

module.exports = validate;

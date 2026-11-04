const express = require('express');
const router = express.Router();
const { getDBStatus } = require('../config/db');
const { successResponse } = require('../utils/apiResponse');

/**
 * @route   GET /api/v1/health
 * @desc    System health check endpoint
 * @access  Public
 */
router.get('/', (req, res) => {
  return successResponse(res, 200, 'NGOcore API is running', {
    environment: process.env.NODE_ENV || 'development',
    database: getDBStatus(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

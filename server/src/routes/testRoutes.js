const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { successResponse } = require('../utils/apiResponse');

// Admin-only test endpoint
router.get('/admin-only', authMiddleware, roleMiddleware('admin'), (req, res) => {
  return successResponse(res, 200, 'Admin access granted', {
    user: req.user.email,
    role: req.user.role
  });
});

// Staff-only test endpoint (staff or admin)
router.get('/staff-only', authMiddleware, roleMiddleware('staff', 'admin'), (req, res) => {
  return successResponse(res, 200, 'Staff access granted', {
    user: req.user.email,
    role: req.user.role
  });
});

module.exports = router;

const express = require('express');
const multer = require('multer');
const router = express.Router();
const aiInsightsController = require('../controllers/aiInsightsController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Multer memory storage configuration (up to 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  }
});

// Authentication & NGO Tenant Isolation
router.use(authMiddleware);
router.use(ngoScope);

// Sample datasets metadata
router.get(
  '/samples',
  roleMiddleware('admin', 'ngo_admin', 'staff'),
  aiInsightsController.getSampleDatasets
);

// Analyze uploaded file or dataset payload
router.post(
  '/analyze',
  roleMiddleware('admin', 'ngo_admin', 'staff'),
  upload.single('file'),
  aiInsightsController.analyzeDataset
);

// Generate & Download Overview PDF Report
router.post(
  '/export-pdf',
  roleMiddleware('admin', 'ngo_admin', 'staff'),
  aiInsightsController.exportPdf
);

module.exports = router;

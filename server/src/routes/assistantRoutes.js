const express = require('express');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { validateBody } = require('../middlewares/validationMiddleware');
const {
  cleanReviewSchema,
  explainFindingRequestSchema,
  explainDuplicateRequestSchema,
  normalizeTextRequestSchema,
  proposeCorrectionRequestSchema
} = require('../validations/assistantValidation');
const assistantController = require('../controllers/assistantController');

const router = express.Router();

const cleaningLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many data-cleaning requests. Please try again later.', data: null, errors: null }
});

const insightsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many insights requests. Please try again later.', data: null, errors: null }
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many AI requests. Please try again later.', data: null, errors: null }
});

router.use(authMiddleware, ngoScope);

// Deterministic data cleaning and human review endpoints
router.post('/clean/:recordType', cleaningLimiter, roleMiddleware('admin', 'staff'), assistantController.analyze);
router.post('/clean/:recordType/review', cleaningLimiter, roleMiddleware('admin', 'staff'), validateBody(cleanReviewSchema), assistantController.review);
router.get('/insights/:recordType', insightsLimiter, roleMiddleware('admin'), assistantController.insights);

// AI status and explanation endpoints (Gemini / Hybrid)
router.get('/ai/status', roleMiddleware('admin', 'staff'), assistantController.aiStatus);
router.post('/ai/explain-finding', aiLimiter, roleMiddleware('admin', 'staff'), validateBody(explainFindingRequestSchema), assistantController.explainFinding);
router.post('/ai/explain-duplicate', aiLimiter, roleMiddleware('admin', 'staff'), validateBody(explainDuplicateRequestSchema), assistantController.explainDuplicate);
router.post('/ai/normalize-text', aiLimiter, roleMiddleware('admin', 'staff'), validateBody(normalizeTextRequestSchema), assistantController.normalizeText);
router.post('/ai/propose-correction', aiLimiter, roleMiddleware('admin', 'staff'), validateBody(proposeCorrectionRequestSchema), assistantController.proposeCorrection);

module.exports = router;

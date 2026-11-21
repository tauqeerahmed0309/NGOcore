const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  validateBody,
  validateParams,
  validateQuery
} = require('../middlewares/validationMiddleware');
const {
  donationIdParamSchema,
  createDonationSchema,
  updateDonationSchema,
  reverseDonationSchema,
  listDonationsQuerySchema
} = require('../validations/donationValidation');

// All donation operations require authenticated session and NGO tenant scoping
router.use(authMiddleware);
router.use(ngoScope);

// Only admin, ngo_admin, and staff can access donation records (financial data)
router.use(roleMiddleware('admin', 'ngo_admin', 'staff'));

// Aggregations and exports (must precede /:id)
router.get('/summary', donationController.getDonationSummary);
router.get(
  '/export',
  validateQuery(listDonationsQuerySchema),
  donationController.exportDonations
);

// Standard collection operations
router.get(
  '/',
  validateQuery(listDonationsQuerySchema),
  donationController.listDonations
);

router.post(
  '/',
  validateBody(createDonationSchema),
  donationController.createDonation
);

// Item operations
router.get(
  '/:id',
  validateParams(donationIdParamSchema),
  donationController.getDonationById
);

router.put(
  '/:id',
  validateParams(donationIdParamSchema),
  validateBody(updateDonationSchema),
  donationController.updateDonation
);

router.patch(
  '/:id/verify',
  validateParams(donationIdParamSchema),
  donationController.verifyDonation
);

router.patch(
  '/:id/approve',
  validateParams(donationIdParamSchema),
  donationController.approveDonation
);

router.post(
  '/:id/reverse',
  validateParams(donationIdParamSchema),
  validateBody(reverseDonationSchema),
  donationController.reverseDonation
);

router.post(
  '/:id/receipt',
  validateParams(donationIdParamSchema),
  donationController.issueReceipt
);

router.get(
  '/:id/receipt',
  validateParams(donationIdParamSchema),
  donationController.getReceiptMetadata
);

router.get(
  '/:id/receipt/pdf',
  validateParams(donationIdParamSchema),
  donationController.downloadReceiptPdf
);

module.exports = router;

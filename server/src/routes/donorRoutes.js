const express = require('express');
const router = express.Router();

const donorController = require('../controllers/donorController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  validateBody,
  validateParams,
  validateQuery
} = require('../middlewares/validationMiddleware');
const {
  createDonorSchema,
  updateDonorSchema,
  updateDonorStatusSchema,
  donorIdParamSchema,
  listDonorsQuerySchema
} = require('../validations/donorValidation');

// All donor routes require authentication and NGO multi-tenant scoping
router.use(authMiddleware);
router.use(ngoScope);

// 1. List donors with search, filters, sorting, and pagination (Admin, Staff)
router.get(
  '/',
  roleMiddleware('admin', 'staff'),
  validateQuery(listDonorsQuerySchema),
  donorController.listDonors
);

// 2. Create donor profile (Admin, Staff)
router.post(
  '/',
  roleMiddleware('admin', 'staff'),
  validateBody(createDonorSchema),
  donorController.createDonor
);

// 3. Get donor details by ID (Admin, Staff)
router.get(
  '/:id',
  roleMiddleware('admin', 'staff'),
  validateParams(donorIdParamSchema),
  donorController.getDonorById
);

// 4. Update donor details (Admin, Staff)
router.put(
  '/:id',
  roleMiddleware('admin', 'staff'),
  validateParams(donorIdParamSchema),
  validateBody(updateDonorSchema),
  donorController.updateDonor
);

// 5. Update donor status / archive (Admin, Staff)
router.patch(
  '/:id/status',
  roleMiddleware('admin', 'staff'),
  validateParams(donorIdParamSchema),
  validateBody(updateDonorStatusSchema),
  donorController.updateDonorStatus
);

// 6. Safely delete donor record (Admin only)
router.delete(
  '/:id',
  roleMiddleware('admin'),
  validateParams(donorIdParamSchema),
  donorController.deleteDonor
);

module.exports = router;

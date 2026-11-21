const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Base authentication and tenant scoping
router.use(authMiddleware);
router.use(ngoScope);

// Summary & Export endpoints
router.get('/summary', roleMiddleware('admin', 'ngo_admin', 'staff'), volunteerController.getVolunteerSummary);
router.get('/export', roleMiddleware('admin', 'ngo_admin', 'staff'), volunteerController.exportVolunteers);

// Core CRUD endpoints
router
  .route('/')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), volunteerController.getVolunteers)
  .post(roleMiddleware('admin', 'ngo_admin', 'staff'), volunteerController.createVolunteer);

router
  .route('/:id')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), volunteerController.getVolunteerById)
  .put(roleMiddleware('admin', 'ngo_admin', 'staff'), volunteerController.updateVolunteer)
  .delete(roleMiddleware('admin', 'ngo_admin'), volunteerController.deleteVolunteer);

// Volunteer hours logging & approval workflows
router.post(
  '/:id/hours',
  roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'),
  volunteerController.logHours
);

router.patch(
  '/:id/hours/:logId',
  roleMiddleware('admin', 'ngo_admin', 'staff'),
  volunteerController.reviewHours
);

module.exports = router;

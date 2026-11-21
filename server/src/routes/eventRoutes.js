const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Base authentication and tenant scoping
router.use(authMiddleware);
router.use(ngoScope);

// Summary & Export endpoints
router.get('/summary', roleMiddleware('admin', 'ngo_admin', 'staff'), eventController.getEventSummary);
router.get('/export', roleMiddleware('admin', 'ngo_admin', 'staff'), eventController.exportEvents);

// Core CRUD endpoints
router
  .route('/')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), eventController.getEvents)
  .post(roleMiddleware('admin', 'ngo_admin', 'staff'), eventController.createEvent);

router
  .route('/:id')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), eventController.getEventById)
  .put(roleMiddleware('admin', 'ngo_admin', 'staff'), eventController.updateEvent)
  .delete(roleMiddleware('admin', 'ngo_admin'), eventController.deleteEvent);

// Attendee registration & check-in
router.post(
  '/:id/attendees',
  roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'),
  eventController.registerAttendee
);

router.patch(
  '/:id/attendees/:attendeeId/checkin',
  roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'),
  eventController.checkInAttendee
);

module.exports = router;

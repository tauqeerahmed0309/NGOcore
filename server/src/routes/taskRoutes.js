const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Base authentication and tenant scoping
router.use(authMiddleware);
router.use(ngoScope);

// Summary & Export endpoints
router.get('/summary', roleMiddleware('admin', 'ngo_admin', 'staff'), taskController.getTaskSummary);
router.get('/export', roleMiddleware('admin', 'ngo_admin', 'staff'), taskController.exportTasks);

// Core CRUD endpoints
router
  .route('/')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), taskController.getTasks)
  .post(roleMiddleware('admin', 'ngo_admin', 'staff'), taskController.createTask);

router
  .route('/:id')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), taskController.getTaskById)
  .put(roleMiddleware('admin', 'ngo_admin', 'staff'), taskController.updateTask)
  .delete(roleMiddleware('admin', 'ngo_admin'), taskController.deleteTask);

// Task Status update
router.patch(
  '/:id/status',
  roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'),
  taskController.updateTaskStatus
);

module.exports = router;

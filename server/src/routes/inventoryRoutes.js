const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Base authentication and tenant scoping
router.use(authMiddleware);
router.use(ngoScope);

// Summary & Export endpoints
router.get('/summary', roleMiddleware('admin', 'ngo_admin', 'staff'), inventoryController.getInventorySummary);
router.get('/export', roleMiddleware('admin', 'ngo_admin', 'staff'), inventoryController.exportInventory);

// Core CRUD endpoints
router
  .route('/')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), inventoryController.getInventoryItems)
  .post(roleMiddleware('admin', 'ngo_admin', 'staff'), inventoryController.createItem);

router
  .route('/:id')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), inventoryController.getInventoryItemById)
  .put(roleMiddleware('admin', 'ngo_admin', 'staff'), inventoryController.updateInventoryItem)
  .delete(roleMiddleware('admin', 'ngo_admin'), inventoryController.deleteInventoryItem);

// Stock Transactions (inflow, outflow, adjustment)
router.post(
  '/:id/transactions',
  roleMiddleware('admin', 'ngo_admin', 'staff'),
  inventoryController.recordTransaction
);

module.exports = router;

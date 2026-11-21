const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middlewares/authMiddleware');
const ngoScope = require('../middlewares/ngoScope');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Base authentication and tenant scoping
router.use(authMiddleware);
router.use(ngoScope);

// Summary & Export endpoints
router.get('/summary', roleMiddleware('admin', 'ngo_admin', 'staff'), documentController.getDocumentSummary);
router.get('/export', roleMiddleware('admin', 'ngo_admin', 'staff'), documentController.exportDocuments);

// Core CRUD endpoints
router
  .route('/')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), documentController.getDocuments)
  .post(roleMiddleware('admin', 'ngo_admin', 'staff'), documentController.createDocument);

router
  .route('/:id')
  .get(roleMiddleware('admin', 'ngo_admin', 'staff', 'volunteer'), documentController.getDocumentById)
  .put(roleMiddleware('admin', 'ngo_admin', 'staff'), documentController.updateDocument)
  .delete(roleMiddleware('admin', 'ngo_admin'), documentController.deleteDocument);

// Document Verification (Admin only)
router.patch(
  '/:id/verify',
  roleMiddleware('admin', 'ngo_admin'),
  documentController.verifyDocument
);

module.exports = router;

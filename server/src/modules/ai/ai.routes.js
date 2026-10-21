const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireNgoStatus } = require('../../middleware/ngoStatus');
const { requirePermission } = require('../../middleware/permissions');
const { ngoScope } = require('../../middleware/ngoScope');
const aiController = require('./ai.controller');

const router = express.Router();

// Enforce authentication, approved NGO status, and tenant scoping across all AI endpoints
router.use(requireAuth, requireNgoStatus('approved'), ngoScope);

// Data Quality & Deduplication
router.post('/deduplicate', requirePermission('records:read'), aiController.scanDuplicates);
router.post('/anomalies', requirePermission('records:read'), aiController.scanAnomalies);
router.post('/merge', requirePermission('records:update'), aiController.mergeRecords);

// Analytics & Forecasting
router.post('/vulnerability', requirePermission('records:read'), aiController.analyzeVulnerability);
router.get('/forecast', requirePermission('records:read'), aiController.forecastDemand);
router.get('/history', requirePermission('records:read'), aiController.getAiHistory);

module.exports = router;

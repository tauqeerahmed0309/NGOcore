const aiService = require('./ai.service');
const { sendSuccess } = require('../../utils/response');

class AiController {
  async scanDuplicates(req, res, next) {
    try {
      const { recordTypeId, threshold } = req.body || {};
      const result = await aiService.scanDeduplication(req.ngoId, { recordTypeId, threshold }, req.user);
      return sendSuccess(res, 200, 'Deduplication scan completed', result);
    } catch (err) {
      next(err);
    }
  }

  async scanAnomalies(req, res, next) {
    try {
      const { recordTypeId } = req.body || {};
      const result = await aiService.scanAnomalies(req.ngoId, { recordTypeId }, req.user);
      return sendSuccess(res, 200, 'Anomaly detection scan completed', result);
    } catch (err) {
      next(err);
    }
  }

  async mergeRecords(req, res, next) {
    try {
      const { primaryRecordId, duplicateRecordId, mergedData, deleteDuplicate } = req.body || {};
      const result = await aiService.mergeRecords(
        req.ngoId,
        { primaryRecordId, duplicateRecordId, mergedData, deleteDuplicate },
        req.user
      );
      return sendSuccess(res, 200, 'Records merged successfully', result);
    } catch (err) {
      next(err);
    }
  }

  async analyzeVulnerability(req, res, next) {
    try {
      const { recordTypeId } = req.body || {};
      const result = await aiService.analyzeVulnerabilities(req.ngoId, { recordTypeId }, req.user);
      return sendSuccess(res, 200, 'Vulnerability analysis completed', result);
    } catch (err) {
      next(err);
    }
  }

  async forecastDemand(req, res, next) {
    try {
      const { periodsAhead } = req.query || {};
      const periods = periodsAhead ? parseInt(periodsAhead, 10) : 3;
      const result = await aiService.forecastDemand(req.ngoId, { periodsAhead: periods }, req.user);
      return sendSuccess(res, 200, 'Demand forecasting calculated', result);
    } catch (err) {
      next(err);
    }
  }

  async getAiHistory(req, res, next) {
    try {
      const { type, limit } = req.query || {};
      const results = await aiService.getAiHistory(req.ngoId, { type, limit });
      return sendSuccess(res, 200, 'AI execution history retrieved', results);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AiController();

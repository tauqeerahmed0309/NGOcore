const Student = require('../models/Student');
const Program = require('../models/Program');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');
const { analyzeRecords, applyReview } = require('../services/dataAssistantService');
const { summarizeMetrics } = require('../services/aiSummaryService');

const recordModels = {
  students: Student,
  programs: Program
};

const validateRecordType = (recordType) => Boolean(recordModels[recordType]);

const analyze = async (req, res, next) => {
  try {
    const { recordType } = req.params;
    if (!validateRecordType(recordType)) {
      return errorResponse(res, 400, 'Record type must be students or programs.');
    }
    const analysis = await analyzeRecords(recordType, req.ngoFilter);
    return successResponse(res, 200, 'Data quality review ready.', {
      recordType,
      ...analysis,
      notice: 'AI-assisted suggestions require your decision for each item. No records are changed automatically.'
    });
  } catch (error) {
    return next(error);
  }
};

const review = async (req, res, next) => {
  try {
    const { recordType } = req.params;
    if (!validateRecordType(recordType)) {
      return errorResponse(res, 400, 'Record type must be students or programs.');
    }

    const { recordId, issueType, field, relatedRecordId, decision, proposedValue } = req.body;
    const result = await applyReview({
      recordType,
      recordId,
      issueType,
      field,
      relatedRecordId,
      decision,
      proposedValue,
      ngoFilter: req.ngoFilter
    });
    await writeAuditLog({
      req,
      actor: req.user,
      action: 'update',
      entityType: 'data_cleaning_review',
      entityId: recordId,
      metadata: { recordType, issueType, field: field || null, relatedRecordId: relatedRecordId || null, decision, applied: result.applied }
    });
    return successResponse(res, 200, result.applied ? 'The confirmed fix was applied.' : 'Review decision recorded; the record was not changed.', {
      applied: result.applied,
      recordId
    });
  } catch (error) {
    return next(error);
  }
};

const insights = async (req, res, next) => {
  try {
    const { recordType } = req.params;
    const Model = recordModels[recordType];
    if (!Model) return errorResponse(res, 400, 'Record type must be students or programs.');

    const now = new Date();
    const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const [aggregates] = await Model.aggregate([
      { $match: req.ngoFilter({}) },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],
          timeline: [
            { $match: { createdAt: { $gte: rangeStart } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]);
    const countsByMonth = new Map((aggregates?.timeline || []).map((entry) => [entry._id, entry.count]));
    const timeline = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
      const key = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
      return {
        month: new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(month),
        count: countsByMonth.get(key) || 0
      };
    });
    const metrics = {
      totalRecords: aggregates?.total?.[0]?.count || 0,
      byStatus: (aggregates?.byStatus || []).map(({ _id, count }) => ({ status: _id || 'unspecified', count })),
      timeline
    };
    const summary = await summarizeMetrics(recordType, metrics);
    return successResponse(res, 200, 'Aggregated insights ready.', {
      recordType,
      metrics,
      summary,
      summaryUnavailable: !summary
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { analyze, review, insights };

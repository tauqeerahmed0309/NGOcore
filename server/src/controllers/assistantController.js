const Student = require('../models/Student');
const Program = require('../models/Program');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');
const { analyzeRecords, applyReview, buildRecordFlags, CORRECTION_ALLOWED_FIELDS } = require('../services/dataAssistantService');
const {
  summarizeMetrics,
  getProviderStatus,
  explainFinding: explainFindingAi,
  explainDuplicate: explainDuplicateAi,
  suggestNormalization: suggestNormalizationAi,
  proposeCorrection: proposeCorrectionAi
} = require('../services/aiProviderService');

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

const aiStatus = async (req, res, next) => {
  try {
    const status = getProviderStatus();
    return successResponse(res, 200, 'AI provider status retrieved.', status);
  } catch (error) {
    return next(error);
  }
};

const explainFinding = async (req, res, next) => {
  try {
    const { issueType, field, currentValue, suggestedValue } = req.body;
    const result = await explainFindingAi({ issueType, field, currentValue, suggestedValue });
    if (!result.success) {
      return successResponse(res, 200, 'AI explanation is currently unavailable.', {
        available: false,
        reason: result.reason,
        error: result.error
      });
    }
    return successResponse(res, 200, 'AI finding explanation ready.', {
      available: true,
      ...result.data,
      meta: result.meta
    });
  } catch (error) {
    return next(error);
  }
};

const explainDuplicate = async (req, res, next) => {
  try {
    const { score, reason, matchedFields, recordLabel, relatedRecordLabel } = req.body;
    const result = await explainDuplicateAi({ score, reason, matchedFields, recordLabel, relatedRecordLabel });
    if (!result.success) {
      return successResponse(res, 200, 'AI explanation is currently unavailable.', {
        available: false,
        reason: result.reason,
        error: result.error
      });
    }
    return successResponse(res, 200, 'AI duplicate explanation ready.', {
      available: true,
      ...result.data,
      meta: result.meta
    });
  } catch (error) {
    return next(error);
  }
};

const normalizeText = async (req, res, next) => {
  try {
    const { text, fieldType } = req.body;
    const result = await suggestNormalizationAi({ text, fieldType });
    if (!result.success) {
      return successResponse(res, 200, 'AI text normalization is currently unavailable.', {
        available: false,
        reason: result.reason,
        error: result.error
      });
    }
    return successResponse(res, 200, 'AI text normalization suggestion ready.', {
      available: true,
      ...result.data,
      meta: result.meta
    });
  } catch (error) {
    return next(error);
  }
};

const proposeCorrection = async (req, res, next) => {
  try {
    const { recordType, recordId, field, issueType } = req.body;
    const Model = recordModels[recordType];
    if (!Model) {
      return errorResponse(res, 400, 'Record type must be students or programs.');
    }

    const allowed = CORRECTION_ALLOWED_FIELDS[recordType] || [];
    if (!allowed.includes(field)) {
      return errorResponse(res, 400, `Field "${field}" does not support automated correction proposals.`);
    }

    const record = await Model.findOne(req.ngoFilter({ _id: recordId }));
    if (!record) {
      return errorResponse(res, 404, 'Record not found or access denied.');
    }

    const flags = buildRecordFlags(recordType, record.toObject());
    const matchingFlag = flags.find((f) => f.field === field && f.type === issueType);
    if (!matchingFlag) {
      return errorResponse(res, 400, 'No active deterministic data-quality issue found for this record and field.');
    }

    const result = await proposeCorrectionAi({
      recordType,
      field,
      currentValue: matchingFlag.currentValue || '',
      issueType,
      recordLabel: matchingFlag.recordLabel,
      description: matchingFlag.description
    });

    if (!result.success) {
      return successResponse(res, 200, 'AI correction proposal is currently unavailable.', {
        available: false,
        reason: result.reason,
        error: result.error
      });
    }

    return successResponse(res, 200, 'AI correction proposal ready.', {
      available: true,
      recordId,
      field,
      issueType,
      ...result.data,
      meta: result.meta,
      notice: 'This is an advisory AI proposal. Human review and explicit confirmation are required to apply any change.'
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  analyze,
  review,
  insights,
  aiStatus,
  explainFinding,
  explainDuplicate,
  normalizeText,
  proposeCorrection
};

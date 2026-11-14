const crypto = require('crypto');
const config = require('../config/env');
const Student = require('../models/Student');
const Program = require('../models/Program');
const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');
const {
  analyzeRecords,
  applyReview,
  buildRecordFlags,
  CORRECTION_ALLOWED_FIELDS,
  validateCorrectionProposal,
  calculateRecordDQI,
  calculateDatasetDQI
} = require('../services/dataAssistantService');
const geminiService = require('../services/geminiService');
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

const sanitizeAuditValue = (val) => {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  const masked = geminiService.sanitizeText(str);
  return masked.length > 150 ? `${masked.slice(0, 150)}...` : masked;
};

// Cryptographic proposal tokens to eliminate client metadata tampering in audit logs
const createProposalToken = ({
  recordId,
  recordType,
  field,
  issueType,
  proposedValue,
  provider,
  model,
  ngoId
}) => {
  const secret = config.JWT_SECRET;
  const tokenId = crypto.randomUUID();
  const payload = {
    tokenId,
    recordId: String(recordId),
    recordType: String(recordType || ''),
    field: String(field || ''),
    issueType: String(issueType),
    proposedValue: String(proposedValue || '').trim(),
    provider: String(provider),
    model: String(model),
    ngoId: String(ngoId || ''),
    createdAt: Date.now()
  };
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(serialized).digest('base64url');
  return `${serialized}.${signature}`;
};

const verifyProposalToken = (token) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [serialized, signature] = parts;
  if (!serialized || !signature) return null;

  try {
    const secret = config.JWT_SECRET;
    const expectedSigBuffer = crypto.createHmac('sha256', secret).update(serialized).digest();
    const sigBuffer = Buffer.from(signature, 'base64url');

    if (sigBuffer.length !== expectedSigBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) return null;

    const payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf8'));
    // Valid for 24 hours
    if (typeof payload.createdAt !== 'number' || Date.now() - payload.createdAt > 24 * 60 * 60 * 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

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

    const {
      recordId,
      issueType,
      field,
      relatedRecordId,
      decision,
      proposedValue,
      proposalToken
    } = req.body;

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

    // Derive AI provider and model ONLY from verified cryptographic proposal token
    let trustedAiProvider = null;
    let trustedAiModel = null;
    let trustedTokenId = null;

    if (proposalToken) {
      const verified = verifyProposalToken(proposalToken);
      const tenantNgoId = String(req.ngoFilter?.ngoId || '');
      const recordNgoId = String(result.record?.ngoId || '');
      const matchesTenant = verified && (!verified.ngoId || verified.ngoId === tenantNgoId || verified.ngoId === recordNgoId);
      const matchesProposedValue = decision !== 'accept' || verified?.proposedValue === String(proposedValue || '').trim();

      if (
        verified &&
        verified.recordId === String(recordId) &&
        verified.recordType === String(recordType) &&
        verified.field === String(field || '') &&
        verified.issueType === String(issueType) &&
        matchesTenant &&
        matchesProposedValue
      ) {
        // Prevent token reuse from creating misleading duplicate approval audit records
        const isReused = verified.tokenId
          ? await AuditLog.exists({
              action: 'update',
              entityType: 'data_cleaning_review',
              'metadata.proposalTokenId': verified.tokenId
            })
          : false;

        if (!isReused) {
          trustedAiProvider = verified.provider;
          trustedAiModel = verified.model;
          trustedTokenId = verified.tokenId || null;
        }
      }
    }

    // findingId is strictly derived by the server from deterministic evaluation
    const trustedFindingId = result.findingId || (field ? `${recordId}:${issueType}:${field}` : `${recordId}:${issueType}`);

    await writeAuditLog({
      req,
      actor: req.user,
      action: 'update',
      entityType: 'data_cleaning_review',
      entityId: recordId,
      metadata: {
        recordType,
        issueType,
        targetField: field || null,
        field: field || null,
        relatedRecordId: relatedRecordId || null,
        originalValue: result.originalValue !== undefined && result.originalValue !== null
          ? sanitizeAuditValue(result.originalValue)
          : null,
        proposedValue: result.proposedValue !== undefined && result.proposedValue !== null
          ? sanitizeAuditValue(result.proposedValue)
          : null,
        associatedFinding: issueType,
        findingId: trustedFindingId,
        aiProvider: trustedAiProvider,
        aiModel: trustedAiModel,
        proposalTokenId: trustedTokenId,
        decision,
        applied: result.applied,
        reviewerId: req.user?._id ? String(req.user._id) : null,
        reviewerRole: req.user?.role || null,
        reviewedAt: new Date().toISOString()
      }
    });

    return successResponse(res, 200, result.applied ? 'The confirmed fix was applied.' : 'Review decision recorded; the record was not changed.', {
      applied: result.applied,
      recordId,
      targetField: field || null,
      decision,
      auditLogged: true
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

    // STAGE 3C PHASE 2: Deterministic validation of AI proposed value using existing field rules
    const validationCheck = validateCorrectionProposal(
      recordType,
      field,
      result.data.proposedValue,
      record.toObject()
    );

    if (!validationCheck.valid) {
      return successResponse(res, 200, 'AI correction proposal could not be validated against field rules.', {
        available: false,
        reason: 'invalid_ai_proposal',
        error: `AI proposed value failed field-level validation rules: ${validationCheck.error}`
      });
    }

    const modelUsed = result.meta?.model || config.GEMINI_MODEL || 'gemini-2.5-flash';
    const proposalToken = createProposalToken({
      recordId,
      recordType,
      field,
      issueType,
      proposedValue: validationCheck.sanitizedValue,
      provider: 'gemini',
      model: modelUsed,
      ngoId: req.ngoFilter?.ngoId || record.ngoId
    });

    return successResponse(res, 200, 'AI correction proposal ready.', {
      available: true,
      recordId,
      field,
      issueType,
      proposedValue: validationCheck.sanitizedValue,
      rawProposedValue: result.data.proposedValue,
      reasoning: result.data.reasoning,
      confidenceCategory: result.data.confidenceCategory,
      validated: true,
      proposalToken,
      meta: result.meta,
      notice: 'This is an advisory AI proposal. Human review and explicit confirmation are required to apply any change.'
    });
  } catch (error) {
    return next(error);
  }
};

const getDqi = async (req, res, next) => {
  try {
    const { recordType } = req.params;
    const Model = recordModels[recordType];
    if (!Model) {
      return errorResponse(res, 400, 'Record type must be students or programs.');
    }

    const records = await Model.find(req.ngoFilter({})).select(
      recordType === 'students'
        ? 'firstName lastName registrationNumber email dateOfBirth phone pinCode state address createdAt'
        : 'name code type category startDate endDate createdAt'
    ).lean();

    const flags = records.flatMap((record) => buildRecordFlags(recordType, record));
    const dqi = calculateDatasetDQI(recordType, records, flags);

    return successResponse(res, 200, 'Data Quality Index calculated.', {
      recordType,
      dqi
    });
  } catch (error) {
    return next(error);
  }
};

const getRecordDqi = async (req, res, next) => {
  try {
    const { recordType, recordId } = req.params;
    const Model = recordModels[recordType];
    if (!Model) {
      return errorResponse(res, 400, 'Record type must be students or programs.');
    }

    const record = await Model.findOne(req.ngoFilter({ _id: recordId })).lean();
    if (!record) {
      return errorResponse(res, 404, 'Record not found or access denied.');
    }

    const flags = buildRecordFlags(recordType, record);
    const dqi = calculateRecordDQI(recordType, record, flags);

    return successResponse(res, 200, 'Record Data Quality Index calculated.', {
      recordType,
      recordId,
      dqi
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
  proposeCorrection,
  getDqi,
  getRecordDqi,
  createProposalToken,
  verifyProposalToken
};

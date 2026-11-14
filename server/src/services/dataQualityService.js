/**
 * Data Quality Intelligence Service (Stage 3C Phase 2)
 *
 * Deterministic Data Quality Index (DQI) scoring engine.
 * Computes transparent, normalized (0-100) quality scores derived solely from
 * deterministic validation rules and algorithmic findings, NEVER from AI opinions.
 *
 * Scoring Methodology:
 * - 4 Weighted Dimensions:
 *   1. Completeness (35%): Mandatory fields present (optional fields are never penalized).
 *   2. Validity & Accuracy (35%): Provided data conforms to regex, domain limits, and plausibility.
 *   3. Consistency & Standardization (15%): Proper casing, trimmed whitespace, and canonical formatting.
 *   4. Uniqueness (15%): Absence of duplicate candidate records (deduplicated per entity pair).
 *
 * Quality Categories / Bands:
 *   - 90 - 100: "Excellent" (High data integrity, ready for NGO reporting)
 *   - 75 - 89:  "Good"      (Minor standardization/formatting issues)
 *   - 50 - 74:  "Fair"      (Moderate issues, staff review recommended)
 *   - 0 - 49:   "Poor"      (Missing mandatory data or severe validation defects)
 */

const DQI_WEIGHTS = {
  completeness: 35,
  validity: 35,
  standardization: 15,
  uniqueness: 15
};

const MANDATORY_FIELDS = {
  students: ['registrationNumber', 'firstName', 'lastName'],
  programs: ['name', 'code', 'type']
};

const OPTIONAL_FIELDS = {
  students: [
    'email',
    'phone',
    'dateOfBirth',
    'gender',
    'pinCode',
    'state',
    'address',
    'guardianName',
    'guardianRelationship',
    'educationLevel',
    'schoolName',
    'notes'
  ],
  programs: [
    'category',
    'description',
    'startDate',
    'endDate',
    'schedule',
    'location',
    'coordinator'
  ]
};

const DQI_RATING_BANDS = [
  { min: 90, rating: 'Excellent', label: 'High data integrity, ready for operational use and statutory reporting.' },
  { min: 75, rating: 'Good', label: 'Good quality data with minor formatting or non-critical standardization items.' },
  { min: 50, rating: 'Fair', label: 'Moderate quality issues detected. Manual review recommended before reporting.' },
  { min: 0, rating: 'Poor', label: 'Critical data quality defects or missing mandatory fields requiring immediate correction.' }
];

const classifyRating = (score) => {
  if (score === null || score === undefined) return 'not_assessable';
  const normalized = Math.min(100, Math.max(0, Number(score) || 0));
  for (const band of DQI_RATING_BANDS) {
    if (normalized >= band.min) {
      return band.rating;
    }
  }
  return 'Poor';
};

const hasValue = (val) => val !== null && val !== undefined && String(val).trim() !== '';

/**
 * Calculate deterministic DQI for an individual record
 *
 * @param {string} recordType - 'students' or 'programs'
 * @param {object} record - Plain JavaScript record object
 * @param {Array} recordFlags - Deterministic findings matching this record
 * @returns {object} Detailed structured DQI evaluation
 */
const calculateRecordDQI = (recordType, record, recordFlags = []) => {
  const id = String(record?._id || record?.id || 'unknown');
  const mandatoryFields = MANDATORY_FIELDS[recordType] || [];
  const optionalFields = OPTIONAL_FIELDS[recordType] || [];

  // Filter flags strictly belonging to this record
  const flags = Array.isArray(recordFlags)
    ? recordFlags.filter((f) => String(f.recordId) === id)
    : [];

  const deductions = [];

  // --------------------------------------------------------------------------
  // Dimension 1: Completeness (Weight: 35%)
  // Measures presence of mandatory fields. Optional fields are NEVER penalized.
  // --------------------------------------------------------------------------
  const missingRequiredFlags = flags.filter((f) => f.type === 'missing_required');
  const missingCount = missingRequiredFlags.length;
  const totalMandatory = mandatoryFields.length || 1;

  let completenessScore = Math.max(0, 100 - (missingCount / totalMandatory) * 100);
  completenessScore = Math.round(completenessScore * 10) / 10;

  for (const flag of missingRequiredFlags) {
    const pointsDeducted = Math.round(((100 / totalMandatory) * (DQI_WEIGHTS.completeness / 100)) * 10) / 10;
    deductions.push({
      dimension: 'completeness',
      field: flag.field,
      severity: 'high',
      pointsDeducted,
      reason: flag.description || `Required mandatory field “${flag.field}” is missing.`
    });
  }

  // --------------------------------------------------------------------------
  // Dimension 2: Validity & Accuracy (Weight: 35%)
  // Evaluates whether provided field values conform to validation rules.
  // A missing optional field is NOT an invalid value.
  // --------------------------------------------------------------------------
  const validityFlags = flags.filter((f) => {
    if (f.type === 'missing_required') return false; // Handled in completeness
    if (f.type === 'possible_duplicate') return false; // Handled in uniqueness
    return f.type === 'invalid_value' || (f.type === 'inconsistent_format' && f.severity === 'high');
  });

  // Deduct 25 points from Validity dimension per invalid field (max 4 defects = 0 score)
  const validityDefectPoints = Math.min(100, validityFlags.length * 25);
  const validityScore = Math.max(0, 100 - validityDefectPoints);

  for (const flag of validityFlags) {
    const pointsDeducted = Math.round((25 * (DQI_WEIGHTS.validity / 100)) * 10) / 10;
    deductions.push({
      dimension: 'validity',
      field: flag.field,
      severity: 'high',
      pointsDeducted,
      reason: flag.description || `Field “${flag.field}” contains invalid or implausible data.`
    });
  }

  // --------------------------------------------------------------------------
  // Dimension 3: Consistency & Standardization (Weight: 15%)
  // Evaluates formatting, casing, whitespace, and canonical representation.
  // Mutually exclusive with validity (does not double-count invalid fields).
  // --------------------------------------------------------------------------
  const invalidFields = new Set(validityFlags.map((f) => f.field));
  const standardizationFlags = flags.filter((f) => {
    if (f.type === 'missing_required' || f.type === 'possible_duplicate') return false;
    // Explicit safeguard: A field with an active validity defect is never double-penalized under standardization
    if (invalidFields.has(f.field)) return false;
    return f.type === 'inconsistent_format' && (f.severity === 'low' || f.severity === 'medium');
  });

  // Deduct 15 points per standardization defect from Consistency dimension
  const standardDefectPoints = Math.min(100, standardizationFlags.length * 15);
  const standardizationScore = Math.max(0, 100 - standardDefectPoints);

  for (const flag of standardizationFlags) {
    const pointsDeducted = Math.round((15 * (DQI_WEIGHTS.standardization / 100)) * 10) / 10;
    deductions.push({
      dimension: 'standardization',
      field: flag.field,
      severity: flag.severity,
      pointsDeducted,
      reason: flag.description || `Field “${flag.field}” has non-standard casing or whitespace.`
    });
  }

  // --------------------------------------------------------------------------
  // Dimension 4: Uniqueness (Weight: 15%)
  // Evaluates candidate duplicate matches.
  // Avoids double-counting: Deduplicates by relatedRecordId so multiple
  // candidate blocking passes for the same duplicate entity pair count once.
  // --------------------------------------------------------------------------
  const duplicateFlags = flags.filter((f) => f.type === 'possible_duplicate');
  const seenRelatedIds = new Set();
  const uniqueDuplicatePairs = [];

  for (const flag of duplicateFlags) {
    const relatedKey = String(flag.relatedRecordId || '');
    if (relatedKey && !seenRelatedIds.has(relatedKey)) {
      seenRelatedIds.add(relatedKey);
      uniqueDuplicatePairs.push(flag);
    }
  }

  let uniquenessPenalty = 0;
  for (const dup of uniqueDuplicatePairs) {
    // 50 points deduction from Uniqueness dimension for high confidence, 30 for medium
    const penaltyPerMatch = (dup.severity === 'high' || dup.confidence === 'high' || (typeof dup.score === 'number' && dup.score >= 0.9)) ? 50 : 30;
    uniquenessPenalty += penaltyPerMatch;

    const pointsDeducted = Math.round((penaltyPerMatch * (DQI_WEIGHTS.uniqueness / 100)) * 10) / 10;
    deductions.push({
      dimension: 'uniqueness',
      field: 'record',
      severity: dup.severity || 'medium',
      pointsDeducted,
      reason: dup.description || `Flagged as possible duplicate of record ${dup.relatedRecordId}.`
    });
  }

  const uniquenessScore = Math.max(0, 100 - uniquenessPenalty);

  // --------------------------------------------------------------------------
  // Composite Score Calculation (Normalized 0 to 100)
  // --------------------------------------------------------------------------
  const weightedScore = (
    completenessScore * (DQI_WEIGHTS.completeness / 100) +
    validityScore * (DQI_WEIGHTS.validity / 100) +
    standardizationScore * (DQI_WEIGHTS.standardization / 100) +
    uniquenessScore * (DQI_WEIGHTS.uniqueness / 100)
  );

  const finalScore = Math.min(100, Math.max(0, Math.round(weightedScore * 10) / 10));
  const rating = classifyRating(finalScore);

  // Informational Fill Rate for Optional Fields (does NOT penalize score)
  let filledOptional = 0;
  for (const field of optionalFields) {
    if (hasValue(record[field])) {
      filledOptional += 1;
    }
  }
  const optionalFillRate = optionalFields.length > 0
    ? Math.round((filledOptional / optionalFields.length) * 1000) / 10
    : 100;

  return {
    recordId: id,
    recordType,
    score: finalScore,
    rating,
    dimensions: {
      completeness: {
        score: completenessScore,
        weight: DQI_WEIGHTS.completeness,
        weightedScore: Math.round(completenessScore * (DQI_WEIGHTS.completeness / 100) * 10) / 10,
        status: completenessScore >= 90 ? 'optimal' : completenessScore >= 70 ? 'acceptable' : 'critical',
        findingsCount: missingCount
      },
      validity: {
        score: validityScore,
        weight: DQI_WEIGHTS.validity,
        weightedScore: Math.round(validityScore * (DQI_WEIGHTS.validity / 100) * 10) / 10,
        status: validityScore >= 90 ? 'optimal' : validityScore >= 70 ? 'acceptable' : 'critical',
        findingsCount: validityFlags.length
      },
      standardization: {
        score: standardizationScore,
        weight: DQI_WEIGHTS.standardization,
        weightedScore: Math.round(standardizationScore * (DQI_WEIGHTS.standardization / 100) * 10) / 10,
        status: standardizationScore >= 90 ? 'optimal' : standardizationScore >= 70 ? 'acceptable' : 'minor_defects',
        findingsCount: standardizationFlags.length
      },
      uniqueness: {
        score: uniquenessScore,
        weight: DQI_WEIGHTS.uniqueness,
        weightedScore: Math.round(uniquenessScore * (DQI_WEIGHTS.uniqueness / 100) * 10) / 10,
        status: uniquenessScore >= 90 ? 'optimal' : uniquenessScore >= 70 ? 'acceptable' : 'critical',
        findingsCount: uniqueDuplicatePairs.length
      }
    },
    deductions,
    metrics: {
      totalFindings: flags.length,
      missingMandatoryCount: missingCount,
      validityDefectsCount: validityFlags.length,
      standardizationDefectsCount: standardizationFlags.length,
      duplicateCandidateCount: uniqueDuplicatePairs.length,
      optionalFieldsProvidedRate: optionalFillRate
    }
  };
};

/**
 * Calculate deterministic DQI for an entire collection/dataset
 *
 * @param {string} recordType - 'students' or 'programs'
 * @param {Array} records - Array of plain JavaScript record objects
 * @param {Array} flags - Array of all deterministic findings across the collection
 * @returns {object} Aggregated DQI report with methodology and breakdown
 */
const calculateDatasetDQI = (recordType, records = [], flags = []) => {
  const totalRecords = records.length;

  if (totalRecords === 0) {
    return {
      score: null,
      rating: 'not_assessable',
      category: 'not_assessable',
      scanned: 0,
      summary: `No ${recordType} records found to evaluate. Data quality is not assessable for an empty dataset.`,
      dimensions: {
        completeness: { score: null, weight: DQI_WEIGHTS.completeness, status: 'not_assessable', description: 'Measures presence of required mandatory fields.' },
        validity: { score: null, weight: DQI_WEIGHTS.validity, status: 'not_assessable', description: 'Measures format validity, regex adherence, date plausibility.' },
        standardization: { score: null, weight: DQI_WEIGHTS.standardization, status: 'not_assessable', description: 'Measures standard capitalization and canonical formatting.' },
        uniqueness: { score: null, weight: DQI_WEIGHTS.uniqueness, status: 'not_assessable', description: 'Measures freedom from duplicate entity candidates.' }
      },
      metrics: {
        totalRecordsScanned: 0,
        cleanRecordsCount: 0,
        flaggedRecordsCount: 0,
        criticalIssuesCount: 0,
        warningIssuesCount: 0,
        optionalFieldsProvidedRate: null,
        optionalFieldsFillRate: null
      },
      methodology: getDqiMethodology()
    };
  }

  // Pre-index flags by recordId for O(N) evaluation
  const flagsByRecordId = new Map();
  for (const flag of flags) {
    const rid = String(flag.recordId);
    let list = flagsByRecordId.get(rid);
    if (!list) {
      list = [];
      flagsByRecordId.set(rid, list);
    }
    list.push(flag);
  }

  let totalScore = 0;
  let totalCompleteness = 0;
  let totalValidity = 0;
  let totalStandardization = 0;
  let totalUniqueness = 0;
  let totalOptionalFill = 0;
  let cleanRecordsCount = 0;
  let criticalIssuesCount = 0;
  let warningIssuesCount = 0;

  for (const record of records) {
    const rid = String(record._id || record.id);
    const recordFlags = flagsByRecordId.get(rid) || [];
    const evaluation = calculateRecordDQI(recordType, record, recordFlags);

    totalScore += evaluation.score;
    totalCompleteness += evaluation.dimensions.completeness.score;
    totalValidity += evaluation.dimensions.validity.score;
    totalStandardization += evaluation.dimensions.standardization.score;
    totalUniqueness += evaluation.dimensions.uniqueness.score;
    totalOptionalFill += evaluation.metrics.optionalFieldsProvidedRate;

    if (recordFlags.length === 0) {
      cleanRecordsCount += 1;
    } else {
      for (const f of recordFlags) {
        if (f.severity === 'high') criticalIssuesCount += 1;
        else warningIssuesCount += 1;
      }
    }
  }

  const avgScore = Math.min(100, Math.max(0, Math.round((totalScore / totalRecords) * 10) / 10));
  const avgCompleteness = Math.round((totalCompleteness / totalRecords) * 10) / 10;
  const avgValidity = Math.round((totalValidity / totalRecords) * 10) / 10;
  const avgStandardization = Math.round((totalStandardization / totalRecords) * 10) / 10;
  const avgUniqueness = Math.round((totalUniqueness / totalRecords) * 10) / 10;
  const avgOptionalFill = Math.round((totalOptionalFill / totalRecords) * 10) / 10;

  const rating = classifyRating(avgScore);
  const flaggedRecordsCount = totalRecords - cleanRecordsCount;

  return {
    score: avgScore,
    rating,
    category: rating,
    scanned: totalRecords,
    summary: `Dataset data quality is rated ${rating} (${avgScore}/100) across ${totalRecords} ${recordType}. ` +
      `${cleanRecordsCount} record${cleanRecordsCount === 1 ? '' : 's'} fully clean, ` +
      `${flaggedRecordsCount} record${flaggedRecordsCount === 1 ? '' : 's'} flagged for human review.`,
    dimensions: {
      completeness: {
        score: avgCompleteness,
        weight: DQI_WEIGHTS.completeness,
        weightedScore: Math.round(avgCompleteness * (DQI_WEIGHTS.completeness / 100) * 10) / 10,
        rating: classifyRating(avgCompleteness),
        description: 'Measures presence of required mandatory fields. Legitimately optional fields are never penalized.'
      },
      validity: {
        score: avgValidity,
        weight: DQI_WEIGHTS.validity,
        weightedScore: Math.round(avgValidity * (DQI_WEIGHTS.validity / 100) * 10) / 10,
        rating: classifyRating(avgValidity),
        description: 'Measures format validity, regex adherence, date plausibility, and integrity of provided values.'
      },
      standardization: {
        score: avgStandardization,
        weight: DQI_WEIGHTS.standardization,
        weightedScore: Math.round(avgStandardization * (DQI_WEIGHTS.standardization / 100) * 10) / 10,
        rating: classifyRating(avgStandardization),
        description: 'Measures standard capitalization, spacing cleanup, and canonical formatting.'
      },
      uniqueness: {
        score: avgUniqueness,
        weight: DQI_WEIGHTS.uniqueness,
        weightedScore: Math.round(avgUniqueness * (DQI_WEIGHTS.uniqueness / 100) * 10) / 10,
        rating: classifyRating(avgUniqueness),
        description: 'Measures freedom from duplicate entity candidates (deduplicated by candidate pair).'
      }
    },
    metrics: {
      totalRecordsScanned: totalRecords,
      cleanRecordsCount,
      flaggedRecordsCount,
      criticalIssuesCount,
      warningIssuesCount,
      optionalFieldsProvidedRate: avgOptionalFill
    },
    methodology: getDqiMethodology()
  };
};

const getDqiMethodology = () => ({
  version: '2.0.0',
  name: 'NGOcore Deterministic Data Quality Index (DQI)',
  description: 'Deterministic quality index strictly derived from algorithmic validation rules. Zero dependency on generative AI opinions.',
  formula: 'DQI = (Completeness * 0.35) + (Validity * 0.35) + (Standardization * 0.15) + (Uniqueness * 0.15)',
  weights: { ...DQI_WEIGHTS },
  ratingBands: {
    Excellent: '90 - 100',
    Good: '75 - 89',
    Fair: '50 - 74',
    Poor: '0 - 49'
  },
  principles: [
    'Strict determinism: Same record and findings always evaluate to the exact same score.',
    'No optional field penalty: Legitimately optional fields cause zero deduction when omitted.',
    'No double-counting: Related findings on the same field or duplicate entity pair are deduplicated.',
    'AI separation: DQI is computed solely from backend business rules; AI cannot alter scoring.'
  ]
});

module.exports = {
  calculateRecordDQI,
  calculateDatasetDQI,
  classifyRating,
  getDqiMethodology,
  DQI_WEIGHTS,
  DQI_RATING_BANDS,
  MANDATORY_FIELDS,
  OPTIONAL_FIELDS
};

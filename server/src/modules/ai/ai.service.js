const { Record, RecordType } = require('../records/model');
const { AiJob, AiResult } = require('./model');
const { AuditLog } = require('../audit/model');
const { decrypt, encrypt } = require('../../utils/encryption');
const { AppError } = require('../../utils/errors');
const env = require('../../config/env');

// ==========================================
// Fallback Algorithms (Phonetic & Fuzzy)
// ==========================================
function soundex(s) {
  if (!s || typeof s !== 'string') return '';
  const clean = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return '';
  const map = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6'
  };
  let code = clean[0];
  let prev = map[clean[0]] || '0';
  for (let i = 1; i < clean.length; i++) {
    const curr = map[clean[i]] || '0';
    if (curr !== '0' && curr !== prev) {
      code += curr;
      prev = curr;
    } else if (curr === '0') {
      prev = '0';
    }
  }
  return (code + '000').slice(0, 4);
}

function levenshtein(a, b) {
  if (!a || !b) return (a || b) ? (a || b).length : 0;
  const s1 = String(a).toLowerCase();
  const s2 = String(b).toLowerCase();
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function stringSimilarity(a, b) {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  const s1 = String(a).trim().toLowerCase();
  const s2 = String(b).trim().toLowerCase();
  if (s1 === s2) return 1.0;
  const dist = levenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return maxLen === 0 ? 1.0 : Math.max(0, 1 - dist / maxLen);
}

class AiService {
  /**
   * Helper to format and decrypt records for AI scanning
   */
  async getDecryptedRecords(ngoId, recordTypeId = null) {
    const query = { ngoId, isDeleted: false };
    if (recordTypeId) {
      query.recordTypeId = recordTypeId;
    }

    const records = await Record.find(query)
      .populate('recordTypeId', 'name slug prefix fields')
      .lean();

    return records.map((rec) => {
      const typeFields = rec.recordTypeId?.fields || [];
      const sensitiveKeys = new Set(
        typeFields.filter((f) => f.isSensitive || f.type === 'Encrypted Text').map((f) => f.key)
      );

      const rawData = rec.data instanceof Map ? Object.fromEntries(rec.data) : (rec.data || {});
      const plainData = {};

      for (const [k, v] of Object.entries(rawData)) {
        if (sensitiveKeys.has(k) || (rec.encryptedFields && rec.encryptedFields.includes(k))) {
          plainData[k] = decrypt(v);
        } else {
          plainData[k] = v;
        }
      }

      return {
        _id: rec._id.toString(),
        recordNumber: rec.recordNumber,
        recordTypeId: rec.recordTypeId?._id?.toString(),
        recordTypeName: rec.recordTypeId?.name || 'Standard Record',
        data: plainData,
        createdAt: rec.createdAt
      };
    });
  }

  /**
   * Phonetic & Fuzzy Deduplication Scan
   */
  async scanDeduplication(ngoId, { recordTypeId = null, threshold = 0.70 } = {}, user = null) {
    const records = await this.getDecryptedRecords(ngoId, recordTypeId);

    if (records.length < 2) {
      return {
        scannedCount: records.length,
        duplicatesFound: 0,
        duplicatePairs: []
      };
    }

    let duplicatePairs = [];

    // Attempt calling FastAPI AI Engine
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/clean/deduplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': env.AI_SERVICE_SECRET
        },
        body: JSON.stringify({
          records,
          threshold: parseFloat(threshold) || 0.70
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        duplicatePairs = result.duplicate_pairs || [];
      } else {
        throw new Error(`AI service responded with status ${response.status}`);
      }
    } catch (err) {
      // Execute local high-performance fallback
      duplicatePairs = this.localDeduplicate(records, threshold);
    }

    // Persist result
    const aiResult = await AiResult.create({
      ngoId,
      type: 'deduplication',
      summary: `Deduplication scan found ${duplicatePairs.length} candidate pairs among ${records.length} records.`,
      insights: { scannedCount: records.length, duplicatesFound: duplicatePairs.length },
      data: duplicatePairs
    });

    return {
      resultId: aiResult._id,
      scannedCount: records.length,
      duplicatesFound: duplicatePairs.length,
      duplicatePairs
    };
  }

  localDeduplicate(records, threshold = 0.70) {
    const matches = [];

    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const r1 = records[i];
        const r2 = records[j];
        const d1 = r1.data || {};
        const d2 = r2.data || {};

        const name1 = d1.fullName || d1.name || d1.beneficiaryName || '';
        const name2 = d2.fullName || d2.name || d2.beneficiaryName || '';

        const phone1 = (d1.phone || d1.phoneNumber || '').replace(/\D/g, '');
        const phone2 = (d2.phone || d2.phoneNumber || '').replace(/\D/g, '');

        const aadhaar1 = (d1.aadhaarNumber || d1.governmentId || '').replace(/\s+/g, '');
        const aadhaar2 = (d2.aadhaarNumber || d2.governmentId || '').replace(/\s+/g, '');

        let score = 0.0;
        let reasons = [];

        // Exact ID/Govt Match
        if (aadhaar1 && aadhaar2 && aadhaar1 === aadhaar2) {
          score = 1.0;
          reasons.push('Identical Government ID');
        } else if (phone1 && phone2 && phone1.length >= 10 && phone1 === phone2) {
          score = Math.max(score, 0.90);
          reasons.push('Exact phone number match');
        }

        // Name similarity
        if (name1 && name2) {
          const nameSim = stringSimilarity(name1, name2);
          const s1 = soundex(name1);
          const s2 = soundex(name2);
          const isSoundexMatch = s1 && s2 && s1 === s2;

          let nameScore = nameSim;
          if (isSoundexMatch) {
            nameScore = Math.max(nameScore, 0.82);
            reasons.push(`Phonetic name match (${s1})`);
          }

          if (score < 0.90) {
            score = (score * 0.4) + (nameScore * 0.6);
            if (nameSim >= 0.75) {
              reasons.push(`High name similarity (${Math.round(nameSim * 100)}%)`);
            }
          }
        }

        if (score >= threshold) {
          matches.push({
            record1: r1,
            record2: r2,
            confidence: Math.round(score * 100) / 100,
            confidencePercentage: Math.round(score * 100),
            matchReasons: reasons.length ? reasons : ['High composite profile similarity']
          });
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Data Quality & Anomaly Detection Scan
   */
  async scanAnomalies(ngoId, { recordTypeId = null } = {}, user = null) {
    const records = await this.getDecryptedRecords(ngoId, recordTypeId);
    let flaggedRecords = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/clean/anomalies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': env.AI_SERVICE_SECRET
        },
        body: JSON.stringify({ records }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        flaggedRecords = result.flagged_records || [];
      } else {
        throw new Error(`AI service responded with status ${response.status}`);
      }
    } catch (err) {
      flaggedRecords = this.localDetectAnomalies(records);
    }

    const aiResult = await AiResult.create({
      ngoId,
      type: 'anomalies',
      summary: `Anomaly scan flagged ${flaggedRecords.length} records with data quality issues.`,
      insights: { scannedCount: records.length, anomaliesFound: flaggedRecords.length },
      data: flaggedRecords
    });

    return {
      resultId: aiResult._id,
      scannedCount: records.length,
      anomaliesFound: flaggedRecords.length,
      flaggedRecords
    };
  }

  localDetectAnomalies(records) {
    const flagged = [];
    const now = new Date();

    for (const rec of records) {
      const data = rec.data || {};
      const issues = [];
      let severity = 'low';

      // 1. Missing identification or name
      const name = data.fullName || data.name || data.beneficiaryName;
      if (!name || String(name).trim().length < 2) {
        issues.push('Missing or empty beneficiary name');
        severity = 'high';
      }

      // 2. Phone formatting validation
      const phone = data.phone || data.phoneNumber;
      if (phone) {
        const digits = String(phone).replace(/\D/g, '');
        if (digits.length > 0 && digits.length < 10) {
          issues.push(`Malformed phone number (${phone}) - less than 10 digits`);
          severity = severity === 'high' ? 'high' : 'medium';
        }
      }

      // 3. Email formatting
      const email = data.email;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        issues.push(`Invalid email syntax (${email})`);
        severity = severity === 'high' ? 'high' : 'medium';
      }

      // 4. Impossible dates (future birthdates or > 120 years)
      const dob = data.dateOfBirth || data.dob;
      if (dob) {
        const dobDate = new Date(dob);
        if (!isNaN(dobDate.getTime())) {
          if (dobDate > now) {
            issues.push('Impossible date of birth: set in the future');
            severity = 'high';
          } else {
            const ageYears = (now - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
            if (ageYears > 120) {
              issues.push(`Suspicious age calculation (${Math.round(ageYears)} years old)`);
              severity = 'high';
            }
          }
        }
      }

      // 5. Numeric sanity check
      const amount = parseFloat(data.amount || data.income || data.grantAmount);
      if (!isNaN(amount) && amount < 0) {
        issues.push(`Negative financial amount detected (${amount})`);
        severity = 'high';
      }

      if (issues.length > 0) {
        flagged.push({
          recordId: rec._id,
          recordNumber: rec.recordNumber,
          recordTypeName: rec.recordTypeName,
          severity,
          issues,
          data: rec.data
        });
      }
    }

    return flagged;
  }

  /**
   * Vulnerability Clustering & Demographics Analysis
   */
  async analyzeVulnerabilities(ngoId, { recordTypeId = null } = {}, user = null) {
    const records = await this.getDecryptedRecords(ngoId, recordTypeId);
    let analytics = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/analyze/vulnerability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': env.AI_SERVICE_SECRET
        },
        body: JSON.stringify({ records }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        analytics = result.analytics;
      } else {
        throw new Error(`AI service responded with status ${response.status}`);
      }
    } catch (err) {
      analytics = this.localAnalyzeVulnerability(records);
    }

    const aiResult = await AiResult.create({
      ngoId,
      type: 'vulnerability',
      summary: `Vulnerability analysis calculated tiers for ${records.length} records.`,
      insights: analytics,
      data: analytics
    });

    return {
      resultId: aiResult._id,
      analytics
    };
  }

  localAnalyzeVulnerability(records) {
    let high = 0;
    let medium = 0;
    let low = 0;
    const categoryCounts = {};
    const locations = {};

    for (const rec of records) {
      const d = rec.data || {};
      const familySize = parseInt(d.familySize || d.dependents || 1, 10);
      const income = parseFloat(d.annualIncome || d.income || 50000);
      const isDisplaced = d.isDisplaced || d.displaced === true || d.displaced === 'true';

      let score = 0;
      if (familySize >= 5) score += 2;
      else if (familySize >= 3) score += 1;

      if (income < 25000) score += 2;
      else if (income < 50000) score += 1;

      if (isDisplaced) score += 2;

      if (score >= 3) high++;
      else if (score >= 1) medium++;
      else low++;

      const cat = d.category || rec.recordTypeName || 'General Relief';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      const loc = d.district || d.city || d.state || 'Unspecified';
      locations[loc] = (locations[loc] || 0) + 1;
    }

    return {
      totalAnalyzed: records.length,
      vulnerabilityTiers: {
        high: { count: high, percentage: records.length ? Math.round((high / records.length) * 100) : 0 },
        medium: { count: medium, percentage: records.length ? Math.round((medium / records.length) * 100) : 0 },
        low: { count: low, percentage: records.length ? Math.round((low / records.length) * 100) : 0 }
      },
      categoryDistribution: categoryCounts,
      geographicHotspots: locations
    };
  }

  /**
   * Predictive Demand Forecasting
   */
  async forecastDemand(ngoId, { periodsAhead = 3 } = {}, user = null) {
    // Collect past 6 months record creation statistics
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyCounts = await Record.aggregate([
      { $match: { ngoId, isDeleted: false, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    let historicalSequence = monthlyCounts.map((m) => m.count);
    if (historicalSequence.length < 3) {
      // Seed minimal historical sequence for early-stage NGOs
      const base = Math.max(5, historicalSequence[historicalSequence.length - 1] || 12);
      historicalSequence = [Math.round(base * 0.75), Math.round(base * 0.9), base];
    }

    let forecastData = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/predict/demand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': env.AI_SERVICE_SECRET
        },
        body: JSON.stringify({
          historical_counts: historicalSequence,
          periods_ahead: periodsAhead
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        forecastData = result.forecast_results;
      } else {
        throw new Error(`AI service responded with status ${response.status}`);
      }
    } catch (err) {
      forecastData = this.localForecast(historicalSequence, periodsAhead);
    }

    const aiResult = await AiResult.create({
      ngoId,
      type: 'demand_forecast',
      summary: `Demand forecast generated for next ${periodsAhead} periods. Trend: ${forecastData.trend_direction}.`,
      insights: forecastData,
      data: forecastData
    });

    return {
      resultId: aiResult._id,
      forecast: forecastData
    };
  }

  localForecast(history, periods = 3) {
    const n = history.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += history[i];
      sumXY += i * history[i];
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const projections = [];
    for (let p = 1; p <= periods; p++) {
      const nextX = n - 1 + p;
      const expected = Math.max(1, Math.round(intercept + slope * nextX));
      projections.push({
        period: `Month +${p}`,
        projectedDemand: expected,
        recommendedSafetyStock: Math.round(expected * 1.15)
      });
    }

    return {
      historicalTrend: history,
      slope: Math.round(slope * 100) / 100,
      trend_direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      growthRatePercent: history[0] ? Math.round(((history[n - 1] - history[0]) / history[0]) * 100) : 0,
      projections
    };
  }

  /**
   * Merge Duplicate Records
   * Transfers verified data to master record, marks secondary as soft-deleted with mergedInto reference
   */
  async mergeRecords(ngoId, { primaryRecordId, duplicateRecordId, mergedData = {}, deleteDuplicate = true }, user = null) {
    if (!primaryRecordId || !duplicateRecordId) {
      throw new AppError(400, 'Both primaryRecordId and duplicateRecordId are required');
    }

    if (primaryRecordId === duplicateRecordId) {
      throw new AppError(400, 'Cannot merge a record into itself');
    }

    const [primaryRecord, duplicateRecord] = await Promise.all([
      Record.findOne({ _id: primaryRecordId, ngoId, isDeleted: false }),
      Record.findOne({ _id: duplicateRecordId, ngoId, isDeleted: false })
    ]);

    if (!primaryRecord) {
      throw new AppError(404, 'Master record not found or has been deleted');
    }
    if (!duplicateRecord) {
      throw new AppError(404, 'Duplicate candidate record not found or has already been merged/deleted');
    }

    // Merge data: preserve master fields unless explicitly overridden in mergedData or present in duplicate
    const pData = primaryRecord.data instanceof Map ? Object.fromEntries(primaryRecord.data) : (primaryRecord.data || {});
    const dData = duplicateRecord.data instanceof Map ? Object.fromEntries(duplicateRecord.data) : (duplicateRecord.data || {});

    // Combined data: dData fills in blanks of pData, mergedData overrides
    const updatedData = { ...dData, ...pData, ...mergedData };

    // RecordType schema checks for encryption
    const recordType = await RecordType.findOne({ _id: primaryRecord.recordTypeId, ngoId });
    const sensitiveKeys = new Set(
      (recordType?.fields || []).filter((f) => f.isSensitive || f.type === 'Encrypted Text').map((f) => f.key)
    );

    const encryptedFields = [];
    const finalStoredData = {};

    for (const [k, v] of Object.entries(updatedData)) {
      if (sensitiveKeys.has(k)) {
        finalStoredData[k] = encrypt(v);
        encryptedFields.push(k);
      } else {
        finalStoredData[k] = v;
      }
    }

    primaryRecord.data = finalStoredData;
    primaryRecord.encryptedFields = encryptedFields;
    if (user?._id) primaryRecord.updatedBy = user._id;
    await primaryRecord.save();

    // Mark duplicate record as merged and soft-deleted
    if (deleteDuplicate) {
      duplicateRecord.isDeleted = true;
      duplicateRecord.deletedAt = new Date();
      duplicateRecord.deletedBy = user?._id;
      duplicateRecord.mergedInto = primaryRecord._id;
      await duplicateRecord.save();
    }

    // Create Audit Log
    await AuditLog.create({
      ngoId,
      userId: user?._id,
      action: 'RECORD_MERGED',
      resource: 'Record',
      resourceId: primaryRecord._id,
      details: {
        masterRecordNumber: primaryRecord.recordNumber,
        mergedDuplicateId: duplicateRecord._id,
        mergedDuplicateNumber: duplicateRecord.recordNumber,
        mergedFields: Object.keys(mergedData)
      }
    }).catch((err) => console.warn('AuditLog failed on record merge:', err.message));

    return {
      success: true,
      message: `Record ${duplicateRecord.recordNumber} successfully merged into ${primaryRecord.recordNumber}`,
      primaryRecordId: primaryRecord._id,
      duplicateRecordId: duplicateRecord._id
    };
  }

  /**
   * Get AI Execution History
   */
  async getAiHistory(ngoId, { type = null, limit = 10 } = {}) {
    const query = { ngoId };
    if (type) query.type = type;

    return AiResult.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(50, Math.max(1, parseInt(limit, 10))))
      .lean();
  }
}

module.exports = new AiService();

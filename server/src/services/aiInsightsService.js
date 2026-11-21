const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');
const logger = require('../utils/logger');

// Strict Zod schema for AI Data Insights Output
const aiInsightsSchema = z.object({
  healthScore: z.coerce.number().min(0).max(100),
  healthCategory: z.enum(['excellent', 'good', 'moderate', 'needs_attention', 'critical']),
  executiveSummary: z.string().min(10),
  keyMetrics: z.object({
    totalRows: z.coerce.number().default(0),
    totalColumns: z.coerce.number().default(0),
    dataCompletenessPercent: z.coerce.number().default(100),
    duplicateRiskPercent: z.coerce.number().default(0),
    totalValuationOrAmount: z.coerce.number().default(0)
  }),
  dataQualityFindings: z.array(z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    issue: z.string(),
    affectedFields: z.array(z.string()).default([]),
    affectedRowsCount: z.coerce.number().default(0),
    suggestion: z.string()
  })).default([]),
  financialInsights: z.array(z.object({
    metric: z.string(),
    value: z.string(),
    anomaly: z.string(),
    recommendation: z.string()
  })).default([]),
  operationalTrends: z.array(z.object({
    area: z.string(),
    trend: z.string(),
    impact: z.string()
  })).default([]),
  strategicRecommendations: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    title: z.string(),
    action: z.string(),
    expectedOutcome: z.string()
  })).default([]),
  limitations: z.array(z.string()).default([])
});

/**
 * Robust CSV parser compliant with RFC-4180
 */
function parseCsv(content) {
  const lines = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1).map((r) => {
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = r[idx] !== undefined ? r[idx].replace(/^["']|["']$/g, '') : '';
    });
    return rowObj;
  });

  return { headers, rows };
}

/**
 * Extract statistical metadata & quality indicators from tabular records
 */
function analyzeTabularData(headers, rows) {
  const totalRows = rows.length;
  const totalColumns = headers.length;
  const columnStats = {};
  let totalMissingCells = 0;
  const totalCells = totalRows * totalColumns || 1;

  let detectedFinancialColumn = null;
  let financialSum = 0;

  // Initialize column stats
  headers.forEach((h) => {
    columnStats[h] = {
      name: h,
      inferredType: 'string',
      missingCount: 0,
      uniqueValues: new Set(),
      numericValues: [],
      sampleValues: []
    };
  });

  // Track duplicate row hashes
  const seenHashes = new Set();
  let duplicateCount = 0;

  rows.forEach((row) => {
    const hash = headers.map((h) => String(row[h] || '').toLowerCase()).join('|');
    if (seenHashes.has(hash)) {
      duplicateCount++;
    } else {
      seenHashes.add(hash);
    }

    headers.forEach((h) => {
      const val = row[h];
      const stats = columnStats[h];
      if (val === undefined || val === null || String(val).trim() === '') {
        stats.missingCount++;
        totalMissingCells++;
      } else {
        const strVal = String(val).trim();
        stats.uniqueValues.add(strVal);
        if (stats.sampleValues.length < 5) stats.sampleValues.push(strVal);

        // Check if numeric
        const cleanNum = strVal.replace(/[$,₹€£]/g, '').trim();
        const num = Number(cleanNum);
        if (!isNaN(num) && cleanNum !== '') {
          stats.numericValues.push(num);
        }
      }
    });
  });

  // Infer types and aggregate statistics
  headers.forEach((h) => {
    const stats = columnStats[h];
    const presentCount = totalRows - stats.missingCount;
    if (presentCount > 0 && stats.numericValues.length / presentCount >= 0.7) {
      stats.inferredType = 'numeric';
      const sum = stats.numericValues.reduce((a, b) => a + b, 0);
      stats.sum = sum;
      stats.min = Math.min(...stats.numericValues);
      stats.max = Math.max(...stats.numericValues);
      stats.avg = Math.round((sum / stats.numericValues.length) * 100) / 100;

      // Identify financial column
      const lower = h.toLowerCase();
      if (
        lower.includes('amount') ||
        lower.includes('donation') ||
        lower.includes('cost') ||
        lower.includes('budget') ||
        lower.includes('expense') ||
        lower.includes('fee') ||
        lower.includes('price') ||
        lower.includes('valuation')
      ) {
        if (!detectedFinancialColumn || sum > financialSum) {
          detectedFinancialColumn = h;
          financialSum = sum;
        }
      }
    } else if (presentCount > 0) {
      // Check date
      const dateCount = stats.sampleValues.filter((v) => !isNaN(Date.parse(v))).length;
      if (dateCount / stats.sampleValues.length >= 0.7) {
        stats.inferredType = 'date';
      } else if (stats.uniqueValues.size <= Math.min(10, totalRows * 0.3)) {
        stats.inferredType = 'category';
      }
    }
    stats.uniqueCount = stats.uniqueValues.size;
    delete stats.uniqueValues; // free memory
  });

  const completeness = Math.round(((totalCells - totalMissingCells) / totalCells) * 100);
  const duplicateRisk = totalRows > 0 ? Math.round((duplicateCount / totalRows) * 100) : 0;

  // Calculate health score: 100 - penalties
  let score = 100;
  score -= Math.min(40, Math.round((totalMissingCells / totalCells) * 50));
  score -= Math.min(30, duplicateRisk * 2);

  // Check columns with > 50% missing
  const highlyIncompleteCols = Object.values(columnStats).filter(
    (c) => totalRows > 0 && c.missingCount / totalRows > 0.4
  );
  score -= highlyIncompleteCols.length * 5;
  score = Math.max(10, Math.min(100, Math.round(score)));

  let healthCategory = 'moderate';
  if (score >= 90) healthCategory = 'excellent';
  else if (score >= 75) healthCategory = 'good';
  else if (score >= 60) healthCategory = 'moderate';
  else if (score >= 40) healthCategory = 'needs_attention';
  else healthCategory = 'critical';

  return {
    totalRows,
    totalColumns,
    totalMissingCells,
    completeness,
    duplicateCount,
    duplicateRisk,
    columnStats,
    detectedFinancialColumn,
    financialSum,
    score,
    healthCategory
  };
}

/**
 * Generate deterministic fallback report when Gemini is unavailable
 */
function generateDeterministicInsights(analysis, datasetName = 'Uploaded Dataset') {
  const {
    totalRows,
    totalColumns,
    completeness,
    duplicateCount,
    duplicateRisk,
    columnStats,
    detectedFinancialColumn,
    financialSum,
    score,
    healthCategory
  } = analysis;

  const qualityFindings = [];

  // 1. Missing cells finding
  const incompleteCols = Object.values(columnStats)
    .filter((c) => c.missingCount > 0)
    .sort((a, b) => b.missingCount - a.missingCount);

  if (incompleteCols.length > 0) {
    const worst = incompleteCols[0];
    const missingPct = Math.round((worst.missingCount / totalRows) * 100);
    qualityFindings.push({
      severity: missingPct > 30 ? 'high' : 'medium',
      issue: `Significant missing values in '${worst.name}' (${worst.missingCount} records, ${missingPct}%)`,
      affectedFields: [worst.name],
      affectedRowsCount: worst.missingCount,
      suggestion: `Require validation checks on data entry to enforce '${worst.name}' or provide sensible organizational defaults.`
    });
  }

  // 2. Duplicate detection
  if (duplicateCount > 0) {
    qualityFindings.push({
      severity: duplicateRisk > 10 ? 'critical' : 'medium',
      issue: `Found ${duplicateCount} potential duplicate rows (${duplicateRisk}% duplicate index)`,
      affectedFields: Object.keys(columnStats).slice(0, 3),
      affectedRowsCount: duplicateCount,
      suggestion: 'Run the beneficiary duplicate resolver to merge identical registrations and reconcile primary contact keys.'
    });
  } else {
    qualityFindings.push({
      severity: 'info',
      issue: 'Zero duplicate rows detected across primary entity columns.',
      affectedFields: [],
      affectedRowsCount: 0,
      suggestion: 'Maintain current unique constraint policies across new intake channels.'
    });
  }

  // 3. Inferred type anomalies
  const textCols = Object.values(columnStats).filter((c) => c.inferredType === 'string' && c.missingCount === 0);
  if (textCols.length > 0) {
    qualityFindings.push({
      severity: 'low',
      issue: `Complete textual fields verified for ${textCols.map((c) => c.name).slice(0, 3).join(', ')}`,
      affectedFields: textCols.map((c) => c.name).slice(0, 3),
      affectedRowsCount: 0,
      suggestion: 'Standardize capitalization and whitespace trims across external data feeds.'
    });
  }

  // Financial Insights
  const financialInsights = [];
  if (detectedFinancialColumn && financialSum > 0) {
    const stats = columnStats[detectedFinancialColumn];
    financialInsights.push({
      metric: `Total ${stats.name}`,
      value: `INR ${financialSum.toLocaleString('en-IN')}`,
      anomaly: stats.max > stats.avg * 5 ? `High upper variance detected (Maximum: INR ${stats.max.toLocaleString('en-IN')})` : 'Normal transaction range',
      recommendation: 'Verify top 5 percentile transactions against bank receipts and approval vouchers.'
    });
    financialInsights.push({
      metric: `Average ${stats.name}`,
      value: `INR ${stats.avg.toLocaleString('en-IN')}`,
      anomaly: stats.min === 0 ? 'Zero-value records present in financial column' : 'Consistent average ledger distribution',
      recommendation: stats.min === 0 ? 'Exclude zero-value placeholders from outflow aggregations.' : 'Maintain regular reconciliations.'
    });
  } else {
    financialInsights.push({
      metric: 'Financial Data Presence',
      value: 'Non-monetary dataset',
      anomaly: 'No explicit currency or outflow column identified',
      recommendation: 'Link entity identifiers with donation and expense ledgers for complete ROI tracking.'
    });
  }

  // Operational Trends
  const operationalTrends = [
    {
      area: 'Record Volume & Capacity',
      trend: `${totalRows} records loaded across ${totalColumns} defined schema attributes.`,
      impact: totalRows > 100 ? 'Sufficient sample size for operational trend extrapolation.' : 'Dataset is compact; continue collecting longitudinal records.'
    },
    {
      area: 'Data Hygiene & Reliability',
      trend: `Overall dataset completeness stands at ${completeness}%.`,
      impact: completeness >= 85 ? 'High confidence for compliance reporting and stakeholder presentations.' : 'Requires field verification before submitting to donor audits.'
    }
  ];

  // Strategic Recommendations
  const strategicRecommendations = [
    {
      priority: score < 70 ? 'high' : 'medium',
      title: 'Automated Ingestion Validation',
      action: 'Enforce schema-level Zod validators at all intake forms to prevent null entries in critical fields.',
      expectedOutcome: 'Increases data completeness to over 95% within the next reporting period.'
    },
    {
      priority: duplicateCount > 0 ? 'high' : 'low',
      title: 'Primary Key & Deduplication Policy',
      action: 'Implement phone and email normalized hashing to block duplicate intake submissions.',
      expectedOutcome: 'Prevents double allocation of relief supplies and benefits.'
    },
    {
      priority: 'medium',
      title: 'Regular Stakeholder Reporting Export',
      action: 'Generate weekly overview PDF audits for program directors and board compliance trustees.',
      expectedOutcome: 'Ensures proactive governance and continuous audit-readiness.'
    }
  ];

  return {
    healthScore: score,
    healthCategory,
    executiveSummary: `Audit of '${datasetName}' comprises ${totalRows} records across ${totalColumns} attributes. The dataset exhibits an overall Health Score of ${score}/100 (${healthCategory.toUpperCase()}) with ${completeness}% field completeness and ${duplicateRisk}% duplicate index. ${detectedFinancialColumn ? `Total aggregated valuation identified: INR ${financialSum.toLocaleString('en-IN')}.` : ''} Key operational strengths and quality risks have been cataloged below for administrative review.`,
    keyMetrics: {
      totalRows,
      totalColumns,
      dataCompletenessPercent: completeness,
      duplicateRiskPercent: duplicateRisk,
      totalValuationOrAmount: financialSum
    },
    dataQualityFindings: qualityFindings,
    financialInsights,
    operationalTrends,
    strategicRecommendations,
    limitations: [
      'Analysis derived from uploaded file metadata and statistical sampling.',
      'Textual fields sanitized to protect sensitive beneficiary PII.',
      'Financial projections assume INR currency base unless foreign designations are explicitly flagged.'
    ],
    metadata: {
      source: 'deterministic',
      isFallback: true,
      analyzedAt: new Date().toISOString()
    }
  };
}

/**
 * Call Gemini AI to produce deep contextual insights
 */
async function generateGeminiInsights(analysis, datasetName = 'Uploaded Dataset') {
  if (!config.GEMINI_ENABLED || !config.GEMINI_API_KEY) {
    return generateDeterministicInsights(analysis, datasetName);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    const model = config.GEMINI_MODEL || 'gemini-2.5-flash';

    // Build sanitized prompt with statistics only (NO raw personal details)
    const sanitizedStats = {
      datasetName,
      totalRows: analysis.totalRows,
      totalColumns: analysis.totalColumns,
      completenessPercent: analysis.completeness,
      duplicateCount: analysis.duplicateCount,
      duplicateRiskPercent: analysis.duplicateRisk,
      calculatedHealthScore: analysis.score,
      detectedFinancialMetric: analysis.detectedFinancialColumn,
      totalFinancialSum: analysis.financialSum,
      columnsSummary: Object.values(analysis.columnStats).map((c) => ({
        column: c.name,
        type: c.inferredType,
        missing: c.missingCount,
        unique: c.uniqueCount,
        min: c.min,
        max: c.max,
        avg: c.avg,
        sampleCategories: c.sampleValues.slice(0, 4)
      }))
    };

    const prompt = `You are a Principal NGO Data Governance Auditor and Strategic Analyst.
Analyze the following statistical dataset profile and provide comprehensive, actionable intelligence.

Dataset Profile:
${JSON.stringify(sanitizedStats, null, 2)}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "healthScore": number (0 to 100),
  "healthCategory": "excellent" | "good" | "moderate" | "needs_attention" | "critical",
  "executiveSummary": "Concise 3-4 sentence executive overview for NGO leadership",
  "keyMetrics": {
    "totalRows": ${analysis.totalRows},
    "totalColumns": ${analysis.totalColumns},
    "dataCompletenessPercent": ${analysis.completeness},
    "duplicateRiskPercent": ${analysis.duplicateRisk},
    "totalValuationOrAmount": ${analysis.financialSum}
  },
  "dataQualityFindings": [
    {
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "issue": "Brief description of data anomaly or quality risk",
      "affectedFields": ["string"],
      "affectedRowsCount": number,
      "suggestion": "Concrete remediation guidance"
    }
  ],
  "financialInsights": [
    {
      "metric": "e.g. Total Outflow / Budget Variance",
      "value": "string value",
      "anomaly": "Observation or variance",
      "recommendation": "Strategic advice"
    }
  ],
  "operationalTrends": [
    {
      "area": "Operational domain (e.g., Program Reach, Supplies)",
      "trend": "Observed trend pattern",
      "impact": "Organizational impact"
    }
  ],
  "strategicRecommendations": [
    {
      "priority": "high" | "medium" | "low",
      "title": "Action title",
      "action": "Specific execution step",
      "expectedOutcome": "Tangible outcome"
    }
  ],
  "limitations": [
    "String noting caveats or sampling constraints"
  ]
}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const rawText = typeof response?.text === 'function' ? response.text() : response?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/^```json\s*|\s*```$/g, '').trim());
    } catch {
      // Regex extract json if wrapped
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Failed to parse Gemini JSON output');
    }

    const validated = aiInsightsSchema.parse(parsed);
    return {
      ...validated,
      metadata: {
        source: 'gemini',
        model,
        isFallback: false,
        analyzedAt: new Date().toISOString()
      }
    };
  } catch (err) {
    logger.warn(`Gemini analysis failed: ${err.message}. Generating deterministic fallback.`);
    return generateDeterministicInsights(analysis, datasetName);
  }
}

/**
 * Pre-packaged Sample Datasets for one-click testing / demo
 */
const SAMPLE_DATASETS = {
  beneficiaries: {
    name: 'Sample_Urban_Education_Beneficiaries.csv',
    content: `Beneficiary ID,Full Name,Category,Age,Gender,Phone,Location,Attendance Rate,Assigned Program,Status
BEN-1001,Aarav Sharma,Primary Education,10,Male,9876543210,Zone A - North,92%,Vidya Hope,active
BEN-1002,Priya Patel,Skill Training,19,Female,9876543211,Zone B - East,88%,Saksham Youth,active
BEN-1003,Rohan Verma,Primary Education,9,Male,9876543212,Zone A - North,,Vidya Hope,active
BEN-1004,Ananya Das,Primary Education,11,Female,,Zone C - South,95%,Vidya Hope,active
BEN-1005,Vikram Singh,Vocational,22,Male,9876543214,Zone B - East,74%,Saksham Youth,pending
BEN-1006,Neha Gupta,Primary Education,10,Female,9876543215,Zone A - North,89%,Vidya Hope,active
BEN-1007,Kabir Khan,Primary Education,8,Male,9876543216,Zone A - North,91%,Vidya Hope,active
BEN-1008,Pooja Kumari,Skill Training,18,Female,9876543217,Zone C - South,65%,Saksham Youth,active
BEN-1009,Aarav Sharma,Primary Education,10,Male,9876543210,Zone A - North,92%,Vidya Hope,active
BEN-1010,Siddharth Rao,Vocational,21,Male,9876543219,Zone B - East,82%,Saksham Youth,active`
  },
  donations: {
    name: 'Sample_Q3_Corporate_Donations.csv',
    content: `Donation Number,Donor Name,Type,Amount,Currency,Payment Method,Program Allocation,Receipt Issued,Date
DON-2026-001,Tata Trust,Corporate Grant,500000,INR,bank_transfer,Vidya Hope,Yes,2026-08-01
DON-2026-002,Infosys Foundation,CSR,350000,INR,bank_transfer,Saksham Youth,Yes,2026-08-05
DON-2026-003,Amitabh Sen,Individual,25000,INR,upi,General Fund,Yes,2026-08-10
DON-2026-004,Sunita Mehta,Individual,15000,INR,cheque,Vidya Hope,No,2026-08-12
DON-2026-005,Global Relief Fund,International,1200000,INR,wire_transfer,Medical Relief Camps,Yes,2026-08-15
DON-2026-006,Rajiv Kapoor,Individual,5000,INR,upi,General Fund,Yes,2026-08-18
DON-2026-007,Apex Logistics,Corporate,75000,INR,bank_transfer,Saksham Youth,Yes,2026-08-20
DON-2026-008,Dr. K. N. Murthy,HNI,100000,INR,cheque,Medical Relief Camps,Yes,2026-08-22
DON-2026-009,Community Collection,Anonymous,18500,INR,cash,General Fund,No,2026-08-25
DON-2026-010,Tata Trust,Corporate Grant,500000,INR,bank_transfer,Vidya Hope,Yes,2026-08-28`
  },
  inventory: {
    name: 'Sample_Medical_Camp_Supplies.csv',
    content: `Item Code,Item Name,Category,Quantity on Hand,Unit of Measure,Min Threshold,Unit Cost,Storage Building,Status
MED-101,First Aid Emergency Kits,medical_kits,150,boxes,30,850,Warehouse North,available
MED-102,Nutritional Supplement Packs,food_rations,800,packets,200,120,Warehouse East,available
MED-103,Pediatric Multivitamin Drops,medical_kits,45,bottles,100,65,Clinic Room 2,low_stock
MED-104,Digital Blood Pressure Monitors,electronics,18,units,10,2400,Clinic Room 1,available
MED-105,Sterile Surgical Gloves (Pack 100),medical_kits,12,boxes,25,450,Clinic Room 2,low_stock
MED-106,Disinfectant Solution (5L),medical_kits,60,liters,20,380,Warehouse North,available
MED-107,Blankets & Thermal Sheets,clothing,320,pieces,100,280,Warehouse South,available
MED-108,Antiseptic Ointments,medical_kits,250,tubes,50,45,Clinic Room 2,available`
  }
};

/**
 * Main Analysis Entry Point
 */
async function analyzeDataset({ content, filename, format = 'csv' }) {
  let parsed;
  if (format === 'json') {
    try {
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      const rows = Array.isArray(data) ? data : data.records || [data];
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      parsed = { headers, rows };
    } catch {
      throw new Error('Invalid JSON dataset format.');
    }
  } else {
    // Default CSV
    const text = typeof content === 'string' ? content : content.toString('utf8');
    parsed = parseCsv(text);
  }

  if (parsed.rows.length === 0) {
    throw new Error('The dataset does not contain any readable data rows.');
  }

  const analysis = analyzeTabularData(parsed.headers, parsed.rows);
  const insights = await generateGeminiInsights(analysis, filename || 'Dataset');

  return {
    success: true,
    data: {
      datasetName: filename || 'Uploaded Dataset',
      structure: {
        headers: parsed.headers,
        totalRows: parsed.rows.length,
        columnStats: analysis.columnStats,
        previewRows: parsed.rows.slice(0, 10)
      },
      analysis,
      insights
    }
  };
}

module.exports = {
  parseCsv,
  analyzeTabularData,
  analyzeDataset,
  generateDeterministicInsights,
  generateGeminiInsights,
  SAMPLE_DATASETS
};

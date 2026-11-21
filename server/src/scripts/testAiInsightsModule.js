const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const Ngo = require('../models/Ngo');
const aiInsightsService = require('../services/aiInsightsService');
const reportStudioPdfService = require('../services/reportStudioPdfService');

async function run() {
  console.log('--- Testing AI Data Insights & Report Studio Services ---');

  // 1. Test CSV Parsing & Analysis
  console.log('\n1. Testing RFC-4180 CSV Parsing & Tabular Statistics...');
  const sampleCsv = aiInsightsService.SAMPLE_DATASETS.donations.content;
  const parsed = aiInsightsService.parseCsv(sampleCsv);
  console.log(`Parsed ${parsed.rows.length} rows and ${parsed.headers.length} headers.`);
  if (parsed.rows.length !== 10 || parsed.headers.length !== 9) {
    throw new Error('CSV parsing count mismatch');
  }

  const analysis = aiInsightsService.analyzeTabularData(parsed.headers, parsed.rows);
  console.log(`Calculated Health Score: ${analysis.score}/100 (${analysis.healthCategory})`);
  console.log(`Detected Financial Column: '${analysis.detectedFinancialColumn}' with Total Sum: INR ${analysis.financialSum.toLocaleString('en-IN')}`);
  console.log(`Completeness: ${analysis.completeness}% | Duplicate Risk: ${analysis.duplicateRisk}%`);

  // 2. Test Gemini AI or Deterministic Fallback Generation
  console.log('\n2. Testing AI Insights Pipeline...');
  const insights = await aiInsightsService.generateGeminiInsights(analysis, 'Q3 Corporate Donations');
  console.log(`Intelligence Source: ${insights.metadata.source} (${insights.metadata.model || 'rule-based'})`);
  console.log(`Health Category: ${insights.healthCategory}`);
  console.log(`Executive Summary: ${insights.executiveSummary.slice(0, 120)}...`);
  console.log(`Quality Findings Count: ${insights.dataQualityFindings.length}`);
  console.log(`Financial Insights Count: ${insights.financialInsights.length}`);
  console.log(`Recommendations Count: ${insights.strategicRecommendations.length}`);

  // 3. Test PDF Generation
  console.log('\n3. Testing Overview Report PDF Generation (PDFKit)...');
  const pdfBuffer = await reportStudioPdfService.generateOverviewReportPdf({
    datasetName: 'Q3 Corporate Donations Ledger',
    ngoName: 'Pratham Hope Foundation',
    insights,
    structure: {
      headers: parsed.headers,
      totalRows: parsed.rows.length
    }
  });

  console.log(`Generated PDF Buffer: ${pdfBuffer.length} bytes (starts with '${pdfBuffer.slice(0, 4).toString()}')`);
  if (!pdfBuffer || pdfBuffer.length < 5000 || pdfBuffer.slice(0, 4).toString() !== '%PDF') {
    throw new Error('Invalid PDF generated');
  }

  console.log('\n All AI Data Insights & Report Studio unit tests PASSED successfully!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

const PDFDocument = require('pdfkit');

/**
 * Generate a comprehensive "FINAL OVERVIEW REPORT (PDF)"
 * using PDFKit with clean typography, tables, and branding.
 */
function generateOverviewReportPdf({ datasetName, ngoName, insights, structure }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `NGOcore Executive Intelligence Report — ${datasetName}`,
          Author: 'NGOcore AI Report Studio',
          Subject: 'Data Quality, Operations & Strategic Overview'
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      // Color Palette
      const primaryColor = '#10B981'; // Emerald 500
      const primaryDark = '#065F46'; // Emerald 800
      const primaryLight = '#ECFDF5'; // Emerald 50
      const textPrimary = '#0F172A'; // Slate 900
      const textSecondary = '#475569'; // Slate 600
      const textMuted = '#94A3B8'; // Slate 400
      const borderColor = '#CBD5E1'; // Slate 300

      let y = margin;

      // Helper: check page break
      const ensureSpace = (neededHeight) => {
        if (y + neededHeight > pageHeight - margin - 30) {
          doc.addPage();
          y = margin;
          renderHeader();
        }
      };

      // Header Block on each page
      const renderHeader = () => {
        doc.rect(margin, y, contentWidth, 3).fill(primaryColor);
        y += 8;
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(primaryDark)
          .text('NGOcore — DIGITAL RECORDS & AI DATA GOVERNANCE PLATFORM', margin, y, {
            width: contentWidth,
            align: 'left'
          });
        y += 14;
      };

      // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
      renderHeader();

      // Title Banner
      doc.rect(margin, y, contentWidth, 54).fill(primaryLight);
      doc.rect(margin, y, contentWidth, 54).strokeColor(primaryColor).lineWidth(1).stroke();

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(primaryDark)
        .text('FINAL OVERVIEW REPORT', margin + 14, y + 10);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(textSecondary)
        .text(
          `Dataset: ${datasetName}  |  Organization: ${ngoName || 'NGOcore Partner Organization'}  |  Generated: ${new Date().toLocaleString('en-US')}`,
          margin + 14,
          y + 32
        );

      y += 68;

      // Health Score & Metadata Badge Grid
      const score = insights.healthScore || 0;
      const scoreColor =
        score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
      const category = (insights.healthCategory || 'moderate').toUpperCase();

      doc.rect(margin, y, 140, 60).fill('#F8FAFC');
      doc.rect(margin, y, 140, 60).strokeColor(borderColor).stroke();

      doc.fontSize(8).font('Helvetica-Bold').fillColor(textSecondary).text('DATASET HEALTH SCORE', margin + 10, y + 10);
      doc.fontSize(22).font('Helvetica-Bold').fillColor(scoreColor).text(`${score}/100`, margin + 10, y + 24);
      doc.fontSize(8).font('Helvetica').fillColor(textSecondary).text(`Status: ${category}`, margin + 10, y + 48);

      // Key Metrics Row
      const metrics = [
        { label: 'Total Rows', val: String(insights.keyMetrics?.totalRows || structure?.totalRows || 0) },
        { label: 'Attributes', val: String(insights.keyMetrics?.totalColumns || structure?.headers?.length || 0) },
        { label: 'Completeness', val: `${insights.keyMetrics?.dataCompletenessPercent ?? 100}%` },
        { label: 'Duplicate Risk', val: `${insights.keyMetrics?.duplicateRiskPercent ?? 0}%` }
      ];

      const metricBoxWidth = (contentWidth - 150) / metrics.length;
      metrics.forEach((m, idx) => {
        const mx = margin + 150 + idx * metricBoxWidth;
        doc.rect(mx, y, metricBoxWidth - 6, 60).fill('#F8FAFC');
        doc.rect(mx, y, metricBoxWidth - 6, 60).strokeColor(borderColor).stroke();

        doc.fontSize(8).font('Helvetica-Bold').fillColor(textMuted).text(m.label.toUpperCase(), mx + 8, y + 12);
        doc.fontSize(14).font('Helvetica-Bold').fillColor(textPrimary).text(m.val, mx + 8, y + 28);
      });

      y += 74;

      // Section: Executive Summary
      doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryDark).text('Executive Summary', margin, y);
      y += 18;

      doc.rect(margin, y, contentWidth, 1).fill(borderColor);
      y += 8;

      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor(textPrimary)
        .text(insights.executiveSummary || 'No executive summary provided.', margin, y, {
          width: contentWidth,
          lineGap: 4
        });

      y += doc.heightOfString(insights.executiveSummary || '', { width: contentWidth, lineGap: 4 }) + 20;

      // Section: Data Quality & Governance Findings
      ensureSpace(120);
      doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryDark).text('Data Quality & Integrity Findings', margin, y);
      y += 18;
      doc.rect(margin, y, contentWidth, 1).fill(borderColor);
      y += 8;

      const findings = insights.dataQualityFindings || [];
      if (findings.length === 0) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor(textMuted).text('No critical data quality issues flagged.', margin, y);
        y += 16;
      } else {
        findings.forEach((f) => {
          ensureSpace(50);
          const sevColor =
            f.severity === 'critical' ? '#EF4444' : f.severity === 'high' ? '#F97316' : f.severity === 'medium' ? '#F59E0B' : '#10B981';

          doc.rect(margin, y, 4, 34).fill(sevColor);
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(textPrimary)
            .text(`[${f.severity.toUpperCase()}] ${f.issue}`, margin + 10, y, { width: contentWidth - 10 });
          doc
            .fontSize(8.5)
            .font('Helvetica')
            .fillColor(textSecondary)
            .text(`Action: ${f.suggestion}`, margin + 10, y + 14, { width: contentWidth - 10 });
          y += 40;
        });
      }

      // Section: Financial Insights & Anomalies
      ensureSpace(120);
      y += 10;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryDark).text('Financial & Ledger Analysis', margin, y);
      y += 18;
      doc.rect(margin, y, contentWidth, 1).fill(borderColor);
      y += 8;

      const finances = insights.financialInsights || [];
      if (finances.length === 0) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor(textMuted).text('No financial outflow records identified.', margin, y);
        y += 16;
      } else {
        finances.forEach((fi) => {
          ensureSpace(45);
          doc.rect(margin, y, contentWidth, 38).fill('#F8FAFC');
          doc.rect(margin, y, contentWidth, 38).strokeColor(borderColor).stroke();

          doc.fontSize(9).font('Helvetica-Bold').fillColor(textPrimary).text(`${fi.metric}: ${fi.value}`, margin + 10, y + 8);
          doc.fontSize(8).font('Helvetica').fillColor(textSecondary).text(`Observation: ${fi.anomaly}  |  Advice: ${fi.recommendation}`, margin + 10, y + 22, {
            width: contentWidth - 20
          });
          y += 44;
        });
      }

      // Section: Strategic Recommendations
      ensureSpace(140);
      y += 10;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryDark).text('Strategic Action Plan & Governance Steps', margin, y);
      y += 18;
      doc.rect(margin, y, contentWidth, 1).fill(borderColor);
      y += 8;

      const recs = insights.strategicRecommendations || [];
      recs.forEach((r, idx) => {
        ensureSpace(45);
        const prioColor = r.priority === 'high' ? '#DC2626' : r.priority === 'medium' ? '#D97706' : '#2563EB';

        doc.fontSize(9).font('Helvetica-Bold').fillColor(prioColor).text(`${idx + 1}. [${r.priority.toUpperCase()} PRIORITY] ${r.title}`, margin, y);
        y += 12;
        doc.fontSize(8.5).font('Helvetica').fillColor(textPrimary).text(`Execution: ${r.action}`, margin + 12, y, { width: contentWidth - 12 });
        y += 12;
        doc.fontSize(8).font('Helvetica-Oblique').fillColor(textSecondary).text(`Expected Outcome: ${r.expectedOutcome}`, margin + 12, y, { width: contentWidth - 12 });
        y += 16;
      });

      // Section: Caveats & Limitations
      ensureSpace(80);
      y += 10;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(textMuted).text('Audit Limitations & Methodology Caveats', margin, y);
      y += 14;
      (insights.limitations || []).forEach((lim) => {
        doc.fontSize(7.5).font('Helvetica').fillColor(textMuted).text(`• ${lim}`, margin + 6, y, { width: contentWidth - 6 });
        y += 11;
      });

      // Footer numbering across all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(textMuted)
          .text(
            `NGOcore Intelligence System  •  Confidential & Proprietary  •  Page ${i + 1} of ${range.count}`,
            margin,
            pageHeight - 25,
            { align: 'center', width: contentWidth }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateOverviewReportPdf
};

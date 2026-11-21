const aiInsightsService = require('../services/aiInsightsService');
const reportStudioPdfService = require('../services/reportStudioPdfService');
const Ngo = require('../models/Ngo');
const logger = require('../utils/logger');

/**
 * AI Data Insights & Report Studio Controller
 */

// Analyze Dataset endpoint
const analyzeDataset = async (req, res, next) => {
  try {
    let content = '';
    let filename = 'Dataset';
    let format = 'csv';

    if (req.file) {
      filename = req.file.originalname;
      const ext = (filename.split('.').pop() || '').toLowerCase();
      format = ext === 'json' ? 'json' : 'csv';
      content = req.file.buffer.toString('utf8');
    } else if (req.body.sampleKey) {
      const sample = aiInsightsService.SAMPLE_DATASETS[req.body.sampleKey];
      if (!sample) {
        return res.status(400).json({ success: false, message: 'Invalid sample dataset key.' });
      }
      filename = sample.name;
      content = sample.content;
      format = 'csv';
    } else if (req.body.content) {
      content = req.body.content;
      filename = req.body.filename || 'Custom_Dataset.csv';
      format = req.body.format || 'csv';
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file, sample key, or text content was provided for analysis.'
      });
    }

    const result = await aiInsightsService.analyzeDataset({
      content,
      filename,
      format
    });

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (err) {
    logger.error('Error analyzing dataset in Report Studio:', err);
    next(err);
  }
};

// Export Overview PDF Report
const exportPdf = async (req, res, next) => {
  try {
    const { datasetName, insights, structure } = req.body;
    if (!insights) {
      return res.status(400).json({ success: false, message: 'Missing insights data payload for PDF generation.' });
    }

    let ngoName = 'NGO Organization';
    if (req.ngoId || req.user?.ngoId) {
      const ngo = await Ngo.findById(req.ngoId || req.user?.ngoId).lean();
      if (ngo?.name) ngoName = ngo.name;
    }

    const pdfBuffer = await reportStudioPdfService.generateOverviewReportPdf({
      datasetName: datasetName || 'Executive Dataset',
      ngoName,
      insights,
      structure
    });

    const safeName = (datasetName || 'Report')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const filename = `NGOcore_Overview_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (err) {
    logger.error('Error generating Report Studio PDF:', err);
    next(err);
  }
};

// Retrieve available pre-packaged sample datasets
const getSampleDatasets = async (req, res) => {
  const keys = Object.keys(aiInsightsService.SAMPLE_DATASETS).map((key) => ({
    key,
    name: aiInsightsService.SAMPLE_DATASETS[key].name,
    previewLines: aiInsightsService.SAMPLE_DATASETS[key].content.split('\n').slice(0, 4)
  }));

  res.status(200).json({
    success: true,
    data: { samples: keys }
  });
};

module.exports = {
  analyzeDataset,
  exportPdf,
  getSampleDatasets
};

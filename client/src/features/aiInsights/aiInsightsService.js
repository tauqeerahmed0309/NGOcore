import api from '../../services/api';

/**
 * AI Data Insights & Report Studio API Client
 */
export const aiInsightsService = {
  /**
   * Fetch pre-configured sample datasets
   */
  getSampleDatasets: async () => {
    return await api.get('/ai-insights/samples');
  },

  /**
   * Analyze an uploaded file or sample dataset
   */
  analyzeFile: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    return await api.post('/ai-insights/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
  },

  /**
   * Analyze using a sample dataset key
   */
  analyzeSample: async (sampleKey) => {
    return await api.post('/ai-insights/analyze', { sampleKey });
  },

  /**
   * Analyze raw text/content payload
   */
  analyzeContent: async ({ content, filename, format = 'csv' }) => {
    return await api.post('/ai-insights/analyze', { content, filename, format });
  },

  /**
   * Generate & download the FINAL OVERVIEW REPORT (PDF)
   */
  exportOverviewPdf: async ({ datasetName, insights, structure }) => {
    const response = await api.post(
      '/ai-insights/export-pdf',
      { datasetName, insights, structure },
      { responseType: 'blob' }
    );

    const blob = response instanceof Blob ? response : new Blob([response.data || response], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (datasetName || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25);
    link.setAttribute('download', `NGOcore_Overview_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default aiInsightsService;

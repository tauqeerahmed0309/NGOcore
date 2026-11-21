import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  UploadCloud,
  Layers,
  Database,
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import aiInsightsService from './aiInsightsService';
import DatasetUploadPanel from './DatasetUploadPanel';
import InsightsOverviewDashboard from './InsightsOverviewDashboard';
import DatasetExplorer from './DatasetExplorer';

export default function AiInsightsStudio() {
  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'explorer' | 'upload'
  const [datasetName, setDatasetName] = useState('');
  const [insights, setInsights] = useState(null);
  const [structure, setStructure] = useState(null);

  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  // Analyze custom uploaded file
  const handleAnalyzeFile = async (file) => {
    setLoading(true);
    setUploadProgress(10);
    try {
      const res = await aiInsightsService.analyzeFile(file, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      const payload = res?.data?.data || res?.data || res;
      setDatasetName(payload.datasetName || file.name);
      setStructure(payload.structure);
      setInsights(payload.insights);
      setActiveTab('insights');
      showNotification('success', `Dataset '${file.name}' analyzed successfully.`);
    } catch (err) {
      console.error('Failed to analyze dataset:', err);
      const msg = err?.message || err?.response?.data?.message || 'Failed to analyze dataset.';
      showNotification('error', msg);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Analyze pre-loaded sample dataset
  const handleLoadSample = async (sampleKey) => {
    setLoading(true);
    try {
      const res = await aiInsightsService.analyzeSample(sampleKey);
      const payload = res?.data?.data || res?.data || res;
      setDatasetName(payload.datasetName || 'Sample Dataset');
      setStructure(payload.structure);
      setInsights(payload.insights);
      setActiveTab('insights');
      showNotification('success', `Sample dataset '${payload.datasetName}' loaded and analyzed.`);
    } catch (err) {
      console.error('Failed to load sample dataset:', err);
      const msg = err?.message || err?.response?.data?.message || 'Failed to load sample dataset.';
      showNotification('error', msg);
    } finally {
      setLoading(false);
    }
  };

  // Export Overview PDF Report
  const handleExportPdf = async () => {
    if (!insights) {
      showNotification('error', 'Please analyze a dataset before generating the PDF report.');
      return;
    }

    setDownloadingPdf(true);
    showNotification('info', 'Compiling and rendering FINAL OVERVIEW REPORT (PDF)...');
    try {
      await aiInsightsService.exportOverviewPdf({
        datasetName,
        insights,
        structure
      });
      showNotification('success', 'Overview PDF Report downloaded successfully.');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      const msg = err?.message || err?.response?.data?.message || 'Failed to generate PDF report.';
      showNotification('error', msg);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Auto-load beneficiary sample on first visit if empty
  useEffect(() => {
    if (!insights && !loading) {
      handleLoadSample('donations');
    }
  }, []);

  return (
    <div className="feature-page-container" style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: notification.type === 'error' ? 'var(--status-danger-bg)' : notification.type === 'info' ? 'rgba(59, 130, 246, 0.1)' : 'var(--status-success-bg)',
            color: notification.type === 'error' ? 'var(--status-danger)' : notification.type === 'info' ? '#2563eb' : 'var(--status-success)',
            border: `1px solid ${notification.type === 'error' ? '#fecaca' : notification.type === 'info' ? '#bfdbfe' : '#bbf7d0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {notification.type === 'error' ? (
              <AlertCircle size={16} />
            ) : notification.type === 'info' ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Page Header — Design Match */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--brand-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              AI Data Insights &amp; Report Studio
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '3px 0 0 0' }}>
              Automated data governance, quality audits, financial projections &amp; exportable PDF intelligence
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <UploadCloud size={16} />
            <span>Upload New Dataset</span>
          </button>

          {insights && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={downloadingPdf}
              onClick={handleExportPdf}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                background: 'var(--brand-green)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: downloadingPdf ? 'not-allowed' : 'pointer'
              }}
            >
              <Download size={16} />
              <span>{downloadingPdf ? 'Generating PDF...' : 'Export Overview Report (PDF)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border)',
          marginBottom: 20
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('insights')}
          style={{
            padding: '10px 18px',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'insights' ? '2px solid var(--brand-green)' : '2px solid transparent',
            color: activeTab === 'insights' ? 'var(--brand-green)' : 'var(--text-secondary)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <BarChart3 size={15} />
          <span>Executive Overview &amp; Insights</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explorer')}
          disabled={!structure}
          style={{
            padding: '10px 18px',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'explorer' ? '2px solid var(--brand-green)' : '2px solid transparent',
            color: activeTab === 'explorer' ? 'var(--brand-green)' : 'var(--text-secondary)',
            backgroundColor: 'transparent',
            cursor: !structure ? 'not-allowed' : 'pointer',
            opacity: !structure ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <FileSpreadsheet size={15} />
          <span>Attribute Schema &amp; Records ({structure?.totalRows || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          style={{
            padding: '10px 18px',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'upload' ? '2px solid var(--brand-green)' : '2px solid transparent',
            color: activeTab === 'upload' ? 'var(--brand-green)' : 'var(--text-secondary)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <UploadCloud size={15} />
          <span>Upload &amp; Sample Datasets</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--brand-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <RefreshCw size={24} className="spin" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Analyzing Dataset with AI Engine...
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto' }}>
            Auditing tabular completeness, detecting duplicate risks, calculating statistical variances, and invoking Gemini intelligence.
          </p>
        </div>
      ) : activeTab === 'insights' ? (
        <InsightsOverviewDashboard insights={insights} datasetName={datasetName} />
      ) : activeTab === 'explorer' ? (
        <DatasetExplorer structure={structure} />
      ) : (
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <DatasetUploadPanel
            onAnalyze={handleAnalyzeFile}
            onLoadSample={handleLoadSample}
            loading={loading}
            progress={uploadProgress}
          />
        </div>
      )}
    </div>
  );
}

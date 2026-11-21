import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Database,
  ArrowRight,
  X
} from 'lucide-react';

export default function DatasetUploadPanel({
  onAnalyze,
  onLoadSample,
  loading,
  progress
}) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.json', '.pdf', '.docx', '.txt'];

  const validateAndSetFile = (file) => {
    setFileError('');
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setFileError(`Unsupported file format. Please upload ${allowedExtensions.join(', ')}.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setFileError('File exceeds the maximum 25 MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleStartAnalysis = () => {
    if (!selectedFile) return;
    onAnalyze(selectedFile);
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--brand-green)' : 'var(--border)'}`,
          backgroundColor: dragOver ? 'var(--status-success-bg)' : 'var(--bg-surface)',
          borderRadius: '12px',
          padding: '36px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.json,.pdf,.docx,.txt"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-green)'
            }}
          >
            <UploadCloud size={28} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Drag &amp; Drop dataset files, or <span style={{ color: 'var(--brand-green)' }}>browse</span>
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Supports CSV, XLSX, XLS, PDF, DOCX, JSON, TXT up to 25 MB
            </p>
          </div>
        </div>
      </div>

      {/* File Validation Error */}
      {fileError && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <AlertCircle size={16} />
          <span>{fileError}</span>
        </div>
      )}

      {/* Selected File Card */}
      {selectedFile && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}
            >
              {selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx') ? (
                <FileSpreadsheet size={22} />
              ) : (
                <FileText size={22} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document file'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={handleStartAnalysis}
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
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <Sparkles size={16} />
              <span>{loading ? 'Analyzing with Gemini...' : 'Run AI Analysis & Audit'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              disabled={loading}
              style={{
                padding: '8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {loading && progress > 0 && progress < 100 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span>Uploading dataset...</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--border)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: 'var(--brand-green)',
                transition: 'width 0.2s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* Pre-packaged Sample Datasets Section */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Database size={16} style={{ color: 'var(--brand-green)' }} />
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Or test instantly with pre-loaded NGO demonstration datasets:
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <button
            type="button"
            className="btn btn-outline"
            disabled={loading}
            onClick={() => onLoadSample('beneficiaries')}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Urban Education Beneficiaries
              </span>
              <ArrowRight size={14} style={{ color: 'var(--brand-green)' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              10 records • Primary education, attendance metrics, missing phone numbers
            </span>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            disabled={loading}
            onClick={() => onLoadSample('donations')}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Q3 Corporate Donations Ledger
              </span>
              <ArrowRight size={14} style={{ color: 'var(--brand-green)' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              10 records • INR 28.3L inflow, grants, CSR, receipts issued vs unissued
            </span>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            disabled={loading}
            onClick={() => onLoadSample('inventory')}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Medical Camp Supplies Inventory
              </span>
              <ArrowRight size={14} style={{ color: 'var(--brand-green)' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              8 records • Emergency kits, rations, threshold alerts, multi-warehouse stock
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

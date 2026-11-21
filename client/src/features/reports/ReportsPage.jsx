import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Download,
  FileText,
  FileSpreadsheet,
  FileDown,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Users,
  Calendar,
  Building2,
  CheckCircle2,
  ClipboardList
} from 'lucide-react';
import { reportService } from './reportService';

const toDateInput = (date) => {
  if (!date) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export default function ReportsPage() {
  // Current active report tab
  const [activeReport, setActiveReport] = useState('beneficiaries');

  // Filter States
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Legacy Participation Range
  const [partFrom, setPartFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInput(d);
  });
  const [partTo, setPartTo] = useState(() => toDateInput(new Date()));

  // Data & UI States
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null); // 'pdf' | 'xlsx' | 'csv' | null
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Load preview data when report type or filters change
  const fetchPreview = useCallback(async () => {
    if (activeReport === 'participation') {
      setPreviewData(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      let res;
      if (activeReport === 'beneficiaries') {
        res = await reportService.getBeneficiaryReport({
          status: statusFilter,
          from: from || undefined,
          to: to || undefined,
          search: searchQuery || undefined,
          format: 'json',
          limit: 100
        });
      } else if (activeReport === 'programs') {
        res = await reportService.getProgramReport({
          status: statusFilter,
          type: typeFilter || undefined,
          from: from || undefined,
          to: to || undefined,
          search: searchQuery || undefined,
          format: 'json',
          limit: 100
        });
      } else if (activeReport === 'org-summary') {
        res = await reportService.getOrgSummaryReport({
          format: 'json'
        });
      }

      const payload = res?.data?.data || res?.data || res;
      if (payload) {
        setPreviewData(payload);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load report preview.');
    } finally {
      setLoading(false);
    }
  }, [activeReport, statusFilter, typeFilter, from, to, searchQuery]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Handle Tab Change
  const handleTabChange = (reportKey) => {
    setActiveReport(reportKey);
    setStatusFilter('all');
    setTypeFilter('');
    setSearchQuery('');
    setFrom('');
    setTo('');
    setError('');
    setNotice('');
  };

  // Trigger File Download
  const handleExport = async (format) => {
    setError('');
    setNotice('');
    setExportingFormat(format);

    try {
      let blob;
      const dateSuffix = new Date().toISOString().slice(0, 10);
      let filename = `ngocore-${activeReport}-${dateSuffix}.${format}`;

      if (activeReport === 'beneficiaries') {
        const res = await reportService.getBeneficiaryReport({
          status: statusFilter,
          from: from || undefined,
          to: to || undefined,
          search: searchQuery || undefined,
          format,
          limit: 5000
        });
        blob = new Blob([res.data]);
        filename = `ngocore-beneficiaries-${dateSuffix}.${format}`;
      } else if (activeReport === 'programs') {
        const res = await reportService.getProgramReport({
          status: statusFilter,
          type: typeFilter || undefined,
          from: from || undefined,
          to: to || undefined,
          search: searchQuery || undefined,
          format,
          limit: 5000
        });
        blob = new Blob([res.data]);
        filename = `ngocore-programs-${dateSuffix}.${format}`;
      } else if (activeReport === 'org-summary') {
        const res = await reportService.getOrgSummaryReport({ format });
        blob = new Blob([res.data]);
        filename = `ngocore-org-summary-${dateSuffix}.${format}`;
      } else if (activeReport === 'participation') {
        if (!partFrom || !partTo || partFrom > partTo) {
          setError('Choose a valid date range. The start date must be on or before the end date.');
          setExportingFormat(null);
          return;
        }
        const res = await reportService.downloadParticipation(partFrom, partTo);
        blob = new Blob([res.data]);
        filename = `ngocore-participation-${partFrom}-to-${partTo}.csv`;
      }

      // Download file to client browser
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 100);

      setNotice(`${previewData?.title || 'Report'} (${format.toUpperCase()}) downloaded successfully.`);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || `Could not generate ${format.toUpperCase()} export.`);
    } finally {
      setExportingFormat(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'active') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: 'var(--status-success-bg)',
            color: 'var(--status-success)',
            border: '1px solid #bbf7d0'
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-success)' }} />
          Active
        </span>
      );
    }
    if (s === 'graduated' || s === 'completed') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            textTransform: 'capitalize'
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
          {s}
        </span>
      );
    }
    if (s === 'inactive' || s === 'cancelled' || s === 'withdrawn') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger)',
            border: '1px solid #fecaca',
            textTransform: 'capitalize'
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-danger)' }} />
          {s}
        </span>
      );
    }
    if (s === 'draft' || s === 'paused' || s === 'transferred') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: 'var(--status-warning-bg)',
            color: 'var(--status-warning)',
            border: '1px solid #fde68a',
            textTransform: 'capitalize'
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-warning)' }} />
          {s}
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: '#f1f5f9',
          color: 'var(--text-secondary)',
          border: '1px solid #cbd5e1'
        }}
      >
        {status || 'N/A'}
      </span>
    );
  };

  return (
    <div className="feature-page-container" style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: 'var(--brand-green-muted)',
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileText size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Reports &amp; Exports
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Generate and export operational records, capacity analytics, and audit summaries in PDF, Excel, and CSV
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger)',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem'
          }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            style={{ color: 'inherit', padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: 'var(--status-success-bg)',
            color: 'var(--status-success)',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem'
          }}
          role="status"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice('')}
            style={{ color: 'inherit', padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Report Selection Tabs */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            onClick={() => handleTabChange('beneficiaries')}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: activeReport === 'beneficiaries' ? 'none' : '1px solid var(--border)',
              background: activeReport === 'beneficiaries' ? 'var(--brand-green)' : 'var(--bg-surface)',
              color: activeReport === 'beneficiaries' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeReport === 'beneficiaries' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer'
            }}
          >
            <Users size={16} />
            <span>Beneficiary Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('programs')}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: activeReport === 'programs' ? 'none' : '1px solid var(--border)',
              background: activeReport === 'programs' ? 'var(--brand-green)' : 'var(--bg-surface)',
              color: activeReport === 'programs' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeReport === 'programs' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer'
            }}
          >
            <Calendar size={16} />
            <span>Program &amp; Activity Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('org-summary')}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: activeReport === 'org-summary' ? 'none' : '1px solid var(--border)',
              background: activeReport === 'org-summary' ? 'var(--brand-green)' : 'var(--bg-surface)',
              color: activeReport === 'org-summary' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeReport === 'org-summary' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer'
            }}
          >
            <Building2 size={16} />
            <span>Organization Summary</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('participation')}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: activeReport === 'participation' ? 'none' : '1px solid var(--border)',
              background: activeReport === 'participation' ? 'var(--brand-green)' : 'var(--bg-surface)',
              color: activeReport === 'participation' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: activeReport === 'participation' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer'
            }}
          >
            <ClipboardList size={16} />
            <span>Participation Attendance</span>
          </button>
        </div>
      </div>

      {/* Interactive Filters Bar (for Beneficiary and Program reports) */}
      {activeReport !== 'participation' && activeReport !== 'org-summary' && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={16} style={{ color: 'var(--brand-green)' }} />
              <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Filters:</strong>
            </div>

            {/* Status Filter */}
            <div style={{ minWidth: 140 }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="all">All Statuses</option>
                {activeReport === 'beneficiaries' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="graduated">Graduated</option>
                    <option value="transferred">Transferred</option>
                    <option value="inactive">Inactive</option>
                  </>
                ) : (
                  <>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>

            {/* Program Type Filter (for Programs only) */}
            {activeReport === 'programs' && (
              <div style={{ minWidth: 150 }}>
                <input
                  type="text"
                  placeholder="Program Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            )}

            {/* Date Range Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From:</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To:</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Search Input */}
            <div style={{ flex: '1 1 200px', position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={activeReport === 'beneficiaries' ? 'Search by name, reg # or email...' : 'Search by name or code...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Reset Filters */}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('');
                setFrom('');
                setTo('');
                setSearchQuery('');
              }}
              style={{
                padding: '9px 14px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Legacy Participation Report Section */}
      {activeReport === 'participation' && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 24,
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'var(--brand-green-muted)',
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ClipboardList size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Program Participation &amp; Attendance Report
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                Generates enrollment records and granular attendance metrics across all scheduled sessions for the selected time window.
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
                CSV columns include Program code, Program name, Student ID, Registration number, Enrollment status, Sessions recorded, Present, Absent, Excused, and Attendance rate.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From Date:</span>
                  <input
                    type="date"
                    value={partFrom}
                    max={partTo}
                    onChange={(e) => setPartFrom(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: '0.85rem',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To Date:</span>
                  <input
                    type="date"
                    value={partTo}
                    min={partFrom}
                    onChange={(e) => setPartTo(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: '0.85rem',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleExport('csv')}
                  disabled={exportingFormat !== null}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    background: 'var(--brand-green)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 'none',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer'
                  }}
                >
                  {exportingFormat === 'csv' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download Participation CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Summary Cards (Org Summary) */}
      {previewData?.summaryCards && activeReport === 'org-summary' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}
        >
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Total Beneficiaries
            </span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--brand-green)', marginTop: 4 }}>
              {previewData.summaryCards.totalBeneficiaries}
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {previewData.summaryCards.activeBeneficiaries} active members
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Total Programs
            </span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
              {previewData.summaryCards.totalPrograms}
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {previewData.summaryCards.activePrograms} running programs
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Active Enrollments
            </span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#7c3aed', marginTop: 4 }}>
              {previewData.summaryCards.activeEnrollments}
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Across all programs
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Attendance Sessions
            </span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-warning)', marginTop: 4 }}>
              {previewData.summaryCards.totalAttendanceSessions}
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Recorded session events
            </div>
          </div>
        </div>
      )}

      {/* Report Action & Export Header */}
      {activeReport !== 'participation' && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {previewData?.title || 'Report Preview'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Organization: <strong>{previewData?.ngoName || 'NGO Organization'}</strong> &bull; Total Matching Records:{' '}
                <strong>{previewData?.meta?.total ?? previewData?.data?.length ?? 0}</strong>
              </p>
            </div>

            {/* Three Export Format Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={fetchPreview}
                disabled={loading}
                title="Refresh preview"
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleExport('pdf')}
                disabled={exportingFormat !== null || loading || !previewData?.data?.length}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: (!previewData?.data?.length || exportingFormat !== null) ? 0.5 : 1,
                  cursor: 'pointer'
                }}
              >
                {exportingFormat === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleExport('xlsx')}
                disabled={exportingFormat !== null || loading || !previewData?.data?.length}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: (!previewData?.data?.length || exportingFormat !== null) ? 0.5 : 1,
                  cursor: 'pointer'
                }}
              >
                {exportingFormat === 'xlsx' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleExport('csv')}
                disabled={exportingFormat !== null || loading || !previewData?.data?.length}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  background: 'var(--brand-green)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: 'var(--shadow-sm)',
                  opacity: (!previewData?.data?.length || exportingFormat !== null) ? 0.5 : 1,
                  cursor: 'pointer'
                }}
              >
                {exportingFormat === 'csv' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Report Preview Table */}
      {activeReport !== 'participation' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div className="auth-spinner" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Compiling and querying live report data...</p>
            </div>
          ) : !previewData?.data || previewData.data.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Records Found</h4>
              <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
                No records match the applied criteria or date range. Try broadening your filter settings.
              </p>
            </div>
          ) : (
            <div>
              <div
                style={{
                  padding: '12px 18px',
                  background: 'var(--bg-hover)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Live Data Preview (Showing top {Math.min(previewData.data.length, 100)} of {previewData.meta?.total ?? previewData.data.length} records)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Full downloads will include all matching rows up to 5,000
                </span>
              </div>
              <div className="table-responsive" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                      {previewData.columns.map((col, idx) => (
                        <th key={idx} style={{ textAlign: col.align || 'left', padding: '12px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.data.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background-color 150ms'
                        }}
                        className="table-row-hover"
                      >
                        {previewData.columns.map((col, cIdx) => {
                          const val = row[col.key];
                          return (
                            <td key={cIdx} style={{ textAlign: col.align || 'left', padding: '14px 16px', whiteSpace: 'nowrap' }}>
                              {col.key === 'status' ? (
                                getStatusBadge(val)
                              ) : col.key === 'registrationNumber' ? (
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    backgroundColor: '#f1f5f9',
                                    color: '#334155'
                                  }}
                                >
                                  {val}
                                </span>
                              ) : col.key === 'code' ? (
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    backgroundColor: '#f1f5f9',
                                    color: '#334155'
                                  }}
                                >
                                  {val}
                                </span>
                              ) : (
                                val ?? '—'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

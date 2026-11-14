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

      if (res?.data?.data) {
        setPreviewData(res.data.data);
      } else if (res?.data) {
        setPreviewData(res.data);
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
    const s = String(status || '').toUpperCase();
    if (s === 'ACTIVE') return <span className="badge badge-success">ACTIVE</span>;
    if (s === 'GRADUATED' || s === 'COMPLETED') return <span className="badge badge-info">{s}</span>;
    if (s === 'INACTIVE' || s === 'CANCELLED' || s === 'WITHDRAWN') return <span className="badge badge-danger">{s}</span>;
    if (s === 'DRAFT' || s === 'PAUSED' || s === 'TRANSFERRED') return <span className="badge badge-warning">{s}</span>;
    return <span className="badge badge-muted">{s || 'N/A'}</span>;
  };

  return (
    <div className="user-management-page reports-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &amp; Exports Center</h1>
          <p className="page-subtitle">
            Generate and export operational records, capacity analytics, and audit summaries in PDF, Excel, and CSV.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Report Selection Tabs */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button
            type="button"
            className={`btn-action ${activeReport === 'beneficiaries' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleTabChange('beneficiaries')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
          >
            <Users size={18} />
            <span>Beneficiary Report</span>
          </button>
          <button
            type="button"
            className={`btn-action ${activeReport === 'programs' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleTabChange('programs')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
          >
            <Calendar size={18} />
            <span>Program &amp; Activity Report</span>
          </button>
          <button
            type="button"
            className={`btn-action ${activeReport === 'org-summary' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleTabChange('org-summary')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
          >
            <Building2 size={18} />
            <span>Organization Summary</span>
          </button>
          <button
            type="button"
            className={`btn-action ${activeReport === 'participation' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleTabChange('participation')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
          >
            <ClipboardList size={18} />
            <span>Participation Attendance</span>
          </button>
        </div>
      </div>

      {/* Interactive Filters Bar (for Beneficiary and Program reports) */}
      {activeReport !== 'participation' && activeReport !== 'org-summary' && (
        <div className="card" style={{ marginBottom: '20px', padding: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} style={{ color: 'var(--brand-green-dark)' }} />
              <strong style={{ fontSize: '0.9rem' }}>Filters:</strong>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
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
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Program Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. class, workshop"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', width: '150px' }}
                />
              </div>
            )}

            {/* Date Range Filters */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                From Date
              </label>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                To Date
              </label>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Search Input */}
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                Search Keyword
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={activeReport === 'beneficiaries' ? 'Search by name, reg # or email...' : 'Search by name or code...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem'
                  }}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            {/* Reset Filters */}
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('');
                  setFrom('');
                  setTo('');
                  setSearchQuery('');
                }}
                style={{ padding: '7px 12px', fontSize: '0.85rem' }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Participation Report Section */}
      {activeReport === 'participation' && (
        <section className="card report-export-card" style={{ marginBottom: '20px' }}>
          <div className="report-export-icon">
            <ClipboardList size={22} />
          </div>
          <div>
            <h2>Program Participation &amp; Attendance Report</h2>
            <p>
              Generates enrollment records and granular attendance metrics across all scheduled sessions for the selected time window.
            </p>
            <p className="form-help-text" style={{ margin: '8px 0 16px' }}>
              CSV columns include Program code, Program name, Student ID, Registration number, Enrollment status, Sessions recorded, Present, Absent, Excused, and Attendance rate.
            </p>
            <div className="report-date-fields" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem' }}>
                From Date:{' '}
                <input
                  type="date"
                  value={partFrom}
                  max={partTo}
                  onChange={(e) => setPartFrom(e.target.value)}
                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </label>
              <label style={{ fontSize: '0.85rem' }}>
                To Date:{' '}
                <input
                  type="date"
                  value={partTo}
                  min={partFrom}
                  onChange={(e) => setPartTo(e.target.value)}
                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleExport('csv')}
                disabled={exportingFormat !== null}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {exportingFormat === 'csv' ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                Download Participation CSV
              </button>
            </div>
          </div>
        </section>
      )}

      {/* KPI Summary Cards (Beneficiaries, Programs, Org Summary) */}
      {previewData?.summaryCards && activeReport === 'org-summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div className="card stat-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Beneficiaries</span>
            <h3 style={{ fontSize: '1.6rem', margin: '6px 0 0', color: 'var(--brand-green-dark)' }}>
              {previewData.summaryCards.totalBeneficiaries}
            </h3>
            <small style={{ color: 'var(--text-muted)' }}>{previewData.summaryCards.activeBeneficiaries} active</small>
          </div>
          <div className="card stat-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Programs</span>
            <h3 style={{ fontSize: '1.6rem', margin: '6px 0 0', color: '#2563eb' }}>
              {previewData.summaryCards.totalPrograms}
            </h3>
            <small style={{ color: 'var(--text-muted)' }}>{previewData.summaryCards.activePrograms} running</small>
          </div>
          <div className="card stat-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Enrollments</span>
            <h3 style={{ fontSize: '1.6rem', margin: '6px 0 0', color: '#7c3aed' }}>
              {previewData.summaryCards.activeEnrollments}
            </h3>
            <small style={{ color: 'var(--text-muted)' }}>across programs</small>
          </div>
          <div className="card stat-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Attendance Sessions</span>
            <h3 style={{ fontSize: '1.6rem', margin: '6px 0 0', color: '#d97706' }}>
              {previewData.summaryCards.totalAttendanceSessions}
            </h3>
            <small style={{ color: 'var(--text-muted)' }}>recorded sessions</small>
          </div>
        </div>
      )}

      {/* Report Action & Export Header */}
      {activeReport !== 'participation' && (
        <div className="card" style={{ marginBottom: '20px', padding: '18px 22px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem' }}>
                {previewData?.title || 'Report Preview'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Organization: <strong>{previewData?.ngoName || 'NGO Organization'}</strong> &bull; Total Matching Records:{' '}
                <strong>{previewData?.meta?.total ?? previewData?.data?.length ?? 0}</strong>
              </p>
            </div>

            {/* Three Export Format Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={fetchPreview}
                disabled={loading}
                title="Refresh preview"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
              >
                <RefreshCw size={15} className={loading ? 'spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleExport('pdf')}
                disabled={exportingFormat !== null || loading || !previewData?.data?.length}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
              >
                {exportingFormat === 'pdf' ? <Loader2 size={15} className="spin" /> : <FileDown size={15} />}
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleExport('xlsx')}
                disabled={exportingFormat !== null || loading || !previewData?.data?.length}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
              >
                {exportingFormat === 'xlsx' ? <Loader2 size={15} className="spin" /> : <FileSpreadsheet size={15} />}
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => handleExport('csv')}
                disabled={exportingFormat !== null || loading || !previewData?.data?.length}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
              >
                {exportingFormat === 'csv' ? <Loader2 size={15} className="spin" /> : <FileText size={15} />}
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Report Preview Table */}
      {activeReport !== 'participation' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px', color: 'var(--brand-green-dark)' }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Compiling and querying live report data...</p>
            </div>
          ) : !previewData?.data || previewData.data.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center' }}>
              <FileText size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '1rem' }}>No records found</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                No records match the applied criteria or date range. Try broadening your filter settings.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ padding: '12px 18px', background: 'var(--bg-subtle, #f8fafc)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Live Data Preview (Showing top {Math.min(previewData.data.length, 100)} of {previewData.meta?.total ?? previewData.data.length} records)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Full downloads will include all matching rows up to 5,000
                </span>
              </div>
              <div className="table-responsive-wrapper" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      {previewData.columns.map((col, idx) => (
                        <th key={idx} style={{ textAlign: col.align || 'left', padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.data.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {previewData.columns.map((col, cIdx) => {
                          const val = row[col.key];
                          return (
                            <td key={cIdx} style={{ textAlign: col.align || 'left', padding: '9px 14px', whiteSpace: 'nowrap' }}>
                              {col.key === 'status' ? (
                                getStatusBadge(val)
                              ) : col.key === 'registrationNumber' ? (
                                <span className="reg-badge">{val}</span>
                              ) : col.key === 'code' ? (
                                <span className="code-badge">{val}</span>
                              ) : (
                                val ?? 'N/A'
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

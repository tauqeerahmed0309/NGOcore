import React, { useState } from 'react';
import { AlertCircle, Download, FileText, Loader2 } from 'lucide-react';
import { reportService } from './reportService';

const toDateInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export default function ReportsPage() {
  const [[initialFrom, initialTo]] = useState(() => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    return [toDateInput(monthAgo), toDateInput(today)];
  });
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const download = async () => {
    setError('');
    setNotice('');
    if (!from || !to || from > to) {
      setError('Choose a valid date range. The start date must be on or before the end date.');
      return;
    }
    setLoading(true);
    try {
      const blob = await reportService.downloadParticipation(from, to);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ngocore-participation-${from}-to-${to}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice('Participation report downloaded.');
    } catch (requestError) {
      setError(requestError.message || 'Could not generate this report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-management-page reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &amp; exports</h1>
          <p className="page-subtitle">Download program enrollment and attendance data for NGO reporting.</p>
        </div>
      </div>
      {error && <div className="alert alert-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <section className="card report-export-card">
        <div className="report-export-icon"><FileText size={22} /></div>
        <div>
          <h2>Program participation report</h2>
          <p>One row per enrolled student and program, including attendance totals during the selected period.</p>
          <p className="form-help-text">CSV columns include program, student record ID, registration number, enrollment status, sessions attended, and attendance rate.</p>
        </div>
        <div className="report-date-fields">
          <label>From <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>To <input type="date" value={to} max={today} min={from} onChange={(event) => setTo(event.target.value)} /></label>
          <button type="button" className="btn-primary" onClick={download} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
            Download CSV
          </button>
        </div>
      </section>
    </div>
  );
}

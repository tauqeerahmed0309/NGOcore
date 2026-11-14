import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Calendar,
  Layers,
  Award,
  RefreshCw,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { analyticsService } from '../analytics/analyticsService';

/**
 * AnalyticsSummaryCard
 * Displays a concise executive summary of organization-wide analytics on the dashboard.
 * Provides direct access to the complete Organization Analytics page (/analytics).
 *
 * @param {Object} props
 * @param {'admin'|'ngo_admin'|'staff'} [props.role='admin'] - Current user role
 */
export default function AnalyticsSummaryCard({ role = 'admin' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortControllerRef = useRef(null);

  const isStaff = role === 'staff';

  const loadSummary = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const response = await analyticsService.getDashboardAnalytics(
        { months: 6 },
        { signal: controller.signal }
      );
      const payload = response?.data || response;
      setData(payload);
    } catch (err) {
      if (err?.message === 'canceled' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Failed to load analytics summary:', err);
      const msg = err?.message || err?.errors?.[0]?.message || 'Could not load organization analytics.';
      setError(msg);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadSummary();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadSummary]);

  const beneficiaries = data?.beneficiaries || {
    total: 0,
    byStatus: { active: 0 }
  };
  const programs = data?.programs || {
    total: 0,
    byStatus: { active: 0 },
    capacityMetrics: { overallCapacityUtilizationRate: null, totalActiveEnrollments: 0 }
  };
  const attendance = data?.attendance || {
    overallPresenceRate: 0,
    totalSessionsRecorded: 0
  };

  const activePct = beneficiaries.total > 0
    ? Math.round((beneficiaries.byStatus.active / beneficiaries.total) * 100)
    : 0;

  return (
    <section className="card analytics-summary-card" aria-labelledby="analytics-summary-heading">
      {/* Card Header */}
      <div className="analytics-summary-header">
        <div className="analytics-summary-title-wrap">
          <span className="analytics-summary-icon" aria-hidden="true">
            <TrendingUp size={20} />
          </span>
          <div>
            <h2 id="analytics-summary-heading" className="analytics-summary-title">
              Organization Analytics Summary
            </h2>
            <p className="analytics-summary-subtitle">
              {isStaff
                ? 'Overview of your organization’s beneficiaries, programs, and attendance participation.'
                : 'Key performance indicators, capacity utilization, and attendance trends across the organization.'}
            </p>
          </div>
        </div>

        <div className="analytics-summary-actions">
          <button
            type="button"
            className="btn-action btn-refresh"
            onClick={loadSummary}
            disabled={loading}
            aria-label="Refresh analytics summary"
            title="Refresh summary data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            to="/analytics"
            className="btn-action btn-analytics-link"
            id={isStaff ? 'staff-view-full-analytics-btn' : 'admin-view-full-analytics-btn'}
          >
            <span>View Full Analytics</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div className="alert alert-error analytics-summary-alert" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadSummary}
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="analytics-summary-skeleton" aria-busy="true" aria-label="Loading analytics summary">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="analytics-summary-skeleton-item">
              <div className="skeleton-line" style={{ width: '45%', height: '12px' }} />
              <div className="skeleton-line" style={{ width: '70%', height: '22px', margin: '8px 0' }} />
              <div className="skeleton-line" style={{ width: '55%', height: '10px' }} />
            </div>
          ))}
        </div>
      )}

      {/* Loaded KPI Grid */}
      {data && (
        <>
          <div className="analytics-summary-grid">
            {/* Metric 1: Total Beneficiaries */}
            <div className="analytics-summary-kpi">
              <div className="analytics-summary-kpi-icon green">
                <Users size={18} />
              </div>
              <div className="analytics-summary-kpi-content">
                <span className="analytics-summary-kpi-label">Beneficiaries</span>
                <div className="analytics-summary-kpi-value">
                  {beneficiaries.total.toLocaleString()}
                </div>
                <span className="analytics-summary-kpi-meta">
                  {beneficiaries.byStatus.active} active ({activePct}%)
                </span>
              </div>
            </div>

            {/* Metric 2: Active Programs */}
            <div className="analytics-summary-kpi">
              <div className="analytics-summary-kpi-icon blue">
                <Calendar size={18} />
              </div>
              <div className="analytics-summary-kpi-content">
                <span className="analytics-summary-kpi-label">Active Programs</span>
                <div className="analytics-summary-kpi-value">
                  {programs.byStatus.active.toLocaleString()}
                </div>
                <span className="analytics-summary-kpi-meta">
                  {programs.total} total registered
                </span>
              </div>
            </div>

            {/* Metric 3: Capacity Utilization */}
            <div className="analytics-summary-kpi">
              <div className="analytics-summary-kpi-icon amber">
                <Layers size={18} />
              </div>
              <div className="analytics-summary-kpi-content">
                <span className="analytics-summary-kpi-label">Capacity Load</span>
                <div className="analytics-summary-kpi-value">
                  {programs.capacityMetrics.overallCapacityUtilizationRate !== null
                    ? `${programs.capacityMetrics.overallCapacityUtilizationRate}%`
                    : 'Uncapped'}
                </div>
                <span className="analytics-summary-kpi-meta">
                  {programs.capacityMetrics.totalActiveEnrollments} active enrollments
                </span>
              </div>
            </div>

            {/* Metric 4: Attendance Rate */}
            <div className="analytics-summary-kpi">
              <div className="analytics-summary-kpi-icon purple">
                <Award size={18} />
              </div>
              <div className="analytics-summary-kpi-content">
                <span className="analytics-summary-kpi-label">Attendance Rate</span>
                <div className="analytics-summary-kpi-value">
                  {attendance.overallPresenceRate}%
                </div>
                <span className="analytics-summary-kpi-meta">
                  {attendance.totalSessionsRecorded} session(s) logged
                </span>
              </div>
            </div>
          </div>

          {/* Direct Section Access Links */}
          <div className="analytics-summary-footer">
            <span className="analytics-summary-footer-label">Quick Analytics Modules:</span>
            <div className="analytics-summary-links">
              <Link to="/analytics" className="analytics-pill-link">
                Demographics &amp; Cohorts
              </Link>
              <Link to="/analytics" className="analytics-pill-link">
                Capacity Roster
              </Link>
              <Link to="/analytics" className="analytics-pill-link">
                Attendance Verification
              </Link>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

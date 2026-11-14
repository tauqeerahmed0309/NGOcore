import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  GraduationCap,
  Calendar,
  CheckCircle2,
  ArrowRightLeft,
  UserX,
  AlertCircle,
  RefreshCw,
  Clock,
  Activity,
  Award,
  TrendingUp,
  Layers,
  PieChart,
  MapPin,
  ShieldCheck,
  Building
} from 'lucide-react';
import { analyticsService } from './analyticsService';
import {
  TrendAreaBarChart,
  GenderDistributionChart,
  AgeCohortChart,
  TopStatesChart,
  CapacityUtilizationGauge,
  AttendancePresenceMeter
} from './AnalyticsCharts';
import { fadeUp } from '../../animations';
import './OrganizationAnalytics.css';

/**
 * Format timestamp into user-friendly localized string
 */
function formatDateTime(isoString) {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Format relative time for audit activity
 */
function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateTime(isoString);
  } catch {
    return isoString;
  }
}

export default function OrganizationAnalytics() {
  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === 'staff';
  const dashPath = isStaff ? '/staff/dashboard' : '/admin/dashboard';

  // Query parameters
  const [timeframeMonths, setTimeframeMonths] = useState(6);

  // Data & UI states
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Fetch Dashboard Analytics from API with duplicate in-flight request protection
  const fetchAnalytics = useCallback(async (months = 6) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const response = await analyticsService.getDashboardAnalytics(
        { months },
        { signal: controller.signal }
      );
      // api.js response interceptor unwraps response.data, so response is { success, statusCode, message, data }
      const payload = response?.data || response;
      setAnalyticsData(payload);
    } catch (err) {
      if (err?.message === 'canceled' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Failed to load organization analytics:', err);
      const msg = err?.message || err?.errors?.[0]?.message || 'Could not load organization analytics dashboard.';
      setError(msg);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Initial load and timeframe change with effect cleanup
  useEffect(() => {
    fetchAnalytics(timeframeMonths);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAnalytics, timeframeMonths]);

  // GSAP animation trigger on data load
  useEffect(() => {
    if (!loading && analyticsData && containerRef.current) {
      fadeUp(containerRef.current, { duration: 0.4, distance: 12 });
    }
  }, [loading, analyticsData]);

  // Destructure sections safely with complete empty fallbacks
  const beneficiaries = analyticsData?.beneficiaries || {
    total: 0,
    byStatus: { active: 0, graduated: 0, transferred: 0, inactive: 0 },
    genderDistribution: [],
    ageDistribution: [],
    missingOrInvalidDobCount: 0,
    reliableDobTotal: 0,
    monthlyRegistrationTrends: [],
    topStates: []
  };

  const programs = analyticsData?.programs || {
    total: 0,
    byStatus: { active: 0, completed: 0, draft: 0, paused: 0, cancelled: 0 },
    capacityMetrics: {
      totalActivePrograms: 0,
      totalFiniteCapacity: 0,
      totalEnrolledInFinite: 0,
      totalUnlimitedPrograms: 0,
      totalEnrolledInUnlimited: 0,
      totalActiveEnrollments: 0,
      overallCapacityUtilizationRate: null
    },
    activeProgramsRoster: [],
    monthlyEnrollmentTrends: []
  };

  const attendance = analyticsData?.attendance || {
    totalSessionsRecorded: 0,
    presentCount: 0,
    absentCount: 0,
    excusedCount: 0,
    totalRecordedEntries: 0,
    rateDenominator: 0,
    overallPresenceRate: 0
  };

  const recentActivity = analyticsData?.recentActivity || [];

  return (
    <div className="analytics-dashboard-page" ref={containerRef}>
      {/* 1. Header & Controls Bar */}
      <div className="analytics-header-controls">
        <div className="analytics-header-left">
          <div className="analytics-header-icon" aria-hidden="true">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="analytics-breadcrumb-bar">
              <Link to={dashPath} className="analytics-back-link">
                ← Back to Dashboard
              </Link>
              <span className={`badge ${isStaff ? 'badge-staff' : 'badge-admin'}`}>
                {isStaff ? 'Staff View' : 'Admin View'}
              </span>
            </div>
            <h1 className="analytics-header-title">Organization Analytics</h1>
            <p className="analytics-header-subtitle">
              Demographic distribution, capacity utilization, attendance trends, and operational activity.
            </p>
          </div>
        </div>

        <div className="analytics-controls-right">
          {/* Timeframe selector (3, 6, 12, 24 months) */}
          <div className="analytics-timeframe-group" role="group" aria-label="Select analytics timeframe">
            {[3, 6, 12, 24].map((m) => (
              <button
                key={m}
                type="button"
                className={`analytics-timeframe-btn ${timeframeMonths === m ? 'active' : ''}`}
                onClick={() => setTimeframeMonths(m)}
                disabled={loading}
                aria-pressed={timeframeMonths === m}
              >
                {m}M
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={() => fetchAnalytics(timeframeMonths)}
            disabled={loading}
            title="Refresh dashboard data"
            aria-label="Refresh organization analytics data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* Generated timestamp */}
          {analyticsData?.generatedAt && (
            <span className="analytics-meta-badge" title="Timestamp of report generation">
              <Clock size={13} />
              <span>Updated {formatDateTime(analyticsData.generatedAt)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Global Error Notice with Retry */}
      {error && (
        <div className="alert alert-error" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fetchAnalytics(timeframeMonths)}
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !analyticsData && (
        <div className="analytics-skeleton-view" aria-busy="true" aria-label="Loading analytics data">
          <div className="analytics-kpi-ribbon">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="analytics-skeleton-card">
                <div className="analytics-skeleton-bar" style={{ width: '40%', height: '10px' }} />
                <div className="analytics-skeleton-bar" style={{ width: '70%', height: '24px' }} />
                <div className="analytics-skeleton-bar" style={{ width: '50%', height: '10px' }} />
              </div>
            ))}
          </div>

          <div className="analytics-grid-2col" style={{ marginTop: '20px' }}>
            <div className="analytics-skeleton-card" style={{ height: '280px' }}>
              <div className="analytics-skeleton-bar" style={{ width: '50%', height: '14px' }} />
              <div className="analytics-skeleton-bar" style={{ width: '100%', height: '180px', marginTop: '16px' }} />
            </div>
            <div className="analytics-skeleton-card" style={{ height: '280px' }}>
              <div className="analytics-skeleton-bar" style={{ width: '50%', height: '14px' }} />
              <div className="analytics-skeleton-bar" style={{ width: '100%', height: '180px', marginTop: '16px' }} />
            </div>
          </div>
        </div>
      )}

      {/* Loaded Dashboard Content */}
      {analyticsData && (
        <>
          {/* Top KPI Summary Ribbon */}
          <div className="analytics-kpi-ribbon">
            {/* KPI 1: Beneficiaries */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-icon-box green">
                <Users size={22} />
              </div>
              <div className="analytics-kpi-body">
                <span className="analytics-kpi-label">Total Beneficiaries</span>
                <div className="analytics-kpi-value">{beneficiaries.total.toLocaleString()}</div>
                <span className="analytics-kpi-subtext">
                  {beneficiaries.byStatus.active} active ({beneficiaries.total > 0 ? Math.round((beneficiaries.byStatus.active / beneficiaries.total) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* KPI 2: Programs */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-icon-box blue">
                <Calendar size={22} />
              </div>
              <div className="analytics-kpi-body">
                <span className="analytics-kpi-label">Active Programs</span>
                <div className="analytics-kpi-value">{programs.byStatus.active.toLocaleString()}</div>
                <span className="analytics-kpi-subtext">
                  {programs.total} total programs registered
                </span>
              </div>
            </div>

            {/* KPI 3: Capacity Utilization */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-icon-box amber">
                <Layers size={22} />
              </div>
              <div className="analytics-kpi-body">
                <span className="analytics-kpi-label">Capacity Utilization</span>
                <div className="analytics-kpi-value">
                  {programs.capacityMetrics.overallCapacityUtilizationRate !== null
                    ? `${programs.capacityMetrics.overallCapacityUtilizationRate}%`
                    : 'Uncapped'}
                </div>
                <span className="analytics-kpi-subtext">
                  {programs.capacityMetrics.totalActiveEnrollments} active students enrolled
                </span>
              </div>
            </div>

            {/* KPI 4: Attendance Presence Rate */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-icon-box purple">
                <Award size={22} />
              </div>
              <div className="analytics-kpi-body">
                <span className="analytics-kpi-label">Attendance Presence</span>
                <div className="analytics-kpi-value">{attendance.overallPresenceRate}%</div>
                <span className="analytics-kpi-subtext">
                  Across {attendance.totalSessionsRecorded} logged session(s)
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION A: Beneficiary Overview & Status Breakdown
             ========================================================================= */}
          <section className="analytics-section" aria-labelledby="sec-beneficiary-overview">
            <div className="analytics-section-header">
              <div className="analytics-section-title-wrap">
                <Users size={20} style={{ color: 'var(--brand-green)' }} />
                <h2 id="sec-beneficiary-overview" className="analytics-section-title">Beneficiary Overview</h2>
              </div>
              <span className="analytics-section-desc">Lifecycle status and registration timeline</span>
            </div>

            {/* Status Breakdown Cards */}
            <div className="analytics-grid-status-cards">
              <div className="analytics-status-card">
                <div className="analytics-status-header">
                  <span>Active</span>
                  <CheckCircle2 size={16} style={{ color: 'var(--brand-green)' }} />
                </div>
                <div className="analytics-status-count">{beneficiaries.byStatus.active.toLocaleString()}</div>
                <span className="analytics-status-pct">
                  {beneficiaries.total > 0 ? Math.round((beneficiaries.byStatus.active / beneficiaries.total) * 100) : 0}% of roster
                </span>
              </div>

              <div className="analytics-status-card">
                <div className="analytics-status-header">
                  <span>Graduated</span>
                  <GraduationCap size={16} style={{ color: 'var(--status-info)' }} />
                </div>
                <div className="analytics-status-count">{beneficiaries.byStatus.graduated.toLocaleString()}</div>
                <span className="analytics-status-pct">
                  {beneficiaries.total > 0 ? Math.round((beneficiaries.byStatus.graduated / beneficiaries.total) * 100) : 0}% completed
                </span>
              </div>

              <div className="analytics-status-card">
                <div className="analytics-status-header">
                  <span>Transferred</span>
                  <ArrowRightLeft size={16} style={{ color: 'var(--status-warning)' }} />
                </div>
                <div className="analytics-status-count">{beneficiaries.byStatus.transferred.toLocaleString()}</div>
                <span className="analytics-status-pct">
                  {beneficiaries.total > 0 ? Math.round((beneficiaries.byStatus.transferred / beneficiaries.total) * 100) : 0}% transferred
                </span>
              </div>

              <div className="analytics-status-card">
                <div className="analytics-status-header">
                  <span>Inactive</span>
                  <UserX size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="analytics-status-count">{beneficiaries.byStatus.inactive.toLocaleString()}</div>
                <span className="analytics-status-pct">
                  {beneficiaries.total > 0 ? Math.round((beneficiaries.byStatus.inactive / beneficiaries.total) * 100) : 0}% inactive
                </span>
              </div>
            </div>

            {/* Monthly Registration Trends Chart */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <h3 className="analytics-card-title">
                  <TrendingUp size={18} style={{ color: 'var(--brand-green)' }} />
                  <span>Monthly Beneficiary Registration Trends</span>
                </h3>
                <span className="badge badge-outline">{timeframeMonths} Month Window</span>
              </div>
              <div className="analytics-card-body">
                <TrendAreaBarChart
                  data={beneficiaries.monthlyRegistrationTrends}
                  barColor="#16a34a"
                  accentColor="#22c55e"
                  label="Registrations"
                  emptyMessage="No beneficiary registrations recorded in this window."
                />
              </div>
            </div>
          </section>

          {/* =========================================================================
              SECTION B: Beneficiary Demographics
             ========================================================================= */}
          <section className="analytics-section" aria-labelledby="sec-beneficiary-demographics">
            <div className="analytics-section-header">
              <div className="analytics-section-title-wrap">
                <PieChart size={20} style={{ color: 'var(--status-info)' }} />
                <h2 id="sec-beneficiary-demographics" className="analytics-section-title">Beneficiary Demographics</h2>
              </div>
              <span className="analytics-section-desc">Gender ratios, verified age cohorts, and geographic footprint</span>
            </div>

            <div className="analytics-grid-3col">
              {/* Card 1: Gender Distribution */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <h3 className="analytics-card-title">
                    <Users size={17} style={{ color: '#ec4899' }} />
                    <span>Gender Distribution</span>
                  </h3>
                  <span className="badge badge-muted">{beneficiaries.total} Total</span>
                </div>
                <div className="analytics-card-body">
                  <GenderDistributionChart
                    data={beneficiaries.genderDistribution}
                    total={beneficiaries.total}
                  />
                </div>
              </div>

              {/* Card 2: Age-Group Distribution (with missing DOB alert) */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <h3 className="analytics-card-title">
                    <GraduationCap size={17} style={{ color: 'var(--status-info)' }} />
                    <span>Age Distribution</span>
                  </h3>
                  <span className="badge badge-muted">
                    {beneficiaries.reliableDobTotal} Verified
                  </span>
                </div>
                <div className="analytics-card-body">
                  <AgeCohortChart
                    data={beneficiaries.ageDistribution}
                    missingOrInvalidDobCount={beneficiaries.missingOrInvalidDobCount}
                    reliableDobTotal={beneficiaries.reliableDobTotal}
                  />
                </div>
              </div>

              {/* Card 3: Geographic Distribution (Top States) */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <h3 className="analytics-card-title">
                    <MapPin size={17} style={{ color: 'var(--brand-green)' }} />
                    <span>Top States</span>
                  </h3>
                  <span className="badge badge-muted">{beneficiaries.topStates.length} State(s)</span>
                </div>
                <div className="analytics-card-body">
                  <TopStatesChart data={beneficiaries.topStates} />
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
              SECTION C: Program Analytics & Capacity Utilization
             ========================================================================= */}
          <section className="analytics-section" aria-labelledby="sec-program-analytics">
            <div className="analytics-section-header">
              <div className="analytics-section-title-wrap">
                <Calendar size={20} style={{ color: 'var(--status-warning)' }} />
                <h2 id="sec-program-analytics" className="analytics-section-title">Program Analytics &amp; Capacity</h2>
              </div>
              <span className="analytics-section-desc">Active rosters, capacity utilization, and enrollment trends</span>
            </div>

            {/* Program Status Cards */}
            <div className="analytics-grid-status-cards">
              <div className="analytics-status-card">
                <div className="analytics-status-header">
                  <span>Total Programs</span>
                  <Building size={16} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="analytics-status-count">{programs.total.toLocaleString()}</div>
                <span className="analytics-status-pct">All registered activities</span>
              </div>

              <div className="analytics-status-card">
                <div className="analytics-status-header">
                  <span>Active</span>
                  <CheckCircle2 size={16} style={{ color: 'var(--brand-green)' }} />
                </div>
                <div className="analytics-status-count">{programs.byStatus.active.toLocaleString()}</div>
                <span className="analytics-status-pct">Currently in progress</span>
              </div>

              <div className="analytics-status-card">
                <div className="analytics-status-header">
                  <span>Completed</span>
                  <Award size={16} style={{ color: 'var(--status-info)' }} />
                </div>
                <div className="analytics-status-count">{programs.byStatus.completed.toLocaleString()}</div>
                <span className="analytics-status-pct">Concluded successfully</span>
              </div>

              <div className="analytics-status-card">
                <div className="analytics-status-header">
                  <span>Draft &amp; Paused</span>
                  <Clock size={16} style={{ color: 'var(--status-warning)' }} />
                </div>
                <div className="analytics-status-count">
                  {(programs.byStatus.draft + programs.byStatus.paused).toLocaleString()}
                </div>
                <span className="analytics-status-pct">
                  {programs.byStatus.draft} draft, {programs.byStatus.paused} paused
                </span>
              </div>
            </div>

            <div className="analytics-grid-2col">
              {/* Capacity Utilization Gauge */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <h3 className="analytics-card-title">
                    <Layers size={18} style={{ color: 'var(--brand-green)' }} />
                    <span>Capacity Utilization</span>
                  </h3>
                  {programs.capacityMetrics.overallCapacityUtilizationRate !== null && (
                    <span
                      className={`badge ${
                        programs.capacityMetrics.overallCapacityUtilizationRate >= 85
                          ? 'badge-warning'
                          : 'badge-success'
                      }`}
                    >
                      {programs.capacityMetrics.overallCapacityUtilizationRate}% Load
                    </span>
                  )}
                </div>
                <div className="analytics-card-body">
                  <CapacityUtilizationGauge capacityMetrics={programs.capacityMetrics} />
                </div>
              </div>

              {/* Monthly Enrollment Trends Chart */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <h3 className="analytics-card-title">
                    <TrendingUp size={18} style={{ color: 'var(--status-info)' }} />
                    <span>Monthly Program Enrollment Trends</span>
                  </h3>
                  <span className="badge badge-outline">{timeframeMonths} Month Window</span>
                </div>
                <div className="analytics-card-body">
                  <TrendAreaBarChart
                    data={programs.monthlyEnrollmentTrends}
                    barColor="#0284c7"
                    accentColor="#38bdf8"
                    label="Enrollments"
                    emptyMessage="No program enrollments recorded in this window."
                  />
                </div>
              </div>
            </div>

            {/* Active Programs Roster Table */}
            {programs.activeProgramsRoster && programs.activeProgramsRoster.length > 0 && (
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <h3 className="analytics-card-title">
                    <Calendar size={18} style={{ color: 'var(--brand-green)' }} />
                    <span>Active Programs Roster</span>
                  </h3>
                  <span className="badge badge-muted">
                    {programs.activeProgramsRoster.length} Active Program(s)
                  </span>
                </div>
                <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
                  <table className="analytics-roster-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Program Name</th>
                        <th>Type</th>
                        <th>Capacity</th>
                        <th>Enrolled</th>
                        <th>Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.activeProgramsRoster.map((prog) => {
                        const hasFinite = prog.capacity !== null && prog.capacity > 0;
                        const util = prog.utilizationRate;
                        return (
                          <tr key={prog.id}>
                            <td>
                              <span className="badge badge-outline" style={{ fontFamily: 'monospace' }}>
                                {prog.code}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: 'var(--text-primary)' }}>{prog.name}</strong>
                            </td>
                            <td>
                              <span style={{ textTransform: 'capitalize' }}>{prog.type || 'N/A'}</span>
                            </td>
                            <td>
                              {hasFinite ? (
                                `${prog.capacity} seats`
                              ) : (
                                <span className="badge badge-muted">Unlimited</span>
                              )}
                            </td>
                            <td>
                              <strong>{prog.enrolledCount}</strong> student(s)
                            </td>
                            <td>
                              {hasFinite ? (
                                <span
                                  className={`badge ${
                                    util >= 90
                                      ? 'badge-danger'
                                      : util >= 75
                                        ? 'badge-warning'
                                        : 'badge-success'
                                  }`}
                                >
                                  {util}%
                                </span>
                              ) : (
                                <span className="badge badge-muted">Uncapped</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* =========================================================================
              SECTION D: Attendance Analytics
             ========================================================================= */}
          <section className="analytics-section" aria-labelledby="sec-attendance-analytics">
            <div className="analytics-section-header">
              <div className="analytics-section-title-wrap">
                <Award size={20} style={{ color: 'var(--brand-green)' }} />
                <h2 id="sec-attendance-analytics" className="analytics-section-title">Attendance &amp; Participation</h2>
              </div>
              <span className="analytics-section-desc">Presence rates and session-level entry distributions</span>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-header">
                <h3 className="analytics-card-title">
                  <Award size={18} style={{ color: 'var(--brand-green)' }} />
                  <span>Presence Rate &amp; Session Breakdown</span>
                </h3>
                <span className="badge badge-muted">
                  {attendance.totalSessionsRecorded} Session(s) Logged
                </span>
              </div>
              <div className="analytics-card-body">
                <AttendancePresenceMeter attendance={attendance} />
              </div>
            </div>
          </section>

          {/* =========================================================================
              SECTION E: Recent Organization Activity (Audit Log Stream)
             ========================================================================= */}
          <section className="analytics-section" aria-labelledby="sec-recent-activity">
            <div className="analytics-section-header">
              <div className="analytics-section-title-wrap">
                <Activity size={20} style={{ color: 'var(--text-secondary)' }} />
                <h2 id="sec-recent-activity" className="analytics-section-title">Recent Organization Activity</h2>
              </div>
              <span className="analytics-section-desc">Recent administrative audit events (zero PII)</span>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-header">
                <h3 className="analytics-card-title">
                  <ShieldCheck size={18} style={{ color: 'var(--brand-green)' }} />
                  <span>Administrative Audit Stream</span>
                </h3>
                <span className="badge badge-outline">{recentActivity.length} Event(s)</span>
              </div>
              <div className="analytics-card-body">
                {recentActivity.length === 0 ? (
                  <div className="analytics-empty-chart">
                    <Activity size={28} className="analytics-empty-icon" />
                    <p className="analytics-empty-text">No administrative audit events recorded recently.</p>
                  </div>
                ) : (
                  <div className="analytics-activity-stream">
                    {recentActivity.map((event) => {
                      const action = (event.action || 'activity').toLowerCase();
                      let actionClass = 'action-other';
                      if (action.includes('create') || action.includes('add')) actionClass = 'action-create';
                      else if (action.includes('update') || action.includes('edit')) actionClass = 'action-update';
                      else if (action.includes('delete') || action.includes('remove')) actionClass = 'action-delete';

                      return (
                        <div key={event.id} className="analytics-activity-item">
                          <div className="analytics-activity-main">
                            <div className={`analytics-activity-icon-badge ${actionClass}`}>
                              {action.slice(0, 3)}
                            </div>
                            <div className="analytics-activity-details">
                              <div className="analytics-activity-actor-row">
                                <span className="analytics-activity-actor-name">{event.actorName}</span>
                                <span className={`badge ${event.actorRole === 'admin' ? 'badge-admin' : 'badge-staff'}`}>
                                  {event.actorRole}
                                </span>
                              </div>
                              <span className="analytics-activity-desc">
                                Performed <strong>{event.action}</strong> on entity{' '}
                                <span style={{ textTransform: 'capitalize' }}>
                                  {event.entityType?.replace('_', ' ') || 'record'}
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="analytics-activity-time">
                            {formatRelativeTime(event.timestamp)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}


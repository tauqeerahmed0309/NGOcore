import React, { useState } from 'react';
import {
  Users,
  AlertTriangle,
  MapPin,
  Calendar,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Info
} from 'lucide-react';

/**
 * Responsive SVG Trend Chart (Monthly timeline for registrations / enrollments)
 */
export function TrendAreaBarChart({
  data = [],
  height = 200,
  barColor = '#16a34a',
  accentColor = '#22c55e',
  label = 'Records',
  emptyMessage = 'No timeline trend data recorded for this window.'
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="analytics-empty-chart">
        <Calendar size={28} className="analytics-empty-icon" />
        <p className="analytics-empty-text">{emptyMessage}</p>
      </div>
    );
  }

  const counts = data.map((d) => Number(d.count) || 0);
  const maxCount = Math.max(...counts, 1);
  const chartHeight = height - 40; // reserve 40px for x-axis
  const width = 100; // viewBox relative width in percent

  // Calculate coordinates for points
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((d, i) => {
    const x = data.length > 1 ? i * step : width / 2;
    const y = chartHeight - (d.count / maxCount) * (chartHeight - 20) - 10;
    return { x, y, ...d };
  });

  const allZero = counts.every((c) => c === 0);

  return (
    <div className="trend-chart-wrapper">
      {/* SVG Canvas */}
      <div className="trend-svg-container" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="trend-svg"
          aria-label={`${label} Trend Chart`}
        >
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          <line x1="0" y1={10} x2={width} y2={10} stroke="var(--border)" strokeDasharray="2,2" strokeWidth="0.5" />
          <line x1="0" y1={chartHeight / 2} x2={width} y2={chartHeight / 2} stroke="var(--border)" strokeDasharray="2,2" strokeWidth="0.5" />
          <line x1="0" y1={chartHeight} x2={width} y2={chartHeight} stroke="var(--border)" strokeWidth="0.75" />

          {/* Area fill if points exist */}
          {!allZero && data.length > 1 && (
            <polygon
              fill={`url(#grad-${label})`}
              points={`0,${chartHeight} ${points.map((p) => `${p.x},${p.y}`).join(' ')} ${width},${chartHeight}`}
            />
          )}

          {/* Smooth / polyline line */}
          {!allZero && data.length > 1 && (
            <polyline
              fill="none"
              stroke={barColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Data points & bar columns */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx;
            const barW = Math.max(1, (width / data.length) * 0.45);
            const barX = data.length > 1 ? p.x - barW / 2 : p.x - barW / 2;
            const barY = p.y;
            const barH = Math.max(0, chartHeight - p.y);

            return (
              <g
                key={p.key || idx}
                className="trend-point-group"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onFocus={() => setHoveredIdx(idx)}
                onBlur={() => setHoveredIdx(null)}
                tabIndex={0}
                role="img"
                aria-label={`${p.month}: ${p.count} ${label}`}
              >
                {/* Column bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  fill={isHovered ? accentColor : barColor}
                  opacity={isHovered ? 0.9 : 0.6}
                  rx="1"
                />

                {/* Point circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? '3.5' : '2'}
                  fill={isHovered ? '#ffffff' : barColor}
                  stroke={isHovered ? barColor : '#ffffff'}
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Info Tooltip Bar */}
      <div className="trend-tooltip-bar">
        {hoveredIdx !== null && data[hoveredIdx] ? (
          <div className="trend-tooltip-content">
            <span className="trend-tooltip-badge" style={{ backgroundColor: barColor }} />
            <strong className="trend-tooltip-month">{data[hoveredIdx].month}:</strong>
            <span className="trend-tooltip-count">
              {data[hoveredIdx].count.toLocaleString()} {label.toLowerCase()}
            </span>
          </div>
        ) : (
          <div className="trend-tooltip-placeholder">
            <span>Hover or focus on any data point to inspect monthly counts</span>
          </div>
        )}
      </div>

      {/* X-Axis Month Labels */}
      <div className="trend-x-axis">
        {data.map((d, idx) => (
          <div
            key={d.key || idx}
            className={`trend-x-label ${hoveredIdx === idx ? 'trend-x-label-active' : ''}`}
            title={`${d.month}: ${d.count}`}
          >
            {d.month}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Gender Distribution Visualization
 */
export function GenderDistributionChart({ data = [], total = 0 }) {
  const GENDER_COLORS = {
    female: { bar: '#ec4899', bg: '#fdf2f8', text: '#be185d' },
    male: { bar: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
    other: { bar: '#10b981', bg: '#ecfdf5', text: '#047857' },
    prefer_not_to_say: { bar: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
    unspecified: { bar: '#94a3b8', bg: '#f1f5f9', text: '#475569' }
  };

  if (total === 0 || !data.length) {
    return (
      <div className="analytics-empty-chart">
        <Users size={28} className="analytics-empty-icon" />
        <p className="analytics-empty-text">No beneficiary demographic data recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="gender-chart-container">
      {/* Segmented Stacked Bar */}
      <div className="gender-stacked-bar" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}>
        {data.map((item) => {
          const style = GENDER_COLORS[item.gender] || GENDER_COLORS.unspecified;
          if (item.count === 0) return null;
          return (
            <div
              key={item.gender}
              className="gender-bar-segment"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: style.bar
              }}
              title={`${item.label}: ${item.count} (${item.percentage}%)`}
            />
          );
        })}
      </div>

      {/* Legend Grid */}
      <div className="gender-legend-grid">
        {data.map((item) => {
          const style = GENDER_COLORS[item.gender] || GENDER_COLORS.unspecified;
          return (
            <div key={item.gender} className="gender-legend-item">
              <div className="gender-legend-header">
                <span className="gender-legend-dot" style={{ backgroundColor: style.bar }} />
                <span className="gender-legend-name">{item.label}</span>
              </div>
              <div className="gender-legend-values">
                <strong className="gender-legend-count">{item.count.toLocaleString()}</strong>
                <span className="gender-legend-pct" style={{ backgroundColor: style.bg, color: style.text }}>
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Age-Group Cohort Distribution Chart with Missing DOB Alert
 */
export function AgeCohortChart({
  data = [],
  missingOrInvalidDobCount = 0,
  reliableDobTotal = 0
}) {
  const COHORT_COLORS = [
    { bar: '#38bdf8', bg: '#f0f9ff' }, // early childhood
    { bar: '#34d399', bg: '#ecfdf5' }, // primary 6-12
    { bar: '#818cf8', bg: '#eef2ff' }, // secondary 13-17
    { bar: '#fbbf24', bg: '#fffbeb' }, // young adult 18-24
    { bar: '#f87171', bg: '#fef2f2' }  // adult 25+
  ];

  const totalValid = reliableDobTotal || data.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <div className="age-cohort-container">
      {/* Missing / Unverified DOB Warning Callout */}
      {missingOrInvalidDobCount > 0 && (
        <div className="analytics-dob-warning" role="note">
          <Info size={16} className="analytics-warning-icon" />
          <div className="analytics-dob-warning-text">
            <strong>{missingOrInvalidDobCount} record(s)</strong> have missing, future, or unverified dates of birth.
            <span className="analytics-dob-note">
              Cohorts represent only verified records ({totalValid} total) to maintain demographic integrity.
            </span>
          </div>
        </div>
      )}

      {/* Cohort Progress Bars */}
      {totalValid === 0 ? (
        <div className="analytics-empty-chart">
          <AlertTriangle size={24} className="analytics-empty-icon" />
          <p className="analytics-empty-text">No verified age demographic data available.</p>
        </div>
      ) : (
        <div className="age-cohort-list">
          {data.map((cohort, index) => {
            const color = COHORT_COLORS[index % COHORT_COLORS.length];
            return (
              <div key={cohort.bracket} className="age-cohort-item">
                <div className="age-cohort-meta">
                  <span className="age-cohort-label">{cohort.label}</span>
                  <div className="age-cohort-numbers">
                    <strong className="age-cohort-count">{cohort.count.toLocaleString()}</strong>
                    <span className="age-cohort-pct">({cohort.percentage}%)</span>
                  </div>
                </div>
                <div className="age-cohort-track">
                  <div
                    className="age-cohort-fill"
                    style={{
                      width: `${cohort.percentage}%`,
                      backgroundColor: color.bar
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Top Beneficiary States Horizontal Ranked Bars
 */
export function TopStatesChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="analytics-empty-chart">
        <MapPin size={28} className="analytics-empty-icon" />
        <p className="analytics-empty-text">No geographic state distribution records found.</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="top-states-list">
      {data.map((item, index) => {
        const relativeWidth = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.state || index} className="top-state-item">
            <div className="top-state-header">
              <span className="top-state-rank">#{index + 1}</span>
              <span className="top-state-name">{item.state}</span>
              <div className="top-state-metrics">
                <span className="top-state-count">{item.count.toLocaleString()}</span>
                <span className="top-state-pct">({item.percentage}%)</span>
              </div>
            </div>
            <div className="top-state-bar-track">
              <div
                className="top-state-bar-fill"
                style={{ width: `${relativeWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Capacity Utilization Meter with Roster Breakdown
 */
export function CapacityUtilizationGauge({ capacityMetrics = {} }) {
  const {
    totalFiniteCapacity = 0,
    totalEnrolledInFinite = 0,
    totalUnlimitedPrograms = 0,
    totalEnrolledInUnlimited = 0,
    totalActiveEnrollments = 0,
    overallCapacityUtilizationRate = null
  } = capacityMetrics;

  const hasFiniteCapacity = overallCapacityUtilizationRate !== null && totalFiniteCapacity > 0;
  const rate = hasFiniteCapacity ? overallCapacityUtilizationRate : 0;

  // Threshold colors
  let colorTheme = { bar: '#0284c7', bg: '#f0f9ff', text: '#0369a1', badge: 'badge-info' };
  if (rate >= 90) {
    colorTheme = { bar: '#dc2626', bg: '#fef2f2', text: '#b91c1c', badge: 'badge-danger' };
  } else if (rate >= 75) {
    colorTheme = { bar: '#d97706', bg: '#fffbeb', text: '#b45309', badge: 'badge-warning' };
  } else if (rate >= 50) {
    colorTheme = { bar: '#16a34a', bg: '#f0fdf4', text: '#15803d', badge: 'badge-success' };
  }

  return (
    <div className="capacity-gauge-card">
      <div className="capacity-gauge-main">
        <div className="capacity-rate-display">
          {hasFiniteCapacity ? (
            <>
              <div className="capacity-rate-number" style={{ color: colorTheme.bar }}>
                {rate}%
              </div>
              <div className="capacity-rate-subtitle">Overall Capacity Utilization</div>
            </>
          ) : (
            <>
              <div className="capacity-rate-number" style={{ color: 'var(--brand-green)' }}>
                Uncapped
              </div>
              <div className="capacity-rate-subtitle">No finite limits on active programs</div>
            </>
          )}
        </div>

        {/* Meter progress bar */}
        {hasFiniteCapacity && (
          <div className="capacity-track">
            <div
              className="capacity-fill"
              style={{
                width: `${Math.min(rate, 100)}%`,
                backgroundColor: colorTheme.bar
              }}
            />
          </div>
        )}
      </div>

      {/* Capacity Sub-Metrics Grid */}
      <div className="capacity-meta-grid">
        <div className="capacity-meta-item">
          <span className="capacity-meta-label">Finite Capacity Seats</span>
          <strong className="capacity-meta-value">{totalFiniteCapacity.toLocaleString()}</strong>
        </div>
        <div className="capacity-meta-item">
          <span className="capacity-meta-label">Enrolled in Finite Programs</span>
          <strong className="capacity-meta-value">{totalEnrolledInFinite.toLocaleString()}</strong>
        </div>
        <div className="capacity-meta-item">
          <span className="capacity-meta-label">Unlimited Capacity Programs</span>
          <strong className="capacity-meta-value">
            {totalUnlimitedPrograms.toLocaleString()} ({totalEnrolledInUnlimited} enrolled)
          </strong>
        </div>
        <div className="capacity-meta-item">
          <span className="capacity-meta-label">Total Active Enrollments</span>
          <strong className="capacity-meta-value" style={{ color: 'var(--brand-green-dark)' }}>
            {totalActiveEnrollments.toLocaleString()}
          </strong>
        </div>
      </div>
    </div>
  );
}

/**
 * Attendance Presence Rate & Distribution Meter
 */
export function AttendancePresenceMeter({ attendance = {} }) {
  const {
    totalSessionsRecorded = 0,
    presentCount = 0,
    absentCount = 0,
    excusedCount = 0,
    totalRecordedEntries = 0,
    overallPresenceRate = 0
  } = attendance;

  if (totalSessionsRecorded === 0 || totalRecordedEntries === 0) {
    return (
      <div className="analytics-empty-chart">
        <Clock size={28} className="analytics-empty-icon" />
        <p className="analytics-empty-text">
          No attendance sessions have been logged during this timeframe.
        </p>
      </div>
    );
  }

  const presentPct = Math.round((presentCount / totalRecordedEntries) * 100);
  const absentPct = Math.round((absentCount / totalRecordedEntries) * 100);
  const excusedPct = Math.max(0, 100 - presentPct - absentPct);

  return (
    <div className="attendance-meter-card">
      {/* Presence Rate Banner */}
      <div className="attendance-rate-header">
        <div>
          <span className="attendance-rate-label">Overall Presence Rate</span>
          <p className="attendance-rate-desc">Ratio of verified present entries over active recorded entries</p>
        </div>
        <div className="attendance-rate-badge">
          <Award size={20} className="attendance-rate-icon" />
          <strong className="attendance-rate-val">{overallPresenceRate}%</strong>
        </div>
      </div>

      {/* Stacked Attendance Segment Bar */}
      <div className="attendance-stacked-bar">
        {presentCount > 0 && (
          <div
            className="attendance-bar-segment present"
            style={{ width: `${presentPct}%` }}
            title={`Present: ${presentCount} (${presentPct}%)`}
          />
        )}
        {absentCount > 0 && (
          <div
            className="attendance-bar-segment absent"
            style={{ width: `${absentPct}%` }}
            title={`Absent: ${absentCount} (${absentPct}%)`}
          />
        )}
        {excusedCount > 0 && (
          <div
            className="attendance-bar-segment excused"
            style={{ width: `${excusedPct}%` }}
            title={`Excused: ${excusedCount} (${excusedPct}%)`}
          />
        )}
      </div>

      {/* Distribution Legend Cards */}
      <div className="attendance-legend-row">
        <div className="attendance-legend-card present">
          <div className="attendance-legend-card-header">
            <CheckCircle2 size={16} />
            <span>Present</span>
          </div>
          <strong className="attendance-legend-card-count">{presentCount.toLocaleString()}</strong>
          <span className="attendance-legend-card-pct">{presentPct}% of entries</span>
        </div>

        <div className="attendance-legend-card absent">
          <div className="attendance-legend-card-header">
            <XCircle size={16} />
            <span>Absent</span>
          </div>
          <strong className="attendance-legend-card-count">{absentCount.toLocaleString()}</strong>
          <span className="attendance-legend-card-pct">{absentPct}% of entries</span>
        </div>

        <div className="attendance-legend-card excused">
          <div className="attendance-legend-card-header">
            <Clock size={16} />
            <span>Excused</span>
          </div>
          <strong className="attendance-legend-card-count">{excusedCount.toLocaleString()}</strong>
          <span className="attendance-legend-card-pct">{excusedPct}% of entries</span>
        </div>
      </div>
    </div>
  );
}

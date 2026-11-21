import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Info,
  Sparkles,
  BarChart2,
  FileText,
  Clock
} from 'lucide-react';

export default function InsightsOverviewDashboard({ insights, datasetName }) {
  if (!insights) return null;

  const score = insights.healthScore ?? 0;
  const getScoreTheme = (s) => {
    if (s >= 85) return { bg: 'var(--status-success-bg)', text: 'var(--status-success)', border: '#bbf7d0', label: 'EXCELLENT' };
    if (s >= 70) return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', label: 'GOOD' };
    if (s >= 50) return { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)', border: '#fde68a', label: 'MODERATE' };
    return { bg: 'var(--status-danger-bg)', text: 'var(--status-danger)', border: '#fecaca', label: 'NEEDS ATTENTION' };
  };

  const scoreTheme = getScoreTheme(score);
  const isAi = insights.metadata?.source === 'gemini';

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)', border: '1px solid #fecaca' }}>CRITICAL</span>;
      case 'high':
        return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>HIGH</span>;
      case 'medium':
        return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)', border: '1px solid #fde68a' }}>MEDIUM</span>;
      case 'low':
        return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>LOW</span>;
      default:
        return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', border: '1px solid #bbf7d0' }}>INFO</span>;
    }
  };

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'high':
        return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>HIGH PRIORITY</span>;
      case 'medium':
        return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>MEDIUM PRIORITY</span>;
      default:
        return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>LOW PRIORITY</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Health Score + AI Provider Badge */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          alignItems: 'stretch'
        }}
      >
        {/* Score Card */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 12,
            border: `1px solid ${scoreTheme.border}`,
            backgroundColor: scoreTheme.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: scoreTheme.text, letterSpacing: '0.05em' }}>
              DATASET HEALTH SCORE
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: scoreTheme.text, lineHeight: 1.1, margin: '4px 0' }}>
              {score}<span style={{ fontSize: '1.25rem', fontWeight: 500 }}>/100</span>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: scoreTheme.text }}>
              Status: {scoreTheme.label}
            </div>
          </div>

          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              backgroundColor: '#fff',
              border: `2px solid ${scoreTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: scoreTheme.text
            }}
          >
            <ShieldCheck size={32} />
          </div>
        </div>

        {/* Intelligence Source Card */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              INTELLIGENCE ENGINE
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                borderRadius: 20,
                fontSize: '0.725rem',
                fontWeight: 600,
                backgroundColor: isAi ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.1)',
                color: isAi ? 'var(--brand-green)' : '#2563eb'
              }}
            >
              <Sparkles size={12} />
              {isAi ? `Gemini (${insights.metadata?.model || '2.5 Flash'})` : 'Deterministic Fallback Engine'}
            </span>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {datasetName || 'Active Dataset Profile'}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Analyzed {insights.metadata?.analyzedAt ? new Date(insights.metadata.analyzedAt).toLocaleTimeString() : 'just now'} • Zero PII exposed to external models
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12
        }}
      >
        <div style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL RECORDS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {insights.keyMetrics?.totalRows?.toLocaleString() ?? 0}
          </div>
        </div>

        <div style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL ATTRIBUTES</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {insights.keyMetrics?.totalColumns ?? 0}
          </div>
        </div>

        <div style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>DATA COMPLETENESS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {insights.keyMetrics?.dataCompletenessPercent ?? 100}%
          </div>
        </div>

        <div style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>DUPLICATE RISK</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: (insights.keyMetrics?.duplicateRiskPercent || 0) > 5 ? 'var(--status-danger)' : 'var(--text-primary)', marginTop: 4 }}>
            {insights.keyMetrics?.duplicateRiskPercent ?? 0}%
          </div>
        </div>

        {insights.keyMetrics?.totalValuationOrAmount > 0 && (
          <div style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL FINANCIAL SUM</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-green)', marginTop: 4 }}>
              INR {insights.keyMetrics.totalValuationOrAmount.toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </div>

      {/* Executive Summary Card */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FileText size={18} style={{ color: 'var(--brand-green)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Executive Intelligence Summary
          </h3>
        </div>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
          {insights.executiveSummary}
        </p>
      </div>

      {/* Data Quality & Governance Findings */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Data Quality &amp; Governance Findings
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(insights.dataQualityFindings || []).map((f, idx) => (
            <div
              key={idx}
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-app)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getSeverityBadge(f.severity)}
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {f.issue}
                  </span>
                </div>
                {f.affectedRowsCount > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {f.affectedRowsCount} rows affected
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', paddingLeft: 4 }}>
                <strong>Recommendation:</strong> {f.suggestion}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Financial Analysis + Operational Trends */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16
        }}
      >
        {/* Financial Insights */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <DollarSign size={18} style={{ color: 'var(--brand-green)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Financial &amp; Ledger Analysis
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(insights.financialInsights || []).map((fi, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-app)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {fi.metric}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--brand-green)' }}>
                    {fi.value}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                  {fi.anomaly}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Advice: {fi.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Trends */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={18} style={{ color: '#3b82f6' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Operational Trends &amp; Patterns
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(insights.operationalTrends || []).map((ot, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-app)'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                  {ot.area}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                  {ot.trend}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Impact: {ot.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strategic Recommendations */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Lightbulb size={18} style={{ color: '#f59e0b' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Strategic Action Plan &amp; Governance Steps
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(insights.strategicRecommendations || []).map((rec, idx) => (
            <div
              key={idx}
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-app)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {idx + 1}. {rec.title}
                </span>
                {getPriorityBadge(rec.priority)}
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                <strong>Execution Step:</strong> {rec.action}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>Expected Outcome:</strong> {rec.expectedOutcome}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Limitations */}
      {(insights.limitations || []).length > 0 && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 8,
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border)',
            fontSize: '0.775rem',
            color: 'var(--text-secondary)'
          }}
        >
          <strong>Methodology &amp; Sampling Constraints:</strong>
          <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
            {insights.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

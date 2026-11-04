import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, BarChart3, Loader2, Sparkles } from 'lucide-react';
import dataAssistantService from '../../services/dataAssistantService';
import { animateBars, countUp } from '../../animations';

export default function AIInsightsCard() {
  const resultsRef = useRef(null);
  const [recordType, setRecordType] = useState('students');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await dataAssistantService.getInsights(recordType);
      setResult(response.data || null);
    } catch (requestError) {
      setError(requestError.message || 'Metrics are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const timeline = result?.metrics?.timeline || [];
  const largestMonth = Math.max(1, ...timeline.map((entry) => entry.count));

  useEffect(() => {
    const root = resultsRef.current;
    if (!root || !result) return undefined;
    const cleanups = [animateBars(root)];
    root.querySelectorAll('[data-insight-count]').forEach((counter) => {
      cleanups.push(countUp(counter, Number(counter.dataset.insightCount), 0.48));
    });
    return () => cleanups.reverse().forEach((cleanup) => cleanup());
  }, [result]);

  return (
    <section className="card ai-insights-card" aria-labelledby="ai-insights-heading">
      <div className="ai-insights-heading">
        <div className="ai-insights-title">
          <span className="ai-insights-icon"><BarChart3 size={18} /></span>
          <div>
            <h2 id="ai-insights-heading">Organization insights</h2>
            <p>Explore six-month record trends. Only grouped counts are sent for optional AI summaries.</p>
          </div>
        </div>
        <div className="ai-insights-actions">
          <label className="sr-only" htmlFor="insight-record-type">Record type</label>
          <select
            id="insight-record-type"
            value={recordType}
            onChange={(event) => {
              setRecordType(event.target.value);
              setResult(null);
              setError('');
            }}
            disabled={loading}
          >
            <option value="students">Students</option>
            <option value="programs">Programs</option>
          </select>
          <button type="button" className="btn-action btn-add-user" onClick={generateInsights} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            {loading ? 'Generating…' : 'Generate insights'}
          </button>
        </div>
      </div>

      {error && <p className="data-assistant-error" role="alert"><AlertCircle size={16} /> {error}</p>}

      {result && (
        <div className="ai-insights-results" ref={resultsRef}>
          <div className="ai-insights-metrics">
            <div className="ai-insights-total">
              <strong data-insight-count={result.metrics.totalRecords}>{result.metrics.totalRecords}</strong>
              <span>Total {recordType}</span>
            </div>
            <div className="ai-insights-timeline" aria-label={`Monthly ${recordType} records created`}>
              {timeline.map((entry) => (
                <div className="ai-insights-month" key={entry.month}>
                  <span className="ai-insights-count" data-insight-count={entry.count}>{entry.count}</span>
                  <div
                    className="ai-insights-bar"
                    role="img"
                    aria-label={`${entry.month}: ${entry.count} records`}
                  >
                    <span data-chart-bar data-target-scale={entry.count / largestMonth} />
                  </div>
                  <span>{entry.month}</span>
                </div>
              ))}
            </div>
            <div className="ai-insights-statuses">
              {result.metrics.byStatus.map(({ status, count }) => (
                <span className="ai-insights-status" key={status}>
                  {status}: <strong data-insight-count={count}>{count}</strong>
                </span>
              ))}
            </div>
          </div>
          <div className="ai-generated-summary">
            <h3><Sparkles size={15} /> AI-generated summary</h3>
            <p>{result.summary || 'AI summary is unavailable right now. The aggregated chart and counts are still available.'}</p>
            <small>AI-assisted interpretation of aggregated counts only. It may be incomplete and should be reviewed by your team.</small>
          </div>
        </div>
      )}
    </section>
  );
}

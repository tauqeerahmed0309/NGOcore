import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import dataAssistantService from '../../services/dataAssistantService';

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export default function DataCleaningPanel({ recordType, onApplied }) {
  const [flags, setFlags] = useState([]);
  const [scanned, setScanned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [handled, setHandled] = useState({});
  const [customValues, setCustomValues] = useState({});
  const [error, setError] = useState('');

  const analyze = async () => {
    setLoading(true);
    setError('');
    setHandled({});
    setCustomValues({});
    setHasAnalyzed(false);
    try {
      const response = await dataAssistantService.analyze(recordType);
      setFlags(response.data?.flags || []);
      setScanned(response.data?.scanned || 0);
      setHasAnalyzed(true);
    } catch (requestError) {
      setError(requestError.message || 'Could not analyze records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const review = async (flag, decision) => {
    const needsCustomValue = flag.type !== 'possible_duplicate' && flag.suggestedValue === null;
    const proposedValue = customValues[flag.id];
    if (decision === 'accept' && needsCustomValue && !proposedValue?.trim()) {
      setError(`Enter a corrected value for ${flag.field} before accepting this item.`);
      return;
    }

    setBusyId(flag.id);
    setError('');
    try {
      await dataAssistantService.review(recordType, {
        recordId: flag.recordId,
        issueType: flag.type,
        field: flag.field,
        relatedRecordId: flag.relatedRecordId || undefined,
        decision,
        ...(decision === 'accept' && needsCustomValue ? { proposedValue: proposedValue.trim() } : {})
      });
      setHandled((current) => ({ ...current, [flag.id]: decision }));
      if (decision === 'accept' && flag.type !== 'possible_duplicate') onApplied?.();
    } catch (requestError) {
      setError(requestError.message || 'Could not record this review decision.');
    } finally {
      setBusyId('');
    }
  };

  const issueLabel = (type) => ({
    possible_duplicate: 'Possible duplicate',
    missing_required: 'Missing required field',
    inconsistent_format: 'Inconsistent format'
  }[type] || type);

  return (
    <section className="card data-cleaning-panel" aria-labelledby={`${recordType}-cleaning-title`}>
      <div className="data-assistant-header">
        <div>
          <h3 id={`${recordType}-cleaning-title`}><Sparkles size={17} /> AI-assisted data review</h3>
          <p>Review suggestions one at a time. No record is changed until you accept a fix.</p>
        </div>
        <button className="btn-action btn-refresh" type="button" onClick={analyze} disabled={loading || Boolean(busyId)}>
          {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          {loading ? 'Checking…' : 'Analyze records'}
        </button>
      </div>

      {error && (
        <div className="data-assistant-error" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {flags.length > 0 && (
        <>
          <p className="data-assistant-count">
            Reviewed {scanned} {recordType} and found {flags.length} item{flags.length === 1 ? '' : 's'} to check.
          </p>
          <div className="data-assistant-table-wrap">
            <table className="data-assistant-table">
              <thead>
                <tr><th>Record</th><th>Finding</th><th>Current value</th><th>Suggestion / match</th><th>Review</th></tr>
              </thead>
              <tbody>
                {flags.map((flag) => {
                  const decision = handled[flag.id];
                  const needsCustomValue = flag.type !== 'possible_duplicate' && flag.suggestedValue === null;
                  return (
                    <tr key={flag.id} className={decision ? 'data-assistant-reviewed' : ''}>
                      <td>
                        <strong>{flag.recordLabel}</strong>
                        {flag.relatedRecordLabel && <small>Matches: {flag.relatedRecordLabel}</small>}
                      </td>
                      <td>
                        <span className="data-issue-badge">{issueLabel(flag.type)}</span>
                        {flag.severity && (
                          <span className={`data-issue-badge severity-${flag.severity}`} style={{ marginLeft: 6, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            {flag.severity}
                          </span>
                        )}
                        <small>{flag.description}</small>
                      </td>
                      <td>{formatValue(flag.currentValue)}</td>
                      <td>
                        {flag.type === 'possible_duplicate'
                          ? 'No automatic merge or deletion'
                          : flag.suggestedValue !== null
                            ? formatValue(flag.suggestedValue)
                            : needsCustomValue
                              ? (
                                <input
                                  className="data-assistant-value"
                                  type={['dateOfBirth', 'startDate', 'endDate'].includes(flag.field) ? 'date' : 'text'}
                                  aria-label={`Corrected value for ${flag.field} on ${flag.recordLabel}`}
                                  value={customValues[flag.id] || ''}
                                  onChange={(event) => setCustomValues((current) => ({ ...current, [flag.id]: event.target.value }))}
                                  placeholder={`Enter ${flag.field}`}
                                  disabled={Boolean(decision) || Boolean(busyId)}
                                />
                              )
                              : 'Manual review required'}
                      </td>
                      <td>
                        {decision ? (
                          <span className="data-assistant-decision">
                            <CheckCircle2 size={15} />
                            {decision === 'accept' ? 'Accepted' : 'Dismissed'}
                          </span>
                        ) : flag.type === 'possible_duplicate' ? (
                          <div className="data-assistant-actions">
                            <button type="button" onClick={() => review(flag, 'accept')} disabled={Boolean(busyId)}>
                              {busyId === flag.id ? <Loader2 size={14} className="spin" /> : 'Confirm'}
                            </button>
                            <button type="button" className="data-dismiss-button" onClick={() => review(flag, 'reject')} disabled={Boolean(busyId)}>
                              <X size={14} /> Not duplicate
                            </button>
                          </div>
                        ) : (
                          <div className="data-assistant-actions">
                            {flag.suggestedValue !== null && (
                              <button type="button" onClick={() => review(flag, 'accept')} disabled={Boolean(busyId)}>
                                {busyId === flag.id ? <Loader2 size={14} className="spin" /> : 'Apply fix'}
                              </button>
                            )}
                            <button type="button" className="data-dismiss-button" onClick={() => review(flag, 'reject')} disabled={Boolean(busyId)}>
                              <X size={14} /> Dismiss
                            </button>
                            {needsCustomValue && (
                              <button type="button" onClick={() => review(flag, 'accept')} disabled={Boolean(busyId)}>
                                {busyId === flag.id ? <Loader2 size={14} className="spin" /> : 'Save correction'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && hasAnalyzed && flags.length === 0 && (
        <p className="data-assistant-clean"><CheckCircle2 size={16} /> No data quality issues were found in {scanned} records.</p>
      )}
    </section>
  );
}

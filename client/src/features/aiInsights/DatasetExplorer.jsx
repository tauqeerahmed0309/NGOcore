import React from 'react';
import { Table, Columns, Eye, Hash, Calendar, Type } from 'lucide-react';

export default function DatasetExplorer({ structure }) {
  if (!structure) return null;

  const { headers = [], totalRows = 0, columnStats = {}, previewRows = [] } = structure;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'numeric':
        return <Hash size={13} style={{ color: 'var(--brand-green)' }} />;
      case 'date':
        return <Calendar size={13} style={{ color: '#3b82f6' }} />;
      case 'category':
        return <Columns size={13} style={{ color: '#8b5cf6' }} />;
      default:
        return <Type size={13} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Column Schema & Statistics Table */}
      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Attribute Schema &amp; Quality Metrics
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Inferred data types, completeness, and value distribution across all {headers.length} attributes
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>ATTRIBUTE</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>INFERRED TYPE</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>MISSING / NULL</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>COMPLETENESS</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>DISTINCT VALUES</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>SAMPLE / RANGE</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((h, idx) => {
                const stat = columnStats[h] || {};
                const missing = stat.missingCount || 0;
                const completeness = totalRows > 0 ? Math.round(((totalRows - missing) / totalRows) * 100) : 100;

                let sampleText = (stat.sampleValues || []).slice(0, 3).join(', ');
                if (stat.inferredType === 'numeric' && stat.min !== undefined) {
                  sampleText = `Min: ${stat.min} | Avg: ${stat.avg} | Max: ${stat.max}`;
                }

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {h}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.725rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        {getTypeIcon(stat.inferredType)}
                        {stat.inferredType?.toUpperCase() || 'STRING'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: missing > 0 ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                      {missing} {totalRows > 0 ? `(${Math.round((missing / totalRows) * 100)}%)` : ''}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${completeness}%`,
                              height: '100%',
                              backgroundColor: completeness >= 90 ? 'var(--brand-green)' : completeness >= 70 ? 'var(--status-warning)' : 'var(--status-danger)'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {completeness}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                      {stat.uniqueCount ?? '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sampleText || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Data Preview (First 10 Rows) */}
      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Raw Record Preview (First {previewRows.length} Rows)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Sanitized sample records loaded from the dataset source
          </p>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: 380 }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border)', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', width: 40 }}>#</th>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{rIdx + 1}</td>
                  {headers.map((h, cIdx) => (
                    <td key={cIdx} style={{ padding: '8px 12px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== '' ? (
                        String(row[h])
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>null</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import {
  FileText,
  Eye,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function DocumentTable({
  documents,
  isAdmin,
  onView,
  onDelete
}) {
  const getStatusBadge = (status, expiryDate) => {
    const isExpired = expiryDate && new Date(expiryDate) <= new Date();

    if (isExpired || status === 'expired') {
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
            border: '1px solid #fecaca'
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-danger)' }} />
          Expired
        </span>
      );
    }

    if (status === 'pending_verification') {
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
            border: '1px solid #fde68a'
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-warning)' }} />
          Pending Review
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
          backgroundColor: 'var(--status-success-bg)',
          color: 'var(--status-success)',
          border: '1px solid #bbf7d0'
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-success)' }} />
        Active
      </span>
    );
  };

  if (!documents || documents.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          No Documents Found
        </h4>
        <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
          No compliance, legal, or governance documents match your current filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600, width: '130px' }}>Doc #</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Title &amp; Category</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>File Details</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Scope</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Expiry Date</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const isExpired = doc.expiryDate && new Date(doc.expiryDate) <= new Date();

            return (
              <tr
                key={doc._id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background-color 150ms'
                }}
                className="table-row-hover"
              >
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
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
                    {doc.documentNumber}
                  </span>
                </td>

                <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize', marginTop: 2 }}>
                    {doc.category?.replace('_', ' ')}
                  </div>
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.fileName}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                    {Math.round((doc.fileSize || 0) / 1024)} KB
                  </div>
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textTransform: 'capitalize', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  {doc.associatedEntityType?.replace('_', ' ')}
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                  {doc.expiryDate ? (
                    <span style={{ color: isExpired ? 'var(--status-danger)' : 'var(--text-secondary)', fontWeight: isExpired ? 700 : 400 }}>
                      {new Date(doc.expiryDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Permanent</span>
                  )}
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  {getStatusBadge(doc.status, doc.expiryDate)}
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => onView(doc._id)}
                      title="View Details & Audit"
                      style={{
                        padding: '6px',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={15} />
                    </button>

                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '6px',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        color: 'var(--brand-green)',
                        background: 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none'
                      }}
                      title="Open Document File"
                    >
                      <ExternalLink size={15} />
                    </a>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDelete(doc._id, doc.title)}
                        title="Archive Document"
                        style={{
                          padding: '6px',
                          borderRadius: 4,
                          border: '1px solid #fecaca',
                          color: 'var(--status-danger)',
                          background: 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

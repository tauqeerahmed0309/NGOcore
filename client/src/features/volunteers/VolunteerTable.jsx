import React from 'react';
import {
  Eye,
  Clock,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowUpDown
} from 'lucide-react';

export default function VolunteerTable({
  volunteers = [],
  loading = false,
  userRole = 'staff',
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSort,
  onView,
  onLogHours,
  onEdit,
  onDelete
}) {
  const isAdmin = userRole === 'admin' || userRole === 'ngo_admin';

  const renderSortIndicator = (column) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition" />;
    }
    return (
      <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
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
      case 'on_leave':
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
            On Leave
          </span>
        );
      case 'pending_approval':
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
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
            Pending
          </span>
        );
      default:
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
              backgroundColor: '#f1f5f9',
              color: 'var(--text-secondary)',
              border: '1px solid #cbd5e1'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />
            Inactive
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="auth-spinner" style={{ margin: '0 auto 12px auto' }} />
        <p style={{ fontSize: '0.875rem' }}>Loading volunteer roster...</p>
      </div>
    );
  }

  if (volunteers.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Clock size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          No Volunteers Found
        </h4>
        <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
          No volunteers match your current search and filter settings, or no records have been created yet.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            <th
              onClick={() => onSort('volunteerNumber')}
              style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Volunteer ID</span>
                {renderSortIndicator('volunteerNumber')}
              </div>
            </th>
            <th
              onClick={() => onSort('name')}
              style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Volunteer Name</span>
                {renderSortIndicator('name')}
              </div>
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contact Info</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Skills &amp; Roles</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Availability</th>
            <th
              onClick={() => onSort('totalApprovedHours')}
              style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <span>Approved Hours</span>
                {renderSortIndicator('totalApprovedHours')}
              </div>
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {volunteers.map((v) => (
            <tr
              key={v._id}
              style={{
                borderBottom: '1px solid var(--border)',
                transition: 'background-color 150ms'
              }}
              className="table-row-hover"
            >
              {/* ID */}
              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                <button
                  type="button"
                  onClick={() => onView(v)}
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: '#f1f5f9',
                    color: 'var(--brand-green)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {v.volunteerNumber}
                </button>
              </td>

              {/* Name */}
              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {v.name}
                </div>
                {v.address?.city && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {v.address.city}, {v.address.state || ''}
                  </div>
                )}
              </td>

              {/* Contact */}
              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                <div style={{ color: 'var(--text-primary)' }}>{v.email}</div>
                {v.phone && <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{v.phone}</div>}
              </td>

              {/* Skills */}
              <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(v.skills || []).slice(0, 3).map((skill, sIdx) => {
                    const skillStr = typeof skill === 'string' ? skill : (skill?.name || String(skill || ''));
                    return (
                      <span
                        key={skillStr + '_' + sIdx}
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: '#f1f5f9',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                          textTransform: 'capitalize'
                        }}
                      >
                        {skillStr.replace(/_/g, ' ')}
                      </span>
                    );
                  })}
                  {(v.skills || []).length > 3 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      +{v.skills.length - 3} more
                    </span>
                  )}
                </div>
              </td>

              {/* Availability */}
              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                {String(v.availability || '').replace(/_/g, ' ')}
              </td>

              {/* Hours */}
              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                {v.totalApprovedHours || 0} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>hrs</span>
              </td>

              {/* Status */}
              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                {getStatusBadge(v.status)}
              </td>

              {/* Actions */}
              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => onView(v)}
                    title="View Profile & Hours"
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

                  {/* Log Hours */}
                  <button
                    type="button"
                    onClick={() => onLogHours(v)}
                    title="Log Service Hours"
                    style={{
                      padding: '6px',
                      borderRadius: 4,
                      border: '1px solid #bbf7d0',
                      color: 'var(--status-success)',
                      background: 'var(--status-success-bg)',
                      cursor: 'pointer'
                    }}
                  >
                    <Clock size={15} />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => onEdit(v)}
                    title="Edit Volunteer"
                    style={{
                      padding: '6px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      color: 'var(--brand-green)',
                      background: 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit2 size={15} />
                  </button>

                  {/* Delete (Admin only) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onDelete(v)}
                      title="Archive Volunteer"
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

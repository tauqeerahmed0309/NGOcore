import React from 'react';
import {
  Calendar,
  Eye,
  Edit2,
  Trash2,
  UserCheck
} from 'lucide-react';

export default function EventTable({
  events,
  isAdmin,
  isStaff,
  onView,
  onEdit,
  onManageAttendees,
  onDelete
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
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
            Completed
          </span>
        );
      case 'ongoing':
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
            Ongoing
          </span>
        );
      case 'scheduled':
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
            Scheduled
          </span>
        );
      case 'cancelled':
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
            Cancelled
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
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (!events || events.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Calendar size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          No Events Found
        </h4>
        <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
          No events match your current search and filter settings, or no events have been scheduled yet.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600, width: '130px' }}>Event #</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Title &amp; Category</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Schedule</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Venue &amp; City</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Roster</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((evt) => {
            const regCount = evt.registeredAttendees?.length || 0;
            const attendedCount = evt.registeredAttendees?.filter((a) => a.attended)?.length || 0;
            const capacity = evt.capacity;

            return (
              <tr
                key={evt._id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background-color 150ms'
                }}
                className="table-row-hover"
              >
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => onView(evt._id)}
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
                    {evt.eventNumber}
                  </button>
                </td>

                <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {evt.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize', marginTop: 2 }}>
                    {evt.category?.replace('_', ' ')}
                  </div>
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                  <div style={{ color: 'var(--text-primary)' }}>{formatDateTime(evt.startDate)}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>to {formatDateTime(evt.endDate)}</div>
                </td>

                <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                  <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {evt.venue?.name || 'Virtual / TBA'}
                  </div>
                  {evt.venue?.city && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {evt.venue.city}
                    </div>
                  )}
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => onManageAttendees(evt)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 6,
                      backgroundColor: 'var(--brand-green-muted)',
                      border: '1px solid #bbf7d0',
                      color: 'var(--brand-green)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Manage Attendees & Check-in"
                  >
                    <UserCheck size={13} />
                    <span>
                      {regCount} {capacity ? `/ ${capacity}` : ''}
                    </span>
                    <span style={{ opacity: 0.85, fontWeight: 400 }}>({attendedCount} in)</span>
                  </button>
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  {getStatusBadge(evt.status)}
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => onView(evt._id)}
                      title="View Event Details"
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

                    {(isAdmin || isStaff) && (
                      <button
                        type="button"
                        onClick={() => onEdit(evt)}
                        title="Edit Event"
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
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDelete(evt._id, evt.title)}
                        title="Archive Event"
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

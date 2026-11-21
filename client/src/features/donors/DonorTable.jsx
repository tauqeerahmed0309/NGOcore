import React from 'react';
import {
  Eye,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
  Building2,
  User,
  Mail,
  Phone,
  HeartHandshake
} from 'lucide-react';

export default function DonorTable({
  donors = [],
  loading = false,
  currentUserRole = 'staff',
  onView,
  onEdit,
  onChangeStatus,
  onDelete
}) {
  const canManage = currentUserRole === 'admin' || currentUserRole === 'ngo_admin' || currentUserRole === 'staff';
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'ngo_admin';

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
      case 'inactive':
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
            Inactive
          </span>
        );
      case 'archived':
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
            Archived
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getTypeBadge = (type) => {
    const isOrg = type === 'organization';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 7px',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontWeight: 600,
          backgroundColor: isOrg ? '#f5f3ff' : '#eff6ff',
          color: isOrg ? '#7c3aed' : '#2563eb',
          border: `1px solid ${isOrg ? '#ddd6fe' : '#bfdbfe'}`
        }}
      >
        {isOrg ? <Building2 size={11} /> : <User size={11} />}
        {isOrg ? 'Org' : 'Individual'}
      </span>
    );
  };

  const formattedDate = (dateVal) => {
    if (!dateVal) return '—';
    try {
      return new Date(dateVal).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(dateVal);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="auth-spinner" style={{ margin: '0 auto 12px auto' }} />
        <p style={{ fontSize: '0.875rem' }}>Loading donor directory...</p>
      </div>
    );
  }

  if (!donors || donors.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <HeartHandshake size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          No Donors Found
        </h4>
        <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
          No donor profiles match your current search and filter settings, or no records have been created yet.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, width: '130px' }}>Donor ID</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Donor Name & Type</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contact Details</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Registered</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {donors.map((donor) => (
              <tr
                key={donor._id || donor.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background-color 150ms'
                }}
                className="table-row-hover"
              >
                {/* Donor ID */}
                <td style={{ padding: '14px 16px' }}>
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
                    {donor.donorNumber}
                  </span>
                </td>

                {/* Name & Type */}
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{donor.name}</strong>
                      {getTypeBadge(donor.type)}
                    </div>
                    {donor.contactPerson && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Rep: {donor.contactPerson}
                      </span>
                    )}
                  </div>
                </td>

                {/* Contact */}
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.8rem' }}>
                    {donor.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                        <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                        {donor.email}
                      </span>
                    )}
                    {donor.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                        <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                        {donor.phone}
                      </span>
                    )}
                    {!donor.email && !donor.phone && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </div>
                </td>

                {/* Category */}
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                    {donor.category?.replace('_', ' ') || 'General'}
                  </span>
                </td>

                {/* Status */}
                <td style={{ padding: '14px 16px' }}>{getStatusBadge(donor.status)}</td>

                {/* Registered Date */}
                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  {formattedDate(donor.registrationDate || donor.createdAt)}
                </td>

                {/* Actions */}
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => onView(donor)}
                      title="View Profile Details"
                      style={{
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        background: 'transparent'
                      }}
                    >
                      <Eye size={15} />
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onEdit(donor)}
                        title="Edit Donor Profile"
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          color: 'var(--brand-green)',
                          background: 'transparent'
                        }}
                      >
                        <Edit3 size={15} />
                      </button>
                    )}

                    {canManage && (
                      <button
                        type="button"
                        onClick={() =>
                          onChangeStatus(donor, donor.status === 'archived' ? 'active' : 'archived')
                        }
                        title={donor.status === 'archived' ? 'Restore to Active' : 'Archive Donor'}
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          color: donor.status === 'archived' ? 'var(--status-success)' : 'var(--text-secondary)',
                          background: 'transparent'
                        }}
                      >
                        {donor.status === 'archived' ? <RotateCcw size={15} /> : <Archive size={15} />}
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDelete(donor)}
                        title="Delete Clean Record"
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid #fecaca',
                          color: 'var(--status-danger)',
                          background: 'transparent'
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
    </>
  );
}

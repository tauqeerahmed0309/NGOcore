import React from 'react';
import {
  X,
  HeartHandshake,
  User,
  Building2,
  Phone,
  MapPin,
  FileText,
  Clock,
  Edit3,
  Archive,
  Receipt
} from 'lucide-react';

export default function DonorDetails({
  isOpen,
  donor = null,
  auditLogs = [],
  donations = [],
  currentUserRole = 'staff',
  onClose,
  onEdit,
  onChangeStatus
}) {
  if (!isOpen || !donor) return null;

  const canManage = currentUserRole === 'admin' || currentUserRole === 'ngo_admin' || currentUserRole === 'staff';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'var(--status-success-bg)',
              color: 'var(--status-success)',
              border: '1px solid #bbf7d0'
            }}
          >
            Active
          </span>
        );
      case 'inactive':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'var(--status-warning-bg)',
              color: 'var(--status-warning)',
              border: '1px solid #fde68a'
            }}
          >
            Inactive
          </span>
        );
      case 'archived':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#f1f5f9',
              color: 'var(--text-secondary)',
              border: '1px solid #cbd5e1'
            }}
          >
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
          gap: 5,
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: isOrg ? '#f5f3ff' : '#eff6ff',
          color: isOrg ? '#7c3aed' : '#2563eb',
          border: `1px solid ${isOrg ? '#ddd6fe' : '#bfdbfe'}`
        }}
      >
        {isOrg ? <Building2 size={12} /> : <User size={12} />}
        {isOrg ? 'Organization' : 'Individual'}
      </span>
    );
  };

  const formattedDate = (dateVal) => {
    if (!dateVal) return 'Not recorded';
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

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '95%' }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'var(--brand-green-muted)',
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HeartHandshake size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: '#e2e8f0',
                    color: '#334155'
                  }}
                >
                  {donor.donorNumber}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {donor.name}
                </h3>
                {getTypeBadge(donor.type)}
                {getStatusBadge(donor.status)}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                Registered on {formattedDate(donor.registrationDate || donor.createdAt)}
                {donor.createdBy?.firstName && ` by ${donor.createdBy.firstName} ${donor.createdBy.lastName || ''}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ padding: 6, color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Card 1: Contact Information */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '18px',
                background: 'var(--bg-surface)'
              }}
            >
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={16} /> Contact Details
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem' }}>
                {donor.contactPerson && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Primary Contact Person</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{donor.contactPerson}</strong>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Email Address</span>
                  {donor.email ? (
                    <a href={`mailto:${donor.email}`} style={{ color: 'var(--brand-green)', textDecoration: 'underline' }}>
                      {donor.email}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>None provided</span>
                  )}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Phone Number</span>
                  {donor.phone ? (
                    <a href={`tel:${donor.phone}`} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {donor.phone}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>None provided</span>
                  )}
                </div>
                {donor.alternatePhone && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Alternate Phone</span>
                    <span>{donor.alternatePhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Address & Geography */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '18px',
                background: 'var(--bg-surface)'
              }}
            >
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} /> Address & Location
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem' }}>
                {donor.address && <div>{donor.address}</div>}
                <div>
                  {[donor.city, donor.state, donor.pinCode].filter(Boolean).join(', ') || 'No address registered'}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{donor.country || 'India'}</div>
              </div>
            </div>

            {/* Card 3: Classification & Preferences */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '18px',
                background: 'var(--bg-surface)'
              }}
            >
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} /> Classification & Preferences
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Donor Category</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {donor.category?.replace('_', ' ') || 'General'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Preferred Contact Method</span>
                  <span style={{ textTransform: 'capitalize' }}>
                    {donor.communicationPreferences?.preferredChannel || 'Email'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Communication Status</span>
                  <span>
                    {donor.communicationPreferences?.optOut ? (
                      <span style={{ color: 'var(--status-danger)', fontWeight: 500 }}>Opted Out of Outreach</span>
                    ) : (
                      <span style={{ color: 'var(--status-success)', fontWeight: 500 }}>Subscribed to Communication</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Authorized Internal Notes */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '18px',
                background: 'var(--bg-surface)'
              }}
            >
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} /> Authorized Internal Notes
              </h4>
              <p style={{ fontSize: '0.875rem', color: donor.notes ? 'var(--text-secondary)' : 'var(--text-muted)', whiteSpace: 'pre-line' }}>
                {donor.notes || 'No internal relationship notes recorded.'}
              </p>
            </div>
          </div>

          {/* Phase 7B Placeholder: Donation History */}
          {/* Donation Records & Financial History */}
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={16} /> Linked Donation Records ({donations.length})
            </h4>

            {donations && donations.length > 0 ? (
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Donation #</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Method</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d, idx) => (
                      <tr
                        key={d._id || idx}
                        style={{
                          borderBottom: idx < donations.length - 1 ? '1px solid var(--border)' : 'none',
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-hover)'
                        }}
                      >
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{d.donationNumber}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{formattedDate(d.donationDate || d.createdAt)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {d.currency} {Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 12px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                          {d.paymentMethod?.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              textTransform: 'capitalize',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              color:
                                d.status === 'approved'
                                  ? 'var(--status-success)'
                                  : d.status === 'verified'
                                  ? 'var(--status-info)'
                                  : d.status === 'reversed' || d.status === 'cancelled'
                                  ? 'var(--status-danger)'
                                  : 'var(--status-warning)'
                            }}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: d.receiptNumber ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {d.receiptNumber || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    color: '#64748b',
                    marginBottom: 10
                  }}
                >
                  <Receipt size={22} />
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  No Donations Recorded Yet
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto' }}>
                  This donor currently has no monetary or in-kind donations recorded. Contributions logged under &ldquo;Donations & Receipts&rdquo; will automatically appear here.
                </p>
              </div>
            )}
          </div>

          {/* Audit Logs Summary */}
          {auditLogs && auditLogs.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} /> Recent Audit Activity
              </h4>
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                {auditLogs.slice(0, 5).map((log, index) => (
                  <div
                    key={log._id || index}
                    style={{
                      padding: '10px 14px',
                      borderBottom: index < auditLogs.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: index % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-hover)'
                    }}
                  >
                    <div>
                      <strong style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{log.action}</strong>
                      {log.actorId?.firstName && (
                        <span style={{ color: 'var(--text-secondary)' }}> by {log.actorId.firstName} {log.actorId.lastName || ''}</span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{formattedDate(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            {canManage && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  onChangeStatus(donor, donor.status === 'archived' ? 'active' : 'archived');
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Archive size={14} />
                {donor.status === 'archived' ? 'Restore to Active' : 'Archive Donor'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {canManage && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  onClose();
                  onEdit(donor);
                }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Edit3 size={14} /> Edit Profile
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              style={{
                padding: '7px 20px',
                borderRadius: 6,
                background: 'var(--brand-green)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

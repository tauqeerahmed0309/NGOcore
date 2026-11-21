import React from 'react';
import {
  X,
  Receipt,
  Download,
  CheckCircle,
  CheckCheck,
  AlertTriangle,
  RotateCcw,
  Clock,
  FileText,
  ShieldCheck,
  Info
} from 'lucide-react';

export default function DonationDetails({
  isOpen,
  donation = null,
  auditLogs = [],
  currentUser = null,
  onClose,
  onVerify,
  onApprove,
  onReverse,
  onEdit,
  onDownloadReceipt
}) {
  if (!isOpen || !donation) return null;

  const userRole = currentUser?.role || 'staff';
  const currentUserId = currentUser?._id || currentUser?.id;
  const canManage = userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff';

  const isCreatedByCurrentUser =
    donation.createdBy?._id === currentUserId ||
    donation.createdBy === currentUserId ||
    (typeof donation.createdBy === 'object' && String(donation.createdBy?._id) === String(currentUserId));

  const isStaffSelfApproval = userRole === 'staff' && isCreatedByCurrentUser;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'var(--status-success-bg)',
              color: 'var(--status-success)',
              border: '1px solid #bbf7d0'
            }}
          >
            <CheckCheck size={14} /> Approved
          </span>
        );
      case 'verified':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--status-info)',
              border: '1px solid #bfdbfe'
            }}
          >
            <CheckCircle size={14} /> Verified
          </span>
        );
      case 'pending':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'var(--status-warning-bg)',
              color: 'var(--status-warning)',
              border: '1px solid #fde68a'
            }}
          >
            <Clock size={14} /> Pending
          </span>
        );
      case 'reversed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              border: '1px solid #fecaca'
            }}
          >
            <RotateCcw size={14} /> Reversed
          </span>
        );
      case 'cancelled':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#f1f5f9',
              color: 'var(--text-secondary)',
              border: '1px solid #cbd5e1'
            }}
          >
            <AlertTriangle size={14} /> Cancelled
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const formattedDate = (dateVal) => {
    if (!dateVal) return '—';
    try {
      return new Date(dateVal).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return String(dateVal);
    }
  };

  const formattedDateTime = (dateVal) => {
    if (!dateVal) return '—';
    try {
      return new Date(dateVal).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Receipt size={22} color="var(--primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {donation.donationNumber}
                </h3>
                {getStatusBadge(donation.status)}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Recorded on {formattedDate(donation.donationDate || donation.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {/* Reversal / Cancellation Notice */}
          {(donation.status === 'reversed' || donation.status === 'cancelled') && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid #fecaca',
                color: 'var(--status-danger)',
                fontSize: '0.85rem',
                marginBottom: '20px'
              }}
            >
              <strong>Notice:</strong> This donation was <strong>{donation.status}</strong> on{' '}
              {formattedDateTime(donation.cancelledAt)}.
              <div style={{ marginTop: 4 }}>
                <strong>Audit Justification:</strong> &ldquo;{donation.reversalReason || 'No reason provided'}&rdquo;
              </div>
            </div>
          )}

          {/* Key Metric Ledger Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginBottom: 24
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Donation Amount
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                {donation.currency} {Number(donation.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                Type: {donation.donationType?.replace('_', ' ')}
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Receipt Status
              </span>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: donation.receiptNumber ? 'var(--primary)' : 'var(--text-secondary)', marginTop: 6 }}>
                {donation.receiptNumber || 'Not Issued Yet'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {donation.receiptIssuedAt ? `Issued on ${formattedDate(donation.receiptIssuedAt)}` : 'Available once approved'}
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Payment Method
              </span>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 6, textTransform: 'capitalize' }}>
                {donation.paymentMethod?.replace('_', ' ')}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Ref: {donation.transactionReference || 'N/A (Cash/Direct)'}
              </span>
            </div>
          </div>

          {/* In-Kind Asset Description (if applicable) */}
          {donation.donationType === 'in_kind' && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid #bfdbfe',
                marginBottom: 20
              }}
            >
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                In-Kind Donation Asset Description
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                {donation.inKindDescription || 'No description recorded'}
              </p>
            </div>
          )}

          {/* Section: Donor Profile Snapshot */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12 }}>
              Donor Details
            </h4>
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Donor Name</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {donation.donorSnapshot?.name || 'Anonymous Donor'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Donor ID</span>
                <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {donation.donorSnapshot?.donorNumber || 'One-off Donor'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</span>
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                  {donation.donorSnapshot?.email || '—'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone</span>
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                  {donation.donorSnapshot?.phone || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Purpose & Program Linkage */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12 }}>
              Allocation & Purpose
            </h4>
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</span>
                <div style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)', marginTop: 2 }}>
                  {donation.category?.replace('_', ' ')}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Linked Program</span>
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                  {donation.programId ? (
                    typeof donation.programId === 'object' ? `${donation.programId.name} (${donation.programId.code})` : 'Program Linked'
                  ) : (
                    'General NGO Fund'
                  )}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specific Purpose</span>
                <div style={{ color: 'var(--text-primary)', marginTop: 2 }}>
                  {donation.purpose || 'None specified'}
                </div>
              </div>
              {donation.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Internal Audit Notes</span>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 2 }}>
                    {donation.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verification & Approval Ledger Trail */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12 }}>
              Approval Trail & Controls
            </h4>
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                fontSize: '0.85rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recorded By</span>
                <div style={{ marginTop: 2 }}>
                  {donation.createdBy?.firstName
                    ? `${donation.createdBy.firstName} ${donation.createdBy.lastName || ''} (${donation.createdBy.email})`
                    : 'Authorized User'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified By</span>
                <div style={{ marginTop: 2 }}>
                  {donation.verifiedAt ? (
                    <span>
                      {donation.verifiedBy?.firstName ? `${donation.verifiedBy.firstName} ` : ''}
                      on {formattedDateTime(donation.verifiedAt)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Pending verification</span>
                  )}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved By</span>
                <div style={{ marginTop: 2 }}>
                  {donation.approvedAt ? (
                    <span>
                      {donation.approvedBy?.firstName ? `${donation.approvedBy.firstName} ` : ''}
                      on {formattedDateTime(donation.approvedAt)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Pending approval</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Official Receipt Action Banner */}
          {(donation.status === 'approved' || donation.receiptNumber) && donation.status !== 'reversed' && donation.status !== 'cancelled' && (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--primary)' }}>
                  <ShieldCheck size={18} /> {donation.receiptNumber ? 'Official Receipt Generated' : 'Official Receipt Ready to Issue'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Receipt Identifier: <strong>{donation.receiptNumber || 'Not allocated yet (allocated on issuance)'}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDownloadReceipt(donation)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 6,
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Download size={15} /> {donation.receiptNumber ? 'Download Receipt (PDF)' : 'Issue & Download Receipt'}
              </button>
            </div>
          )}

          {/* Statutory Tax Disclaimer */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginBottom: 20
            }}
          >
            <Info size={16} flexShrink={0} style={{ marginTop: 1 }} />
            <div>
              <strong>Compliance Disclaimer:</strong> NGOcore provides internal record management and verifiable donation receipts. Formal statutory tax exemptions (e.g., Section 80G under Indian Income Tax or US 501(c)(3) tax deductibility) require distinct statutory approval and official certificates from relevant government revenue authorities.
            </div>
          </div>

          {/* Audit Logs Trail */}
          {auditLogs && auditLogs.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} /> Audit Trail ({auditLogs.length} events)
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
                      {log.metadata?.newStatus && (
                        <span> &rarr; status changed to <strong>{log.metadata.newStatus}</strong></span>
                      )}
                      {log.metadata?.reason && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Reason: {log.metadata.reason}
                        </div>
                      )}
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

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {canManage && donation.status !== 'reversed' && donation.status !== 'cancelled' && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => onReverse(donation, donation.status === 'approved' ? 'reverse' : 'cancel')}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid #fecaca',
                  color: 'var(--status-danger)',
                  backgroundColor: 'var(--status-danger-bg)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} />
                {donation.status === 'approved' ? 'Reverse Donation' : 'Cancel Donation'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {canManage && donation.status === 'pending' && (
              <button
                type="button"
                onClick={() => onVerify(donation)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--status-info)',
                  border: '1px solid #bfdbfe',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <CheckCircle size={14} /> Verify
              </button>
            )}

            {canManage && (donation.status === 'pending' || donation.status === 'verified') && (
              <button
                type="button"
                onClick={() => onApprove(donation)}
                disabled={isStaffSelfApproval}
                title={isStaffSelfApproval ? 'Separation of Duties: You recorded this donation and cannot approve it.' : ''}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  backgroundColor: isStaffSelfApproval ? 'var(--bg-hover)' : 'var(--status-success)',
                  color: isStaffSelfApproval ? 'var(--text-muted)' : '#ffffff',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: isStaffSelfApproval ? 'not-allowed' : 'pointer',
                  opacity: isStaffSelfApproval ? 0.6 : 1
                }}
              >
                <CheckCheck size={14} /> Approve
              </button>
            )}

            {canManage && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  onClose();
                  onEdit(donation);
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <FileText size={14} /> Edit
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                cursor: 'pointer'
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

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  CheckCheck,
  RotateCcw,
  X,
  AlertCircle
} from 'lucide-react';

export default function DonationActionModal({
  isOpen,
  actionType = null, // 'verify' | 'approve' | 'reverse' | 'cancel'
  donation = null,
  currentUserId = null,
  currentUserRole = 'staff',
  onClose,
  onConfirm
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !donation || !actionType) return null;

  // Separation of duties check
  const isCreatedByCurrentUser =
    donation.createdBy?._id === currentUserId ||
    donation.createdBy === currentUserId ||
    (typeof donation.createdBy === 'object' && String(donation.createdBy?._id) === String(currentUserId));

  const isStaffSelfApproval = actionType === 'approve' && currentUserRole === 'staff' && isCreatedByCurrentUser;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isStaffSelfApproval) {
      setError('Separation of Duties Policy: You recorded this donation and cannot approve it. An administrator or a different authorized staff member must review and approve.');
      return;
    }

    if ((actionType === 'reverse' || actionType === 'cancel') && (!reason || reason.trim().length < 5)) {
      setError('Please provide a mandatory audit explanation for this cancellation/reversal (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(actionType, donation, reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getActionConfig = () => {
    switch (actionType) {
      case 'verify':
        return {
          title: `Verify Donation ${donation.donationNumber}`,
          subtitle: 'Confirm that payment funds or in-kind assets have been received and verified.',
          icon: CheckCircle,
          iconColor: 'var(--status-info)',
          iconBg: 'rgba(59, 130, 246, 0.1)',
          confirmText: 'Confirm Verification',
          confirmBtnClass: 'btn-primary',
          confirmBtnBg: 'var(--status-info)'
        };
      case 'approve':
        return {
          title: `Approve Donation ${donation.donationNumber}`,
          subtitle: 'Grant final financial approval and enable official receipt issuance.',
          icon: CheckCheck,
          iconColor: 'var(--status-success)',
          iconBg: 'var(--status-success-bg)',
          confirmText: 'Approve Donation',
          confirmBtnClass: 'btn-primary',
          confirmBtnBg: 'var(--status-success)'
        };
      case 'reverse':
      case 'cancel':
        return {
          title: `${actionType === 'reverse' ? 'Reverse Approved' : 'Cancel Pending'} Donation ${donation.donationNumber}`,
          subtitle: 'This will lock the transaction and permanently update financial records. An audit log reason is strictly required.',
          icon: actionType === 'reverse' ? RotateCcw : AlertTriangle,
          iconColor: 'var(--status-danger)',
          iconBg: 'var(--status-danger-bg)',
          confirmText: actionType === 'reverse' ? 'Reverse Donation' : 'Cancel Donation',
          confirmBtnClass: 'btn-danger',
          confirmBtnBg: 'var(--status-danger)'
        };
      default:
        return {
          title: 'Confirm Action',
          subtitle: '',
          icon: AlertCircle,
          iconColor: 'var(--primary)',
          iconBg: 'var(--bg-hover)',
          confirmText: 'Confirm',
          confirmBtnClass: 'btn-primary',
          confirmBtnBg: 'var(--primary)'
        };
    }
  };

  const config = getActionConfig();
  const ActionIcon = config.icon;

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
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: config.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ActionIcon size={22} color={config.iconColor} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {config.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
              {config.subtitle}
            </p>
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
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid #fecaca',
                color: 'var(--status-danger)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          {/* Separation of duties alert */}
          {isStaffSelfApproval && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--status-warning-bg)',
                border: '1px solid #fde68a',
                color: 'var(--status-warning)',
                fontSize: '0.85rem',
                marginBottom: '16px'
              }}
            >
              <strong>Separation of Duties:</strong> You recorded this donation. To prevent unauthorized financial approval, only an Administrator or a different Staff member can approve it.
            </div>
          )}

          {/* Details Overview Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Donor:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{donation.donorSnapshot?.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Amount:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {donation.currency} {Number(donation.amount).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Payment Method:</span>
              <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                {donation.paymentMethod?.replace('_', ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Current Status:</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{donation.status}</span>
            </div>
          </div>

          {/* Mandatory reason textarea for Reversal / Cancellation */}
          {(actionType === 'reverse' || actionType === 'cancel') && (
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px'
                }}
              >
                Audit Reason <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this donation is being cancelled or reversed (e.g. cheque bounced, duplicate entry, donor refund request)..."
                rows={3}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  resize: 'vertical'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                This justification will be permanently saved to the donation ledger and audit log.
              </span>
            </div>
          )}

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '20px'
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isStaffSelfApproval}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                backgroundColor: config.confirmBtnBg,
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: submitting || isStaffSelfApproval ? 'not-allowed' : 'pointer',
                opacity: submitting || isStaffSelfApproval ? 0.6 : 1
              }}
            >
              {submitting ? 'Processing...' : config.confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

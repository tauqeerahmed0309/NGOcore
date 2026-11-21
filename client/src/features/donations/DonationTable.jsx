import React from 'react';
import {
  Eye,
  Edit3,
  CheckCircle,
  CheckCheck,
  RotateCcw,
  AlertTriangle,
  Download,
  Receipt,
  Clock,
  ArrowUpDown
} from 'lucide-react';

export default function DonationTable({
  donations = [],
  loading = false,
  currentUser = null,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSort,
  onViewDetails,
  onEdit,
  onVerify,
  onApprove,
  onReverse,
  onDownloadReceipt
}) {
  const userRole = currentUser?.role || 'staff';
  const currentUserId = currentUser?._id || currentUser?.id;
  const canManage = userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
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
            <CheckCheck size={12} /> Approved
          </span>
        );
      case 'verified':
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
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--status-info)',
              border: '1px solid #bfdbfe'
            }}
          >
            <CheckCircle size={12} /> Verified
          </span>
        );
      case 'pending':
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
            <Clock size={12} /> Pending
          </span>
        );
      case 'reversed':
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
            <RotateCcw size={12} /> Reversed
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
              backgroundColor: '#f1f5f9',
              color: 'var(--text-secondary)',
              border: '1px solid #cbd5e1'
            }}
          >
            <AlertTriangle size={12} /> Cancelled
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

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        Loading donation records...
      </div>
    );
  }

  if (!donations || donations.length === 0) {
    return (
      <div
        style={{
          padding: '60px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '10px',
          border: '1px solid var(--border)'
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <Receipt size={28} color="var(--primary)" />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          No donations found
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px' }}>
          No donation records matched your search or filters. Click &ldquo;Record Donation&rdquo; to log a monetary contribution or in-kind receipt.
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)' }}>
            <th
              onClick={() => onSort('donationNumber')}
              style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Donation # <ArrowUpDown size={13} style={{ opacity: sortBy === 'donationNumber' ? 1 : 0.4 }} />
              </div>
            </th>
            <th
              onClick={() => onSort('donationDate')}
              style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Date <ArrowUpDown size={13} style={{ opacity: sortBy === 'donationDate' ? 1 : 0.4 }} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Donor
            </th>
            <th
              onClick={() => onSort('amount')}
              style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Amount ({sortOrder.toUpperCase()}) <ArrowUpDown size={13} style={{ opacity: sortBy === 'amount' ? 1 : 0.4 }} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Payment / Ref
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Category
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Status
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Receipt
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {donations.map((d) => {
            const isCreatedByCurrentUser =
              d.createdBy?._id === currentUserId ||
              d.createdBy === currentUserId ||
              (typeof d.createdBy === 'object' && String(d.createdBy?._id) === String(currentUserId));

            const isStaffSelfApproval = userRole === 'staff' && isCreatedByCurrentUser;

            return (
              <tr
                key={d._id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {/* Donation # */}
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {d.donationNumber}
                </td>

                {/* Date */}
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {formattedDate(d.donationDate || d.createdAt)}
                </td>

                {/* Donor */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {d.donorSnapshot?.name || 'Anonymous Donor'}
                  </div>
                  {d.donorSnapshot?.donorNumber && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {d.donorSnapshot.donorNumber}
                    </div>
                  )}
                </td>

                {/* Amount */}
                <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {d.currency} {Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  {d.donationType === 'in_kind' && (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 4,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--status-info)',
                        marginTop: 2
                      }}
                    >
                      In-Kind
                    </span>
                  )}
                </td>

                {/* Payment Method / Ref */}
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ textTransform: 'capitalize', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {d.paymentMethod?.replace('_', ' ')}
                  </div>
                  {d.transactionReference && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {d.transactionReference}
                    </div>
                  )}
                </td>

                {/* Category */}
                <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                  {d.category?.replace('_', ' ')}
                </td>

                {/* Status */}
                <td style={{ padding: '12px 16px' }}>
                  {getStatusBadge(d.status)}
                </td>

                {/* Receipt # */}
                <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                  {d.receiptNumber ? (
                    <button
                      type="button"
                      onClick={() => onDownloadReceipt(d)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="Download PDF Receipt"
                    >
                      <Download size={13} /> {d.receiptNumber}
                    </button>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {/* View Details */}
                    <button
                      type="button"
                      onClick={() => onViewDetails(d)}
                      title="View Details"
                      style={{
                        padding: '5px',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        background: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={15} />
                    </button>

                    {/* Edit */}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onEdit(d)}
                        title="Edit Record"
                        style={{
                          padding: '5px',
                          borderRadius: 4,
                          border: '1px solid var(--border)',
                          background: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={15} />
                      </button>
                    )}

                    {/* Verify Action (if pending) */}
                    {canManage && d.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => onVerify(d)}
                        title="Verify Donation Funds"
                        style={{
                          padding: '5px',
                          borderRadius: 4,
                          border: '1px solid #bfdbfe',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: 'var(--status-info)',
                          cursor: 'pointer'
                        }}
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}

                    {/* Approve Action (if pending or verified) */}
                    {canManage && (d.status === 'pending' || d.status === 'verified') && (
                      <button
                        type="button"
                        onClick={() => onApprove(d)}
                        disabled={isStaffSelfApproval}
                        title={
                          isStaffSelfApproval
                            ? 'Separation of Duties: You recorded this donation and cannot approve it.'
                            : 'Approve Donation'
                        }
                        style={{
                          padding: '5px',
                          borderRadius: 4,
                          border: '1px solid #bbf7d0',
                          background: isStaffSelfApproval ? 'var(--bg-hover)' : 'var(--status-success-bg)',
                          color: isStaffSelfApproval ? 'var(--text-muted)' : 'var(--status-success)',
                          cursor: isStaffSelfApproval ? 'not-allowed' : 'pointer',
                          opacity: isStaffSelfApproval ? 0.5 : 1
                        }}
                      >
                        <CheckCheck size={15} />
                      </button>
                    )}

                    {/* Reverse / Cancel Action */}
                    {canManage && d.status !== 'reversed' && d.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => onReverse(d, d.status === 'approved' ? 'reverse' : 'cancel')}
                        title={d.status === 'approved' ? 'Reverse Approved Donation' : 'Cancel Donation'}
                        style={{
                          padding: '5px',
                          borderRadius: 4,
                          border: '1px solid #fecaca',
                          background: 'var(--status-danger-bg)',
                          color: 'var(--status-danger)',
                          cursor: 'pointer'
                        }}
                      >
                        {d.status === 'approved' ? <RotateCcw size={15} /> : <AlertTriangle size={15} />}
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

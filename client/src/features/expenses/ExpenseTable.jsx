import React from 'react';
import {
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  ArrowUpDown
} from 'lucide-react';

export default function ExpenseTable({
  expenses = [],
  loading = false,
  userRole = 'staff',
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSort,
  onView,
  onEdit,
  onApprove,
  onReject,
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
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-success)' }} />
            Approved
          </span>
        );
      case 'rejected':
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
            Rejected
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
              backgroundColor: 'var(--status-warning-bg)',
              color: 'var(--status-warning)',
              border: '1px solid #fde68a'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-warning)' }} />
            Pending
          </span>
        );
    }
  };

  const getCategoryBadge = (category) => {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 7px',
          borderRadius: 4,
          fontSize: '0.72rem',
          fontWeight: 600,
          backgroundColor: '#f1f5f9',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
          textTransform: 'capitalize'
        }}
      >
        {String(category || '').replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="auth-spinner" style={{ margin: '0 auto 12px auto' }} />
        <p style={{ fontSize: '0.875rem' }}>Loading expense records...</p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Clock size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          No Expense Records Found
        </h4>
        <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
          No expense records match your current search and filter settings, or no expenses have been recorded yet.
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
              onClick={() => onSort('expenseNumber')}
              style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Expense #</span>
                {renderSortIndicator('expenseNumber')}
              </div>
            </th>
            <th
              onClick={() => onSort('expenseDate')}
              style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Date</span>
                {renderSortIndicator('expenseDate')}
              </div>
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Title &amp; Vendor</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
            <th
              onClick={() => onSort('amount')}
              style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <span>Amount</span>
                {renderSortIndicator('amount')}
              </div>
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Payment Method</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => {
            const isPending = expense.status === 'pending';
            const canApprove = (isAdmin || userRole === 'staff') && isPending;

            return (
              <tr
                key={expense._id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background-color 150ms'
                }}
                className="table-row-hover"
              >
                {/* Expense # */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => onView(expense)}
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
                    {expense.expenseNumber}
                  </button>
                </td>

                {/* Date */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {expense.expenseDate ? (() => {
                    const d = new Date(expense.expenseDate);
                    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    });
                  })() : '—'}
                </td>

                {/* Title & Vendor */}
                <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {expense.title || 'Untitled Expense'}
                  </div>
                  {expense.vendor && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Vendor: {expense.vendor}
                    </div>
                  )}
                  {expense.programId && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-green)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Prog: {typeof expense.programId === 'object' ? (expense.programId.name || expense.programId.code || '') : String(expense.programId)}
                    </div>
                  )}
                </td>

                {/* Category */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  {getCategoryBadge(expense.category)}
                </td>

                {/* Amount */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 4, fontWeight: 400 }}>
                    {expense.currency || 'INR'}
                  </span>
                  {Number(expense.amount || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </td>

                {/* Payment Method */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                  {String(expense.paymentMethod || '').replace(/_/g, ' ')}
                </td>

                {/* Status */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  {getStatusBadge(expense.status)}
                </td>

                {/* Actions */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    {/* View Details */}
                    <button
                      type="button"
                      onClick={() => onView(expense)}
                      title="View Details"
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

                    {/* Quick Approve / Reject if Pending */}
                    {canApprove && (
                      <>
                        <button
                          type="button"
                          onClick={() => onApprove(expense)}
                          title="Approve Expense"
                          style={{
                            padding: '6px',
                            borderRadius: 4,
                            border: '1px solid #bbf7d0',
                            color: 'var(--status-success)',
                            background: 'var(--status-success-bg)',
                            cursor: 'pointer'
                          }}
                        >
                          <CheckCircle size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(expense)}
                          title="Reject Expense"
                          style={{
                            padding: '6px',
                            borderRadius: 4,
                            border: '1px solid #fecaca',
                            color: 'var(--status-danger)',
                            background: 'var(--status-danger-bg)',
                            cursor: 'pointer'
                          }}
                        >
                          <XCircle size={15} />
                        </button>
                      </>
                    )}

                    {/* Edit Details */}
                    {expense.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => onEdit(expense)}
                        title="Edit Details"
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

                    {/* Archive / Delete (Admin Only) */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDelete(expense)}
                        title="Archive Expense"
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

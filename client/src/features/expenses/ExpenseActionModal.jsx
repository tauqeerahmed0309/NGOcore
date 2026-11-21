import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';

export default function ExpenseActionModal({
  isOpen,
  actionType = 'approve', // 'approve' | 'reject' | 'delete'
  expense = null,
  currentUserId = null,
  onClose,
  onConfirm
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !expense) return null;

  const isCreator = currentUserId && expense.createdBy?._id && (
    expense.createdBy._id.toString() === currentUserId.toString()
  );

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');

    if (actionType === 'reject') {
      if (!reason.trim() || reason.trim().length < 5) {
        setError('A descriptive rejection reason (at least 5 characters) is required for audit trail.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await onConfirm(actionType, expense._id, reason.trim());
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Action failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {actionType === 'approve' && (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
            {actionType === 'reject' && (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            {actionType === 'delete' && (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
              {actionType === 'approve'
                ? 'Approve Expense'
                : actionType === 'reject'
                ? 'Reject Expense'
                : 'Archive Expense'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Expense summary badge */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-1 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span className="font-medium">Expense Number:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{expense.expenseNumber}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span className="font-medium">Amount:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {expense.currency} {Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span className="font-medium">Title:</span>
              <span className="truncate max-w-[200px] text-gray-900 dark:text-white">{expense.title}</span>
            </div>
          </div>

          {actionType === 'approve' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to approve this expense? Once approved, the amount and currency will be locked for financial integrity.
              </p>
              {isCreator && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg text-xs">
                  <strong>Notice:</strong> Separation of duties policy requires a different staff member or administrator to approve this expense.
                </div>
              )}
            </div>
          )}

          {actionType === 'reject' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why this expense is rejected (e.g., missing receipts, unauthorized item)..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This justification will be permanently recorded in the audit trail.
              </p>
            </div>
          )}

          {actionType === 'delete' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to archive this expense record? The record will be soft-deleted and hidden from general listings, preserving audit integrity.
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition disabled:opacity-50 ${
                actionType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : actionType === 'reject'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {submitting
                ? 'Processing...'
                : actionType === 'approve'
                ? 'Confirm Approval'
                : actionType === 'reject'
                ? 'Reject Expense'
                : 'Archive Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

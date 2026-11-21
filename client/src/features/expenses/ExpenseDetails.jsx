import React from 'react';
import {
  X,
  CreditCard,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ShieldCheck,
  Edit2,
  ExternalLink
} from 'lucide-react';

export default function ExpenseDetails({
  isOpen,
  expense = null,
  auditLogs = [],
  userRole = 'staff',
  onClose,
  onEdit,
  onApprove,
  onReject
}) {
  if (!isOpen || !expense) return null;

  const canApprove = (userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff') && expense.status === 'pending';
  const canEdit = expense.status !== 'rejected';

  const formatUser = (u) => {
    if (!u) return 'System / Unassigned';
    if (typeof u === 'string') return u;
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return name ? `${name} (${u.email || ''})` : (u.email || 'User');
  };

  const formatDate = (d, fallback = '—') => {
    if (!d) return fallback;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? fallback : dt.toLocaleDateString();
  };

  const formatDateTime = (d, fallback = '—') => {
    if (!d) return fallback;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? fallback : dt.toLocaleString();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5" /> Pending Approval
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {expense.expenseNumber}
                </h2>
                {getStatusBadge(expense.status)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Created on {formatDate(expense.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Title & Financial Highlight */}
          <div className="bg-gradient-to-r from-gray-50 to-emerald-50/30 dark:from-gray-750 dark:to-emerald-950/20 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Expense Title
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {expense.title}
            </h3>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Amount</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {expense.currency || 'INR'} {Number(expense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Category</span>
                <span className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-200">
                  {String(expense.category || '').replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Payment Method</span>
                <span className="text-sm font-semibold capitalize text-gray-800 dark:text-gray-200">
                  {String(expense.paymentMethod || '').replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Expense Date</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {formatDate(expense.expenseDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Rejection Alert if rejected */}
          {expense.status === 'rejected' && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold text-sm">
                <XCircle className="w-4 h-4" /> Expense Rejected
              </div>
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                Reason: "{expense.rejectionReason}"
              </p>
              {expense.rejectedBy && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Rejected by {formatUser(expense.rejectedBy)} on {formatDateTime(expense.rejectedAt)}
                </p>
              )}
            </div>
          )}

          {/* Program & Vendor Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Linked Program
              </h4>
              {expense.programId ? (
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">
                    {expense.programId.name || 'Program'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Code: {expense.programId.code}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Not linked to any specific program (General Expense)
                </p>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Vendor & Verification
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Vendor / Supplier:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{expense.vendor || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Invoice Number:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{expense.invoiceNumber || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Transaction Ref:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{expense.transactionReference || '—'}</span>
                </div>
                {expense.receiptUrl && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500 dark:text-gray-400">Receipt Attachment:</span>
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Receipt
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Internal Notes
              </h4>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                {expense.notes}
              </p>
            </div>
          )}

          {/* Audit Trail & Lifecycle History */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Audit Trail & Governance Logs
            </h4>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700 text-xs">
              {/* Creator entry */}
              <div className="p-3 bg-white dark:bg-gray-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Record Created</span>
                  <p className="text-gray-500 dark:text-gray-400">
                    By {formatUser(expense.createdBy)}
                  </p>
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatDateTime(expense.createdAt)}
                </span>
              </div>

              {/* Approval entry if approved */}
              {expense.status === 'approved' && expense.approvedBy && (
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Approved &amp; Verified
                    </span>
                    <p className="text-gray-500 dark:text-gray-400">
                      By {formatUser(expense.approvedBy)}
                    </p>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatDateTime(expense.approvedAt)}
                  </span>
                </div>
              )}

              {/* Rejection entry if rejected */}
              {expense.status === 'rejected' && expense.rejectedBy && (
                <div className="p-3 bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      Rejected by Accounting
                    </span>
                    <p className="text-gray-500 dark:text-gray-400">
                      By {formatUser(expense.rejectedBy)}
                    </p>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatDateTime(expense.rejectedAt)}
                  </span>
                </div>
              )}

              {/* Additional audit log events */}
              {auditLogs.map((log) => (
                <div key={log._id} className="p-3 bg-white dark:bg-gray-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">
                      {String(log.action || '').replace(/_/g, ' ')}
                    </span>
                    <p className="text-gray-500 dark:text-gray-400">
                      {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : 'Audit event registered'}
                    </p>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <div>
            {canEdit && (
              <button
                onClick={() => onEdit(expense)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Details
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canApprove && (
              <>
                <button
                  onClick={() => onReject(expense)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 rounded-lg transition"
                >
                  Reject
                </button>
                <button
                  onClick={() => onApprove(expense)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                >
                  Approve Expense
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

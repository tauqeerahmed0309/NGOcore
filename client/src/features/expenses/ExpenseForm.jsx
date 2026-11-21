import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  AlertCircle,
  Lock
} from 'lucide-react';
import api from '../../services/api';

const CATEGORIES = [
  { value: 'program', label: 'Program Implementation' },
  { value: 'operational', label: 'Operational & Overhead' },
  { value: 'administrative', label: 'Administrative & Governance' },
  { value: 'salary', label: 'Staff Salaries & Stipends' },
  { value: 'supplies', label: 'Supplies, Kits & Materials' },
  { value: 'education', label: 'Education & Training' },
  { value: 'healthcare', label: 'Healthcare & Medical Relief' },
  { value: 'utilities', label: 'Utilities (Electricity, Water, Internet)' },
  { value: 'rent', label: 'Office & Facility Rent' },
  { value: 'travel', label: 'Field Travel & Transport' },
  { value: 'fundraising', label: 'Fundraising & Events' },
  { value: 'other', label: 'Other Operational Expenses' }
];

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
  { value: 'upi', label: 'UPI / QR Code' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'cash', label: 'Cash (Petty Cash)' },
  { value: 'other', label: 'Other' }
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];

export default function ExpenseForm({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  expense = null,
  onClose,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    expenseNumber: '',
    title: '',
    category: 'operational',
    amount: '',
    currency: 'INR',
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'bank_transfer',
    vendor: '',
    transactionReference: '',
    invoiceNumber: '',
    receiptUrl: '',
    programId: '',
    notes: ''
  });

  const [programsList, setProgramsList] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lock financial fields if already approved
  const isApproved = expense && expense.status === 'approved';

  useEffect(() => {
    if (!isOpen) return;

    // Load active programs for selection
    const loadPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const res = await api.get('/programs', { params: { limit: 100 } });
        const list = res?.data?.programs || res?.data?.data?.programs || res?.programs || [];
        setProgramsList(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load programs for expense:', err);
      } finally {
        setLoadingPrograms(false);
      }
    };
    loadPrograms();

    if (mode === 'edit' && expense) {
      let formattedDate = new Date().toISOString().slice(0, 10);
      if (expense.expenseDate) {
        const parsed = new Date(expense.expenseDate);
        if (!isNaN(parsed.getTime())) {
          formattedDate = parsed.toISOString().slice(0, 10);
        }
      }

      setFormData({
        expenseNumber: expense.expenseNumber || '',
        title: expense.title || '',
        category: expense.category || 'operational',
        amount: expense.amount !== undefined ? expense.amount.toString() : '',
        currency: expense.currency || 'INR',
        expenseDate: formattedDate,
        paymentMethod: expense.paymentMethod || 'bank_transfer',
        vendor: expense.vendor || '',
        transactionReference: expense.transactionReference || '',
        invoiceNumber: expense.invoiceNumber || '',
        receiptUrl: expense.receiptUrl || '',
        programId: expense.programId?._id || expense.programId || '',
        notes: expense.notes || ''
      });
      setError('');
    } else {
      setFormData({
        expenseNumber: '',
        title: '',
        category: 'operational',
        amount: '',
        currency: 'INR',
        expenseDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'bank_transfer',
        vendor: '',
        transactionReference: '',
        invoiceNumber: '',
        receiptUrl: '',
        programId: '',
        notes: ''
      });
      setError('');
    }
  }, [isOpen, mode, expense]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required.');
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number greater than zero.');
      return;
    }

    // Check max two decimals
    const amountStr = formData.amount.toString().trim();
    if (amountStr.includes('.') && amountStr.split('.')[1].length > 2) {
      setError('Amount cannot have more than 2 decimal places.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      amount: parsedAmount,
      currency: formData.currency,
      expenseDate: formData.expenseDate,
      paymentMethod: formData.paymentMethod,
      vendor: formData.vendor.trim() || undefined,
      transactionReference: formData.transactionReference.trim() || undefined,
      invoiceNumber: formData.invoiceNumber.trim() || undefined,
      receiptUrl: formData.receiptUrl.trim() || undefined,
      programId: formData.programId ? formData.programId : null,
      notes: formData.notes.trim() || undefined
    };

    if (mode === 'create' && formData.expenseNumber.trim()) {
      payload.expenseNumber = formData.expenseNumber.trim();
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      const errDetails = Array.isArray(err?.errors) ? err.errors.map(e => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ') : '';
      const msg = errDetails || err?.message || err?.response?.data?.message || err?.response?.data?.error || 'Operation failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {mode === 'create' ? 'Record New Expense' : `Edit Expense: ${expense?.expenseNumber}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isApproved && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                This expense is approved. Financial amounts and currency are locked for accounting integrity.
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expense Title / Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Science Lab Experiment Kits & Textbooks"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                disabled={isApproved}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:opacity-60"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                disabled={isApproved}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:opacity-60"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expense Date & Linked Program */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expense Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="expenseDate"
                value={formData.expenseDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Linked Program (Optional)
              </label>
              <select
                name="programId"
                value={formData.programId}
                onChange={handleChange}
                disabled={loadingPrograms}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">
                  {loadingPrograms ? 'Loading programs...' : '-- General / Non-Program Expense --'}
                </option>
                {programsList.map((prog) => (
                  <option key={prog._id} value={prog._id}>
                    {prog.code} — {prog.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vendor & Invoice Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendor / Supplier Name
              </label>
              <input
                type="text"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                placeholder="e.g. Oxford Book Depot"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice / Bill Number
              </label>
              <input
                type="text"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleChange}
                placeholder="e.g. INV-2026-9041"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Transaction Reference & Custom Expense Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transaction Ref / UTR / Check #
              </label>
              <input
                type="text"
                name="transactionReference"
                value={formData.transactionReference}
                onChange={handleChange}
                placeholder="e.g. UTR9876543210"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Custom Expense Number (Optional)
                </label>
                <input
                  type="text"
                  name="expenseNumber"
                  value={formData.expenseNumber}
                  onChange={handleChange}
                  placeholder="Auto-assigned (EXP-XXXX) if blank"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Receipt / Invoice Document URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Receipt / Voucher Document URL (Optional)
            </label>
            <input
              type="text"
              name="receiptUrl"
              value={formData.receiptUrl}
              onChange={handleChange}
              placeholder="e.g. https://... or document reference code"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Internal Accounting Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Any auditing or accounting context..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : mode === 'create' ? 'Record Expense' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

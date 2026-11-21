import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Sliders, AlertCircle } from 'lucide-react';
import inventoryService from './inventoryService';

export default function StockTransactionModal({
  isOpen,
  onClose,
  item,
  onTransactionRecorded,
  showNotification
}) {
  const [type, setType] = useState('inflow'); // 'inflow' | 'outflow' | 'adjustment'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !item) return null;

  const currentStock = item.quantityOnHand || 0;
  const numQty = Number(quantity) || 0;

  let projectedBalance = currentStock;
  if (type === 'inflow') {
    projectedBalance = currentStock + numQty;
  } else if (type === 'outflow') {
    projectedBalance = currentStock - numQty;
  } else if (type === 'adjustment') {
    projectedBalance = numQty;
  }

  const isInvalidOutflow = type === 'outflow' && numQty > currentStock;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!quantity || numQty <= 0) {
      setError('Please enter a valid positive quantity.');
      return;
    }

    if (isInvalidOutflow) {
      setError(
        `Insufficient stock: Cannot issue ${numQty} ${item.unitOfMeasure} when only ${currentStock} are available.`
      );
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a descriptive reason for this stock movement.');
      return;
    }

    setLoading(true);
    try {
      await inventoryService.recordStockTransaction(item._id, {
        type,
        quantity: numQty,
        reason: reason.trim(),
        recipientName: recipientName.trim(),
        notes: notes.trim()
      });

      showNotification('success', `Stock ${type} transaction recorded successfully.`);
      if (onTransactionRecorded) onTransactionRecorded();
      onClose();
    } catch (err) {
      console.error('Failed to record stock transaction:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to record transaction';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/20 text-white font-mono">
                {item.itemCode}
              </span>
              <h2 className="text-base font-bold truncate max-w-xs">{item.name}</h2>
            </div>
            <p className="text-xs text-amber-100 mt-1">
              Current Balance: <strong className="text-white">{currentStock}</strong> {item.unitOfMeasure}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Movement Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Transaction Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('inflow')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'inflow'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                Receive (In)
              </button>

              <button
                type="button"
                onClick={() => setType('outflow')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'outflow'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                Issue (Out)
              </button>

              <button
                type="button"
                onClick={() => setType('adjustment')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'adjustment'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                Audit Count
              </button>
            </div>
          </div>

          {/* Quantity & Balance Projection */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {type === 'adjustment' ? 'Verified Physical Count' : 'Quantity'} ({item.unitOfMeasure}){' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                  isInvalidOutflow
                    ? 'border-red-400 focus:ring-red-500 bg-red-50/50'
                    : 'border-gray-300 focus:ring-amber-500'
                }`}
              />
            </div>

            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs">
              <span className="text-gray-500 block">Projected Balance</span>
              <span
                className={`font-bold text-sm block mt-0.5 ${
                  isInvalidOutflow ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {projectedBalance} {item.unitOfMeasure}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reason / Justification <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === 'inflow'
                  ? 'e.g. Shipment from supplier, In-kind donation'
                  : type === 'outflow'
                  ? 'e.g. Field distribution for health camp, Damaged write-off'
                  : 'e.g. End-of-month physical warehouse reconciliation'
              }
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Recipient (if outflow) */}
          {type === 'outflow' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Recipient / Beneficiary Group
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Community Center #4, Ramesh Kumar"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Notes</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Batch number, delivery receipt reference, condition details..."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isInvalidOutflow}
              className="px-4 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Confirm Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

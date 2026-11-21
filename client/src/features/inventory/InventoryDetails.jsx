import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  MapPin,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  AlertTriangle,
  Edit2,
  PlusCircle
} from 'lucide-react';
import inventoryService from './inventoryService';

export default function InventoryDetails({
  isOpen,
  onClose,
  itemId,
  onEdit,
  onRecordTransaction,
  showNotification
}) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ledger' | 'audit'

  useEffect(() => {
    if (isOpen && itemId) {
      loadItemDetails();
    } else {
      setItem(null);
      setActiveTab('overview');
    }
  }, [isOpen, itemId]);

  const loadItemDetails = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getInventoryItemById(itemId);
      const payload = res?.data || res;
      setItem(payload?.item || payload?.data || payload || null);
    } catch (err) {
      console.error('Failed to load inventory item details:', err);
      showNotification('error', 'Failed to load inventory details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentStock = item?.quantityOnHand || 0;
  const minThreshold = item?.minThreshold || 0;
  const isLowStock = currentStock <= minThreshold;
  const totalValuation = currentStock * (item?.unitCost || 0);

  const transactions = item?.transactions || [];

  const getTxTypeBadge = (type) => {
    if (type === 'inflow') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <ArrowDownRight className="w-3 h-3" /> Inflow
        </span>
      );
    }
    if (type === 'outflow') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
          <ArrowUpRight className="w-3 h-3" /> Outflow
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
        <Sliders className="w-3 h-3" /> Adjustment
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/20 text-white">
              {item?.itemCode || 'INV-XXXX'}
            </span>
            <h2 className="text-lg font-bold truncate max-w-lg">
              {item?.name || 'Inventory Asset Details'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {item && onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Asset Overview
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            Stock Ledger ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Audit Trail ({item?.auditLogs?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              Loading inventory record...
            </div>
          ) : !item ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Inventory record not found or could not be loaded.
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Stock on Hand</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-lg font-bold text-gray-900">
                      {currentStock} {item.unitOfMeasure}
                    </span>
                    {isLowStock && (
                      <span className="p-0.5 rounded text-amber-600 bg-amber-50" title="Low stock warning">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Category</span>
                  <span className="text-xs font-semibold text-gray-900 capitalize block mt-1">
                    {item.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Unit Cost</span>
                  <span className="text-sm font-semibold text-gray-900 block mt-1">
                    ₹{item.unitCost || 0}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Total Valuation</span>
                  <span className="text-sm font-bold text-amber-700 block mt-1">
                    ₹{totalValuation.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Banner: Record Movement */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Stock Movements & Distribution</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Receive supplies, issue items to field teams, or record physical audit counts.
                  </p>
                </div>
                {onRecordTransaction && (
                  <button
                    onClick={() => onRecordTransaction(item)}
                    className="px-4 py-2 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Record Movement
                  </button>
                )}
              </div>

              {/* Warehouse Location & Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-600" /> Warehouse Location
                  </h3>
                  <div className="text-xs space-y-1 text-gray-700">
                    <div>
                      <span className="font-semibold text-gray-500">Building: </span>
                      {item.storageLocation?.building || 'Unassigned'}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Room / Bay: </span>
                      {item.storageLocation?.room || '—'}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Shelf / Bin: </span>
                      {item.storageLocation?.shelf || '—'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-600" /> Threshold & Parameters
                  </h3>
                  <div className="text-xs space-y-1 text-gray-700">
                    <div>
                      <span className="font-semibold text-gray-500">Min Alert Threshold: </span>
                      {item.minThreshold} {item.unitOfMeasure}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Cataloged On: </span>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Cataloged By: </span>
                      {item.createdBy
                        ? `${item.createdBy.firstName} ${item.createdBy.lastName}`
                        : 'System'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Specifications & Description
                  </h3>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === 'ledger' ? (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No stock transactions recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {transactions
                    .slice()
                    .reverse()
                    .map((tx) => (
                      <div
                        key={tx._id}
                        className="py-3 flex items-start justify-between hover:bg-gray-50/50 px-2 rounded-lg transition-colors text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-500 text-[11px]">
                              {tx.transactionNumber}
                            </span>
                            {getTxTypeBadge(tx.type)}
                            <span className="font-bold text-gray-900">
                              {tx.type === 'outflow' ? '-' : '+'}
                              {tx.quantity} {item.unitOfMeasure}
                            </span>
                            <span className="text-gray-400">
                              (Balance: {tx.balanceAfter} {item.unitOfMeasure})
                            </span>
                          </div>
                          <div className="text-gray-700">
                            <strong>Reason:</strong> {tx.reason}
                            {tx.recipientName && (
                              <span className="text-gray-500 ml-2">
                                (Recipient: {tx.recipientName})
                              </span>
                            )}
                          </div>
                          {tx.notes && <div className="text-gray-500 italic">"{tx.notes}"</div>}
                        </div>

                        <div className="text-right text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                          <div>{new Date(tx.timestamp).toLocaleDateString()}</div>
                          <div>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {item.auditLogs?.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No audit logs recorded for this asset yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {item.auditLogs.map((log) => (
                    <div key={log._id} className="py-2.5 text-xs text-gray-700 flex justify-between">
                      <div>
                        <span className="font-semibold uppercase tracking-wider text-amber-700">
                          {log.action}
                        </span>{' '}
                        by{' '}
                        <span className="font-medium text-gray-900">
                          {log.actorId?.firstName
                            ? `${log.actorId.firstName} ${log.actorId.lastName}`
                            : log.actorId?.email || 'System'}
                        </span>
                      </div>
                      <span className="text-gray-400">
                        {new Date(log.timestamp || log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

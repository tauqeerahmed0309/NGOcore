import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import donationService from '../donations/donationService';
import expenseService from '../expenses/expenseService';

export default function FinancialSummaryCard() {
  const [donationSummary, setDonationSummary] = useState(null);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFinancials = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [donRes, expRes] = await Promise.allSettled([
        donationService.getDonationSummary(),
        expenseService.getExpenseSummary()
      ]);

      if (donRes.status === 'fulfilled' && donRes.value.data?.success) {
        setDonationSummary(donRes.value.data.data);
      }
      if (expRes.status === 'fulfilled' && expRes.value.data?.success) {
        setExpenseSummary(expRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load financial overview:', err);
      setError('Unable to load real-time financial balances.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinancials();
  }, [loadFinancials]);

  // Extract INR metrics (primary operational currency)
  const inrDonation = donationSummary?.currencyTotals?.find((c) => c._id === 'INR') || {
    grossCollected: 0,
    netCollected: 0,
    pendingAmount: 0,
    totalDonations: 0
  };

  const inrExpense = expenseSummary?.currencyTotals?.find((c) => c._id === 'INR') || {
    grossOutflow: 0,
    approvedOutflow: 0,
    pendingOutflow: 0,
    totalExpenses: 0
  };

  const totalInflow = inrDonation.netCollected || 0;
  const totalOutflow = inrExpense.approvedOutflow || 0;
  const netBalance = totalInflow - totalOutflow;
  const pendingInflow = inrDonation.pendingAmount || 0;
  const pendingOutflow = inrExpense.pendingOutflow || 0;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Financial Health &amp; Cash Flow
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Live operational funds, donation inflows, and approved expenditures (INR).
            </p>
          </div>
        </div>

        <button
          onClick={loadFinancials}
          disabled={loading}
          aria-label="Refresh financial data"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI 3-Column Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Inflow (Donations) */}
        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase">
            <span>Donations Inflow</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800 dark:text-emerald-200">
            ₹{totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
            <span>{inrDonation.totalDonations || 0} received</span>
            {pendingInflow > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" /> ₹{pendingInflow.toLocaleString()} pending
              </span>
            )}
          </div>
        </div>

        {/* Total Outflow (Expenses) */}
        <div className="p-4 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-red-700 dark:text-red-300 uppercase">
            <span>Expenses Outflow</span>
            <ArrowDownRight className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-red-800 dark:text-red-200">
            ₹{totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-red-600 dark:text-red-400">
            <span>{inrExpense.totalExpenses || 0} disbursements</span>
            {pendingOutflow > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" /> ₹{pendingOutflow.toLocaleString()} awaiting
              </span>
            )}
          </div>
        </div>

        {/* Net Operating Surplus */}
        <div
          className={`p-4 border rounded-xl ${
            netBalance >= 0
              ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40'
              : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
            <span>Net Balance / Surplus</span>
            {netBalance >= 0 ? (
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div
            className={`mt-2 text-2xl font-black ${
              netBalance >= 0
                ? 'text-blue-900 dark:text-blue-200'
                : 'text-amber-900 dark:text-amber-200'
            }`}
          >
            {netBalance < 0 ? '-' : ''}₹{Math.abs(netBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {netBalance >= 0
              ? 'Healthy operational liquidity'
              : 'Disbursements exceed recognized inflows'}
          </div>
        </div>
      </div>

      {/* Navigation Quick Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4 text-xs font-medium">
          <Link
            to="/donations"
            className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <Receipt className="w-3.5 h-3.5" />
            Donations &amp; Receipts
          </Link>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <Link
            to="/expenses"
            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Expenses &amp; Outflow
          </Link>
        </div>

        <span className="text-xs text-gray-400 dark:text-gray-500">
          Amounts verified by multi-tenant financial audit trail
        </span>
      </div>
    </section>
  );
}

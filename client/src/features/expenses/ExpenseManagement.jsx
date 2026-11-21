import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCheck,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import expenseService from './expenseService';
import ExpenseTable from './ExpenseTable';
import ExpenseForm from './ExpenseForm';
import ExpenseDetails from './ExpenseDetails';
import ExpenseActionModal from './ExpenseActionModal';

export default function ExpenseManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'staff';
  const currentUserId = currentUser?._id || currentUser?.id;
  const canManage = userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff';

  // Data state
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    totalExpenses: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const currencyFilter = 'all';
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState([]);

  // Action Dialog state (Approve, Reject, Delete/Archive)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [actionExpense, setActionExpense] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load KPI Summary
  const loadSummary = useCallback(async () => {
    try {
      const res = await expenseService.getExpenseSummary();
      const payload = res?.data || res;
      if (res?.success || payload?.summary || payload?.statusCounts) {
        setSummary(payload.summary || payload.data?.summary || payload);
      }
    } catch (err) {
      console.error('Failed to load expense summary:', err);
    }
  }, []);

  // Fetch Expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentMethodFilter !== 'all') params.paymentMethod = paymentMethodFilter;
      if (currencyFilter !== 'all') params.currency = currencyFilter;

      const res = await expenseService.getExpenses(params);
      const payload = res?.data || res;
      if (res?.success || payload?.expenses) {
        setExpenses(payload.expenses || payload.data?.expenses || []);
        setPagination(payload.pagination || payload.data?.pagination || {});
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      showNotification('error', 'Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, debouncedSearch, categoryFilter, statusFilter, paymentMethodFilter, currencyFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Sort handler
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormMode('create');
    setExpenseToEdit(null);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (expense) => {
    setFormMode('edit');
    setExpenseToEdit(expense);
    setIsDetailsOpen(false);
    setIsFormOpen(true);
  };

  // Open Details Modal
  const handleOpenDetails = async (expense) => {
    try {
      const res = await expenseService.getExpenseById(expense._id);
      const payload = res?.data || res;
      if (res?.success || payload?.expense) {
        setSelectedExpense(payload.expense || payload);
        setSelectedAuditLogs(payload.auditLogs || []);
        setIsDetailsOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch expense details:', err);
      showNotification('error', 'Failed to fetch detailed expense record.');
    }
  };

  // Action Dialog Openers
  const handleOpenApprove = (expense) => {
    setActionType('approve');
    setActionExpense(expense);
    setActionModalOpen(true);
  };

  const handleOpenReject = (expense) => {
    setActionType('reject');
    setActionExpense(expense);
    setActionModalOpen(true);
  };

  const handleOpenDelete = (expense) => {
    setActionType('delete');
    setActionExpense(expense);
    setActionModalOpen(true);
  };

  // Execute Action from Modal
  const handleExecuteAction = async (type, expenseId, reason) => {
    try {
      if (type === 'approve') {
        await expenseService.approveExpense(expenseId);
        showNotification('success', 'Expense approved successfully.');
      } else if (type === 'reject') {
        await expenseService.rejectExpense(expenseId, reason);
        showNotification('success', 'Expense rejected with documented reason.');
      } else if (type === 'delete') {
        await expenseService.deleteExpense(expenseId);
        showNotification('success', 'Expense archived cleanly.');
      }

      fetchExpenses();
      loadSummary();
      setIsDetailsOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Operation failed';
      showNotification('error', msg);
      throw err;
    }
  };

  // Form Submit Handler
  const handleFormSubmit = async (formData) => {
    if (formMode === 'create') {
      await expenseService.createExpense(formData);
      showNotification('success', 'New expense record created successfully.');
    } else {
      await expenseService.updateExpense(expenseToEdit._id, formData);
      showNotification('success', 'Expense details updated.');
    }
    fetchExpenses();
    loadSummary();
  };

  // CSV Export Handler
  const handleExportCSV = async () => {
    try {
      showNotification('info', 'Preparing CSV export...');
      const params = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentMethodFilter !== 'all') params.paymentMethod = paymentMethodFilter;

      const res = await expenseService.exportExpenses(params);
      const blob = res instanceof Blob ? res : new Blob([res?.data || res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification('success', 'CSV export downloaded successfully.');
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('error', 'Failed to generate CSV export.');
    }
  };

  // Compute Primary KPI metrics from summary
  const inrTotals = summary?.totalsByCurrency?.INR || summary?.currencyTotals?.find?.((c) => c._id === 'INR') || {
    gross: 0,
    grossOutflow: 0,
    approved: 0,
    approvedOutflow: 0,
    pending: 0,
    pendingOutflow: 0,
    totalExpenses: 0
  };

  const primaryApproved = Number(inrTotals.approved ?? inrTotals.approvedOutflow ?? 0);
  const primaryPending = Number(inrTotals.pending ?? inrTotals.pendingOutflow ?? 0);
  const primaryGross = Number(inrTotals.gross ?? inrTotals.grossOutflow ?? 0);

  return (
    <div className="feature-page-container" style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: notification.type === 'success' ? 'var(--status-success-bg)' : notification.type === 'error' ? 'var(--status-danger-bg)' : '#eff6ff',
            color: notification.type === 'success' ? 'var(--status-success)' : notification.type === 'error' ? 'var(--status-danger)' : '#1d4ed8',
            border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : notification.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {notification.type === 'success' && <CheckCircle2 size={18} />}
            {notification.type === 'error' && <AlertCircle size={18} />}
            {notification.type === 'info' && <RefreshCw size={18} className="animate-spin" />}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ color: 'inherit', padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: 'var(--brand-green-muted)',
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <CreditCard size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Expenses &amp; Outflow Management
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Track disbursements, vendor payments, approval workflows, and audit-compliant expenditures
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportCSV}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Download size={16} />
            Export CSV
          </button>

          {canManage && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                background: 'var(--brand-green)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: 'var(--shadow-sm)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              Record Expense
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        {/* Approved Outflow */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Approved Outflow (INR)
            </span>
            <CheckCheck size={18} style={{ color: 'var(--status-success)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-success)', marginTop: 4 }}>
            ₹{primaryApproved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {summary?.statusCounts?.approved || 0} approved records
          </div>
        </div>

        {/* Pending Approval */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Pending Approval (INR)
            </span>
            <Clock size={18} style={{ color: 'var(--status-warning)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-warning)', marginTop: 4 }}>
            ₹{primaryPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {summary?.statusCounts?.pending || 0} awaiting dual authorization
          </div>
        </div>

        {/* Total Gross Recorded */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Total Gross Expenses
            </span>
            <TrendingUp size={18} style={{ color: '#2563eb' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
            ₹{primaryGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {summary?.statusCounts?.total || 0} lifetime expense claims
          </div>
        </div>

        {/* Rejected / Audited */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Rejected / Audited
            </span>
            <XCircle size={18} style={{ color: 'var(--status-danger)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-danger)', marginTop: 4 }}>
            {summary?.statusCounts?.rejected || 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Disallowed with documented justification
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Bar */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, expense #, vendor, or invoice..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.875rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div style={{ minWidth: 160 }}>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Categories</option>
              <option value="operational">Operational &amp; Overhead</option>
              <option value="program">Program Implementation</option>
              <option value="salary">Staff Salaries &amp; Stipends</option>
              <option value="supplies">Supplies, Kits &amp; Materials</option>
              <option value="education">Education &amp; Training</option>
              <option value="healthcare">Healthcare &amp; Medical Relief</option>
              <option value="utilities">Utilities</option>
              <option value="rent">Rent</option>
              <option value="travel">Travel &amp; Transport</option>
              <option value="fundraising">Fundraising &amp; Events</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: 150 }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div style={{ minWidth: 160 }}>
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Payment Methods</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI / QR</option>
              <option value="cheque">Cheque</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => {
              fetchExpenses();
              loadSummary();
            }}
            disabled={loading}
            title="Refresh List"
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <ExpenseTable
          expenses={expenses}
          loading={loading}
          userRole={userRole}
          currentUserId={currentUserId}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onView={handleOpenDetails}
          onEdit={handleOpenEdit}
          onApprove={handleOpenApprove}
          onReject={handleOpenReject}
          onDelete={handleOpenDelete}
        />

        {/* Pagination Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <span>
            Showing <strong>{expenses.length}</strong> of <strong>{pagination.totalExpenses || 0}</strong> expense records (Page <strong>{pagination.currentPage || 1}</strong> of <strong>{pagination.totalPages || 1}</strong>)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>

            <button
              type="button"
              className="btn btn-outline"
              disabled={!pagination.hasPrevPage || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: pagination.hasPrevPage ? 1 : 0.4,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: pagination.hasPrevPage ? 'pointer' : 'default'
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={!pagination.hasNextPage || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: pagination.hasNextPage ? 1 : 0.4,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: pagination.hasNextPage ? 'pointer' : 'default'
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExpenseForm
        isOpen={isFormOpen}
        mode={formMode}
        expense={expenseToEdit}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <ExpenseDetails
        isOpen={isDetailsOpen}
        expense={selectedExpense}
        auditLogs={selectedAuditLogs}
        userRole={userRole}
        currentUserId={currentUserId}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={handleOpenEdit}
        onApprove={handleOpenApprove}
        onReject={handleOpenReject}
      />

      <ExpenseActionModal
        isOpen={actionModalOpen}
        actionType={actionType}
        expense={actionExpense}
        currentUserId={currentUserId}
        onClose={() => setActionModalOpen(false)}
        onConfirm={handleExecuteAction}
      />
    </div>
  );
}

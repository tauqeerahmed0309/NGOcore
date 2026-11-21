import React, { useState, useEffect, useCallback } from 'react';
import {
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
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import donationService from './donationService';
import DonationTable from './DonationTable';
import DonationForm from './DonationForm';
import DonationDetails from './DonationDetails';
import DonationActionModal from './DonationActionModal';

export default function DonationManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'staff';
  const currentUserId = currentUser?._id || currentUser?.id;
  const canManage = userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff';

  // Data state
  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    totalDonations: 0,
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
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [donationToEdit, setDonationToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState([]);

  // Action Dialog state (Verify, Approve, Reverse/Cancel)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [actionDonation, setActionDonation] = useState(null);

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
      const res = await donationService.getDonationSummary();
      const payload = res?.data || res;
      setSummary(payload?.data || payload);
    } catch (err) {
      console.error('Failed to load donation summary:', err);
    }
  }, []);

  // Fetch Donations
  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (paymentMethodFilter !== 'all') params.paymentMethod = paymentMethodFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (currencyFilter !== 'all') params.currency = currencyFilter;
      if (typeFilter !== 'all') params.donationType = typeFilter;

      const res = await donationService.getDonations(params);
      const payload = res?.data || res;
      const dataObj = payload?.data || payload;
      const donationsList = dataObj?.donations || (Array.isArray(dataObj) ? dataObj : []);
      setDonations(donationsList);
      if (dataObj?.pagination) {
        setPagination(dataObj.pagination);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err?.message || err?.response?.data?.message || 'Failed to fetch donations list.'
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, debouncedSearch, paymentMethodFilter, categoryFilter, statusFilter, currencyFilter, typeFilter]);

  useEffect(() => {
    fetchDonations();
    loadSummary();
  }, [fetchDonations, loadSummary]);

  // Notification helper
  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Sort Handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setPaymentMethodFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setCurrencyFilter('all');
    setTypeFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  // Form Submissions (Create / Edit)
  const handleFormSubmit = async (formData) => {
    if (formMode === 'create') {
      const res = await donationService.createDonation(formData);
      const payload = res?.data || res;
      const dNum = payload?.donation?.donationNumber || payload?.data?.donation?.donationNumber || '';
      showToast('success', `Donation ${dNum} recorded successfully.`);
    } else if (donationToEdit) {
      const res = await donationService.updateDonation(donationToEdit._id, formData);
      const payload = res?.data || res;
      const dNum = payload?.donation?.donationNumber || payload?.data?.donation?.donationNumber || '';
      showToast('success', `Donation ${dNum} updated successfully.`);
    }
    fetchDonations();
    loadSummary();
  };

  // View Details
  const handleViewDetails = async (donation) => {
    try {
      const res = await donationService.getDonationById(donation._id);
      const payload = res?.data || res;
      const dataObj = payload?.data || payload;
      setSelectedDonation(dataObj?.donation || dataObj);
      setSelectedAuditLogs(dataObj?.auditLogs || []);
      setIsDetailsOpen(true);
    } catch {
      setSelectedDonation(donation);
      setSelectedAuditLogs([]);
      setIsDetailsOpen(true);
    }
  };

  // Open Edit Form
  const handleEdit = (donation) => {
    setDonationToEdit(donation);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  // Open Action Modal (Verify / Approve / Reverse / Cancel)
  const handleOpenAction = (donation, type) => {
    setActionDonation(donation);
    setActionType(type);
    setActionModalOpen(true);
  };

  // Confirm Action execution
  const handleConfirmAction = async (type, donation, reason) => {
    if (type === 'verify') {
      await donationService.verifyDonation(donation._id);
      showToast('success', `Donation ${donation.donationNumber} verified successfully.`);
    } else if (type === 'approve') {
      await donationService.approveDonation(donation._id);
      showToast('success', `Donation ${donation.donationNumber} approved. Official receipt can now be issued.`);
    } else if (type === 'reverse' || type === 'cancel') {
      await donationService.reverseDonation(donation._id, reason);
      showToast('success', `Donation ${donation.donationNumber} marked as ${type === 'reverse' ? 'reversed' : 'cancelled'}.`);
    }

    if (isDetailsOpen && selectedDonation?._id === donation._id) {
      // Refresh details modal
      const res = await donationService.getDonationById(donation._id);
      const payload = res?.data || res;
      const dataObj = payload?.data || payload;
      setSelectedDonation(dataObj?.donation || dataObj);
      setSelectedAuditLogs(dataObj?.auditLogs || []);
    }

    fetchDonations();
    loadSummary();
  };

  // Download Receipt PDF (issues receipt first via POST if not already allocated)
  const handleDownloadReceipt = async (donation) => {
    try {
      let currentReceiptNumber = donation.receiptNumber;

      // If receipt is not yet issued, issue it first via state-mutating POST endpoint
      if (!currentReceiptNumber) {
        showToast('info', `Issuing official receipt for ${donation.donationNumber}...`);
        const issueRes = await donationService.issueReceipt(donation._id);
        const issuePayload = issueRes?.data || issueRes;
        currentReceiptNumber = issuePayload?.receiptNumber || issuePayload?.data?.receiptNumber;
        showToast('success', `Receipt ${currentReceiptNumber || ''} issued successfully.`);
        if (selectedDonation?._id === donation._id) {
          const detailRes = await donationService.getDonationById(donation._id);
          const detailPayload = detailRes?.data || detailRes;
          const dataObj = detailPayload?.data || detailPayload;
          setSelectedDonation(dataObj?.donation || dataObj);
          setSelectedAuditLogs(dataObj?.auditLogs || []);
        }
        fetchDonations();
        loadSummary();
      }

      showToast('info', `Generating receipt PDF for ${donation.donationNumber}...`);
      await donationService.downloadReceiptPdf(donation._id, currentReceiptNumber || `Receipt-${donation.donationNumber}`);
      showToast('success', `Receipt downloaded successfully.`);
    } catch (err) {
      showToast('error', err?.message || err?.response?.data?.message || 'Failed to download receipt PDF.');
    }
  };

  // Export dataset
  const handleExport = async (format) => {
    try {
      showToast('info', `Preparing ${format.toUpperCase()} export...`);
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (paymentMethodFilter !== 'all') params.paymentMethod = paymentMethodFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (currencyFilter !== 'all') params.currency = currencyFilter;
      if (typeFilter !== 'all') params.donationType = typeFilter;

      await donationService.exportDonations(format, params);
      showToast('success', `Donations exported in ${format.toUpperCase()} successfully.`);
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Failed to export donations dataset.');
    }
  };

  // Currency summary calculations
  const currencyTotals = summary?.byCurrency || [];
  const primaryTotal = currencyTotals.find((c) => c.currency === 'INR') || currencyTotals[0] || {
    currency: 'INR',
    grossAmount: 0,
    netAmount: 0,
    count: 0
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor:
              notification.type === 'success'
                ? 'var(--status-success-bg)'
                : notification.type === 'info'
                ? 'rgba(59, 130, 246, 0.1)'
                : 'var(--status-danger-bg)',
            border: `1px solid ${
              notification.type === 'success'
                ? '#bbf7d0'
                : notification.type === 'info'
                ? '#bfdbfe'
                : '#fecaca'
            }`,
            color:
              notification.type === 'success'
                ? 'var(--status-success)'
                : notification.type === 'info'
                ? 'var(--status-info)'
                : 'var(--status-danger)',
            fontSize: '0.875rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginLeft: 8 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Donations & Receipts
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4, marginBottom: 0 }}>
            Record monetary and in-kind contributions, manage approvals, and issue official PDF receipts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Refresh */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              fetchDonations();
              loadSummary();
            }}
            title="Refresh records"
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleExport('csv')}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.85rem'
              }}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Record Donation CTA */}
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setFormMode('create');
                setDonationToEdit(null);
                setIsFormOpen(true);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              <span>Record Donation</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        {/* Total Collected (Net) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '18px 20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Net Collected ({primaryTotal.currency})
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <TrendingUp size={18} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>
            {primaryTotal.currency === 'INR' ? '₹' : '$'}
            {Number(primaryTotal.netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Gross: {Number(primaryTotal.grossAmount || 0).toLocaleString()} across {primaryTotal.count || 0} active records
          </div>
        </div>

        {/* Approved Count */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '18px 20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Approved & Receipts
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                backgroundColor: 'var(--status-success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCheck size={18} color="var(--status-success)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-success)', marginTop: 8 }}>
            {summary?.counts?.approved || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {summary?.counts?.receiptsIssued || 0} official receipts generated
          </div>
        </div>

        {/* Pending Review */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '18px 20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pending Review
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                backgroundColor: 'var(--status-warning-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Clock size={18} color="var(--status-warning)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-warning)', marginTop: 8 }}>
            {summary?.counts?.pending || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {summary?.counts?.verified || 0} verified, awaiting approval
          </div>
        </div>

        {/* Cancelled / Reversed */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '18px 20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Reversed / Cancelled
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                backgroundColor: 'var(--status-danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RotateCcw size={18} color="var(--status-danger)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-danger)', marginTop: 8 }}>
            {(summary?.counts?.reversed || 0) + (summary?.counts?.cancelled || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Full audit justification preserved
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search donor name, donation #, receipt #, UTR..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => {
              setPaymentMethodFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Payment Methods</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="online_card">Card</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Categories</option>
            <option value="general">General Fund</option>
            <option value="education">Education</option>
            <option value="healthcare">Healthcare</option>
            <option value="disaster_relief">Disaster Relief</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="livelihood">Livelihood</option>
            <option value="other">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="approved">Approved</option>
            <option value="reversed">Reversed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => {
              setCurrencyFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Currencies</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>

          {/* Clear Filters */}
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleResetFilters}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main Donation Table */}
      <DonationTable
        donations={donations}
        loading={loading}
        currentUser={currentUser}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onVerify={(d) => handleOpenAction(d, 'verify')}
        onApprove={(d) => handleOpenAction(d, 'approve')}
        onReverse={(d, type) => handleOpenAction(d, type)}
        onDownloadReceipt={handleDownloadReceipt}
      />

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 18,
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: '0.85rem',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ color: 'var(--text-secondary)' }}>
            Showing <strong>{(page - 1) * limit + 1}</strong> to{' '}
            <strong>{Math.min(page * limit, pagination.totalDonations)}</strong> of{' '}
            <strong>{pagination.totalDonations}</strong> donation records
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                opacity: pagination.hasPrevPage ? 1 : 0.5
              }}
            >
              <ChevronLeft size={15} /> Prev
            </button>
            <span style={{ padding: '0 6px', color: 'var(--text-primary)', fontWeight: 600 }}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNextPage}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                opacity: pagination.hasNextPage ? 1 : 0.5
              }}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <DonationForm
        isOpen={isFormOpen}
        mode={formMode}
        donation={donationToEdit}
        onClose={() => {
          setIsFormOpen(false);
          setDonationToEdit(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Details View Modal */}
      <DonationDetails
        isOpen={isDetailsOpen}
        donation={selectedDonation}
        auditLogs={selectedAuditLogs}
        currentUser={currentUser}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedDonation(null);
          setSelectedAuditLogs([]);
        }}
        onVerify={(d) => handleOpenAction(d, 'verify')}
        onApprove={(d) => handleOpenAction(d, 'approve')}
        onReverse={(d, type) => handleOpenAction(d, type)}
        onEdit={handleEdit}
        onDownloadReceipt={handleDownloadReceipt}
      />

      {/* Action Confirmation Modal (Verify / Approve / Reverse / Cancel) */}
      <DonationActionModal
        isOpen={actionModalOpen}
        actionType={actionType}
        donation={actionDonation}
        currentUserId={currentUserId}
        currentUserRole={userRole}
        onClose={() => {
          setActionModalOpen(false);
          setActionDonation(null);
          setActionType(null);
        }}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake,
  UserPlus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import donorService from './donorService';
import DonorTable from './DonorTable';
import DonorForm from './DonorForm';
import DonorDetails from './DonorDetails';

export default function DonorManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'staff';
  const canManage = userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff';

  // Data state
  const [donors, setDonors] = useState([]);
  const [pagination, setPagination] = useState({
    totalDonors: 0,
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
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [donorToEdit, setDonorToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donorAuditLogs, setDonorAuditLogs] = useState([]);
  const [donorDonations, setDonorDonations] = useState([]);

  // Status Change Dialog State
  const [statusDialogDonor, setStatusDialogDonor] = useState(null);
  const [targetStatus, setTargetStatus] = useState('archived');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Delete Dialog State
  const [deleteDialogDonor, setDeleteDialogDonor] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch donors list
  const fetchDonors = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy,
        sortOrder
      };

      const res = await donorService.getDonors(params);
      if (res.success && res.data) {
        setDonors(res.data.donors || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to retrieve donor records'
      });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, typeFilter, categoryFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  // Handle open view details
  const handleViewDetails = async (donor) => {
    setSelectedDonor(donor);
    setIsDetailsOpen(true);
    try {
      const res = await donorService.getDonorById(donor._id || donor.id);
      const payload = res?.data?.data || res?.data || res;
      if (payload?.donor) {
        setSelectedDonor(payload.donor);
        setDonorAuditLogs(payload.auditLogs || []);
        setDonorDonations(payload.donations || []);
      }
    } catch (err) {
      // Non-blocking fallback to table donor data
      console.warn('Could not load detailed audit history:', err.message);
      setDonorDonations([]);
    }
  };

  // Handle open create form
  const handleOpenCreate = () => {
    setDonorToEdit(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  // Handle open edit form
  const handleOpenEdit = (donor) => {
    setDonorToEdit(donor);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  // Handle status update submission
  const handleConfirmStatusChange = async () => {
    if (!statusDialogDonor) return;
    setStatusSubmitting(true);
    try {
      const res = await donorService.updateStatus(statusDialogDonor._id || statusDialogDonor.id, targetStatus);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Donor '${statusDialogDonor.name}' status updated to ${targetStatus}.`
        });
        setStatusDialogDonor(null);
        fetchDonors();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update donor status'
      });
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!deleteDialogDonor) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      const res = await donorService.deleteDonor(deleteDialogDonor._id || deleteDialogDonor.id);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Donor '${deleteDialogDonor.name}' deleted successfully.`
        });
        setDeleteDialogDonor(null);
        fetchDonors();
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete donor.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Stats calculation
  const totalCount = pagination.totalDonors || donors.length;
  const activeCount = donors.filter((d) => d.status === 'active').length;
  const indivCount = donors.filter((d) => d.type === 'individual').length;
  const orgCount = donors.filter((d) => d.type === 'organization').length;

  return (
    <div className="feature-page-container" style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
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
                justifyContent: 'center'
              }}
            >
              <HeartHandshake size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Donor Management
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Maintain profiles for individual patrons, institutional foundations, and corporate CSR partners
              </p>
            </div>
          </div>
        </div>

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
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <UserPlus size={16} />
            Add New Donor
          </button>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: notification.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
            color: notification.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)',
            border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ color: 'inherit', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Donors
          </span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {totalCount}
          </h3>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Active Supporter Base
          </span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-success)', marginTop: 4 }}>
            {activeCount}
          </h3>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Individual Patrons
          </span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
            {indivCount}
          </h3>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Institutional / Corporate
          </span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#7c3aed', marginTop: 4 }}>
            {orgCount}
          </h3>
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
              placeholder="Search by donor name, ID, email, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.875rem'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div style={{ minWidth: 150 }}>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)'
              }}
            >
              <option value="all">All Types</option>
              <option value="individual">Individual</option>
              <option value="organization">Organization</option>
            </select>
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
                background: 'var(--bg-surface)'
              }}
            >
              <option value="all">All Categories</option>
              <option value="individual">Individual Donor</option>
              <option value="corporate">Corporate Partner</option>
              <option value="foundation">Foundation</option>
              <option value="major_donor">Major Donor</option>
              <option value="regular">Regular Contributor</option>
              <option value="grant_maker">Grant Maker</option>
              <option value="patron">Patron</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: 140 }}>
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
                background: 'var(--bg-surface)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div style={{ minWidth: 160 }}>
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)'
              }}
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="name:asc">Name (A-Z)</option>
              <option value="name:desc">Name (Z-A)</option>
              <option value="donorNumber:asc">Donor ID</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchDonors}
            disabled={loading}
            title="Refresh List"
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <DonorTable
          donors={donors}
          loading={loading}
          currentUserRole={userRole}
          onView={handleViewDetails}
          onEdit={handleOpenEdit}
          onChangeStatus={(donor, newStatus) => {
            setStatusDialogDonor(donor);
            setTargetStatus(newStatus);
          }}
          onDelete={(donor) => {
            setDeleteDialogDonor(donor);
            setDeleteError('');
          }}
        />

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}
          >
            <span>
              Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalDonors} total donors)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={!pagination.hasPrevPage || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  opacity: pagination.hasPrevPage ? 1 : 0.4
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
                  opacity: pagination.hasNextPage ? 1 : 0.4
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      {isFormOpen && (
        <DonorForm
          isOpen={isFormOpen}
          mode={formMode}
          donorToEdit={donorToEdit}
          onClose={() => setIsFormOpen(false)}
          onSuccess={(msg) => {
            setNotification({ type: 'success', message: msg });
            fetchDonors();
          }}
        />
      )}

      {isDetailsOpen && (
        <DonorDetails
          isOpen={isDetailsOpen}
          donor={selectedDonor}
          auditLogs={donorAuditLogs}
          donations={donorDonations}
          currentUserRole={userRole}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedDonor(null);
          }}
          onEdit={(donor) => {
            setIsDetailsOpen(false);
            handleOpenEdit(donor);
          }}
          onChangeStatus={(donor, newStatus) => {
            setIsDetailsOpen(false);
            setStatusDialogDonor(donor);
            setTargetStatus(newStatus);
          }}
        />
      )}

      {/* Status Change Confirmation Modal */}
      {statusDialogDonor && (
        <div className="modal-overlay" onClick={() => setStatusDialogDonor(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Confirm Status Change
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Are you sure you want to change the status of donor{' '}
              <strong>{statusDialogDonor.name}</strong> ({statusDialogDonor.donorNumber}) to{' '}
              <strong style={{ textTransform: 'capitalize' }}>{targetStatus}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStatusDialogDonor(null)}
                disabled={statusSubmitting}
                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmStatusChange}
                disabled={statusSubmitting}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  background: targetStatus === 'archived' ? '#475569' : 'var(--brand-green)',
                  color: '#fff',
                  fontWeight: 600
                }}
              >
                {statusSubmitting ? 'Updating...' : `Confirm ${targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDialogDonor && (
        <div className="modal-overlay" onClick={() => setDeleteDialogDonor(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--status-danger)', marginBottom: 8 }}>
              Permanently Delete Donor
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Are you sure you want to permanently delete donor{' '}
              <strong>{deleteDialogDonor.name}</strong> ({deleteDialogDonor.donorNumber})?
            </p>

            {deleteError && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  borderRadius: 6,
                  backgroundColor: 'var(--status-danger-bg)',
                  color: 'var(--status-danger)',
                  fontSize: '0.85rem',
                  border: '1px solid #fecaca'
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteDialogDonor(null)}
                disabled={deleteSubmitting}
                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  background: 'var(--status-danger)',
                  color: '#fff',
                  fontWeight: 600
                }}
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

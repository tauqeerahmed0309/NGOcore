import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Award,
  Users,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import volunteerService from './volunteerService';
import VolunteerTable from './VolunteerTable';
import VolunteerForm from './VolunteerForm';
import VolunteerDetails from './VolunteerDetails';
import LogHoursModal from './LogHoursModal';

export default function VolunteerManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'staff';
  const canManage = userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff';

  // Data state
  const [volunteers, setVolunteers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    totalVolunteers: 0,
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [volunteerToEdit, setVolunteerToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState([]);

  const [isLogHoursOpen, setIsLogHoursOpen] = useState(false);
  const [volunteerForHours, setVolunteerForHours] = useState(null);

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [volunteerToArchive, setVolunteerToArchive] = useState(null);

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
      const res = await volunteerService.getVolunteerSummary();
      const payload = res?.data || res;
      if (res?.success || payload?.statusCounts) {
        setSummary(payload.data || payload);
      }
    } catch (err) {
      console.error('Failed to load volunteer summary:', err);
    }
  }, []);

  // Fetch Volunteers
  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (availabilityFilter !== 'all') params.availability = availabilityFilter;
      if (skillFilter.trim()) params.skill = skillFilter.trim();

      const res = await volunteerService.getVolunteers(params);
      const payload = res?.data || res;
      if (res?.success || payload?.volunteers) {
        setVolunteers(payload.volunteers || payload.data?.volunteers || []);
        setPagination(payload.pagination || payload.data?.pagination || {});
      }
    } catch (err) {
      console.error('Failed to fetch volunteers:', err);
      showNotification('error', 'Failed to load volunteer roster.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, debouncedSearch, statusFilter, availabilityFilter, skillFilter]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setVolunteerToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (volunteer) => {
    setFormMode('edit');
    setVolunteerToEdit(volunteer);
    setIsDetailsOpen(false);
    setIsFormOpen(true);
  };

  const handleOpenDetails = async (volunteer) => {
    try {
      const res = await volunteerService.getVolunteerById(volunteer._id);
      const payload = res?.data || res;
      if (res?.success || payload?.volunteer) {
        setSelectedVolunteer(payload.volunteer || payload);
        setSelectedAuditLogs(payload.auditLogs || []);
        setIsDetailsOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch volunteer profile:', err);
      showNotification('error', 'Failed to retrieve volunteer profile.');
    }
  };

  const handleOpenLogHours = (volunteer) => {
    setVolunteerForHours(volunteer);
    setIsLogHoursOpen(true);
  };

  const handleLogHoursSubmit = async (volunteerId, logData) => {
    await volunteerService.logHours(volunteerId, logData);
    showNotification('success', 'Service hours submitted for review.');
    fetchVolunteers();
    loadSummary();
    if (selectedVolunteer && selectedVolunteer._id === volunteerId) {
      handleOpenDetails(selectedVolunteer);
    }
  };

  const handleReviewHours = async (volunteerId, logId, reviewData) => {
    await volunteerService.reviewHours(volunteerId, logId, reviewData);
    showNotification(
      'success',
      `Hours entry ${reviewData.status === 'approved' ? 'approved' : 'rejected'}.`
    );
    fetchVolunteers();
    loadSummary();
    if (selectedVolunteer && selectedVolunteer._id === volunteerId) {
      handleOpenDetails(selectedVolunteer);
    }
  };

  const handleFormSubmit = async (formData) => {
    if (formMode === 'create') {
      await volunteerService.createVolunteer(formData);
      showNotification('success', 'Volunteer registered successfully.');
    } else {
      await volunteerService.updateVolunteer(volunteerToEdit._id, formData);
      showNotification('success', 'Volunteer profile updated.');
    }
    fetchVolunteers();
    loadSummary();
  };

  const handleOpenArchive = (volunteer) => {
    setVolunteerToArchive(volunteer);
    setArchiveModalOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!volunteerToArchive) return;
    try {
      await volunteerService.deleteVolunteer(volunteerToArchive._id);
      showNotification('success', 'Volunteer record archived cleanly.');
      setArchiveModalOpen(false);
      setVolunteerToArchive(null);
      fetchVolunteers();
      loadSummary();
      setIsDetailsOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to archive volunteer';
      showNotification('error', msg);
    }
  };

  const handleExportCSV = async () => {
    try {
      showNotification('info', 'Preparing CSV export...');
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (availabilityFilter !== 'all') params.availability = availabilityFilter;

      const res = await volunteerService.exportVolunteers(params);
      const blob = res instanceof Blob ? res : new Blob([res?.data || res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `volunteers_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification('success', 'Volunteer CSV downloaded.');
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('error', 'Failed to generate volunteer CSV.');
    }
  };

  const activeCount = summary?.statusCounts?.active || 0;
  const totalApprovedHours = summary?.totalApprovedHours || 0;
  const pendingReviewsCount = summary?.hoursMetrics?.pendingCount || 0;
  const totalVolunteers = summary?.statusCounts?.total || 0;

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
              <UserCheck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Volunteer Management &amp; Engagement
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Coordinate volunteers, track verified service hours, match skills, and manage program assignments
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
              Register Volunteer
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
        {/* Active Volunteers */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Active Volunteers
            </span>
            <Users size={18} style={{ color: 'var(--status-success)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-success)', marginTop: 4 }}>
            {activeCount}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Out of {totalVolunteers} registered members
          </div>
        </div>

        {/* Total Service Hours */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Total Approved Hours
            </span>
            <Award size={18} style={{ color: '#2563eb' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
            {totalApprovedHours} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>hrs</span>
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Verified community impact time
          </div>
        </div>

        {/* Pending Hours Review */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Hours Awaiting Review
            </span>
            <Clock size={18} style={{ color: 'var(--status-warning)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-warning)', marginTop: 4 }}>
            {pendingReviewsCount} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>logs</span>
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Awaiting coordinator verification
          </div>
        </div>

        {/* On Leave / Inactive */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              On Leave / Standby
            </span>
            <Calendar size={18} style={{ color: '#7c3aed' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#7c3aed', marginTop: 4 }}>
            {summary?.statusCounts?.on_leave || 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Available for future program cycles
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
              placeholder="Search by name, ID, email, or skill..."
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

          {/* Status Filter */}
          <div style={{ minWidth: 160 }}>
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
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div style={{ minWidth: 160 }}>
            <select
              value={availabilityFilter}
              onChange={(e) => {
                setAvailabilityFilter(e.target.value);
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
              <option value="all">All Schedules</option>
              <option value="weekends">Weekends Only</option>
              <option value="weekdays">Weekdays</option>
              <option value="flexible">Flexible</option>
              <option value="evenings">Evenings</option>
              <option value="full_time">Full Time</option>
            </select>
          </div>

          {/* Skill Filter */}
          <div style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              value={skillFilter}
              onChange={(e) => {
                setSkillFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by skill (e.g. teaching, first_aid)"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => {
              fetchVolunteers();
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
        <VolunteerTable
          volunteers={volunteers}
          loading={loading}
          userRole={userRole}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onView={handleOpenDetails}
          onLogHours={handleOpenLogHours}
          onEdit={handleOpenEdit}
          onDelete={handleOpenArchive}
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
            Showing <strong>{volunteers.length}</strong> of <strong>{pagination.totalVolunteers || 0}</strong> volunteers (Page <strong>{pagination.currentPage || 1}</strong> of <strong>{pagination.totalPages || 1}</strong>)
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
      <VolunteerForm
        isOpen={isFormOpen}
        mode={formMode}
        volunteer={volunteerToEdit}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <VolunteerDetails
        isOpen={isDetailsOpen}
        volunteer={selectedVolunteer}
        auditLogs={selectedAuditLogs}
        userRole={userRole}
        onClose={() => setIsDetailsOpen(false)}
        onOpenLogHours={handleOpenLogHours}
        onReviewHours={handleReviewHours}
      />

      <LogHoursModal
        isOpen={isLogHoursOpen}
        volunteer={volunteerForHours}
        onClose={() => setIsLogHoursOpen(false)}
        onSubmit={handleLogHoursSubmit}
      />

      {/* Archive Confirmation Dialog */}
      {archiveModalOpen && volunteerToArchive && (
        <div className="modal-overlay" onClick={() => setArchiveModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Archive Volunteer Record
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Are you sure you want to archive <strong>{volunteerToArchive.name}</strong> ({volunteerToArchive.volunteerNumber})?
              The record will be soft-deleted, preserving historical hours logs and audit records.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setArchiveModalOpen(false)}
                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleArchiveConfirm}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  background: 'var(--status-danger)',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Archive Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

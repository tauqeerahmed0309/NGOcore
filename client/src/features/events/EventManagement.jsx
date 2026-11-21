import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import eventService from './eventService';
import EventTable from './EventTable';
import EventForm from './EventForm';
import EventDetails from './EventDetails';
import EventAttendeeModal from './EventAttendeeModal';

export default function EventManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'staff';
  const isAdmin = userRole === 'admin' || userRole === 'ngo_admin';
  const isStaff = userRole === 'staff';

  // Data state
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 10
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const [isAttendeeModalOpen, setIsAttendeeModalOpen] = useState(false);
  const [selectedAttendeeEvent, setSelectedAttendeeEvent] = useState(null);

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [eventToArchive, setEventToArchive] = useState(null);

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current));
    }, 4000);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      const res = await eventService.getEventSummary();
      const payload = res?.data?.data || res?.data || res;
      setSummary(payload || null);
    } catch (err) {
      console.error('Failed to load event summary:', err);
    }
  }, []);

  // Fetch events list
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        status: statusFilter,
        category: categoryFilter,
        search: debouncedSearch.trim() || undefined
      };
      const res = await eventService.getEvents(params);
      const payload = res?.data?.data || res?.data || res;
      setEvents(payload?.events || (Array.isArray(payload) ? payload : []));
      setPagination(payload?.pagination || { total: 0, totalPages: 1, page: 1, limit: 10 });
    } catch (err) {
      console.error('Failed to fetch events:', err);
      showNotification('error', 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, categoryFilter, debouncedSearch, showNotification]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Handle open actions
  const handleOpenCreate = () => {
    setEventToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (evt) => {
    setEventToEdit(evt);
    setIsFormOpen(true);
  };

  const handleOpenDetails = (id) => {
    setSelectedEventId(id);
    setIsDetailsOpen(true);
  };

  const handleOpenAttendees = (evt) => {
    setSelectedAttendeeEvent(evt);
    setIsAttendeeModalOpen(true);
  };

  const handleOpenArchive = (id, title) => {
    setEventToArchive({ id, title });
    setArchiveModalOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!eventToArchive) return;
    try {
      await eventService.deleteEvent(eventToArchive.id);
      showNotification('success', `Event "${eventToArchive.title}" archived successfully.`);
      setArchiveModalOpen(false);
      setEventToArchive(null);
      fetchEvents();
      loadSummary();
    } catch (err) {
      console.error('Failed to archive event:', err);
      showNotification('error', 'Failed to archive event.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await eventService.exportEvents({
        status: statusFilter,
        category: categoryFilter,
        search: debouncedSearch.trim() || undefined
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `events_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('success', 'Events exported to CSV successfully.');
    } catch (err) {
      console.error('Failed to export events CSV:', err);
      showNotification('error', 'Failed to export events.');
    }
  };

  return (
    <div className="feature-page-container" style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: notification.type === 'error' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
            color: notification.type === 'error' ? 'var(--status-danger)' : 'var(--status-success)',
            border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
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
              <Calendar size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Events &amp; Camps
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Plan, organize, track attendance, and manage community outreach events and workshops
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportCsv}
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

          {(isAdmin || isStaff) && (
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
              Schedule Event
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
        {/* Total Events */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Total Events
            </span>
            <Calendar size={18} style={{ color: 'var(--brand-green)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {summary?.totalEvents ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            All scheduled activities
          </div>
        </div>

        {/* Upcoming */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Upcoming
            </span>
            <Clock size={18} style={{ color: '#2563eb' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
            {summary?.upcomingCount ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Awaiting execution
          </div>
        </div>

        {/* Registered */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Registered
            </span>
            <Users size={18} style={{ color: 'var(--status-warning)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-warning)', marginTop: 4 }}>
            {summary?.totalRegisteredAttendees ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Enrolled participants
          </div>
        </div>

        {/* Verified Check-Ins */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Verified Check-Ins
            </span>
            <CheckCircle size={18} style={{ color: 'var(--status-success)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-success)', marginTop: 4 }}>
            {summary?.totalCheckedInAttendees ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Physical attendance recorded
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
          {/* Search */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search by title, event #, venue, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ minWidth: 180 }}>
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
              <option value="workshop">Workshop / Seminar</option>
              <option value="health_camp">Health &amp; Medical Camp</option>
              <option value="fundraiser">Fundraising Event</option>
              <option value="distribution">Supply / Relief Distribution</option>
              <option value="training">Skill Training Session</option>
              <option value="community_outreach">Community Outreach</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => {
              fetchEvents();
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
        <EventTable
          events={events}
          isAdmin={isAdmin}
          isStaff={isStaff}
          onView={handleOpenDetails}
          onEdit={handleOpenEdit}
          onManageAttendees={handleOpenAttendees}
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
            Showing <strong>{events.length}</strong> of <strong>{pagination.total || 0}</strong> events (Page <strong>{pagination.page || 1}</strong> of <strong>{pagination.totalPages || 1}</strong>)
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
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: pagination.page > 1 ? 1 : 0.4,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: pagination.page > 1 ? 'pointer' : 'default'
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: pagination.page < pagination.totalPages ? 1 : 0.4,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: pagination.page < pagination.totalPages ? 'pointer' : 'default'
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EventForm
        isOpen={isFormOpen}
        event={eventToEdit}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => {
          fetchEvents();
          loadSummary();
        }}
        showNotification={showNotification}
      />

      <EventDetails
        isOpen={isDetailsOpen}
        eventId={selectedEventId}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={(evt) => {
          setIsDetailsOpen(false);
          handleOpenEdit(evt);
        }}
        onManageAttendees={(evt) => {
          setIsDetailsOpen(false);
          handleOpenAttendees(evt);
        }}
        showNotification={showNotification}
      />

      <EventAttendeeModal
        isOpen={isAttendeeModalOpen}
        event={selectedAttendeeEvent}
        onClose={() => setIsAttendeeModalOpen(false)}
        onUpdated={() => {
          fetchEvents();
          loadSummary();
        }}
        showNotification={showNotification}
      />

      {/* Archive Modal */}
      {archiveModalOpen && eventToArchive && (
        <div className="modal-overlay" onClick={() => setArchiveModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Archive Event
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Are you sure you want to archive "{eventToArchive.title}"? The event will be soft-deleted
              and set to cancelled, preserving all attendee records and audit history.
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
                Archive Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

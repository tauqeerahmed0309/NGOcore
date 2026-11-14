import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  BookOpen,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import programService from './programService';
import ProgramTable from './ProgramTable';
import ProgramForm from './ProgramForm';
import ProgramDetails from './ProgramDetails';
import DataCleaningPanel from '../../components/common/DataCleaningPanel';
import ProgramOperations from './ProgramOperations';
import { fadeUp } from '../../animations';

const FILTER_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'class', label: 'School Class' },
  { value: 'course', label: 'Course' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'training', label: 'Vocational Training' },
  { value: 'awareness', label: 'Awareness Campaign' },
  { value: 'event', label: 'Community Event' },
  { value: 'camp', label: 'Camp' },
  { value: 'other', label: 'Other' }
];

const FILTER_STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function ProgramManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'volunteer';
  const isAdmin = userRole === 'admin' || userRole === 'ngo_admin';
  const canRunCleaning = isAdmin || userRole === 'staff';
  const isStudent = userRole === 'student';
  const isVolunteer = userRole === 'volunteer';

  // Program list & pagination
  const [programs, setPrograms] = useState([]);
  const tableMotionRef = useRef(null);
  const [pagination, setPagination] = useState({
    totalPrograms: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showDataCleaning, setShowDataCleaning] = useState(false);

  // Search and filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [programToEdit, setProgramToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [programToView, setProgramToView] = useState(null);
  const [programToManage, setProgramToManage] = useState(null);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [studentProgramsPage, setStudentProgramsPage] = useState(1);
  const [studentProgramsPagination, setStudentProgramsPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [studentProgramsLoading, setStudentProgramsLoading] = useState(false);
  const [studentProgramsError, setStudentProgramsError] = useState('');

  useEffect(() => {
    if (!programs.length) return undefined;
    return fadeUp(tableMotionRef.current, { duration: 0.2, distance: 4 });
  }, [programs]);

  // Status Change Dialog State
  const [statusDialogProgram, setStatusDialogProgram] = useState(null);
  const [targetStatus, setTargetStatus] = useState('active');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Safe Delete Dialog State
  const [deleteDialogProgram, setDeleteDialogProgram] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  }, []);

  // Fetch programs from API
  const fetchPrograms = useCallback(async () => {
    if (isStudent) return;

    setLoading(true);
    try {
      const res = await programService.getPrograms({
        page,
        limit: 10,
        search: debouncedSearch,
        type: typeFilter,
        status: statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (res.success && res.data) {
        setPrograms(res.data.programs || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, typeFilter, statusFilter, isStudent, showNotification]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    if (!isStudent) return;
    let active = true;
    setStudentProgramsLoading(true);
    programService.getMyEnrollments({ page: studentProgramsPage, limit: 100 })
      .then((response) => {
        if (active) {
          setMyEnrollments(response.data?.enrollments || []);
          if (response.data?.pagination) setStudentProgramsPagination(response.data.pagination);
        }
      })
      .catch((error) => {
        if (active) setStudentProgramsError(error.message || 'Could not load your enrolled programs.');
      })
      .finally(() => {
        if (active) setStudentProgramsLoading(false);
      });
    return () => { active = false; };
  }, [isStudent, studentProgramsPage]);

  // Handlers for modal openings
  const handleOpenCreate = () => {
    setFormMode('create');
    setProgramToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prog) => {
    setFormMode('edit');
    setProgramToEdit(prog);
    setIsFormOpen(true);
  };

  const handleOpenView = (prog) => {
    setProgramToView(prog);
    setIsDetailsOpen(true);
  };

  const handleOpenStatusDialog = (prog) => {
    setStatusDialogProgram(prog);
    setTargetStatus(prog.status || 'active');
  };

  const handleOpenDeleteDialog = (prog) => {
    setDeleteDialogProgram(prog);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogProgram) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      const progId = deleteDialogProgram._id || deleteDialogProgram.id;
      const res = await programService.deleteProgram(progId);
      if (res.success) {
        showNotification(
          'success',
          `Program [${deleteDialogProgram.code}] deleted successfully.`
        );
        setDeleteDialogProgram(null);
        fetchPrograms();
      }
    } catch (err) {
      setDeleteError(err.message || 'Cannot delete program with existing enrollments or activity history. Pause, cancel, or complete it instead.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialogProgram) return;
    setStatusSubmitting(true);
    try {
      const programId = statusDialogProgram._id || statusDialogProgram.id;
      const res = await programService.updateStatus(programId, targetStatus);
      if (res.success) {
        showNotification(
          'success',
          `Status for program [${statusDialogProgram.code}] updated to ${targetStatus.toUpperCase()}.`
        );
        fetchPrograms();
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to update program status');
    } finally {
      setStatusSubmitting(false);
      setStatusDialogProgram(null);
    }
  };

  // ----------------------------------------------------
  // STUDENT ROLE ACCESS GUARD
  // ----------------------------------------------------
  if (isStudent) {
    return (
      <div className="user-management-page program-student-view-page">
        <div className="page-header">
          <div>
            <div className="title-with-badge">
              <h1 className="page-title">Programs & Activities</h1>
              <span className="badge badge-student">Student Portal</span>
            </div>
            <p className="page-subtitle">
              Your enrolled classes and NGO educational activities
            </p>
          </div>
        </div>

        {studentProgramsError && <div className="alert alert-error" role="alert">{studentProgramsError}</div>}
        {studentProgramsLoading ? <div className="card empty-state-card">Loading your programs…</div> : myEnrollments.length ? (
          <>
            <div className="student-program-grid">
              {myEnrollments.map(({ _id, programId, status, enrolledAt }) => programId && (
                <article className="card student-program-card" key={_id}>
                  <div className="title-with-badge">
                    <h3>{programId.name}</h3>
                    <span className="code-badge">{programId.code}</span>
                  </div>
                  <p>{programId.description || 'Your NGO program'}</p>
                  <dl>
                    <div><dt>Enrollment</dt><dd>{status}</dd></div>
                    <div><dt>Start date</dt><dd>{programId.startDate ? new Date(programId.startDate).toLocaleDateString() : 'Not scheduled'}</dd></div>
                    <div><dt>Schedule</dt><dd>{programId.schedule?.days?.join(', ') || 'To be confirmed'}</dd></div>
                    <div><dt>Location</dt><dd>{programId.location || 'To be confirmed'}</dd></div>
                    <div><dt>Enrolled on</dt><dd>{new Date(enrolledAt).toLocaleDateString()}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
            {studentProgramsPagination.totalPages > 1 && (
              <div className="pagination-bar">
                <div className="pagination-info">
                  Page <strong>{studentProgramsPagination.currentPage}</strong> of{' '}
                  <strong>{studentProgramsPagination.totalPages}</strong> ({studentProgramsPagination.totalItems} programs)
                </div>
                <div className="pagination-controls">
                  <button type="button" className="btn-pagination"
                    disabled={!studentProgramsPagination.hasPrevPage || studentProgramsLoading}
                    onClick={() => setStudentProgramsPage((current) => Math.max(1, current - 1))}>
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button type="button" className="btn-pagination"
                    disabled={!studentProgramsPagination.hasNextPage || studentProgramsLoading}
                    onClick={() => setStudentProgramsPage((current) => current + 1)}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card empty-state-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <BookOpen size={48} className="text-primary" style={{ margin: '0 auto 1rem auto' }} />
            <h3>No programs yet</h3>
            <p style={{ maxWidth: '540px', margin: '0.5rem auto 1.5rem auto', color: 'var(--text-muted)' }}>
              Your NGO coordinator can enroll you in an active program. Enrolled programs and session schedules will appear here.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN / STAFF / VOLUNTEER LIST VIEW
  // ----------------------------------------------------
  return (
    <div className="user-management-page program-management-page">
      {/* Toast Notification */}
      {notification && (
        <div className={`notification-toast alert-${notification.type}`}>
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="flex-shrink-0" />
          )}
          <span>{notification.message}</span>
          <button 
            type="button" 
            onClick={() => setNotification(null)}
            className="toast-close-btn"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="title-with-badge">
            <h1 className="page-title">Programs & Activities</h1>
            <span className={`badge ${isAdmin ? 'badge-admin' : userRole === 'staff' ? 'badge-staff' : 'badge-volunteer'}`}>
              {isAdmin ? 'Organization Admin' : userRole === 'staff' ? 'Staff' : 'Volunteer View'}
            </span>
          </div>
          <p className="page-subtitle">
            Configure dynamic NGO classes, courses, skill training, workshops, and community camps
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={fetchPrograms}
            className="btn-action btn-refresh"
            title="Refresh programs list"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canRunCleaning && (
            <button
              type="button"
              onClick={() => setShowDataCleaning((visible) => !visible)}
              className="btn-action btn-clean-data"
              aria-expanded={showDataCleaning}
            >
              <Sparkles size={16} />
              <span>{showDataCleaning ? 'Hide data review' : 'Clean my data'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-action btn-add-user"
            >
              <Plus size={16} />
              <span>+ Create Program</span>
            </button>
          )}
        </div>
      </div>

      {/* Volunteer Notice if applicable */}
      {isVolunteer && (
        <div className="alert alert-info volunteer-banner">
          <BookOpen size={16} className="flex-shrink-0" />
          <span>
            Volunteer View: You are currently viewing programs where you are an assigned team member. Program creation and modifications are reserved for NGO Administrators.
          </span>
        </div>
      )}

      {/* Control Bar: Search + Filters */}
      <div className="card filters-control-card">
        <div className="filters-grid">
          {/* Search Box */}
          <div className="search-box-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by program name, code, type, category..."
              className="search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="clear-search-btn"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="filter-select-group">
            <label htmlFor="program-type-filter">Type:</label>
            <select
              id="program-type-filter"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              {FILTER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-select-group">
            <label htmlFor="program-status-filter">Status:</label>
            <select
              id="program-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              {FILTER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showDataCleaning && <DataCleaningPanel recordType="programs" onApplied={fetchPrograms} />}

      {/* Program Table Card */}
      <div className="card user-table-card" ref={tableMotionRef}>
        <div className="table-header-bar">
          <div className="table-header-info">
            <Calendar size={19} className="text-primary" />
            <h3>Configured Programs & Curriculum</h3>
            <span className="count-pill">{pagination.totalPrograms} programs</span>
          </div>
        </div>

        <ProgramTable
          programs={programs}
          loading={loading}
          currentUserRole={userRole}
          onView={handleOpenView}
          onEdit={handleOpenEdit}
          onChangeStatus={handleOpenStatusDialog}
          onDelete={isAdmin ? handleOpenDeleteDialog : undefined}
        />

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing page <strong>{pagination.currentPage}</strong> of{' '}
              <strong>{pagination.totalPages}</strong> ({pagination.totalPrograms} total records)
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage || loading}
                className="btn-pagination"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <span className="pagination-page-indicator">
                {pagination.currentPage} / {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNextPage || loading}
                className="btn-pagination"
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Program Modal (Admin only) */}
      {isAdmin && (
        <ProgramForm
          isOpen={isFormOpen}
          mode={formMode}
          programToEdit={programToEdit}
          onClose={() => setIsFormOpen(false)}
          onSuccess={(msg) => {
            showNotification('success', msg);
            fetchPrograms();
          }}
        />
      )}

      {/* Program Details Modal */}
      <ProgramDetails
        isOpen={isDetailsOpen}
        program={programToView}
        onClose={() => setIsDetailsOpen(false)}
        onManage={isAdmin || userRole === 'staff' ? (program) => {
          setProgramToManage(program);
          setIsDetailsOpen(false);
        } : undefined}
      />
      {programToManage && (
        <ProgramOperations
          program={programToManage}
          role={userRole}
          onClose={() => setProgramToManage(null)}
        />
      )}

      {/* Change Status Modal Dialog (Admin only) */}
      {isAdmin && statusDialogProgram && (
        <div className="modal-overlay" onClick={() => setStatusDialogProgram(null)}>
          <div
            className="modal-container status-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <RefreshCw size={20} className="text-primary" />
                <h3>Update Program Status</h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusDialogProgram(null)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <div className="status-student-meta">
                <strong>{statusDialogProgram.name}</strong>
                <span className="code-badge">{statusDialogProgram.code}</span>
              </div>
              <p className="status-modal-desc">
                Adjust the lifecycle state of this program. Historical schedules and records remain fully preserved.
              </p>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="target-prog-status">Select New Status:</label>
                <select
                  id="target-prog-status"
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="select-dropdown"
                  disabled={statusSubmitting}
                >
                  <option value="active">Active (Ongoing / In-session)</option>
                  <option value="draft">Draft (Planning stage)</option>
                  <option value="paused">Paused (Temporarily on hold)</option>
                  <option value="completed">Completed (Successfully concluded)</option>
                  <option value="cancelled">Cancelled (Terminated)</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setStatusDialogProgram(null)}
                className="btn-secondary"
                disabled={statusSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className="btn-primary"
                disabled={statusSubmitting}
              >
                {statusSubmitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete Modal Dialog (Admin only) */}
      {isAdmin && deleteDialogProgram && (
        <div className="modal-overlay" onClick={() => !deleteSubmitting && setDeleteDialogProgram(null)}>
          <div
            className="modal-container status-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <Trash2 size={20} className="text-danger" style={{ color: '#ef4444' }} />
                <h3>Delete Program</h3>
              </div>
              <button
                type="button"
                onClick={() => !deleteSubmitting && setDeleteDialogProgram(null)}
                className="modal-close-btn"
                disabled={deleteSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <div className="status-student-meta">
                <strong>{deleteDialogProgram.name}</strong>
                <span className="code-badge">{deleteDialogProgram.code}</span>
              </div>

              {deleteError && (
                <div className="alert alert-error" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="status-modal-desc" style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
                Are you sure you want to permanently delete this program?
              </p>
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  fontSize: '0.82rem',
                  color: '#991b1b',
                  lineHeight: '1.4'
                }}
              >
                <strong>Operational Safe Guard:</strong> Programs with enrolled beneficiaries, recorded attendance sessions, or logged audit history cannot be deleted. If this program has history, consider changing its status to <em>Cancelled</em> or <em>Completed</em> instead.
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setDeleteDialogProgram(null)}
                className="btn-secondary"
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-danger"
                disabled={deleteSubmitting}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: deleteSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

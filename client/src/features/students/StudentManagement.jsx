import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GraduationCap, 
  UserPlus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  X,
  BookOpen,
  Sparkles,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import studentService from './studentService';
import StudentTable from './StudentTable';
import StudentForm from './StudentForm';
import StudentDetails from './StudentDetails';
import DataCleaningPanel from '../../components/common/DataCleaningPanel';
import { fadeUp } from '../../animations';

const POPULAR_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Delhi', 'Gujarat', 'Haryana', 
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 
  'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'
];

export default function StudentManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'volunteer';
  const isStudent = userRole === 'student';
  const isVolunteer = userRole === 'volunteer';
  const canManage = userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff';
  const isAdmin = userRole === 'admin' || userRole === 'ngo_admin';

  // State for data
  const [students, setStudents] = useState([]);
  const tableMotionRef = useRef(null);
  const [pagination, setPagination] = useState({
    totalStudents: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showDataCleaning, setShowDataCleaning] = useState(false);

  // Search, filter and sorting state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [programsList, setProgramsList] = useState([]);
  const [sortKey, setSortKey] = useState('createdAt:desc');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [studentToEdit, setStudentToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [studentToView, setStudentToView] = useState(null);

  useEffect(() => {
    if (!students.length) return undefined;
    return fadeUp(tableMotionRef.current, { duration: 0.2, distance: 4 });
  }, [students]);

  // Status Change Dialog State
  const [statusDialogStudent, setStatusDialogStudent] = useState(null);
  const [targetStatus, setTargetStatus] = useState('active');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Safe Deletion Dialog State
  const [deleteDialogStudent, setDeleteDialogStudent] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Student role specific profile state
  const [myProfile, setMyProfile] = useState(null);
  const [myProfileLoading, setMyProfileLoading] = useState(false);
  const [myProfileError, setMyProfileError] = useState('');

  // Fetch programs list for filter dropdown
  useEffect(() => {
    let isMounted = true;
    studentService.getPrograms({ limit: 100 })
      .then((res) => {
        if (isMounted && res.success && res.data?.programs) {
          setProgramsList(res.data.programs);
        }
      })
      .catch((err) => {
        console.warn('Could not load programs for filter:', err.message);
      });
    return () => { isMounted = false; };
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  }, []);

  // Parse sortKey
  const [sortBy, sortOrder] = sortKey.split(':');

  // Fetch student records for Admin / Staff / Volunteer
  const fetchStudents = useCallback(async () => {
    if (isStudent) return; // Students use getMyProfile

    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter,
        gender: genderFilter,
        sortBy,
        sortOrder
      };

      if (stateFilter && stateFilter !== 'all') {
        params.state = stateFilter;
      }

      if (programFilter && programFilter !== 'all') {
        params.programId = programFilter;
      }

      const res = await studentService.getStudents(params);

      if (res.success && res.data) {
        setStudents(res.data.students || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, genderFilter, stateFilter, programFilter, sortBy, sortOrder, isStudent, showNotification]);

  // Fetch single profile for Student role
  const fetchMyStudentProfile = useCallback(async () => {
    if (!isStudent) return;
    setMyProfileLoading(true);
    setMyProfileError('');
    try {
      const res = await studentService.getMyProfile();
      if (res.success && res.data?.student) {
        setMyProfile(res.data.student);
      }
    } catch (err) {
      setMyProfileError(
        err.message || 'No linked student record found for your user account.'
      );
    } finally {
      setMyProfileLoading(false);
    }
  }, [isStudent]);

  useEffect(() => {
    if (isStudent) {
      fetchMyStudentProfile();
    } else {
      fetchStudents();
    }
  }, [isStudent, fetchStudents, fetchMyStudentProfile]);

  // Reset all filters
  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setGenderFilter('all');
    setStateFilter('all');
    setProgramFilter('all');
    setSortKey('createdAt:desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search ||
    statusFilter !== 'all' ||
    genderFilter !== 'all' ||
    stateFilter !== 'all' ||
    programFilter !== 'all' ||
    sortKey !== 'createdAt:desc'
  );

  // Handlers for Student Actions
  const handleOpenCreate = () => {
    setFormMode('create');
    setStudentToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student) => {
    setFormMode('edit');
    setStudentToEdit(student);
    setIsFormOpen(true);
  };

  const handleOpenView = (student) => {
    setStudentToView(student);
    setIsDetailsOpen(true);
  };

  const handleOpenStatusDialog = (student) => {
    setStatusDialogStudent(student);
    setTargetStatus(student.status || 'active');
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialogStudent) return;
    setStatusSubmitting(true);
    try {
      const studentId = statusDialogStudent._id || statusDialogStudent.id;
      const res = await studentService.updateStatus(studentId, targetStatus);
      if (res.success) {
        showNotification(
          'success',
          `Enrollment status for ${statusDialogStudent.firstName} ${statusDialogStudent.lastName} changed to ${targetStatus.toUpperCase()}.`
        );
        fetchStudents();
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to update student status');
    } finally {
      setStatusSubmitting(false);
      setStatusDialogStudent(null);
    }
  };

  // Safe Deletion Handlers
  const handleOpenDeleteDialog = (student) => {
    setDeleteDialogStudent(student);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogStudent) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      const studentId = deleteDialogStudent._id || deleteDialogStudent.id;
      const res = await studentService.deleteStudent(studentId);
      if (res.success) {
        showNotification('success', `Beneficiary ${deleteDialogStudent.firstName} ${deleteDialogStudent.lastName} successfully deleted.`);
        setDeleteDialogStudent(null);
        fetchStudents();
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete beneficiary record.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // STUDENT ROLE SELF-PROFILE VIEW
  // ----------------------------------------------------
  if (isStudent) {
    return (
      <div className="user-management-page student-self-view-page">
        <div className="page-header">
          <div>
            <div className="title-with-badge">
              <h1 className="page-title">My Student Profile</h1>
              <span className="badge badge-student">Student Portal</span>
            </div>
            <p className="page-subtitle">
              Your official NGO beneficiary and enrollment record
            </p>
          </div>
          <button
            type="button"
            onClick={fetchMyStudentProfile}
            className="btn-action btn-refresh"
            disabled={myProfileLoading}
          >
            <RefreshCw size={16} className={myProfileLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {myProfileLoading ? (
          <div className="card loading-card">
            <div className="auth-spinner"></div>
            <p>Loading your student profile...</p>
          </div>
        ) : myProfileError ? (
          <div className="card empty-state-card">
            <AlertCircle size={40} className="text-warning" />
            <h3>No Linked Student Record Found</h3>
            <p>{myProfileError}</p>
            <p className="text-dim">
              Please contact your NGO coordinator or administrator to link your user account to your beneficiary registration.
            </p>
          </div>
        ) : myProfile ? (
          <div className="student-profile-container">
            <StudentDetails
              student={myProfile}
              isOpen={true}
              onClose={() => {}}
            />
          </div>
        ) : null}
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN / STAFF / VOLUNTEER LIST VIEW
  // ----------------------------------------------------
  return (
    <div className="user-management-page student-management-page">
      {/* Top Banner / Notification */}
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
            <h1 className="page-title">Beneficiary Management</h1>
            <span className={`badge ${['admin', 'ngo_admin'].includes(userRole) ? 'badge-admin' : userRole === 'staff' ? 'badge-staff' : 'badge-volunteer'}`}>
              {['admin', 'ngo_admin'].includes(userRole) ? 'Organization Admin' : userRole === 'staff' ? 'Staff' : 'Volunteer View'}
            </span>
          </div>
          <p className="page-subtitle">
            Manage NGO beneficiary profiles, programs, attendance, quality verification, and enrollment status
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={fetchStudents}
            className="btn-action btn-refresh"
            title="Refresh student list"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canManage && (
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

          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-action btn-add-user"
            >
              <UserPlus size={16} />
              <span>+ Add Beneficiary</span>
            </button>
          )}
        </div>
      </div>

      {/* Volunteer Notice if applicable */}
      {isVolunteer && (
        <div className="alert alert-info volunteer-banner">
          <BookOpen size={16} className="flex-shrink-0" />
          <span>
            Volunteer View: You have read-only access to view beneficiary records. Profile creation and editing are reserved for Staff and Admin coordinators.
          </span>
        </div>
      )}

      {/* Control Bar: Search + Extended Filters */}
      <div className="card filters-control-card">
        <div className="filters-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {/* Search Input */}
          <div className="search-box-wrapper" style={{ minWidth: '220px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, reg number, phone, email..."
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

          {/* Status Filter */}
          <div className="filter-select-group">
            <label htmlFor="student-status-filter">Status:</label>
            <select
              id="student-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Program Filter */}
          <div className="filter-select-group">
            <label htmlFor="student-program-filter">Program:</label>
            <select
              id="student-program-filter"
              value={programFilter}
              onChange={(e) => {
                setProgramFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Programs</option>
              {programsList.map((prog) => (
                <option key={prog._id} value={prog._id}>
                  {prog.name} ({prog.code || 'Code'})
                </option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div className="filter-select-group">
            <label htmlFor="student-state-filter">State:</label>
            <select
              id="student-state-filter"
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All States</option>
              {POPULAR_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div className="filter-select-group">
            <label htmlFor="student-gender-filter">Gender:</label>
            <select
              id="student-gender-filter"
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="filter-select-group">
            <label htmlFor="student-sort-filter">Sort By:</label>
            <select
              id="student-sort-filter"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="createdAt:desc">Newest (Registration Date)</option>
              <option value="createdAt:asc">Oldest (Registration Date)</option>
              <option value="updatedAt:desc">Recently Updated</option>
              <option value="name:asc">Name (A – Z)</option>
              <option value="name:desc">Name (Z – A)</option>
              <option value="registrationNumber:asc">Registration Number</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Row */}
        {hasActiveFilters && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color, #e5e7eb)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
            >
              <RotateCcw size={13} />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}
      </div>

      {showDataCleaning && <DataCleaningPanel recordType="students" onApplied={fetchStudents} />}

      {/* Student Table Card */}
      <div className="card user-table-card" ref={tableMotionRef}>
        <div className="table-header-bar">
          <div className="table-header-info">
            <GraduationCap size={19} className="text-primary" />
            <h3>Enrolled Beneficiaries & Students</h3>
            <span className="count-pill">{pagination.totalStudents} beneficiaries</span>
          </div>
        </div>

        <StudentTable
          students={students}
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
              <strong>{pagination.totalPages}</strong> ({pagination.totalStudents} total records)
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

      {/* Create / Edit Student Modal */}
      {canManage && (
        <StudentForm
          isOpen={isFormOpen}
          mode={formMode}
          studentToEdit={studentToEdit}
          onClose={() => setIsFormOpen(false)}
          onSuccess={(msg) => {
            showNotification('success', msg);
            fetchStudents();
          }}
        />
      )}

      {/* Student Details Modal */}
      <StudentDetails
        isOpen={isDetailsOpen}
        student={studentToView}
        onClose={() => setIsDetailsOpen(false)}
      />

      {/* Change Status Modal Dialog */}
      {statusDialogStudent && (
        <div className="modal-overlay" onClick={() => setStatusDialogStudent(null)}>
          <div 
            className="modal-container status-confirm-modal" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <RefreshCw size={20} className="text-primary" />
                <h3>Change Enrollment Status</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setStatusDialogStudent(null)} 
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <div className="status-student-meta">
                <strong>{statusDialogStudent.firstName} {statusDialogStudent.lastName}</strong>
                <span className="reg-badge">{statusDialogStudent.registrationNumber}</span>
              </div>
              <p className="status-modal-desc">
                Update the enrollment status for this beneficiary. Historical records and logs remain preserved.
              </p>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="target-status-select">Select New Status:</label>
                <select
                  id="target-status-select"
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="select-dropdown"
                  disabled={statusSubmitting}
                >
                  <option value="active">Active (Enrolled in NGO programs)</option>
                  <option value="graduated">Graduated (Successfully completed)</option>
                  <option value="transferred">Transferred (Moved to another school/center)</option>
                  <option value="inactive">Inactive (Suspended or on leave)</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setStatusDialogStudent(null)}
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

      {/* Safe Deletion Modal Dialog */}
      {deleteDialogStudent && (
        <div className="modal-overlay" onClick={() => setDeleteDialogStudent(null)}>
          <div 
            className="modal-container status-confirm-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <Trash2 size={20} style={{ color: '#ef4444' }} />
                <h3>Delete Beneficiary Record</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setDeleteDialogStudent(null)} 
                className="modal-close-btn"
                disabled={deleteSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <div className="status-student-meta">
                <strong>{deleteDialogStudent.firstName} {deleteDialogStudent.lastName}</strong>
                <span className="reg-badge">{deleteDialogStudent.registrationNumber}</span>
              </div>

              {deleteError ? (
                <div className="alert alert-error" style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              ) : (
                <p className="status-modal-desc" style={{ marginTop: '0.5rem' }}>
                  NGOcore enforces a strict non-destructive policy. A beneficiary with associated program enrollments, attendance records, or audit history <strong>cannot be permanently deleted</strong>.
                  If this beneficiary is no longer active, set their status to <strong>Inactive</strong> instead.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setDeleteDialogStudent(null)}
                className="btn-secondary"
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-primary"
                disabled={deleteSubmitting}
                style={{ background: '#ef4444', borderColor: '#dc2626' }}
              >
                {deleteSubmitting ? 'Checking & Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
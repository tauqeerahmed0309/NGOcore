import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import userService from './userService';
import UserTable from './UserTable';
import UserForm from './UserForm';
import UserDetails from './UserDetails';
import { fadeUp } from '../../animations';

export default function UserManagement() {
  const { currentUser } = useAuth();

  // State for data
  const [users, setUsers] = useState([]);
  const tableMotionRef = useRef(null);
  const [pagination, setPagination] = useState({
    totalUsers: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [sendingInviteId, setSendingInviteId] = useState('');

  // Search and filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [userToEdit, setUserToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [userToView, setUserToView] = useState(null);

  useEffect(() => {
    if (!users.length) return undefined;
    return fadeUp(tableMotionRef.current, { duration: 0.2, distance: 4 });
  }, [users]);

  // Status Confirmation Modal State
  const [statusConfirmUser, setStatusConfirmUser] = useState(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

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
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers({
        page,
        limit: 10,
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (res.success && res.data) {
        setUsers(res.data.users || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, statusFilter, showNotification]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handlers for User Actions
  const handleOpenCreate = () => {
    setFormMode('create');
    setUserToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user) => {
    setFormMode('edit');
    setUserToEdit(user);
    setIsFormOpen(true);
  };

  const handleOpenView = (user) => {
    setUserToView(user);
    setIsDetailsOpen(true);
  };

  const handlePromptStatusToggle = (user) => {
    setStatusConfirmUser(user);
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusConfirmUser) return;
    setStatusSubmitting(true);
    try {
      const newStatus = !statusConfirmUser.isActive;
      const res = await userService.updateStatus(statusConfirmUser._id || statusConfirmUser.id, newStatus);
      if (res.success) {
        showNotification(
          'success',
          `Account for ${statusConfirmUser.firstName} ${statusConfirmUser.lastName} has been ${
            newStatus ? 'activated' : 'deactivated'
          }.`
        );
        fetchUsers();
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to update user status');
    } finally {
      setStatusSubmitting(false);
      setStatusConfirmUser(null);
    }
  };

  const handleResendInvite = async (user) => {
    const userId = String(user._id || user.id);
    setSendingInviteId(userId);
    try {
      const response = await userService.resendStudentSetupInvite(userId);
      showNotification('success', response.message || `Password setup invitation sent to ${user.email}.`);
    } catch (err) {
      showNotification('error', err.message || 'Could not resend the setup invitation.');
    } finally {
      setSendingInviteId('');
    }
  };

  return (
    <div className="user-management-page">
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
            <h1 className="page-title">User Management</h1>
            <span className="badge badge-admin">Administrator</span>
          </div>
          <p className="page-subtitle">
            Manage NGO staff, volunteers, and student user accounts
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            onClick={fetchUsers}
            className="btn-action btn-refresh"
            title="Refresh user list"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-action btn-add-user"
          >
            <UserPlus size={16} />
            <span>+ Add User</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search + Filters */}
      <div className="card filters-control-card">
        <div className="filters-grid">
          {/* Search Input */}
          <div className="search-box-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
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

          {/* Role Filter */}
          <div className="filter-select-group">
            <label htmlFor="role-filter">Role:</label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value="staff">Staff</option>
              <option value="volunteer">Volunteer</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-select-group">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Table Card */}
      <div className="card user-table-card" ref={tableMotionRef}>
        <div className="table-header-bar">
          <div className="table-header-info">
            <Users size={18} className="text-primary" />
            <h3>All Registered Users</h3>
            <span className="count-pill">{pagination.totalUsers} users</span>
          </div>
        </div>

        <UserTable
          users={users}
          currentAdminId={currentUser?.id || currentUser?._id}
          loading={loading}
          onView={handleOpenView}
          onEdit={handleOpenEdit}
          onToggleStatus={handlePromptStatusToggle}
          onResendInvite={handleResendInvite}
          sendingInviteId={sendingInviteId}
        />

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing page <strong>{pagination.currentPage}</strong> of{' '}
              <strong>{pagination.totalPages}</strong> ({pagination.totalUsers} total records)
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

      {/* Create / Edit User Modal */}
      <UserForm
        isOpen={isFormOpen}
        mode={formMode}
        userToEdit={userToEdit}
        onClose={() => setIsFormOpen(false)}
        onSuccess={(msg) => {
          showNotification('success', msg);
          fetchUsers();
        }}
      />

      {/* User Details Modal */}
      <UserDetails
        isOpen={isDetailsOpen}
        user={userToView}
        onClose={() => setIsDetailsOpen(false)}
      />

      {/* Soft Deactivation / Activation Confirmation Dialog */}
      {statusConfirmUser && (
        <div className="modal-overlay" onClick={() => setStatusConfirmUser(null)}>
          <div 
            className="modal-container status-confirm-modal" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                {statusConfirmUser.isActive ? (
                  <AlertTriangle size={22} className="text-warning" />
                ) : (
                  <CheckCircle2 size={22} className="text-success" />
                )}
                <h3>
                  {statusConfirmUser.isActive 
                    ? `Deactivate ${statusConfirmUser.firstName} ${statusConfirmUser.lastName}?`
                    : `Activate ${statusConfirmUser.firstName} ${statusConfirmUser.lastName}?`
                  }
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setStatusConfirmUser(null)} 
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              {statusConfirmUser.isActive ? (
                <div className="status-warning-box">
                  <p>
                    Are you sure you want to deactivate <strong>{statusConfirmUser.email}</strong>?
                  </p>
                  <p className="warning-callout">
                    Deactivated users cannot log into the NGO system. Their historical records, activities, and logs will remain preserved.
                  </p>
                </div>
              ) : (
                <div className="status-success-box">
                  <p>
                    Reactivate user account for <strong>{statusConfirmUser.email}</strong>?
                  </p>
                  <p className="info-callout">
                    When activated, this user will regain the ability to log in and access their role dashboard.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                className="btn-secondary"
                disabled={statusSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusToggle}
                className={statusConfirmUser.isActive ? 'btn-danger' : 'btn-primary'}
                disabled={statusSubmitting}
              >
                {statusSubmitting 
                  ? 'Updating...' 
                  : statusConfirmUser.isActive 
                    ? 'Deactivate' 
                    : 'Activate'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

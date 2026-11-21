import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  ListTodo
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import taskService from './taskService';
import TaskTable from './TaskTable';
import TaskForm from './TaskForm';
import TaskDetails from './TaskDetails';

export default function TaskManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'staff';
  const canManage = userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff';

  // Data state
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    totalTasks: 0,
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
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [taskToEdit, setTaskToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState([]);

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [taskToArchive, setTaskToArchive] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await taskService.getTaskSummary();
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load task summary:', err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
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
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const res = await taskService.getTasks(params);
      if (res.data?.success) {
        setTasks(res.data.data.tasks || []);
        setPagination(res.data.data.pagination || {});
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      showNotification('error', 'Failed to load operational tasks.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, debouncedSearch, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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
    setTaskToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (task) => {
    setFormMode('edit');
    setTaskToEdit(task);
    setIsDetailsOpen(false);
    setIsFormOpen(true);
  };

  const handleOpenDetails = async (task) => {
    try {
      const res = await taskService.getTaskById(task._id);
      if (res.data?.success) {
        setSelectedTask(res.data.data.task);
        setSelectedAuditLogs(res.data.data.auditLogs || []);
        setIsDetailsOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch task details:', err);
      showNotification('error', 'Failed to retrieve task details.');
    }
  };

  const handleStatusChange = async (taskId, statusData) => {
    try {
      await taskService.updateTaskStatus(taskId, statusData);
      showNotification('success', `Task updated to ${statusData.status}.`);
      fetchTasks();
      loadSummary();
      if (selectedTask && selectedTask._id === taskId) {
        handleOpenDetails(selectedTask);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Status update failed';
      showNotification('error', msg);
    }
  };

  const handleChecklistToggle = async (task, itemIndex) => {
    const updatedChecklist = [...task.checklist];
    updatedChecklist[itemIndex].isCompleted = !updatedChecklist[itemIndex].isCompleted;
    try {
      await taskService.updateTask(task._id, { checklist: updatedChecklist });
      setSelectedTask((prev) => ({ ...prev, checklist: updatedChecklist }));
      fetchTasks();
    } catch (err) {
      console.error('Failed to update checklist item:', err);
    }
  };

  const handleFormSubmit = async (formData) => {
    if (formMode === 'create') {
      await taskService.createTask(formData);
      showNotification('success', 'Operational task assigned successfully.');
    } else {
      await taskService.updateTask(taskToEdit._id, formData);
      showNotification('success', 'Task details updated.');
    }
    fetchTasks();
    loadSummary();
  };

  const handleOpenArchive = (task) => {
    setTaskToArchive(task);
    setArchiveModalOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!taskToArchive) return;
    try {
      await taskService.deleteTask(taskToArchive._id);
      showNotification('success', 'Task archived cleanly.');
      setArchiveModalOpen(false);
      setTaskToArchive(null);
      fetchTasks();
      loadSummary();
      setIsDetailsOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to archive task';
      showNotification('error', msg);
    }
  };

  const handleExportCSV = async () => {
    try {
      showNotification('info', 'Preparing tasks CSV export...');
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const res = await taskService.exportTasks(params);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification('success', 'Tasks CSV downloaded successfully.');
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('error', 'Failed to generate tasks CSV.');
    }
  };

  const todoCount = summary?.statusCounts?.todo || 0;
  const inProgressCount = summary?.statusCounts?.in_progress || 0;
  const urgentCount = summary?.priorityCounts?.urgent || 0;
  const overdueCount = summary?.overdueCount || 0;
  const completedCount = summary?.statusCounts?.completed || 0;

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
              <CheckSquare size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Tasks &amp; Operations
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Coordinate field assignments, operational subtasks, deadlines, and staff/volunteer responsibilities
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
              Create Task
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
        {/* Active Open Tasks */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Active Tasks
            </span>
            <ListTodo size={18} style={{ color: '#2563eb' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
            {todoCount + inProgressCount}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {todoCount} To Do &bull; {inProgressCount} In Progress
          </div>
        </div>

        {/* Urgent Attention */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Urgent Priority
            </span>
            <AlertTriangle size={18} style={{ color: 'var(--status-danger)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-danger)', marginTop: 4 }}>
            {urgentCount}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Critical operational blockers
          </div>
        </div>

        {/* Overdue */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Overdue Tasks
            </span>
            <Clock size={18} style={{ color: 'var(--status-warning)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-warning)', marginTop: 4 }}>
            {overdueCount}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Target deadline passed
          </div>
        </div>

        {/* Completed */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Completed Tasks
            </span>
            <CheckCircle size={18} style={{ color: 'var(--status-success)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-success)', marginTop: 4 }}>
            {completedCount}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Successfully closed deliverables
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
              placeholder="Search by title, task #, or details..."
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
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ minWidth: 150 }}>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
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
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
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
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Categories</option>
              <option value="program_ops">Program Operations</option>
              <option value="fundraising">Fundraising</option>
              <option value="field_work">Field Work</option>
              <option value="administrative">Administrative</option>
              <option value="logistics">Logistics</option>
              <option value="compliance">Compliance</option>
              <option value="beneficiary_support">Beneficiary Support</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => {
              fetchTasks();
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
        <TaskTable
          tasks={tasks}
          loading={loading}
          userRole={userRole}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onView={handleOpenDetails}
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
            Showing <strong>{tasks.length}</strong> of <strong>{pagination.totalTasks || 0}</strong> tasks (Page <strong>{pagination.currentPage || 1}</strong> of <strong>{pagination.totalPages || 1}</strong>)
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
      <TaskForm
        isOpen={isFormOpen}
        mode={formMode}
        task={taskToEdit}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <TaskDetails
        isOpen={isDetailsOpen}
        task={selectedTask}
        auditLogs={selectedAuditLogs}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={handleOpenEdit}
        onStatusChange={handleStatusChange}
        onChecklistToggle={handleChecklistToggle}
      />

      {/* Archive Modal */}
      {archiveModalOpen && taskToArchive && (
        <div className="modal-overlay" onClick={() => setArchiveModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Archive Operational Task
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Are you sure you want to archive <strong>{taskToArchive.taskNumber}</strong> ("{taskToArchive.title}")?
              The task will be soft-deleted, preserving full audit history.
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
                Archive Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

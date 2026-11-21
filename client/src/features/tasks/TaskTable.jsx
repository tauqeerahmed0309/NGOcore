import React from 'react';
import {
  Eye,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';

export default function TaskTable({
  tasks = [],
  loading = false,
  userRole = 'staff',
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSort,
  onView,
  onEdit,
  onDelete
}) {
  const isAdmin = userRole === 'admin' || userRole === 'ngo_admin';

  const renderSortIndicator = (column) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition" />;
    }
    return (
      <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: '0.72rem',
              fontWeight: 700,
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              border: '1px solid #fecaca'
            }}
          >
            Urgent
          </span>
        );
      case 'high':
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: '#fff7ed',
              color: '#ea580c',
              border: '1px solid #fed7aa'
            }}
          >
            High
          </span>
        );
      case 'low':
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: '0.72rem',
              fontWeight: 500,
              backgroundColor: '#f1f5f9',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            Low
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe'
            }}
          >
            Medium
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'var(--status-success-bg)',
              color: 'var(--status-success)',
              border: '1px solid #bbf7d0'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-success)' }} />
            Done
          </span>
        );
      case 'in_progress':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
            In Progress
          </span>
        );
      case 'review':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#f5f3ff',
              color: '#7c3aed',
              border: '1px solid #ddd6fe'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed' }} />
            Review
          </span>
        );
      case 'cancelled':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#f1f5f9',
              color: 'var(--text-secondary)',
              border: '1px solid #cbd5e1'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />
            Cancelled
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'var(--status-warning-bg)',
              color: 'var(--status-warning)',
              border: '1px solid #fde68a'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-warning)' }} />
            To Do
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="auth-spinner" style={{ margin: '0 auto 12px auto' }} />
        <p style={{ fontSize: '0.875rem' }}>Loading task board...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Clock size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          No Operational Tasks Found
        </h4>
        <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
          No operational tasks match your current search and filter settings, or no tasks have been created yet.
        </p>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="table-responsive" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            <th
              onClick={() => onSort('taskNumber')}
              style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Task #</span>
                {renderSortIndicator('taskNumber')}
              </div>
            </th>
            <th
              onClick={() => onSort('title')}
              style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Title &amp; Program</span>
                {renderSortIndicator('title')}
              </div>
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
            <th
              onClick={() => onSort('priority')}
              style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Priority</span>
                {renderSortIndicator('priority')}
              </div>
            </th>
            <th
              onClick={() => onSort('dueDate')}
              style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Due Date</span>
                {renderSortIndicator('dueDate')}
              </div>
            </th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Assignee</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed' && task.status !== 'cancelled';

            return (
              <tr
                key={task._id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background-color 150ms'
                }}
                className="table-row-hover"
              >
                {/* Task # */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => onView(task)}
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: '#f1f5f9',
                      color: 'var(--brand-green)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {task.taskNumber}
                  </button>
                </td>

                {/* Title & Program */}
                <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.title}
                  </div>
                  {task.programId && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-green)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Prog: {task.programId.name || task.programId.code}
                    </div>
                  )}
                </td>

                {/* Category */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                  {task.category?.replace('_', ' ')}
                </td>

                {/* Priority */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  {getPriorityBadge(task.priority)}
                </td>

                {/* Due Date */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                  {task.dueDate ? (
                    <span style={{ color: isOverdue ? 'var(--status-danger)' : 'var(--text-secondary)', fontWeight: isOverdue ? 700 : 400, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {isOverdue && <AlertTriangle size={13} style={{ color: 'var(--status-danger)' }} />}
                      {new Date(task.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No deadline</span>
                  )}
                </td>

                {/* Assignee */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                  {task.assignedTo ? (
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {task.assignedTo.firstName} {task.assignedTo.lastName}
                    </div>
                  ) : task.assignedVolunteerId ? (
                    <div style={{ color: 'var(--brand-green)', fontWeight: 500 }}>
                      Vol: {task.assignedVolunteerId.name}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </td>

                {/* Status */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  {getStatusBadge(task.status)}
                </td>

                {/* Actions */}
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => onView(task)}
                      title="View Details"
                      style={{
                        padding: '6px',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      title="Edit Task"
                      style={{
                        padding: '6px',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        color: 'var(--brand-green)',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit2 size={15} />
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDelete(task)}
                        title="Archive Task"
                        style={{
                          padding: '6px',
                          borderRadius: 4,
                          border: '1px solid #fecaca',
                          color: 'var(--status-danger)',
                          background: 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

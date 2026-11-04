import React from 'react';
import { 
  Eye, 
  Edit3, 
  RefreshCw, 
  Calendar, 
  AlertTriangle
} from 'lucide-react';

export default function ProgramTable({
  programs = [],
  loading = false,
  currentUserRole = 'staff',
  onView,
  onEdit,
  onChangeStatus
}) {
  const isAdmin = currentUserRole === 'admin';

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatProgramType = (type) => {
    if (!type) return 'Custom';
    const map = {
      school_class: 'School Class',
      weekend_class: 'Weekend Class',
      sunday_program: 'Sunday Program',
      vocational_training: 'Vocational Training',
      skill_development: 'Skill Development',
      workshop: 'Workshop',
      awareness_program: 'Awareness Program',
      community_training: 'Community Training',
      summer_camp: 'Summer Camp',
      career_guidance: 'Career Guidance',
      health_awareness: 'Health Awareness',
      digital_literacy: 'Digital Literacy',
      sports_activity: 'Sports Activity',
      course: 'Course',
      class: 'School Class',
      event: 'Community Event',
      camp: 'Camp',
      awareness: 'Awareness Campaign',
      training: 'Vocational Training',
      other: 'Other'
    };
    const key = type.toLowerCase().replace(/[-\s]/g, '_');
    if (map[key]) return map[key];
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatProgramCategory = (cat) => {
    if (!cat) return 'General';
    return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="status-pill status-active">
            <span className="status-dot"></span>
            Active
          </span>
        );
      case 'draft':
        return (
          <span className="status-pill status-draft">
            <span className="status-dot"></span>
            Draft
          </span>
        );
      case 'paused':
        return (
          <span className="status-pill status-paused">
            <span className="status-dot"></span>
            Paused
          </span>
        );
      case 'completed':
        return (
          <span className="status-pill status-completed">
            <span className="status-dot"></span>
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="status-pill status-cancelled">
            <span className="status-dot"></span>
            Cancelled
          </span>
        );
      default:
        return (
          <span className="status-pill status-outline">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="table-loading-container">
        <div className="auth-spinner"></div>
        <p>Loading NGO programs & activities...</p>
      </div>
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <div className="table-empty-state">
        <AlertTriangle size={36} className="text-muted" />
        <h4>No Programs Found</h4>
        <p>There are no programs matching your query or current assignment filters.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive-wrapper">
      <table className="user-data-table program-data-table">
        <thead>
          <tr>
            <th>Program Code</th>
            <th>Program Name</th>
            <th>Type</th>
            <th>Category</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Coordinator</th>
            <th>Location</th>
            <th>Status</th>
            <th>Capacity</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((program) => {
            const programId = program._id || program.id;
            const coordinator = program.coordinator;

            return (
              <tr 
                key={programId} 
                className={program.status === 'cancelled' || program.status === 'paused' ? 'row-inactive' : ''}
              >
                {/* 1. Program Code */}
                <td>
                  <span className="code-badge-cell">
                    {program.code}
                  </span>
                </td>

                {/* 2. Program Name */}
                <td>
                  <div className="user-cell-meta">
                    <div className="program-table-avatar">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="user-name-title font-medium">
                        {program.name}
                      </div>
                      <div className="user-email-subtitle">
                        {program.schedule?.frequency ? `Frequency: ${program.schedule.frequency}` : ''}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 3. Type */}
                <td>
                  <span className="type-pill-cell">
                    {formatProgramType(program.type)}
                  </span>
                </td>

                {/* 4. Category */}
                <td>
                  <span className="category-cell-text">
                    {formatProgramCategory(program.category)}
                  </span>
                </td>

                {/* 5. Start Date */}
                <td>
                  <span className="date-cell-text">
                    {formatDate(program.startDate)}
                  </span>
                </td>

                {/* 6. End Date */}
                <td>
                  <span className="date-cell-text">
                    {formatDate(program.endDate)}
                  </span>
                </td>

                {/* 7. Coordinator */}
                <td>
                  {coordinator ? (
                    <div className="coordinator-cell" title={coordinator.email}>
                      <span className="coord-name">{coordinator.firstName} {coordinator.lastName}</span>
                      <span className="coord-role">({coordinator.role})</span>
                    </div>
                  ) : (
                    <span className="text-dim">—</span>
                  )}
                </td>

                {/* 8. Location */}
                <td>
                  <span className="location-cell-text" title={program.location || ''}>
                    {program.location ? program.location : <span className="text-dim">—</span>}
                  </span>
                </td>

                {/* 9. Status */}
                <td>
                  {getStatusBadge(program.status)}
                </td>

                {/* 10. Capacity */}
                <td>
                  <span className="capacity-text">
                    {program.capacity ? `${program.capacity} max` : <span className="text-dim">Flexible</span>}
                  </span>
                </td>

                {/* 11. Actions */}
                <td className="text-right">
                  <div className="action-buttons-group">
                    <button
                      type="button"
                      onClick={() => onView(program)}
                      className="btn-table-action btn-view"
                      title="View program details"
                    >
                      <Eye size={15} />
                      <span>View</span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(program)}
                          className="btn-table-action btn-edit"
                          title="Edit program"
                        >
                          <Edit3 size={15} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onChangeStatus(program)}
                          className="btn-table-action btn-change-status"
                          title="Change status"
                        >
                          <RefreshCw size={14} />
                          <span>Status</span>
                        </button>
                      </>
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

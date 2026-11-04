import React from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ShieldCheck, 
  Layers, 
  HeartHandshake, 
  UserCheck, 
  Award
} from 'lucide-react';

export default function ProgramDetails({ program, isOpen, onClose, onManage }) {
  if (!isOpen || !program) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString(undefined, {
      dateStyle: 'medium'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not recorded';
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
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
        return <span className="status-pill status-active"><span className="status-dot"></span>Active</span>;
      case 'draft':
        return <span className="status-pill status-draft"><span className="status-dot"></span>Draft</span>;
      case 'paused':
        return <span className="status-pill status-paused"><span className="status-dot"></span>Paused</span>;
      case 'completed':
        return <span className="status-pill status-completed"><span className="status-dot"></span>Completed</span>;
      case 'cancelled':
        return <span className="status-pill status-cancelled"><span className="status-dot"></span>Cancelled</span>;
      default:
        return <span className="status-pill status-outline">{status || 'Unknown'}</span>;
    }
  };

  const coordinator = program.coordinator;
  const assignedStaff = Array.isArray(program.assignedStaff) ? program.assignedStaff : [];
  const assignedVolunteers = Array.isArray(program.assignedVolunteers) ? program.assignedVolunteers : [];
  const schedule = program.schedule || {};
  const customAttrs = program.customAttributes && typeof program.customAttributes === 'object'
    ? Object.entries(program.customAttributes)
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container program-details-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="program-avatar-modal">
              <Calendar size={24} className="text-primary" />
            </div>
            <div>
              <h3>{program.name}</h3>
              <div className="modal-subtitle-row">
                <span className="code-badge">{program.code}</span>
                <span className="type-badge">{formatProgramType(program.type)}</span>
                {getStatusBadge(program.status)}
              </div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="modal-close-btn"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="program-details-scroll-content">
          {/* Section 1: Basic Information */}
          <div className="details-section">
            <h4 className="section-title">
              <Layers size={15} />
              <span>1. Basic Program Information</span>
            </h4>
            <div className="details-info-grid">
              <div className="info-cell">
                <div className="info-cell-label">Program Code</div>
                <div className="info-cell-value reg-highlight">{program.code}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell-label">Program Name</div>
                <div className="info-cell-value">{program.name}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell-label">Program Type</div>
                <div className="info-cell-value">{formatProgramType(program.type)}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell-label">Category</div>
                <div className="info-cell-value">{formatProgramCategory(program.category)}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell-label">Max Student Capacity</div>
                <div className="info-cell-value">
                  {program.capacity ? `${program.capacity} Beneficiaries` : 'Flexible / No Limit'}
                </div>
              </div>
              <div className="info-cell full-width">
                <div className="info-cell-label">Description</div>
                <div className="info-cell-value">
                  {program.description || 'No detailed description provided for this activity.'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Schedule & Timeline */}
          <div className="details-section">
            <h4 className="section-title">
              <Clock size={15} />
              <span>2. Schedule & Timeline</span>
            </h4>
            <div className="details-info-grid">
              <div className="info-cell">
                <div className="info-cell-label">Start Date</div>
                <div className="info-cell-value">{formatDate(program.startDate)}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell-label">End Date</div>
                <div className="info-cell-value">{formatDate(program.endDate)}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell-label">Recurrence Frequency</div>
                <div className="info-cell-value role-capitalize">{schedule.frequency || 'Weekly'}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell-label">Timing</div>
                <div className="info-cell-value">
                  {schedule.startTime && schedule.endTime 
                    ? `${schedule.startTime} - ${schedule.endTime}`
                    : schedule.startTime || schedule.endTime || 'Flexible Time'}
                </div>
              </div>
              <div className="info-cell full-width">
                <div className="info-cell-label">Scheduled Days</div>
                <div className="info-cell-value">
                  {Array.isArray(schedule.days) && schedule.days.length > 0 ? (
                    <div className="days-pills-row">
                      {schedule.days.map((day) => (
                        <span key={day} className="day-pill">{day}</span>
                      ))}
                    </div>
                  ) : (
                    'Not specified / Daily as needed'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Location */}
          <div className="details-section">
            <h4 className="section-title">
              <MapPin size={15} />
              <span>3. Location & Center</span>
            </h4>
            <div className="details-info-grid">
              <div className="info-cell full-width">
                <div className="info-cell-label">Operating Location</div>
                <div className="info-cell-value">
                  {program.location || 'Central NGO Campus / Online'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Team & Personnel */}
          <div className="details-section">
            <h4 className="section-title">
              <Users size={15} />
              <span>4. Assigned Leadership & Team</span>
            </h4>

            {/* Coordinator Card */}
            <div className="team-role-card">
              <div className="team-role-label">
                <ShieldCheck size={14} className="text-primary" />
                <span>Program Coordinator</span>
              </div>
              {coordinator ? (
                <div className="person-row">
                  <div className="person-name">{coordinator.firstName} {coordinator.lastName}</div>
                  <div className="person-email">{coordinator.email}</div>
                  <span className={`status-pill ${coordinator.isActive ? 'status-active' : 'status-inactive'}`}>
                    {coordinator.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ) : (
                <div className="text-dim">No coordinator currently assigned</div>
              )}
            </div>

            {/* Assigned Staff */}
            <div className="team-role-card">
              <div className="team-role-label">
                <UserCheck size={14} className="text-secondary" />
                <span>Assigned Staff ({assignedStaff.length})</span>
              </div>
              {assignedStaff.length > 0 ? (
                <div className="people-list">
                  {assignedStaff.map((staff) => (
                    <div key={staff._id || staff.id} className="person-chip">
                      <strong>{staff.firstName} {staff.lastName}</strong>
                      <span className="chip-email">({staff.email})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-dim">No staff assigned</div>
              )}
            </div>

            {/* Assigned Volunteers */}
            <div className="team-role-card">
              <div className="team-role-label">
                <HeartHandshake size={14} className="text-accent" />
                <span>Assigned Volunteers ({assignedVolunteers.length})</span>
              </div>
              {assignedVolunteers.length > 0 ? (
                <div className="people-list">
                  {assignedVolunteers.map((vol) => (
                    <div key={vol._id || vol.id} className="person-chip">
                      <strong>{vol.firstName} {vol.lastName}</strong>
                      <span className="chip-email">({vol.email})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-dim">No volunteers assigned</div>
              )}
            </div>
          </div>

          {/* Section 5: Custom Attributes (Dynamic Key-Value) */}
          {customAttrs.length > 0 && (
            <div className="details-section">
              <h4 className="section-title">
                <Award size={15} />
                <span>5. Dynamic Custom Attributes</span>
              </h4>
              <div className="details-info-grid">
                {customAttrs.map(([key, val]) => (
                  <div key={key} className="info-cell">
                    <div className="info-cell-label">{key}</div>
                    <div className="info-cell-value">
                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="details-metadata-row">
            <span>Created: {formatDateTime(program.createdAt)}</span>
            <span>Last Updated: {formatDateTime(program.updatedAt)}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          {onManage && (
            <button type="button" onClick={() => onManage(program)} className="btn-primary">
              Enrollment &amp; attendance
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
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
  Award,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Trash2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import programService from './programService';
import userService from '../users/userService';

export default function ProgramDetails({ program: initialProgram, isOpen, onClose, onManage }) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'ngo_admin';

  const [activeTab, setActiveTab] = useState('overview');
  const [program, setProgram] = useState(initialProgram);
  const [enrichedData, setEnrichedData] = useState(null);
  const [notification, setNotification] = useState(null);

  // Team tab states
  const [availableStaff, setAvailableStaff] = useState([]);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState('');
  const [assigningStaff, setAssigningStaff] = useState(false);

  // Beneficiaries tab states
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [enrollmentPagination, setEnrollmentPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1
  });

  // Attendance tab states
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePagination, setAttendancePagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1
  });

  // Withdrawal modal state
  const [withdrawingStudent, setWithdrawingStudent] = useState(null);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [withdrawingSubmitting, setWithdrawingSubmitting] = useState(false);

  const programId = initialProgram?._id || initialProgram?.id;

  const showToast = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Fetch enriched details
  const fetchProgramDetails = useCallback(async () => {
    if (!programId) return;
    try {
      const res = await programService.getProgramById(programId);
      if (res.success && res.data) {
        setEnrichedData(res.data);
        if (res.data.program) {
          setProgram(res.data.program);
        } else {
          setProgram(res.data);
        }
      }
    } catch {
      // fallback to initialProgram
    }
  }, [programId]);

  // Fetch enrollments
  const fetchEnrollments = useCallback(async (p = 1) => {
    if (!programId) return;
    setEnrollmentLoading(true);
    try {
      const res = await programService.getEnrollments(programId, { page: p, limit: 10 });
      if (res.success && res.data) {
        setEnrollments(res.data.enrollments || []);
        if (res.data.pagination) setEnrollmentPagination(res.data.pagination);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load enrollments');
    } finally {
      setEnrollmentLoading(false);
    }
  }, [programId, showToast]);

  // Fetch attendance history
  const fetchAttendanceHistory = useCallback(async (p = 1) => {
    if (!programId) return;
    setAttendanceLoading(true);
    try {
      const res = await programService.getAttendanceHistory(programId, { page: p, limit: 10 });
      if (res.success && res.data) {
        setAttendanceSessions(res.data.sessions || []);
        setAttendanceStats(res.data.stats || null);
        if (res.data.pagination) setAttendancePagination(res.data.pagination);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load attendance history');
    } finally {
      setAttendanceLoading(false);
    }
  }, [programId, showToast]);

  // Fetch available staff for assignment
  const fetchStaffOptions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await userService.getUsers({ role: 'staff', isActive: true, limit: 50 });
      if (res.success && res.data?.users) {
        setAvailableStaff(res.data.users);
      }
    } catch {
      // Silent fail
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isOpen && initialProgram) {
      setProgram(initialProgram);
      setActiveTab('overview');
      fetchProgramDetails();
    }
  }, [isOpen, initialProgram, fetchProgramDetails]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'team' && isAdmin) {
      fetchStaffOptions();
    } else if (activeTab === 'beneficiaries') {
      fetchEnrollments(enrollmentPage);
    } else if (activeTab === 'attendance') {
      fetchAttendanceHistory(attendancePage);
    }
  }, [activeTab, isOpen, isAdmin, enrollmentPage, attendancePage, fetchStaffOptions, fetchEnrollments, fetchAttendanceHistory]);

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

  // Staff Assignment handler
  const handleAssignStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaffToAssign) return;
    setAssigningStaff(true);
    try {
      const res = await programService.assignStaff(programId, selectedStaffToAssign);
      if (res.success) {
        showToast('success', 'Staff member assigned successfully.');
        setSelectedStaffToAssign('');
        await fetchProgramDetails();
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to assign staff member');
    } finally {
      setAssigningStaff(false);
    }
  };

  // Staff Removal handler
  const handleRemoveStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to remove this staff member from the program?')) return;
    try {
      const res = await programService.removeStaff(programId, staffId);
      if (res.success) {
        showToast('success', 'Staff member removed from program.');
        await fetchProgramDetails();
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to remove staff member');
    }
  };

  // Beneficiary withdrawal handler
  const handleConfirmWithdraw = async () => {
    if (!withdrawingStudent) return;
    setWithdrawingSubmitting(true);
    try {
      const studentId = withdrawingStudent.studentId?._id || withdrawingStudent.studentId?.id || withdrawingStudent.studentId;
      const res = await programService.updateEnrollment(programId, studentId, 'withdrawn', withdrawalReason);
      if (res.success) {
        showToast('success', 'Student marked as withdrawn.');
        setWithdrawingStudent(null);
        setWithdrawalReason('');
        await fetchEnrollments(enrollmentPage);
        await fetchProgramDetails();
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to withdraw student');
    } finally {
      setWithdrawingSubmitting(false);
    }
  };

  const coordinator = program.coordinator;
  const assignedStaff = Array.isArray(program.assignedStaff) ? program.assignedStaff : [];
  const assignedVolunteers = Array.isArray(program.assignedVolunteers) ? program.assignedVolunteers : [];
  const schedule = program.schedule || {};
  const customAttrs = program.customAttributes && typeof program.customAttributes === 'object'
    ? Object.entries(program.customAttributes)
    : [];

  const activeEnrolledCount = enrichedData?.enrolledCount ?? (program.enrolledCount || 0);
  const availableSeats = program.capacity ? Math.max(0, program.capacity - activeEnrolledCount) : null;
  const presenceRate = enrichedData?.attendance?.presenceRate ?? attendanceStats?.overallPresenceRate ?? 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container program-details-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '92%' }}
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

        {/* Toast inside modal */}
        {notification && (
          <div className={`notification-toast alert-${notification.type}`} style={{ margin: '0.5rem 1rem' }}>
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-subtle)', padding: '0 1rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'overview' ? 600 : 500,
              color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : '2px solid transparent'
            }}
          >
            Overview & Schedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'team' ? 600 : 500,
              color: activeTab === 'team' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'team' ? '2px solid var(--primary)' : '2px solid transparent'
            }}
          >
            Team & Staff ({assignedStaff.length + (coordinator ? 1 : 0)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('beneficiaries')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'beneficiaries' ? 600 : 500,
              color: activeTab === 'beneficiaries' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'beneficiaries' ? '2px solid var(--primary)' : '2px solid transparent'
            }}
          >
            Enrolled Beneficiaries ({activeEnrolledCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'attendance' ? 600 : 500,
              color: activeTab === 'attendance' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'attendance' ? '2px solid var(--primary)' : '2px solid transparent'
            }}
          >
            Attendance & History
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="program-details-scroll-content" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1.25rem' }}>
          
          {/* TAB 1: OVERVIEW & SCHEDULE */}
          {activeTab === 'overview' && (
            <>
              {/* Quick Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '1.25rem' }}>
                <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enrolled Beneficiaries</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {activeEnrolledCount}
                  </div>
                  {program.capacity && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      of {program.capacity} capacity
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Seats</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: program.isFull ? '#ef4444' : 'var(--text-primary)', marginTop: '4px' }}>
                    {program.capacity ? availableSeats : 'Flexible'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {program.isFull ? 'Program full' : 'Open for enrollment'}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Presence Rate</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: presenceRate >= 75 ? '#16a34a' : 'var(--text-primary)', marginTop: '4px' }}>
                    {presenceRate}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Overall attendance
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sessions Recorded</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {enrichedData?.totalSessions ?? enrichedData?.attendance?.totalSessions ?? 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Completed sessions
                  </div>
                </div>
              </div>

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

              {/* Section 4: Dynamic Custom Attributes */}
              {customAttrs.length > 0 && (
                <div className="details-section">
                  <h4 className="section-title">
                    <Award size={15} />
                    <span>4. Dynamic Custom Attributes</span>
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
            </>
          )}

          {/* TAB 2: TEAM & STAFF */}
          {activeTab === 'team' && (
            <div className="details-section">
              <h4 className="section-title">
                <Users size={15} />
                <span>Assigned Leadership & Team Members</span>
              </h4>

              {/* Coordinator Card */}
              <div className="team-role-card" style={{ marginBottom: '1rem' }}>
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

              {/* Assigned Staff List */}
              <div className="team-role-card" style={{ marginBottom: '1rem' }}>
                <div className="team-role-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={14} className="text-secondary" />
                    <span>Assigned Staff ({assignedStaff.length})</span>
                  </div>
                </div>

                {assignedStaff.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {assignedStaff.map((staff) => (
                      <div 
                        key={staff._id || staff.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--bg-surface)',
                          borderRadius: '6px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div>
                          <strong>{staff.firstName} {staff.lastName}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                            ({staff.email})
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStaff(staff._id || staff.id)}
                            className="btn-table-action"
                            style={{ color: '#ef4444', padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Remove staff assignment"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-dim" style={{ padding: '8px 0' }}>No staff members currently assigned.</div>
                )}

                {/* Staff Assignment Form (Admin only) */}
                {isAdmin && (
                  <form onSubmit={handleAssignStaff} style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      className="select-dropdown"
                      value={selectedStaffToAssign}
                      onChange={(e) => setSelectedStaffToAssign(e.target.value)}
                      disabled={assigningStaff}
                      style={{ flex: 1, padding: '7px 10px', fontSize: '0.85rem' }}
                    >
                      <option value="">Select staff member to assign...</option>
                      {availableStaff
                        .filter((s) => !assignedStaff.some((as) => (as._id || as.id) === (s._id || s.id)))
                        .map((s) => (
                          <option key={s._id || s.id} value={s._id || s.id}>
                            {s.firstName} {s.lastName} ({s.email})
                          </option>
                        ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!selectedStaffToAssign || assigningStaff}
                      className="btn-primary"
                      style={{ padding: '7px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <UserPlus size={14} />
                      <span>{assigningStaff ? 'Assigning...' : 'Assign Staff'}</span>
                    </button>
                  </form>
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
          )}

          {/* TAB 3: ENROLLED BENEFICIARIES */}
          {activeTab === 'beneficiaries' && (
            <div className="details-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 className="section-title" style={{ margin: 0 }}>
                  <Users size={15} />
                  <span>Enrolled Beneficiaries ({enrollmentPagination.totalItems})</span>
                </h4>
                {onManage && (
                  <button 
                    type="button" 
                    onClick={() => onManage(program)} 
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Manage Enrollment
                  </button>
                )}
              </div>

              {enrollmentLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <p>Loading beneficiaries...</p>
                </div>
              ) : enrollments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p>No beneficiaries are currently enrolled in this program.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive-wrapper">
                    <table className="user-data-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Registration #</th>
                          <th>Beneficiary Name</th>
                          <th>Status</th>
                          <th>Enrolled Date</th>
                          <th>Withdrawal Details</th>
                          {isAdmin && <th className="text-right">Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((enrollment) => {
                          const student = enrollment.studentId || {};
                          return (
                            <tr key={enrollment._id}>
                              <td>
                                <span className="code-badge-cell">{student.registrationNumber || '—'}</span>
                              </td>
                              <td>
                                <strong>{student.firstName} {student.lastName}</strong>
                              </td>
                              <td>
                                <span className={`status-pill ${
                                  enrollment.status === 'enrolled' ? 'status-active' :
                                  enrollment.status === 'completed' ? 'status-completed' : 'status-inactive'
                                }`}>
                                  {enrollment.status}
                                </span>
                              </td>
                              <td>{formatDate(enrollment.enrolledAt)}</td>
                              <td>
                                {enrollment.status === 'withdrawn' ? (
                                  <span style={{ fontSize: '0.78rem', color: '#b91c1c' }}>
                                    {enrollment.withdrawalReason || 'No reason specified'}
                                    {enrollment.withdrawnAt && ` (${formatDate(enrollment.withdrawnAt)})`}
                                  </span>
                                ) : (
                                  <span className="text-dim">—</span>
                                )}
                              </td>
                              {isAdmin && (
                                <td className="text-right">
                                  {enrollment.status === 'enrolled' && (
                                    <button
                                      type="button"
                                      onClick={() => setWithdrawingStudent(enrollment)}
                                      className="btn-table-action"
                                      style={{ color: '#ef4444', fontSize: '0.75rem', padding: '3px 8px' }}
                                    >
                                      Withdraw
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {enrollmentPagination.totalPages > 1 && (
                    <div className="pagination-bar" style={{ marginTop: '1rem' }}>
                      <div className="pagination-info">
                        Page <strong>{enrollmentPagination.currentPage}</strong> of <strong>{enrollmentPagination.totalPages}</strong>
                      </div>
                      <div className="pagination-controls">
                        <button
                          type="button"
                          className="btn-pagination"
                          disabled={enrollmentPagination.currentPage <= 1 || enrollmentLoading}
                          onClick={() => setEnrollmentPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={14} /> Previous
                        </button>
                        <button
                          type="button"
                          className="btn-pagination"
                          disabled={enrollmentPagination.currentPage >= enrollmentPagination.totalPages || enrollmentLoading}
                          onClick={() => setEnrollmentPage((p) => p + 1)}
                        >
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 4: ATTENDANCE & HISTORY */}
          {activeTab === 'attendance' && (
            <div className="details-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 className="section-title" style={{ margin: 0 }}>
                  <CalendarCheck size={15} />
                  <span>Session Attendance Records</span>
                </h4>
                {onManage && (
                  <button 
                    type="button" 
                    onClick={() => onManage(program)} 
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Take Attendance
                  </button>
                )}
              </div>

              {/* Attendance Statistics Cards */}
              {attendanceStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Sessions</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{attendanceStats.totalSessions}</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>Present Marks</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>{attendanceStats.presentCount}</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#dc2626' }}>Absent Marks</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#dc2626' }}>{attendanceStats.absentCount}</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)' }}>Presence Rate</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: attendanceStats.overallPresenceRate >= 75 ? '#16a34a' : '#d97706' }}>
                      {attendanceStats.overallPresenceRate}%
                    </div>
                  </div>
                </div>
              )}

              {attendanceLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <p>Loading attendance sessions...</p>
                </div>
              ) : attendanceSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <CalendarCheck size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p>No attendance sessions have been recorded yet.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive-wrapper">
                    <table className="user-data-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Session Date</th>
                          <th>Recorded By</th>
                          <th>Present</th>
                          <th>Absent</th>
                          <th>Excused</th>
                          <th>Total</th>
                          <th>Presence Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceSessions.map((session) => (
                          <tr key={session._id}>
                            <td>
                              <strong>{formatDate(session.sessionDate)}</strong>
                            </td>
                            <td>
                              {session.recordedBy ? (
                                <span>{session.recordedBy.firstName} {session.recordedBy.lastName}</span>
                              ) : (
                                <span className="text-dim">System</span>
                              )}
                            </td>
                            <td style={{ color: '#16a34a', fontWeight: 600 }}>{session.presentCount}</td>
                            <td style={{ color: '#dc2626', fontWeight: 600 }}>{session.absentCount}</td>
                            <td style={{ color: '#d97706', fontWeight: 600 }}>{session.excusedCount}</td>
                            <td>{session.totalEntries}</td>
                            <td>
                              <span style={{ 
                                fontWeight: 600,
                                color: session.presenceRate >= 75 ? '#16a34a' : session.presenceRate >= 50 ? '#d97706' : '#dc2626'
                              }}>
                                {session.presenceRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {attendancePagination.totalPages > 1 && (
                    <div className="pagination-bar" style={{ marginTop: '1rem' }}>
                      <div className="pagination-info">
                        Page <strong>{attendancePagination.currentPage}</strong> of <strong>{attendancePagination.totalPages}</strong>
                      </div>
                      <div className="pagination-controls">
                        <button
                          type="button"
                          className="btn-pagination"
                          disabled={attendancePagination.currentPage <= 1 || attendanceLoading}
                          onClick={() => setAttendancePage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={14} /> Previous
                        </button>
                        <button
                          type="button"
                          className="btn-pagination"
                          disabled={attendancePagination.currentPage >= attendancePagination.totalPages || attendanceLoading}
                          onClick={() => setAttendancePage((p) => p + 1)}
                        >
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Metadata Footer */}
          <div className="details-metadata-row" style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
            <span>Created: {formatDateTime(program.createdAt)}</span>
            <span>Last Updated: {formatDateTime(program.updatedAt)}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
          {onManage && (
            <button type="button" onClick={() => onManage(program)} className="btn-primary">
              Enrollment &amp; Attendance Register
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>

      {/* Withdrawal Prompt Modal */}
      {withdrawingStudent && (
        <div className="modal-overlay" onClick={() => !withdrawingSubmitting && setWithdrawingStudent(null)}>
          <div 
            className="modal-container" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '440px', padding: '1.25rem' }}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <AlertCircle size={20} className="text-danger" style={{ color: '#ef4444' }} />
                <h3>Withdraw Beneficiary</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setWithdrawingStudent(null)} 
                className="modal-close-btn"
                disabled={withdrawingSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                You are withdrawing <strong>{withdrawingStudent.studentId?.firstName} {withdrawingStudent.studentId?.lastName}</strong> from <strong>{program.name}</strong>.
              </p>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Reason for Withdrawal (Optional):
                </label>
                <textarea
                  className="input-textarea"
                  rows={3}
                  placeholder="e.g. Relocated to another district, class schedule conflict, personal reasons..."
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                  disabled={withdrawingSubmitting}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button 
                type="button" 
                onClick={() => setWithdrawingStudent(null)} 
                className="btn-secondary"
                disabled={withdrawingSubmitting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmWithdraw} 
                className="btn-danger"
                disabled={withdrawingSubmitting}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px' }}
              >
                {withdrawingSubmitting ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

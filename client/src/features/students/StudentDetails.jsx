import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  GraduationCap, 
  User, 
  Mail, 
  FileText,
  ShieldCheck, 
  School, 
  CheckCircle2, 
  XCircle,
  Calendar,
  BookOpen,
  AlertTriangle,
  Sparkles,
  History,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import studentService from './studentService';

export default function StudentDetails({ student: initialStudent, isOpen, onClose }) {
  const { currentUser } = useAuth();
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'ngo_admin' || currentUser?.role === 'staff';

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'programs' | 'quality' | 'history'
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // AI Proposal state for in-profile review
  const [activeProposal, setActiveProposal] = useState(null); // { field, findingId, proposedValue, confidenceCategory, reasoning, proposalToken }
  const [proposalLoading, setProposalLoading] = useState(false);

  const studentId = initialStudent?._id || initialStudent?.id;

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await studentService.getStudentById(studentId);
      if (res.success && res.data) {
        setProfileData(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch enriched student profile:', err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchProfile();
      setActiveTab('overview');
      setActiveProposal(null);
    } else {
      setProfileData(null);
    }
  }, [isOpen, studentId, fetchProfile]);

  if (!isOpen || !initialStudent) return null;

  const student = profileData?.student || initialStudent;
  const enrollments = profileData?.enrollments || [];
  const attendance = profileData?.attendance || { totalSessions: 0, presentCount: 0, absentCount: 0, excusedCount: 0, presenceRate: 0, recent: [] };
  const dataQuality = profileData?.dataQuality || null;
  const duplicates = profileData?.duplicates || [];
  const auditLogs = profileData?.auditLogs || [];

  const formatDate = (dateString) => {
    if (!dateString) return 'Not recorded';
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="status-pill status-active"><span className="status-dot"></span>Active</span>;
      case 'graduated':
        return <span className="status-pill status-graduated"><span className="status-dot"></span>Graduated</span>;
      case 'transferred':
        return <span className="status-pill status-transferred"><span className="status-dot"></span>Transferred</span>;
      case 'inactive':
        return <span className="status-pill status-inactive"><span className="status-dot"></span>Inactive</span>;
      default:
        return <span className="status-pill status-outline">{status || 'Unknown'}</span>;
    }
  };

  const getDqiColor = (rating) => {
    switch (rating) {
      case 'Excellent': return '#10b981';
      case 'Good': return '#3b82f6';
      case 'Fair': return '#f59e0b';
      case 'Poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Request AI Proposal for a specific finding
  const handleRequestAiProposal = async (finding) => {
    setProposalLoading(true);
    try {
      const issueType = finding.type || finding.issueType || 'inconsistent_format';
      const res = await studentService.proposeAiCorrection({
        recordId: student._id || student.id,
        field: finding.field,
        issueType
      });

      const prop = res.data?.proposal || res.data;
      if (res.success && prop) {
        if (prop.available && prop.proposalToken) {
          setActiveProposal({
            field: prop.field,
            issueType: prop.issueType || issueType,
            findingId: finding.id || `${studentId}:invalid_value:${prop.field}`,
            proposedValue: prop.proposedValue,
            confidenceCategory: prop.confidenceCategory,
            reasoning: prop.reasoning,
            proposalToken: prop.proposalToken
          });
          showNotification('success', `AI suggested correction for ${prop.field}`);
        } else {
          showNotification('info', prop.message || prop.reason || 'AI proposal not available for this finding');
        }
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to request AI correction proposal');
    } finally {
      setProposalLoading(false);
    }
  };

  // Apply or Reject AI Proposal
  const handleReviewProposal = async (decision) => {
    if (!activeProposal) return;
    setActionLoading(true);
    try {
      const res = await studentService.submitReview({
        recordId: student._id || student.id,
        field: activeProposal.field,
        issueType: activeProposal.issueType || 'inconsistent_format',
        decision,
        proposedValue: activeProposal.proposedValue,
        proposalToken: activeProposal.proposalToken
      });

      if (res.success) {
        showNotification(
          'success',
          decision === 'accept'
            ? `Correction accepted! ${activeProposal.field} updated to "${activeProposal.proposedValue}".`
            : `Proposal rejected. No changes made to ${activeProposal.field}.`
        );
        setActiveProposal(null);
        await fetchProfile(); // Reload enriched profile with updated DQI
      }
    } catch (err) {
      showNotification('error', err.message || 'Failed to submit review');
    } finally {
      setActionLoading(false);
    }
  };

  const linkedUser = student.userId;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container student-details-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', width: '92vw' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="student-avatar-modal">
              <GraduationCap size={24} className="text-primary" />
            </div>
            <div>
              <h3>{student.firstName} {student.lastName}</h3>
              <div className="modal-subtitle-row">
                <span className="reg-badge">{student.registrationNumber}</span>
                {getStatusBadge(student.status)}
                {dataQuality && (
                  <span 
                    className="badge" 
                    style={{ 
                      backgroundColor: `${getDqiColor(dataQuality.rating)}18`, 
                      color: getDqiColor(dataQuality.rating), 
                      border: `1px solid ${getDqiColor(dataQuality.rating)}40`,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      padding: '2px 8px'
                    }}
                  >
                    DQI: {dataQuality.score !== null ? `${dataQuality.score}/100` : 'N/A'} ({dataQuality.rating})
                  </span>
                )}
                {duplicates.length > 0 && (
                  <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    {duplicates.length} Duplicate Warning{duplicates.length > 1 ? 's' : ''}
                  </span>
                )}
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

        {/* Tab Navigation Bar */}
        <div className="profile-tabs-nav" style={{ display: 'flex', borderBottom: '1px solid var(--border-color, #e5e7eb)', padding: '0 1.5rem', background: 'var(--card-bg, #ffffff)' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid var(--primary-color, #4f46e5)' : '2px solid transparent',
              color: activeTab === 'overview' ? 'var(--primary-color, #4f46e5)' : 'var(--text-muted, #6b7280)',
              fontWeight: activeTab === 'overview' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <User size={15} />
            <span>Profile Overview</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'programs' ? 'active' : ''}`}
            onClick={() => setActiveTab('programs')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'programs' ? '2px solid var(--primary-color, #4f46e5)' : '2px solid transparent',
              color: activeTab === 'programs' ? 'var(--primary-color, #4f46e5)' : 'var(--text-muted, #6b7280)',
              fontWeight: activeTab === 'programs' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <BookOpen size={15} />
            <span>Programs & Attendance</span>
            {enrollments.length > 0 && (
              <span className="count-pill" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>{enrollments.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'quality' ? 'active' : ''}`}
            onClick={() => setActiveTab('quality')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'quality' ? '2px solid var(--primary-color, #4f46e5)' : '2px solid transparent',
              color: activeTab === 'quality' ? 'var(--primary-color, #4f46e5)' : 'var(--text-muted, #6b7280)',
              fontWeight: activeTab === 'quality' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Sparkles size={15} />
            <span>Data Quality & AI</span>
            {dataQuality?.deductions?.length > 0 && (
              <span className="count-pill" style={{ fontSize: '0.7rem', padding: '1px 6px', background: '#fee2e2', color: '#b91c1c' }}>
                {dataQuality.deductions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'history' ? '2px solid var(--primary-color, #4f46e5)' : '2px solid transparent',
              color: activeTab === 'history' ? 'var(--primary-color, #4f46e5)' : 'var(--text-muted, #6b7280)',
              fontWeight: activeTab === 'history' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <History size={15} />
            <span>Duplicates & Audit</span>
            {duplicates.length > 0 && (
              <span className="count-pill" style={{ fontSize: '0.7rem', padding: '1px 6px', background: '#fef3c7', color: '#b45309' }}>
                {duplicates.length}
              </span>
            )}
          </button>
        </div>

        {/* In-Modal Notification */}
        {notification && (
          <div className={`notification-toast alert-${notification.type}`} style={{ margin: '1rem 1.5rem 0 1.5rem' }}>
            <span>{notification.message}</span>
            <button type="button" onClick={() => setNotification(null)} className="toast-close-btn">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="student-details-scroll-content" style={{ maxHeight: '68vh', overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {loading ? (
            <div className="card loading-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="auth-spinner"></div>
              <p>Refreshing beneficiary lifecycle data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & DEMOGRAPHICS */}
              {activeTab === 'overview' && (
                <>
                  <div className="details-section">
                    <h4 className="section-title">
                      <User size={15} />
                      <span>Personal Information</span>
                    </h4>
                    <div className="details-info-grid">
                      <div className="info-cell">
                        <div className="info-cell-label">Registration Number</div>
                        <div className="info-cell-value reg-highlight">{student.registrationNumber}</div>
                      </div>
                      <div className="info-cell">
                        <div className="info-cell-label">Full Name</div>
                        <div className="info-cell-value">{student.firstName} {student.lastName}</div>
                      </div>
                      <div className="info-cell full-width">
                        <div className="info-cell-label">Student Record System ID</div>
                        <div className="info-cell-value code-font">{student._id || student.id}</div>
                      </div>
                      <div className="info-cell">
                        <div className="info-cell-label">Date of Birth</div>
                        <div className="info-cell-value">{formatDate(student.dateOfBirth)}</div>
                      </div>
                      <div className="info-cell">
                        <div className="info-cell-label">Gender</div>
                        <div className="info-cell-value role-capitalize">{student.gender || 'Not specified'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="details-section">
                    <h4 className="section-title">
                      <Mail size={15} />
                      <span>Contact & Address Information</span>
                    </h4>
                    <div className="details-info-grid">
                      <div className="info-cell">
                        <div className="info-cell-label">Phone Number</div>
                        <div className="info-cell-value">{student.phone || 'Not provided'}</div>
                      </div>
                      <div className="info-cell">
                        <div className="info-cell-label">Email Address</div>
                        <div className="info-cell-value">{student.email || 'Not provided'}</div>
                      </div>
                      <div className="info-cell full-width">
                        <div className="info-cell-label">Address</div>
                        <div className="info-cell-value">{student.address || 'Not provided'}</div>
                      </div>
                      <div className="info-cell">
                        <div className="info-cell-label">State / Region</div>
                        <div className="info-cell-value">{student.state || 'Not provided'}</div>
                      </div>
                      <div className="info-cell">
                        <div className="info-cell-label">PIN Code</div>
                        <div className="info-cell-value">{student.pinCode || 'Not provided'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="details-section">
                    <h4 className="section-title">
                      <School size={15} />
                      <span>Guardian & Education Details</span>
                    </h4>
                    <div className="details-info-grid">
                      <div className="info-cell">
                        <div className="info-cell-label">Guardian Name</div>
                        <div className="info-cell-value">{student.guardianName || 'Not recorded'}</div>
                      </div>
                      <div className="info-cell">
                        <div className="info-cell-label">Relationship</div>
                        <div className="info-cell-value">{student.guardianRelationship || 'Not recorded'}</div>
                      </div>
                      <div className="info-cell">
                        <div className="info-cell-label">Education Level</div>
                        <div className="info-cell-value">{student.educationLevel || 'Not specified'}</div>
                      </div>
                      <div className="info-cell">
                        <div className="info-cell-label">School / Institution</div>
                        <div className="info-cell-value">{student.schoolName || 'Not recorded'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="details-section">
                    <h4 className="section-title">
                      <ShieldCheck size={15} />
                      <span>Login Account Linking</span>
                    </h4>
                    <div className="linked-account-card">
                      {linkedUser ? (
                        <div className="linked-user-box active">
                          <div className="linked-icon-circle">
                            <CheckCircle2 size={18} className="text-success" />
                          </div>
                          <div className="linked-info">
                            <div className="linked-title">
                              <span>Linked Account: <strong>{linkedUser.firstName} {linkedUser.lastName}</strong></span>
                              <span className={`status-pill ${linkedUser.isActive ? 'status-active' : 'status-inactive'}`}>
                                {linkedUser.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="linked-email">{linkedUser.email}</div>
                            <div className="linked-sub">Role: {linkedUser.role?.toUpperCase()} • ID: {linkedUser._id || linkedUser.id}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="linked-user-box none">
                          <div className="linked-icon-circle text-dim">
                            <XCircle size={18} />
                          </div>
                          <div className="linked-info">
                            <div className="linked-title">No User Account Linked</div>
                            <div className="linked-sub">This beneficiary is recorded as an offline/in-person beneficiary without direct portal credentials.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {student.notes && (
                    <div className="details-section">
                      <h4 className="section-title">
                        <FileText size={15} />
                        <span>Notes & Remarks</span>
                      </h4>
                      <div className="notes-box">{student.notes}</div>
                    </div>
                  )}

                  <div className="details-metadata-row">
                    <span>Created: {formatDateTime(student.createdAt)}</span>
                    <span>Last Updated: {formatDateTime(student.updatedAt)}</span>
                  </div>
                </>
              )}

              {/* TAB 2: PROGRAMS & ATTENDANCE */}
              {activeTab === 'programs' && (
                <>
                  <div className="details-section">
                    <h4 className="section-title">
                      <BookOpen size={15} />
                      <span>Program Enrollments ({enrollments.length})</span>
                    </h4>
                    {enrollments.length === 0 ? (
                      <div className="table-empty-state" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <p className="text-muted">No program enrollments recorded for this beneficiary.</p>
                      </div>
                    ) : (
                      <div className="table-responsive-wrapper" style={{ marginTop: '0.75rem' }}>
                        <table className="user-data-table">
                          <thead>
                            <tr>
                              <th>Program</th>
                              <th>Code</th>
                              <th>Type</th>
                              <th>Status</th>
                              <th>Enrolled At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enrollments.map((enr) => (
                              <tr key={enr._id}>
                                <td>
                                  <strong>{enr.programId?.name || 'Program'}</strong>
                                  {enr.programId?.category && (
                                    <div className="text-dim" style={{ fontSize: '0.75rem' }}>{enr.programId.category}</div>
                                  )}
                                </td>
                                <td>
                                  <span className="code-font">{enr.programId?.code || '—'}</span>
                                </td>
                                <td className="role-capitalize">{enr.programId?.type || '—'}</td>
                                <td>
                                  <span className={`status-pill ${enr.status === 'enrolled' ? 'status-active' : enr.status === 'completed' ? 'status-graduated' : 'status-inactive'}`}>
                                    {enr.status.toUpperCase()}
                                  </span>
                                </td>
                                <td>{formatDate(enr.enrolledAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Attendance Summary */}
                  <div className="details-section">
                    <h4 className="section-title">
                      <Calendar size={15} />
                      <span>Attendance History & Presence Rate</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', margin: '0.75rem 0 1.25rem 0' }}>
                      <div className="info-cell" style={{ textAlign: 'center', padding: '0.75rem' }}>
                        <div className="info-cell-label">Total Sessions</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color, #4f46e5)' }}>
                          {attendance.totalSessions}
                        </div>
                      </div>
                      <div className="info-cell" style={{ textAlign: 'center', padding: '0.75rem' }}>
                        <div className="info-cell-label">Present</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                          {attendance.presentCount}
                        </div>
                      </div>
                      <div className="info-cell" style={{ textAlign: 'center', padding: '0.75rem' }}>
                        <div className="info-cell-label">Absent</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
                          {attendance.absentCount}
                        </div>
                      </div>
                      <div className="info-cell" style={{ textAlign: 'center', padding: '0.75rem' }}>
                        <div className="info-cell-label">Excused</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                          {attendance.excusedCount}
                        </div>
                      </div>
                      <div className="info-cell" style={{ textAlign: 'center', padding: '0.75rem' }}>
                        <div className="info-cell-label">Presence Rate</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: attendance.presenceRate >= 75 ? '#10b981' : attendance.presenceRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {attendance.presenceRate}%
                        </div>
                      </div>
                    </div>

                    {/* Recent Sessions Table */}
                    {attendance.recent && attendance.recent.length > 0 ? (
                      <div className="table-responsive-wrapper">
                        <table className="user-data-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Program</th>
                              <th>Status</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendance.recent.map((rec, i) => (
                              <tr key={i}>
                                <td>{formatDate(rec.sessionDate)}</td>
                                <td>
                                  <strong>{rec.programName}</strong>
                                  {rec.programCode && <span className="text-dim" style={{ marginLeft: '4px' }}>({rec.programCode})</span>}
                                </td>
                                <td>
                                  <span className={`status-pill ${rec.status === 'present' ? 'status-active' : rec.status === 'absent' ? 'status-inactive' : 'status-outline'}`}>
                                    {rec.status.toUpperCase()}
                                  </span>
                                </td>
                                <td>{rec.note || <span className="text-dim">—</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No individual attendance session entries recorded yet.</p>
                    )}
                  </div>
                </>
              )}

              {/* TAB 3: DATA QUALITY & AI PROPOSALS */}
              {activeTab === 'quality' && (
                <>
                  {dataQuality ? (
                    <div>
                      {/* DQI Score Overview Card */}
                      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: `5px solid ${getDqiColor(dataQuality.rating)}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', fontWeight: 600 }}>
                              Data Quality Index (DQI)
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: getDqiColor(dataQuality.rating) }}>
                              {dataQuality.score !== null ? `${dataQuality.score}/100` : 'N/A'}
                              <span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: `${getDqiColor(dataQuality.rating)}18` }}>
                                {dataQuality.rating}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', maxWidth: '350px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-color, #374151)' }}>
                              {dataQuality.summary?.executiveSummary || 'Deterministic quality assessment'}
                            </div>
                          </div>
                        </div>

                        {/* 4 Dimensions Bar */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)' }}>Completeness (35%)</div>
                            <strong style={{ fontSize: '1.1rem' }}>{dataQuality.dimensions?.completeness !== undefined ? `${dataQuality.dimensions.completeness}%` : '—'}</strong>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)' }}>Validity (35%)</div>
                            <strong style={{ fontSize: '1.1rem' }}>{dataQuality.dimensions?.validity !== undefined ? `${dataQuality.dimensions.validity}%` : '—'}</strong>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)' }}>Standardization (15%)</div>
                            <strong style={{ fontSize: '1.1rem' }}>{dataQuality.dimensions?.standardization !== undefined ? `${dataQuality.dimensions.standardization}%` : '—'}</strong>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)' }}>Uniqueness (15%)</div>
                            <strong style={{ fontSize: '1.1rem' }}>{dataQuality.dimensions?.uniqueness !== undefined ? `${dataQuality.dimensions.uniqueness}%` : '—'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Active AI Proposal Card (if one was requested) */}
                      {activeProposal && (
                        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: '#f0fdf4', border: '1px solid #86efac' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <Sparkles size={18} style={{ color: '#16a34a' }} />
                            <strong style={{ color: '#15803d' }}>AI Suggested Correction: {activeProposal.field}</strong>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>
                              {activeProposal.confidenceCategory?.toUpperCase()} CONFIDENCE
                            </span>
                          </div>

                          <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6b7280)' }}>Proposed Value:</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color, #1f2937)' }}>
                              "{activeProposal.proposedValue}"
                            </div>
                          </div>

                          <div style={{ fontSize: '0.875rem', color: 'var(--text-color, #374151)', marginBottom: '1rem' }}>
                            <strong>Reasoning:</strong> {activeProposal.reasoning}
                          </div>

                          <div style={{ fontSize: '0.8rem', color: '#65a30d', fontStyle: 'italic', marginBottom: '1rem' }}>
                            Mandatory human review: accepting this proposal will update the beneficiary record with server-validated cryptographic HMAC provenance.
                          </div>

                          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleReviewProposal('reject')}
                              disabled={actionLoading}
                              className="btn-secondary"
                              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                            >
                              Reject Proposal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewProposal('accept')}
                              disabled={actionLoading}
                              className="btn-primary"
                              style={{ fontSize: '0.85rem', padding: '6px 12px', background: '#16a34a', borderColor: '#15803d' }}
                            >
                              {actionLoading ? 'Applying...' : 'Accept & Apply Fix'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Deterministic Findings & Deductions */}
                      <div className="details-section">
                        <h4 className="section-title">
                          <AlertTriangle size={15} />
                          <span>Quality Findings & Deductions ({dataQuality.deductions?.length || 0})</span>
                        </h4>

                        {!dataQuality.deductions || dataQuality.deductions.length === 0 ? (
                          <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 0.5rem auto' }} />
                            <h4 style={{ margin: '0 0 0.25rem 0', color: '#065f46' }}>Perfect Data Quality</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#047857' }}>
                              All mandatory fields are populated, phone and PIN formats conform to Indian national standards, and no duplicate candidates exist.
                            </p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                            {dataQuality.deductions.map((ded, idx) => {
                              const matchingFlag = (dataQuality.findings || []).find((f) => f.field === ded.field);
                              return (
                                <div 
                                  key={idx} 
                                  style={{ 
                                    padding: '0.875rem 1rem', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--border-color, #e5e7eb)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'var(--card-bg, #ffffff)'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <strong style={{ textTransform: 'capitalize' }}>{ded.field}</strong>
                                      <span className="badge" style={{ fontSize: '0.7rem', padding: '1px 6px', background: '#fee2e2', color: '#b91c1c' }}>
                                        -{ded.pointsDeducted} pts ({ded.dimension})
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-color, #4b5563)', marginTop: '4px' }}>
                                      {ded.reason}
                                    </div>
                                  </div>

                                  {canManage && matchingFlag && (
                                    <button
                                      type="button"
                                      onClick={() => handleRequestAiProposal(matchingFlag)}
                                      disabled={proposalLoading}
                                      className="btn-action btn-sm"
                                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '4px 10px' }}
                                    >
                                      {proposalLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                      <span>Request AI Fix</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Quality evaluation not yet loaded.</p>
                  )}
                </>
              )}

              {/* TAB 4: DUPLICATES & AUDIT TRAIL */}
              {activeTab === 'history' && (
                <>
                  {/* Duplicate Warnings */}
                  <div className="details-section">
                    <h4 className="section-title">
                      <AlertTriangle size={15} />
                      <span>Potential Duplicate Warnings ({duplicates.length})</span>
                    </h4>
                    {duplicates.length === 0 ? (
                      <p className="text-muted" style={{ padding: '0.75rem 0' }}>No potential duplicates detected within your organization.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                        {duplicates.map((dup, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              padding: '0.75rem 1rem', 
                              borderRadius: '8px', 
                              border: '1px solid #fcd34d', 
                              background: '#fffbeb' 
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong>{dup.name}</strong>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                                {(dup.confidence || 'MEDIUM').toUpperCase()} CONFIDENCE ({Math.round((dup.score || 0.85) * 100)}%)
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#78350f', marginTop: '4px' }}>
                              Registration: {dup.registrationNumber || 'N/A'} • {dup.reason}
                            </div>
                            {dup.matchedFields && dup.matchedFields.length > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '4px' }}>
                                Matched factors: {dup.matchedFields.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audit History Timeline */}
                  <div className="details-section">
                    <h4 className="section-title">
                      <History size={15} />
                      <span>Audit Activity History ({auditLogs.length})</span>
                    </h4>
                    {auditLogs.length === 0 ? (
                      <p className="text-muted" style={{ padding: '0.75rem 0' }}>No recorded audit events for this beneficiary.</p>
                    ) : (
                      <div className="table-responsive-wrapper" style={{ marginTop: '0.5rem' }}>
                        <table className="user-data-table">
                          <thead>
                            <tr>
                              <th>Action</th>
                              <th>Actor</th>
                              <th>Details</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.map((log) => (
                              <tr key={log._id}>
                                <td>
                                  <span className={`status-pill ${log.action === 'create' ? 'status-active' : log.action === 'delete' ? 'status-inactive' : 'status-outline'}`}>
                                    {log.action.toUpperCase()}
                                  </span>
                                </td>
                                <td>
                                  {log.actorId ? (
                                    <div>
                                      <strong>{log.actorId.firstName} {log.actorId.lastName}</strong>
                                      <div className="text-dim" style={{ fontSize: '0.75rem' }}>{log.actorId.role}</div>
                                    </div>
                                  ) : (
                                    <span className="text-dim">System / Anonymous</span>
                                  )}
                                </td>
                                <td>
                                  {log.metadata?.modifiedFields ? (
                                    <span>Modified: {log.metadata.modifiedFields.join(', ')}</span>
                                  ) : log.metadata?.field ? (
                                    <span>{log.metadata.field}: {String(log.metadata.value)}</span>
                                  ) : log.metadata?.decision ? (
                                    <span>AI Review: {log.metadata.decision} ({log.metadata.targetField})</span>
                                  ) : (
                                    <span className="text-dim">Standard operation</span>
                                  )}
                                </td>
                                <td>{formatDateTime(log.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color, #e5e7eb)', padding: '1rem 1.5rem', background: 'var(--card-bg, #ffffff)' }}>
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
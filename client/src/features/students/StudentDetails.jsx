import React from 'react';
import { 
  X, 
  GraduationCap, 
  User, 
  Mail, 
  FileText,
  ShieldCheck, 
  School, 
  Heart, 
  CheckCircle2, 
  XCircle
} from 'lucide-react';

export default function StudentDetails({ student, isOpen, onClose }) {
  if (!isOpen || !student) return null;

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

  const linkedUser = student.userId;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container student-details-modal" 
        onClick={(e) => e.stopPropagation()}
      >
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

        <div className="student-details-scroll-content">
          {/* Section 1: Personal Information */}
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
                <div className="info-cell-label">
                  {student.userId
                    ? 'Student Login ID (share this with the student)'
                    : 'Student Record System ID (link a student account before sharing it as a login ID)'}
                </div>
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

          {/* Section 2: Contact Information */}
          <div className="details-section">
            <h4 className="section-title">
              <Mail size={15} />
              <span>Contact Information</span>
            </h4>
            <div className="details-info-grid">
              <div className="info-cell">
                <div className="info-cell-label">Phone Number</div>
                <div className="info-cell-value">{student.phone || 'Not provided'}</div>
              </div>
              <div className="info-cell">
                <div className="info-cell-label">Student Email</div>
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

          {/* Section 3: Guardian Details */}
          <div className="details-section">
            <h4 className="section-title">
              <Heart size={15} />
              <span>Guardian Details</span>
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
            </div>
          </div>

          {/* Section 4: Education Information */}
          <div className="details-section">
            <h4 className="section-title">
              <School size={15} />
              <span>Education Information</span>
            </h4>
            <div className="details-info-grid">
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

          {/* Section 5: Linked User Account */}
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
                    <div className="linked-sub">This beneficiary is recorded as an offline/in-person student without direct web login credentials.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Notes & Metadata */}
          {student.notes && (
            <div className="details-section">
              <h4 className="section-title">
                <FileText size={15} />
                <span>Notes & Remarks</span>
              </h4>
              <div className="notes-box">
                {student.notes}
              </div>
            </div>
          )}

          <div className="details-metadata-row">
            <span>Created: {formatDateTime(student.createdAt)}</span>
            <span>Last Updated: {formatDateTime(student.updatedAt)}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

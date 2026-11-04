import React from 'react';
import { 
  X, 
  User, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Hash
} from 'lucide-react';

export default function UserDetails({ user, isOpen, onClose }) {
  if (!isOpen || !user) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'badge-admin';
      case 'ngo_admin':
        return 'badge-admin';
      case 'staff':
        return 'badge-staff';
      case 'volunteer':
        return 'badge-volunteer';
      case 'student':
        return 'badge-student';
      default:
        return 'badge-outline';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container user-details-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="user-avatar-modal">
              <User size={22} className="text-primary" />
            </div>
            <div>
              <h3>{user.firstName} {user.lastName}</h3>
              <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                {user.role === 'ngo_admin' ? 'ORGANIZATION ADMIN' : user.role ? user.role.toUpperCase() : 'USER'}
              </span>
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

        <div className="user-details-body">
          <div className="details-info-grid">
            <div className="info-cell">
              <div className="info-cell-label">
                <Mail size={14} />
                <span>Email Address</span>
              </div>
              <div className="info-cell-value">{user.email}</div>
            </div>

            <div className="info-cell">
              <div className="info-cell-label">
                <ShieldCheck size={14} />
                <span>Role Permission</span>
              </div>
              <div className="info-cell-value">
                <span className="role-capitalize">{user.role === 'ngo_admin' ? 'Organization Admin' : user.role}</span>
              </div>
            </div>

            <div className="info-cell">
              <div className="info-cell-label">
                {user.isActive ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
                <span>Account Status</span>
              </div>
              <div className="info-cell-value">
                {user.isActive ? (
                  <span className="status-badge-inline status-active">Active</span>
                ) : (
                  <span className="status-badge-inline status-inactive">Deactivated</span>
                )}
              </div>
            </div>

            <div className="info-cell">
              <div className="info-cell-label">
                <Clock size={14} />
                <span>Last Login</span>
              </div>
              <div className="info-cell-value">{formatDate(user.lastLogin)}</div>
            </div>

            <div className="info-cell">
              <div className="info-cell-label">
                <Calendar size={14} />
                <span>Account Created</span>
              </div>
              <div className="info-cell-value">{formatDate(user.createdAt)}</div>
            </div>

            <div className="info-cell">
              <div className="info-cell-label">
                <Calendar size={14} />
                <span>Last Updated</span>
              </div>
              <div className="info-cell-value">{formatDate(user.updatedAt)}</div>
            </div>

            <div className="info-cell">
              <div className="info-cell-label">
                <Hash size={14} />
                <span>System ID</span>
              </div>
              <div className="info-cell-value code-font">{user._id || user.id}</div>
            </div>
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

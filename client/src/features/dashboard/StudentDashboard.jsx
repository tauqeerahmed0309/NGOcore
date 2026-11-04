import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, BookOpen, Calendar } from 'lucide-react';
import ChangePasswordModal from '../auth/ChangePasswordModal';

function getInitials(firstName, lastName) {
  return ((firstName || '').charAt(0) + (lastName || '').charAt(0)).toUpperCase() || '?';
}

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div className="dashboard-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Welcome, {currentUser?.firstName}. View your personal records below.</p>
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="btn-secondary"
          id="student-change-password-btn"
        >
          <KeyRound size={15} aria-hidden="true" />
          <span>Change Password</span>
        </button>
      </div>

      {/* Quick link */}
      <div className="dash-quick-stats">
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-blue">
            <BookOpen size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">My Records</span>
            <span className="quick-stat-desc">View your student profile and program information</span>
          </div>
          <Link to="/students" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-amber"><Calendar size={20} /></div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">My Programs</span>
            <span className="quick-stat-desc">View enrolled activities and schedules</span>
          </div>
          <Link to="/programs" className="quick-stat-link">View →</Link>
        </div>
      </div>

      {/* Profile card */}
      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar-large" aria-hidden="true">
            {getInitials(currentUser?.firstName, currentUser?.lastName)}
          </div>
          <div className="profile-card-info">
            <h3 className="profile-card-name">
              {currentUser?.firstName} {currentUser?.lastName}
            </h3>
            <p className="profile-card-email">{currentUser?.email}</p>
            <div className="profile-role-badge role-student">Student</div>
          </div>
        </div>
        <div className="profile-card-body">
          <div className="profile-detail-grid">
            <div className="profile-detail-item">
              <span className="profile-detail-label">Account Status</span>
              <span className="profile-detail-value status-active">Active</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">Access Level</span>
              <span className="profile-detail-value">Personal Records Only</span>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">Last Login</span>
              <span className="profile-detail-value">
                {currentUser?.lastLogin
                  ? new Date(currentUser.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'This session'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Calendar, GraduationCap } from 'lucide-react';
import ChangePasswordModal from '../auth/ChangePasswordModal';

function getInitials(firstName, lastName) {
  return ((firstName || '').charAt(0) + (lastName || '').charAt(0)).toUpperCase() || '?';
}

export default function VolunteerDashboard() {
  const { currentUser } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div className="dashboard-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {currentUser?.firstName}. View your assigned programs and activities.</p>
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="btn-secondary"
          id="volunteer-change-password-btn"
        >
          <KeyRound size={15} aria-hidden="true" />
          <span>Change Password</span>
        </button>
      </div>

      {/* Quick links */}
      <div className="dash-quick-stats">
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-amber">
            <Calendar size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Programs &amp; Activities</span>
            <span className="quick-stat-desc">View your assigned programs</span>
          </div>
          <Link to="/programs" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-blue">
            <GraduationCap size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Student Profiles</span>
            <span className="quick-stat-desc">Read-only access to student records</span>
          </div>
          <Link to="/students" className="quick-stat-link">View →</Link>
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
            <div className="profile-role-badge role-volunteer">Volunteer</div>
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
              <span className="profile-detail-value">Assigned Programs (Read Access)</span>
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

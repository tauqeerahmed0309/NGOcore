import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  KeyRound,
  Users,
  GraduationCap,
  Calendar,
  FileBarChart,
  TrendingUp,
  HeartHandshake,
  Receipt,
  CreditCard,
  UserCheck,
  CheckSquare,
  CalendarDays,
  Package,
  FileText
} from 'lucide-react';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import AIInsightsCard from './AIInsightsCard';
import OperationalReminders from './OperationalReminders';
import AnalyticsSummaryCard from './AnalyticsSummaryCard';
import FinancialSummaryCard from './FinancialSummaryCard';

function getInitials(firstName, lastName) {
  return ((firstName || '').charAt(0) + (lastName || '').charAt(0)).toUpperCase() || '?';
}

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const isNgoAdmin = currentUser?.role === 'ngo_admin';

  return (
    <div className="dashboard-view">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {currentUser?.firstName}. Here's your workspace overview.</p>
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="btn-secondary"
          id="admin-change-password-btn"
        >
          <KeyRound size={15} aria-hidden="true" />
          <span>Change Password</span>
        </button>
      </div>

      {/* Quick stats */}
      <div className="dash-quick-stats">
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-green">
            <Users size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">User Management</span>
            <span className="quick-stat-desc">Manage staff, volunteers &amp; students</span>
          </div>
          <Link to="/admin/users" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-blue">
            <GraduationCap size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Student Records</span>
            <span className="quick-stat-desc">View and manage beneficiary profiles</span>
          </div>
          <Link to="/students" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-amber">
            <Calendar size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Programs &amp; Activities</span>
            <span className="quick-stat-desc">Create and manage NGO programs</span>
          </div>
          <Link to="/programs" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-green"><FileBarChart size={20} /></div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Reports &amp; Exports</span>
            <span className="quick-stat-desc">Download participation reports</span>
          </div>
          <Link to="/reports" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-purple">
            <TrendingUp size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Organization Analytics</span>
            <span className="quick-stat-desc">Demographics, capacity &amp; performance</span>
          </div>
          <Link to="/analytics" className="quick-stat-link" id="admin-analytics-quick-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-green">
            <HeartHandshake size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Donors &amp; Partners</span>
            <span className="quick-stat-desc">Manage donor profiles &amp; history</span>
          </div>
          <Link to="/donors" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-blue">
            <Receipt size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Donations &amp; Receipts</span>
            <span className="quick-stat-desc">Record inflow, verify &amp; issue receipts</span>
          </div>
          <Link to="/donations" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-amber">
            <CreditCard size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Expenses &amp; Outflow</span>
            <span className="quick-stat-desc">Track disbursements &amp; approvals</span>
          </div>
          <Link to="/expenses" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-purple">
            <UserCheck size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Volunteers &amp; Hours</span>
            <span className="quick-stat-desc">Manage volunteers &amp; log activity</span>
          </div>
          <Link to="/volunteers" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-blue">
            <CheckSquare size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Tasks &amp; Operations</span>
            <span className="quick-stat-desc">Track operational workflows &amp; to-dos</span>
          </div>
          <Link to="/tasks" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-green">
            <CalendarDays size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Events &amp; Camps</span>
            <span className="quick-stat-desc">Workshops, medical camps &amp; outreach</span>
          </div>
          <Link to="/events" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-amber">
            <Package size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Inventory &amp; Supplies</span>
            <span className="quick-stat-desc">Stock movements &amp; asset ledger</span>
          </div>
          <Link to="/inventory" className="quick-stat-link">View →</Link>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-icon icon-blue">
            <FileText size={20} />
          </div>
          <div className="quick-stat-body">
            <span className="quick-stat-label">Documents &amp; Legal</span>
            <span className="quick-stat-desc">Certificates, MOUs &amp; compliance vault</span>
          </div>
          <Link to="/documents" className="quick-stat-link">View →</Link>
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
            <div className="profile-role-badge role-admin">{isNgoAdmin ? 'Organization Admin' : 'Administrator'}</div>
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
              <span className="profile-detail-value">{isNgoAdmin ? 'Organization Access' : 'Full System Access'}</span>
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

      <FinancialSummaryCard />
      <AnalyticsSummaryCard role={isNgoAdmin ? 'ngo_admin' : 'admin'} />
      <AIInsightsCard />
      <OperationalReminders />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}

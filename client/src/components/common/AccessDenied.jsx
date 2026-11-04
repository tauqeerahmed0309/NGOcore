import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function getDashboardPath(role) {
  switch (role) {
    case 'admin':    return '/admin/dashboard';
    case 'ngo_admin':return '/admin/dashboard';
    case 'staff':    return '/staff/dashboard';
    case 'volunteer':return '/volunteer/dashboard';
    case 'student':  return '/student/dashboard';
    default:         return '/login';
  }
}

export default function AccessDenied({ requiredRoles = [] }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="card access-denied-card">
      <div className="access-denied-content">
        <div className="access-denied-icon">
          <ShieldAlert size={44} aria-hidden="true" />
        </div>
        <h2>Access Denied</h2>
        <p className="access-denied-message">
          You don't have permission to view this page.
        </p>

        {(currentUser?.role || requiredRoles.length > 0) && (
          <div className="role-debug-box">
            {currentUser?.role && (
              <div className="role-debug-item">
                <span className="role-debug-label">Your role</span>
                <span className="role-badge current-role">{currentUser.role}</span>
              </div>
            )}
            {requiredRoles.length > 0 && (
              <div className="role-debug-item">
                <span className="role-debug-label">Required</span>
                <span className="role-badge required-role">{requiredRoles.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => navigate(getDashboardPath(currentUser?.role))}
          className="btn-back-role"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Go to My Dashboard</span>
        </button>
      </div>
    </div>
  );
}

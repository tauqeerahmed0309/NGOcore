import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, LogOut, User, ShieldAlert } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function getInitials(firstName, lastName) {
  const f = (firstName || '').charAt(0).toUpperCase();
  const l = (lastName || '').charAt(0).toUpperCase();
  return f + l || '?';
}

function getRoleLabel(role) {
  const labels = {
    admin: 'Administrator',
    ngo_admin: 'Organization Admin',
    staff: 'Staff Member',
    volunteer: 'Volunteer',
    student: 'Student',
  };
  return labels[role] || role;
}

function usePageTitle(location) {
  const map = {
    '/admin/dashboard': 'Dashboard',
    '/staff/dashboard': 'Dashboard',
    '/volunteer/dashboard': 'Dashboard',
    '/student/dashboard': 'My Profile',
    '/admin/users': 'User Management',
    '/students': 'Students & Beneficiaries',
    '/programs': 'Programs & Activities',
    '/reports': 'Reports & Exports',
    '/analytics': 'Organization Analytics',
    '/admin/analytics': 'Organization Analytics',
    '/staff/analytics': 'Organization Analytics',
    '/unauthorized': 'Access Denied',
  };
  return map[location.pathname] || 'ngocore';
}

export default function Header({ toggleSidebar }) {
  const { currentUser, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const menuRef = useRef(null);
  const pageTitle = usePageTitle(location);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Sign out of NGOcore on all devices? You will need to sign in again here.')) return;
    setActionError('');
    try {
      await logoutAll();
      navigate('/login', { replace: true });
    } catch (error) {
      setActionError(error.message || 'Could not sign out from all devices. Please try again.');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  return (
    <header className="app-header" role="banner">
      <div className="header-left">
        {/* Hamburger — mobile only */}
        <button
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Page title */}
        <h2 className="header-page-title">{pageTitle}</h2>
      </div>

      <div className="header-right">
        {/* User dropdown */}
        <div className="header-user-menu" ref={menuRef}>
          <button
            className="header-user-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="User menu"
            aria-expanded={menuOpen}
          >
            <div className="header-avatar" aria-hidden="true">
              {getInitials(currentUser?.firstName, currentUser?.lastName)}
            </div>
            <div className="header-user-info">
              <span className="header-user-name">
                {currentUser?.firstName} {currentUser?.lastName}
              </span>
              <span className="header-user-role">
                {getRoleLabel(currentUser?.role)}
              </span>
            </div>
            <ChevronDown size={15} className={`header-chevron ${menuOpen ? 'open' : ''}`} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="header-dropdown" role="menu">
              {actionError && <p className="dropdown-action-error" role="alert">{actionError}</p>}
              <div className="dropdown-user-header">
                <div className="dropdown-avatar" aria-hidden="true">
                  {getInitials(currentUser?.firstName, currentUser?.lastName)}
                </div>
                <div>
                  <div className="dropdown-user-name">
                    {currentUser?.firstName} {currentUser?.lastName}
                  </div>
                  <div className="dropdown-user-email">{currentUser?.email}</div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(
                    currentUser?.role === 'admin' || currentUser?.role === 'ngo_admin' ? '/admin/dashboard'
                    : currentUser?.role === 'staff' ? '/staff/dashboard'
                    : currentUser?.role === 'volunteer' ? '/volunteer/dashboard'
                    : '/student/dashboard'
                  );
                }}
              >
                <User size={15} aria-hidden="true" />
                <span>My Profile</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item dropdown-item-danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={15} aria-hidden="true" />
                <span>Sign Out</span>
              </button>
              <button
                className="dropdown-item dropdown-item-danger"
                role="menuitem"
                onClick={handleLogoutAll}
              >
                <ShieldAlert size={15} aria-hidden="true" />
                <span>Sign Out on All Devices</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

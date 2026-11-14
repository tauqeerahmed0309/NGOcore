import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  LogOut,
  X,
  BookOpen,
  FileBarChart,
  TrendingUp,
} from 'lucide-react';

/**
 * Role-based navigation configuration.
 * Only implemented modules are listed. Placeholder/future modules are excluded.
 */
function getNavConfig(role) {
  const dashPath = {
    admin: '/admin/dashboard',
    ngo_admin: '/admin/dashboard',
    staff: '/staff/dashboard',
    volunteer: '/volunteer/dashboard',
    student: '/student/dashboard',
  }[role] || '/';

  switch (role) {
    case 'admin':
    case 'ngo_admin':
      return [
        {
          section: 'Overview',
          items: [
            { label: 'Dashboard', path: dashPath, icon: LayoutDashboard },
          ],
        },
        {
          section: 'Management',
          items: [
            { label: 'Users', path: '/admin/users', icon: Users },
            { label: 'Students & Beneficiaries', path: '/students', icon: GraduationCap },
            { label: 'Programs & Activities', path: '/programs', icon: Calendar },
            { label: 'Reports & Exports', path: '/reports', icon: FileBarChart },
            { label: 'Organization Analytics', path: '/analytics', icon: TrendingUp },
          ],
        },
      ];

    case 'staff':
      return [
        {
          section: 'Overview',
          items: [
            { label: 'Dashboard', path: dashPath, icon: LayoutDashboard },
          ],
        },
        {
          section: 'My Work',
          items: [
            { label: 'Students & Beneficiaries', path: '/students', icon: GraduationCap },
            { label: 'Programs & Activities', path: '/programs', icon: Calendar },
            { label: 'Reports & Exports', path: '/reports', icon: FileBarChart },
            { label: 'Organization Analytics', path: '/analytics', icon: TrendingUp },
          ],
        },
      ];

    case 'volunteer':
      return [
        {
          section: 'Overview',
          items: [
            { label: 'Dashboard', path: dashPath, icon: LayoutDashboard },
          ],
        },
        {
          section: 'My Work',
          items: [
            { label: 'Programs & Activities', path: '/programs', icon: Calendar },
            { label: 'Students & Beneficiaries', path: '/students', icon: GraduationCap },
          ],
        },
      ];

    case 'student':
      return [
        {
          section: 'My Portal',
          items: [
            { label: 'My Profile', path: dashPath, icon: LayoutDashboard },
            { label: 'My Records', path: '/students', icon: BookOpen },
          ],
        },
      ];

    default:
      return [];
  }
}

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

export default function Sidebar({ isOpen, closeSidebar }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    closeSidebar();
    await logout();
    navigate('/login', { replace: true });
  };

  const navConfig = getNavConfig(currentUser?.role);

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'show' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`} aria-label="Main navigation">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo-circle" aria-hidden="true">
            <span>NC</span>
          </div>
          <div className="brand-text">
            <h3>NGOcore</h3>
            <span className="brand-sub">Digital Records for NGOs</span>
          </div>
          {/* Mobile close button */}
          <button
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Application navigation">
          {navConfig.map((group) => (
            <div key={group.section} className="nav-group">
              <div className="nav-section-label">{group.section}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `nav-item${isActive ? ' active' : ''}`
                    }
                    end={item.path === '/admin/dashboard' || item.path === '/staff/dashboard' || item.path === '/volunteer/dashboard' || item.path === '/student/dashboard' || item.path === '/analytics'}
                  >
                    <Icon size={17} className="nav-icon" aria-hidden="true" />
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User info + logout at bottom */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {getInitials(currentUser?.firstName, currentUser?.lastName)}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {currentUser?.firstName} {currentUser?.lastName}
              </span>
              <span className="sidebar-user-role">
                {getRoleLabel(currentUser?.role)}
              </span>
            </div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out of workspace"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

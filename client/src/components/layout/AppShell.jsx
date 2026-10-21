import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../common/NotificationBell';
import {
  LayoutDashboard,
  FolderLock,
  Users,
  Cpu,
  ShieldCheck,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Building2,
  Lock,
  ChevronDown,
  Sparkles,
  ExternalLink,
  BarChart3,
  Link as LinkIcon
} from 'lucide-react';

const AppShell = ({ children }) => {
  const { user, ngo, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      label: 'Records Vault',
      path: '/records',
      icon: FolderLock,
      badge: 'AES-256'
    },
    {
      label: 'Beneficiaries',
      path: '/beneficiaries',
      icon: Users,
      badge: null
    },
    {
      label: 'AI Deduplication',
      path: '/ai-clean',
      icon: Cpu,
      badge: 'AI'
    },
    {
      label: 'Immutable Audit Vault',
      path: '/audit',
      icon: ShieldCheck,
      badge: 'SHA-256'
    },
    {
      label: 'Blockchain Anchors',
      path: '/blockchain',
      icon: LinkIcon,
      badge: 'Polygon'
    },
    {
      label: 'Reports & Analytics',
      path: '/reports',
      icon: BarChart3,
      badge: null
    },
    {
      label: 'NGO Settings',
      path: '/settings',
      icon: Building2,
      badge: null
    },
    {
      label: 'My Profile',
      path: '/profile',
      icon: User,
      badge: null
    }
  ];

  const ngoName = ngo?.name || user?.ngoName || 'Organization Vault';
  const ngoRegNum = ngo?.registrationNumber || 'ID: Active';
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const isCurrentActive = (itemPath) => {
    if (itemPath === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex flex-1 relative overflow-hidden">
        {/* SIDEBAR (Desktop & Mobile Drawer) */}
        <aside
          className={`fixed lg:sticky top-0 h-screen z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${
            mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
          } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
        >
          {/* Sidebar Header / Brand */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
            <Link to="/dashboard" className="flex items-center space-x-3 overflow-hidden group">
              <div className="h-10 w-10 min-w-[2.5rem] rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="flex flex-col truncate">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 font-heading">
                    NGO<span className="text-indigo-600">core</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">Digital Record & AI Vault</span>
                </div>
              )}
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tenant NGO Information Card */}
          {(!collapsed || mobileOpen) ? (
            <div className="p-3 mx-3 my-3 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {ngo?.logo ? (
                    <img src={ngo.logo} alt="NGO" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{ngoName}</h4>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] text-slate-500 truncate">{ngoRegNum}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="my-3 flex justify-center">
              <div
                className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-slate-200 transition-colors"
                title={`${ngoName} (${ngoRegNum})`}
              >
                <Building2 className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
            {navItems.map((item) => {
              const active = isCurrentActive(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  } ${collapsed && !mobileOpen ? 'justify-center' : 'justify-between'}`}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                        active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                      }`}
                    />
                    {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                  </div>

                  {(!collapsed || mobileOpen) && item.badge && (
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                        active
                          ? 'bg-indigo-500 text-indigo-50'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Collapse Toggle Button */}
          <div className="p-3 border-t border-slate-100 hidden lg:flex items-center justify-between">
            {(!collapsed || mobileOpen) && (
              <span className="text-[11px] font-medium text-slate-400">Collapse View</span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-auto"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </aside>

        {/* MAIN APPLICATION VIEWPORT */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* TOPBAR NAVIGATION */}
          <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
            {/* Left section: Mobile menu & Contextual Breadcrumb */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-slate-400">Vault</span>
                <span className="text-slate-300">/</span>
                <span className="font-extrabold text-slate-800 capitalize">
                  {location.pathname.replace('/', '') || 'Dashboard'}
                </span>
              </div>
            </div>

            {/* Right section: Security Status, Notification Bell, User Menu */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Zero-Trust Badge */}
              <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                <Lock className="h-3 w-3 text-emerald-600" />
                <span>Zero-Trust Scoped</span>
              </div>

              {/* Notification Bell Component */}
              <NotificationBell />

              {/* User Avatar Menu Dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-xl object-cover border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                      {userInitials}
                    </div>
                  )}
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                      {user?.name || 'Authorized User'}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                      {user?.roleId?.name || (typeof user?.role === 'object' ? user?.role?.name : user?.role) || 'Team Member'}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 py-2 z-50 animate-fade-in text-xs">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{user?.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="h-4 w-4 text-slate-400" />
                        <span>User Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span>Organization Settings</span>
                      </Link>
                      <Link
                        to="/audit"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ShieldCheck className="h-4 w-4 text-slate-400" />
                        <span>Audit Vault</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center space-x-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 font-bold transition-colors"
                      >
                        <LogOut className="h-4 w-4 text-rose-500" />
                        <span>Sign Out Session</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* PAGE CONTENT CONTAINER */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children ? children : <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppShell;

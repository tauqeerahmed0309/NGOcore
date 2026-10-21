import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, ArrowRight, LayoutDashboard, LogOut, User, Settings } from 'lucide-react';
import api from '../../services/api';
import NotificationBell from '../common/NotificationBell';
import ScrollProgressBar from '../common/ScrollProgressBar';
import MagneticButton from '../common/MagneticButton';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(Boolean(token));
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setIsLoggedIn(false);
      navigate('/login');
    }
  };

  const navLinks = [
    { name: 'Features', path: '/features', anchor: '#features' },
    { name: 'Security & Trust', path: '/about', anchor: '#security' },
    { name: 'How It Works', path: '/features', anchor: '#how-it-works' },
    { name: 'FAQ', path: '/faq', anchor: '#faq' },
    { name: 'Contact', path: '/contact', anchor: '#contact' }
  ];

  const handleNavClick = (e, link) => {
    if (location.pathname === '/' && link.anchor) {
      e.preventDefault();
      const el = document.querySelector(link.anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <ScrollProgressBar />
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-white/85 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-slate-200/80 py-3'
            : 'bg-white/60 backdrop-blur-md border-b border-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo Brand */}
            <Link to="/" data-brand="true" className="brand-logo flex items-center space-x-3 group cursor-pointer">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                <div className="h-full w-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-teal-400 group-hover:rotate-6 transition-transform" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900 font-heading">
                    NGO<span className="text-indigo-600">core</span>
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                  Digital Record & AI Vault
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links with animated hover underline */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={(e) => handleNavClick(e, link)}
                    className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors group cursor-pointer ${
                      isActive
                        ? 'text-indigo-600 font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{link.name}</span>
                    {/* Animated gradient underline on hover and active */}
                    <span
                      className={`absolute bottom-0 left-3.5 right-3.5 h-0.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500 rounded-full transform transition-transform duration-300 ease-out origin-left ${
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`}
                    />
                  </Link>
                );
              })}
            </div>

            {/* Desktop Auth CTAs */}
            <div className="hidden md:flex items-center space-x-3">
              {isLoggedIn ? (
                <div className="flex items-center space-x-2.5">
                  <NotificationBell />
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow transition-all"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/profile"
                    className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      location.pathname === '/profile'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 border border-slate-200/80'
                    }`}
                    title="My Profile & Security"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    to="/settings"
                    className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      location.pathname === '/settings' || location.pathname === '/ngo/settings'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 border border-slate-200/80'
                    }`}
                    title="Organization Settings"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/70 rounded-xl transition-all cursor-pointer"
                  >
                    Sign In
                  </Link>
                  <MagneticButton
                    to="/signup"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <span>Register NGO</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </MagneticButton>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-1">
              {isLoggedIn && <NotificationBell />}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-lg border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fade-in">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={(e) => {
                    handleNavClick(e, link);
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
              {isLoggedIn ? (
                <>
                  <Link
                    to="/dashboard"
                    className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
                  >
                    My Profile & Security
                  </Link>
                  <Link
                    to="/settings"
                    className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
                  >
                    Organization Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="w-full text-center py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-sm"
                  >
                    Register Organization
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;

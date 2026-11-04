import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import UIEnhancer from '../common/UIEnhancer';

/**
 * AppShell — Top-level layout wrapper.
 * When the user is NOT authenticated, renders public pages without the workspace shell.
 * When authenticated, renders the full sidebar + header layout.
 */
export default function AppShell({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isPublicRoute = pathname === '/' || pathname === '/login' || pathname.startsWith('/signup');

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  // While auth state is being resolved, show nothing (avoids flicker)
  if (loading && !isPublicRoute) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner" />
        <p>Loading workspace...</p>
      </div>
    );
  }

  // Unauthenticated: show public routes without the workspace shell.
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Authenticated: full app shell with sidebar + header
  return (
    <>
      <UIEnhancer />
      <div className="layout-root">
      <Sidebar isOpen={sidebarOpen} closeSidebar={closeSidebar} />
      <div className="layout-content-wrapper">
        <Header toggleSidebar={toggleSidebar} />
        <main className="layout-main-content">
          <div className="content-container">
            {children}
          </div>
        </main>
      </div>
    </div>
    </>
  );
}

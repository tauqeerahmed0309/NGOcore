import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PublicLandingPage from '../landing/PublicLandingPage';

/**
 * Overview / Root Route
 * Authenticated users are redirected to their role dashboard.
 * Unauthenticated visitors see the public landing page.
 */
export default function Overview() {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !currentUser) return;

    switch (currentUser.role) {
      case 'admin':    navigate('/admin/dashboard',    { replace: true }); break;
      case 'ngo_admin':navigate('/admin/dashboard',    { replace: true }); break;
      case 'staff':    navigate('/staff/dashboard',    { replace: true }); break;
      case 'volunteer':navigate('/volunteer/dashboard',{ replace: true }); break;
      case 'student':  navigate('/student/dashboard',  { replace: true }); break;
      default:         navigate('/login',              { replace: true });
    }
  }, [loading, isAuthenticated, currentUser, navigate]);

  if (loading) return <PublicLandingPage />;
  if (!isAuthenticated || !currentUser) return <PublicLandingPage />;
  return null;
}

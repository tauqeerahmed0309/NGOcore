import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Loader2 } from 'lucide-react';

/**
 * Route guard enforcing authentication, NGO verification status, and RBAC permissions
 */
const ProtectedRoute = ({
  requiredPermission,
  requiredRoles,
  allowPendingNgo = false,
  children
}) => {
  const { user, ngo, isAuthenticated, loading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <div className="h-16 w-16 bg-indigo-50 border border-indigo-200 rounded-3xl flex items-center justify-center shadow-xs">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h4 className="text-sm font-bold text-slate-800">Verifying Cryptographic Session</h4>
          <p className="text-xs text-slate-500">Checking tenant isolation and authorization status...</p>
        </div>
      </div>
    );
  }

  // 1. Authentication Check
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. User Status Check
  if (user.status === 'suspended' || user.status === 'inactive') {
    return <Navigate to="/suspended" replace />;
  }

  // 3. NGO Tenant Status Check (SuperAdmins bypass NGO checks)
  const roleName = (typeof user.role === 'object' ? user.role?.name : (user.roleId?.name || user.role)) || '';
  const isSuperAdmin = roleName.toLowerCase() === 'superadmin';

  if (!isSuperAdmin && ngo && !allowPendingNgo) {
    const ngoStatus = ngo.status?.toLowerCase();
    if (ngoStatus === 'pending') {
      return <Navigate to="/pending-approval" replace />;
    }
    if (ngoStatus === 'rejected') {
      return <Navigate to="/rejected" replace />;
    }
    if (ngoStatus === 'suspended') {
      return <Navigate to="/suspended" replace />;
    }
  }

  // 4. Role Guard
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasRole(...requiredRoles)) {
      return <Navigate to="/403" replace />;
    }
  }

  // 5. Granular RBAC Permission Guard
  if (requiredPermission) {
    if (!hasPermission(requiredPermission)) {
      return <Navigate to="/403" replace />;
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;

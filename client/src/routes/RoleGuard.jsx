import React from 'react';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../components/common/AccessDenied';

export default function RoleGuard({ allowedRoles = [], children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <AccessDenied requiredRoles={allowedRoles} />;
  }

  const hasPermission = allowedRoles.includes(currentUser.role) ||
    (currentUser.role === 'ngo_admin' && allowedRoles.includes('admin'));

  if (!hasPermission) {
    return <AccessDenied requiredRoles={allowedRoles} />;
  }

  return children;
}

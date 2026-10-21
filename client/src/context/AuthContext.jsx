import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import userService from '../services/userService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Sync state with latest server profile on initialization
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const profile = await userService.getProfile();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      return profile;
    } catch (err) {
      console.warn('Session verification failed:', err?.response?.data?.message || err.message);
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  /**
   * Log in user with credentials and optional 2FA OTP
   */
  const login = async ({ email, password, otp, rememberMe }) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password, otp, rememberMe });
      const { accessToken, user: loggedInUser, redirect, statusNotice } = res.data.data;

      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }
      setUser(loggedInUser);
      if (loggedInUser) {
        localStorage.setItem('user', JSON.stringify(loggedInUser));
      }

      // Fetch full populated profile (with permissions and populated NGO)
      try {
        const fullProfile = await userService.getProfile();
        setUser(fullProfile);
        localStorage.setItem('user', JSON.stringify(fullProfile));
        return { success: true, user: fullProfile, redirect, statusNotice };
      } catch {
        return { success: true, user: loggedInUser, redirect, statusNotice };
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out user and revoke refresh token
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API call failed, clearing local state anyway:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  /**
   * Check if current user has a specific permission
   * Supports wildcard matching e.g. records:* covers records:read, records:write
   */
  const hasPermission = useCallback((permission) => {
    if (!user) return false;

    const roleName = (typeof user.role === 'object' ? user.role?.name : (user.roleId?.name || user.role)) || '';
    // SuperAdmin or NGO Admin wildcard
    if (roleName.toLowerCase() === 'superadmin' || roleName.toLowerCase() === 'ngo admin') {
      return true;
    }

    const permissions = Array.isArray(user.permissions)
      ? user.permissions
      : (user.role?.permissions || user.roleId?.permissions || []);

    if (permissions.includes('*') || permissions.includes(permission)) {
      return true;
    }

    // Check resource-level wildcards (e.g. records:* matches records:read)
    const [resource] = permission.split(':');
    if (permissions.includes(`${resource}:*`)) {
      return true;
    }

    return false;
  }, [user]);

  /**
   * Check if current user has any of the specified roles
   */
  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    const roleObj = user.roleId || user.role;
    const currentRoleName = (typeof roleObj === 'object' ? roleObj?.name : (roleObj || '')).toString().toLowerCase();
    return roles.some((r) => r.toLowerCase() === currentRoleName);
  }, [user]);

  const ngo = (user?.ngoId && typeof user.ngoId === 'object')
    ? user.ngoId
    : (user?.ngoStatus ? { _id: user.ngoId, name: user.ngoName, status: user.ngoStatus } : null);
  const isAuthenticated = Boolean(user && localStorage.getItem('accessToken'));

  const value = {
    user,
    ngo,
    isAuthenticated,
    loading,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasRole,
    setUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The server validates the httpOnly cookie and refreshes it if needed.
  useEffect(() => {
    localStorage.removeItem('ngo_auth_token');
    localStorage.removeItem('ngo_user_data');

    const initAuth = async () => {
      try {
        const response = await authService.getMe();
        if (response.success && response.data?.user) {
          setCurrentUser(response.data.user);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for unauthorized events emitted by Axios interceptor
    const handleUnauthorized = () => {
      setCurrentUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  /**
   * Log in user with credentials
   */
  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const loginStudent = async (studentId, password) => {
    const res = await authService.loginStudent(studentId, password);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Student login failed');
  };

  const loginWithGoogle = async (credential, role) => {
    const res = await authService.loginWithGoogle(credential, role);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Google sign-in failed');
  };

  /**
   * Change password for logged-in user
   */
  const changePassword = async (currentPassword, newPassword) => {
    return await authService.changePassword(currentPassword, newPassword);
  };

  /**
   * Log out user
   */
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setCurrentUser(null);
    }
  };

  const logoutAll = async () => {
    await authService.logoutAll();
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
    login,
    loginStudent,
    loginWithGoogle,
    logout,
    logoutAll,
    changePassword,
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

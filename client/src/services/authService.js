import api from './api';

/**
 * Authentication Service Client
 */
export const authService = {
  /**
   * Login user
   * @param {string} email
   * @param {string} password
   */
  login: async (email, password) => {
    return await api.post('/auth/login', { email, password });
  },

  loginStudent: async (studentId, password) => (
    api.post('/auth/student/login', { studentId, password })
  ),

  loginWithGoogle: async (credential, role) => (
    api.post('/auth/google', { credential, ...(role ? { role } : {}) })
  ),

  requestPasswordReset: async (email) => api.post('/auth/password/forgot', { email }),

  resetPassword: async ({ email, code, newPassword }) => (
    api.post('/auth/password/reset', { email, code, newPassword })
  ),
  setInvitedPassword: async (token, password) => (
    api.post('/auth/password/setup', { token, password })
  ),

  signup: async (details) => api.post('/auth/signup', details),

  verifySignupOtp: async (email, code) => api.post('/auth/signup/verify', { email, code }),

  resendSignupOtp: async (email) => api.post('/auth/signup/resend', { email }),

  uploadOnboardingDocument: async (file) => {
    const formData = new FormData();
    formData.append('supportingDocument', file);
    return api.post('/auth/onboarding/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  completeOnboarding: async (details) => api.post('/auth/onboarding', details),

  /**
   * Get current authenticated user profile
   */
  getMe: async () => {
    return await api.get('/auth/me');
  },

  /**
   * Change user password
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  changePassword: async (currentPassword, newPassword) => {
    return await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Clear the server-issued session cookies
   */
  logout: async () => {
    return await api.post('/auth/logout');
  },

  logoutAll: async () => {
    return await api.post('/auth/logout-all');
  }
};

export default authService;

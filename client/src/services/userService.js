import api from './api';

export const userService = {
  /**
   * Fetch authenticated user's profile with populated role and NGO
   */
  async getProfile() {
    const res = await api.get('/users/me');
    return res.data?.data;
  },

  /**
   * Update profile information (name, phone, designation, avatar)
   */
  async updateProfile(formDataOrJson) {
    const isFormData = formDataOrJson instanceof FormData;
    const res = await api.patch('/users/profile', formDataOrJson, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return res.data?.data;
  },

  /**
   * Change user password (Argon2 hash + revoke other sessions)
   */
  async changePassword({ currentPassword, newPassword }) {
    const res = await api.patch('/users/change-password', {
      currentPassword,
      newPassword
    });
    return res.data;
  },

  /**
   * Fetch all active multi-device sessions for current user
   */
  async getSessions() {
    const res = await api.get('/users/me/sessions');
    return res.data?.data || [];
  },

  /**
   * Revoke a specific active device session
   */
  async revokeSession(sessionId) {
    const res = await api.delete(`/users/me/sessions/${sessionId}`);
    return res.data;
  },

  /**
   * Revoke all active sessions except the current one
   */
  async revokeAllOtherSessions() {
    const res = await api.delete('/users/me/sessions');
    return res.data;
  }
};

export default userService;

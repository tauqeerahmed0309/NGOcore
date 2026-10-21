import api from './api';

export const ngoService = {
  /**
   * Fetch NGO profile, settings, and team telemetry
   */
  async getProfile() {
    const res = await api.get('/ngo/profile');
    return res.data?.data;
  },

  /**
   * Update NGO Profile information (name, type, address, phone, website, mission, logo)
   */
  async updateProfile(formDataOrJson) {
    const isFormData = formDataOrJson instanceof FormData;
    const res = await api.patch('/ngo/profile', formDataOrJson, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return res.data?.data;
  },

  /**
   * Update NGO Organizational Settings (currency, timezone, dateFormat, retention, 2FA, email alerts)
   */
  async updateSettings(settingsData) {
    const res = await api.patch('/ngo/settings', settingsData);
    return res.data?.data;
  }
};

export default ngoService;

import api from './api';

export const notificationService = {
  /**
   * Fetch paginated notifications with unread count
   */
  async getNotifications({ page = 1, limit = 20, unreadOnly = false } = {}) {
    const res = await api.get('/notifications', {
      params: { page, limit, unreadOnly }
    });
    return res.data;
  },

  /**
   * Get unread notifications count for bell badge
   */
  async getUnreadCount() {
    const res = await api.get('/notifications/unread-count');
    return res.data?.data?.unreadCount || 0;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data?.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  },

  /**
   * Delete a specific notification
   */
  async deleteNotification(id) {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  },

  /**
   * Clear all read notifications
   */
  async clearAllRead() {
    const res = await api.delete('/notifications/read');
    return res.data;
  }
};

export default notificationService;

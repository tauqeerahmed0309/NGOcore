import api from '../../services/api';

/**
 * Event Management API Service Client
 */
export const eventService = {
  /**
   * Fetch paginated events with search, filtering, and sorting
   */
  getEvents: async (params = {}) => {
    return await api.get('/events', { params });
  },

  /**
   * Fetch specific event record by ID with full relations, attendees, and audit logs
   */
  getEventById: async (id) => {
    return await api.get(`/events/${id}`);
  },

  /**
   * Fetch event summary counts by status, category, upcoming, and attendees
   */
  getEventSummary: async () => {
    return await api.get('/events/summary');
  },

  /**
   * Create a new event
   */
  createEvent: async (eventData) => {
    return await api.post('/events', eventData);
  },

  /**
   * Update event details
   */
  updateEvent: async (id, eventData) => {
    return await api.put(`/events/${id}`, eventData);
  },

  /**
   * Register a new attendee to an event
   */
  registerAttendee: async (id, attendeeData) => {
    return await api.post(`/events/${id}/attendees`, attendeeData);
  },

  /**
   * Check in a registered attendee
   */
  checkInAttendee: async (id, attendeeId) => {
    return await api.patch(`/events/${id}/attendees/${attendeeId}/checkin`);
  },

  /**
   * Archive / soft-delete event record (Admin only)
   */
  deleteEvent: async (id) => {
    return await api.delete(`/events/${id}`);
  },

  /**
   * Export events as CSV
   */
  exportEvents: async (params = {}) => {
    return await api.get('/events/export', {
      params,
      responseType: 'blob'
    });
  }
};

export default eventService;

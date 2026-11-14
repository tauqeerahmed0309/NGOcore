import api from '../../services/api';

/**
 * Student Management API Service Client
 */
export const studentService = {
  /**
   * Fetch paginated list of students with search and filter parameters
   */
  getStudents: async (params = {}) => {
    return await api.get('/students', { params });
  },

  /**
   * Fetch specific student details by ID with rich lifecycle data
   */
  getStudentById: async (id) => {
    return await api.get(`/students/${id}`);
  },

  /**
   * Fetch currently logged-in student's own linked profile
   */
  getMyProfile: async () => {
    return await api.get('/students/me');
  },

  /**
   * Pre-save duplicate candidate verification
   */
  checkDuplicate: async (candidateData) => {
    return await api.post('/students/check-duplicate', candidateData);
  },

  /**
   * Create a new student profile
   */
  createStudent: async (studentData) => {
    return await api.post('/students', studentData);
  },

  /**
   * Update student profile details
   */
  updateStudent: async (id, studentData) => {
    return await api.put(`/students/${id}`, studentData);
  },

  /**
   * Change student status (active, graduated, transferred, inactive)
   */
  updateStatus: async (id, status) => {
    return await api.patch(`/students/${id}/status`, { status });
  },

  /**
   * Safely delete student profile (only if no enrollments, attendance or audit history exist)
   */
  deleteStudent: async (id) => {
    return await api.delete(`/students/${id}`);
  },

  /**
   * Fetch programs list for filtering
   */
  getPrograms: async (params = {}) => {
    return await api.get('/programs', { params });
  },

  /**
   * Request AI proposal for a deterministic data quality finding
   */
  proposeAiCorrection: async ({ recordId, field, issueType }) => {
    return await api.post('/assistant/ai/propose-correction', {
      recordType: 'students',
      recordId,
      field,
      issueType: issueType || 'inconsistent_format'
    });
  },

  /**
   * Submit human review decision with signed proposal token
   */
  submitReview: async ({ recordId, field, issueType, decision, proposedValue, proposalToken }) => {
    return await api.post('/assistant/clean/students/review', {
      recordId,
      field,
      issueType: issueType || 'inconsistent_format',
      decision,
      proposedValue,
      proposalToken
    });
  }
};

export default studentService;
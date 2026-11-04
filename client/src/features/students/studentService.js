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
   * Fetch specific student details by ID
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
  }
};

export default studentService;

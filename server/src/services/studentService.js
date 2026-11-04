const Student = require('../models/Student');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * List students with search, filter, sorting and pagination
 */
const listStudents = async (
  {
    page = 1,
    limit = 10,
    search = '',
    status = 'all',
    gender = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  },
  currentUser,
  ngoFilter
) => {
  const query = ngoFilter({});

  // Role restriction: Students can only view their own linked record
  if (currentUser && currentUser.role === 'student') {
    query.userId = currentUser._id;
  }

  // 1. Text search across registrationNumber, names, email, and schoolName
  if (search && search.trim() !== '') {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    query.$or = [
      { registrationNumber: searchRegex },
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { schoolName: searchRegex }
    ];
  }

  // 2. Status filter
  if (status && status !== 'all') {
    query.status = status;
  }

  // 3. Gender filter
  if (gender && gender !== 'all') {
    query.gender = gender;
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  const totalStudents = await Student.countDocuments(query);
  const totalPages = Math.ceil(totalStudents / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const students = await Student.find(query)
    .populate('userId', 'email firstName lastName role isActive lastLogin')
    .sort({ [sortBy]: sortDirection })
    .skip(skip)
    .limit(limitNum)
    .lean({ virtuals: true });
  students.forEach((student) => { delete student.__v; });

  return {
    students,
    pagination: {
      totalStudents,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Create a new student profile
 */
const createStudent = async (data, createdById, ngoId, ngoFilter) => {
  const cleanRegNo = data.registrationNumber.trim().toUpperCase();

  // Check unique registrationNumber
  const existing = await Student.findOne(ngoFilter({ registrationNumber: cleanRegNo }));
  if (existing) {
    const error = new Error(`Student with registration number '${cleanRegNo}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  // If userId is provided, verify user account existence
  if (data.userId) {
    const userDoc = await User.findOne(ngoFilter({ _id: data.userId }));
    if (!userDoc) {
      const error = new Error('Specified user account does not exist.');
      error.statusCode = 404;
      throw error;
    }
  }

  const newStudent = await Student.create({
    ...data,
    ngoId,
    registrationNumber: cleanRegNo,
    createdBy: createdById
  });

  await newStudent.populate('userId', 'email firstName lastName role isActive lastLogin');

  logger.info(`Student created: ${newStudent.registrationNumber} - ${newStudent.firstName} ${newStudent.lastName}`);
  return newStudent;
};

/**
 * Retrieve student profile by ID with role check
 */
const getStudentById = async (id, currentUser, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ _id: id })).populate('userId', 'email firstName lastName role isActive lastLogin');

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Student role can ONLY view their own linked student profile
  if (currentUser && currentUser.role === 'student') {
    const isOwner =
      student.userId &&
      (student.userId._id.toString() === currentUser._id.toString() ||
        student.userId.id?.toString() === currentUser._id.toString());

    if (!isOwner) {
      const error = new Error("Access denied. You are only authorized to view your own student profile.");
      error.statusCode = 403;
      throw error;
    }
  }

  return student;
};

/**
 * Retrieve student profile for currently logged in student user
 */
const getMyStudentProfile = async (currentUserId, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ userId: currentUserId })).populate(
    'userId',
    'email firstName lastName role isActive lastLogin'
  );

  if (!student) {
    const error = new Error('No student record is linked to your user account.');
    error.statusCode = 404;
    throw error;
  }

  return student;
};

/**
 * Update student profile details
 */
const updateStudent = async (id, data, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ _id: id }));

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // If registration number is changing, verify uniqueness
  if (data.registrationNumber) {
    const cleanRegNo = data.registrationNumber.trim().toUpperCase();
    if (cleanRegNo !== student.registrationNumber) {
      const conflict = await Student.findOne(ngoFilter({
        registrationNumber: cleanRegNo,
        _id: { $ne: id }
      }));
      if (conflict) {
        const error = new Error(`Student with registration number '${cleanRegNo}' already exists.`);
        error.statusCode = 409;
        throw error;
      }
      student.registrationNumber = cleanRegNo;
    }
  }

  // If userId is changing, verify existence
  if (data.userId !== undefined && data.userId !== null) {
    const userDoc = await User.findOne(ngoFilter({ _id: data.userId }));
    if (!userDoc) {
      const error = new Error('Specified user account does not exist.');
      error.statusCode = 404;
      throw error;
    }
    student.userId = data.userId;
  } else if (data.userId === null) {
    student.userId = null;
  }

  // Update remaining fields
  const updatableFields = [
    'firstName',
    'lastName',
    'dateOfBirth',
    'gender',
    'email',
    'address',
    'guardianName',
    'guardianRelationship',
    'educationLevel',
    'schoolName',
    'status',
    'notes'
  ];

  updatableFields.forEach((field) => {
    if (data[field] !== undefined) {
      student[field] = data[field];
    }
  });

  await student.save();
  await student.populate('userId', 'email firstName lastName role isActive lastLogin');

  logger.info(`Student updated: ${student.registrationNumber} - ${student.firstName} ${student.lastName}`);
  return student;
};

/**
 * Update student status (active, graduated, transferred, inactive)
 */
const updateStudentStatus = async (id, status, ngoFilter) => {
  const student = await Student.findOne(ngoFilter({ _id: id }));

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  student.status = status;
  await student.save();
  await student.populate('userId', 'email firstName lastName role isActive lastLogin');

  logger.info(`Student status updated: ${student.registrationNumber} -> ${student.status}`);
  return student;
};

module.exports = {
  listStudents,
  createStudent,
  getStudentById,
  getMyStudentProfile,
  updateStudent,
  updateStudentStatus
};

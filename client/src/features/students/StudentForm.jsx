import React, { useState, useEffect } from 'react';
import { 
  X, 
  GraduationCap, 
  User, 
  Mail, 
  Heart, 
  School, 
  FileText, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import studentService from './studentService';
import userService from '../users/userService';

export default function StudentForm({ 
  isOpen, 
  mode = 'create', 
  studentToEdit = null, 
  onClose, 
  onSuccess 
}) {
  // Personal Information
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');

  // Contact Information
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Guardian Information
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');

  // Education Information
  const [educationLevel, setEducationLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // Additional Information
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [userId, setUserId] = useState('');

  // Form State
  const [studentUsers, setStudentUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch student-role users for account linking
  useEffect(() => {
    if (isOpen) {
      const fetchStudentAccounts = async () => {
        setLoadingUsers(true);
        try {
          const res = await userService.getUsers({ role: 'student', limit: 100 });
          if (res.success && res.data?.users) {
            setStudentUsers(res.data.users);
          }
        } catch (err) {
          setError(err.message || 'Could not load student accounts.');
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchStudentAccounts();
    }
  }, [isOpen]);

  // Populate form on open or switch mode
  useEffect(() => {
    if (isOpen) {
      setError('');
      setValidationErrors({});

      if (mode === 'edit' && studentToEdit) {
        setRegistrationNumber(studentToEdit.registrationNumber || '');
        setFirstName(studentToEdit.firstName || '');
        setLastName(studentToEdit.lastName || '');
        setDateOfBirth(
          studentToEdit.dateOfBirth 
            ? new Date(studentToEdit.dateOfBirth).toISOString().split('T')[0] 
            : ''
        );
        setGender(studentToEdit.gender || '');

        setEmail(studentToEdit.email || '');
        setAddress(studentToEdit.address || '');

        setGuardianName(studentToEdit.guardianName || '');
        setGuardianRelationship(studentToEdit.guardianRelationship || '');

        setEducationLevel(studentToEdit.educationLevel || '');
        setSchoolName(studentToEdit.schoolName || '');

        setStatus(studentToEdit.status || 'active');
        setNotes(studentToEdit.notes || '');

        const existingUserId = studentToEdit.userId?._id || studentToEdit.userId || '';
        setUserId(existingUserId);
      } else {
        // Reset form for create
        setRegistrationNumber('');
        setFirstName('');
        setLastName('');
        setDateOfBirth('');
        setGender('');

        setEmail('');
        setAddress('');

        setGuardianName('');
        setGuardianRelationship('');

        setEducationLevel('');
        setSchoolName('');

        setStatus('active');
        setNotes('');
        setUserId('');
      }
    }
  }, [isOpen, mode, studentToEdit]);

  if (!isOpen) return null;

  const validateForm = () => {
    const errors = {};

    if (!registrationNumber.trim()) {
      errors.registrationNumber = 'Registration Number is required';
    } else if (registrationNumber.trim().length < 3) {
      errors.registrationNumber = 'Registration Number must be at least 3 characters';
    }

    if (!firstName.trim()) {
      errors.firstName = 'First Name is required';
    }

    if (!lastName.trim()) {
      errors.lastName = 'Last Name is required';
    }

    if (email && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Invalid email address format';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        registrationNumber: registrationNumber.trim().toUpperCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        email: email.trim().toLowerCase() || null,
        address: address.trim() || null,
        guardianName: guardianName.trim() || null,
        guardianRelationship: guardianRelationship.trim() || null,
        educationLevel: educationLevel.trim() || null,
        schoolName: schoolName.trim() || null,
        status: status || 'active',
        notes: notes.trim() || null,
        userId: userId ? userId : null
      };

      if (mode === 'create') {
        const res = await studentService.createStudent(payload);
        if (res.success) {
          onSuccess(res.message || 'Student profile created successfully!');
          onClose();
        }
      } else {
        const studentId = studentToEdit._id || studentToEdit.id;
        const res = await studentService.updateStudent(studentId, payload);
        if (res.success) {
          onSuccess(res.message || 'Student profile updated successfully!');
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save student profile');
      if (err.errors && Array.isArray(err.errors)) {
        const backendErrors = {};
        err.errors.forEach((e) => {
          if (e.field) backendErrors[e.field] = e.message;
        });
        setValidationErrors(backendErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container student-form-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <GraduationCap size={22} className="text-primary" />
            <div>
              <h3>{mode === 'create' ? 'Add New Student' : 'Edit Student Profile'}</h3>
              <p className="modal-header-desc">
                {mode === 'create' 
                  ? 'Enroll a new beneficiary into the digital record system' 
                  : `Update profile for ${studentToEdit?.firstName} ${studentToEdit?.lastName}`
                }
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="modal-close-btn"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form student-form">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="student-form-scrollable">
            {/* 1. PERSONAL INFORMATION */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <User size={16} />
                <span>1. Personal Information</span>
              </h4>

              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="student-regNum">Registration Number *</label>
                  <input
                    id="student-regNum"
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. STU-2026-001"
                    disabled={loading}
                    className="input-uppercase"
                  />
                  {validationErrors.registrationNumber && (
                    <span className="field-error-text">{validationErrors.registrationNumber}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="student-firstName">First Name *</label>
                  <input
                    id="student-firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Rahul"
                    disabled={loading}
                  />
                  {validationErrors.firstName && (
                    <span className="field-error-text">{validationErrors.firstName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="student-lastName">Last Name *</label>
                  <input
                    id="student-lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    disabled={loading}
                  />
                  {validationErrors.lastName && (
                    <span className="field-error-text">{validationErrors.lastName}</span>
                  )}
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="student-dob">Date of Birth</label>
                  <input
                    id="student-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={loading}
                  />
                  {validationErrors.dateOfBirth && (
                    <span className="field-error-text">{validationErrors.dateOfBirth}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="student-gender">Gender</label>
                  <select
                    id="student-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="select-dropdown"
                    disabled={loading}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. CONTACT INFORMATION */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <Mail size={16} />
                <span>2. Contact Information</span>
              </h4>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="student-email">Email Address</label>
                  <input
                    id="student-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul.sharma@example.com"
                    disabled={loading}
                  />
                  {validationErrors.email && (
                    <span className="field-error-text">{validationErrors.email}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="student-address">Residential Address</label>
                <textarea
                  id="student-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Community, City, District, PIN..."
                  disabled={loading}
                />
              </div>
            </div>

            {/* 3. GUARDIAN INFORMATION */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <Heart size={16} />
                <span>3. Guardian Information</span>
              </h4>

              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="student-guardianName">Guardian Name</label>
                  <input
                    id="student-guardianName"
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="e.g. Suresh Sharma"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="student-guardianRel">Relationship</label>
                  <input
                    id="student-guardianRel"
                    type="text"
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                    placeholder="e.g. Father, Mother, Guardian"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* 4. EDUCATION INFORMATION */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <School size={16} />
                <span>4. Education Information</span>
              </h4>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="student-eduLevel">Education Level</label>
                  <input
                    id="student-eduLevel"
                    type="text"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    placeholder="e.g. Class 10, Secondary, Diploma"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="student-schoolName">School / Institution</label>
                  <input
                    id="student-schoolName"
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. Model High School"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* 5. USER ACCOUNT LINKING (OPTIONAL) */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <ShieldCheck size={16} />
                <span>5. User Login Account (Optional)</span>
              </h4>

              <div className="form-group">
                <label htmlFor="student-userId">Linked User Account</label>
                <select
                  id="student-userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="select-dropdown"
                  disabled={loading || loadingUsers}
                >
                  <option value="">None (Beneficiary Profile Only - No Web Login)</option>
                  {studentUsers.map((u) => {
                    const uId = u._id || u.id;
                    return (
                      <option key={uId} value={uId}>
                        {u.firstName} {u.lastName} ({u.email})
                      </option>
                    );
                  })}
                </select>
                <span className="form-help-text">
                  Link an existing student login account so the student can access their profile directly.
                </span>
              </div>
            </div>

            {/* 6. STATUS & NOTES */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <FileText size={16} />
                <span>6. Status & Additional Notes</span>
              </h4>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="student-status">Enrollment Status *</label>
                  <select
                    id="student-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="select-dropdown"
                    disabled={loading}
                  >
                    <option value="active">Active (Currently Enrolled)</option>
                    <option value="graduated">Graduated (Completed Program)</option>
                    <option value="transferred">Transferred (Moved to Another Center)</option>
                    <option value="inactive">Inactive (Suspended / On Leave)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="student-notes">Notes & Observations</label>
                <textarea
                  id="student-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special needs, achievements, background context..."
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary" 
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
            >
              {loading 
                ? (mode === 'create' ? 'Creating Student...' : 'Saving Changes...') 
                : (mode === 'create' ? 'Create Student' : 'Save Changes')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

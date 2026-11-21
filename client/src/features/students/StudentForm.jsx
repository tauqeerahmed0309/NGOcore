import React, { useState, useEffect } from 'react';
import { 
  X, 
  GraduationCap, 
  User, 
  Mail, 
  School, 
  FileText, 
  AlertCircle,
  AlertTriangle,
  MapPin, 
  Loader2 
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
  // 1. Personal Information
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');

  // 2. Contact Information
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // 3. Address Information
  const [address, setAddress] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [state, setState] = useState('');

  // 4. Guardian & Education Information
  const [educationLevel, setEducationLevel] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');

  // 5. Additional Information & Account Linking
  const [status, setStatus] = useState('active');
  const [userId, setUserId] = useState('');
  const [notes, setNotes] = useState('');

  // Component State
  const [studentUsers, setStudentUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [duplicateOverride, setDuplicateOverride] = useState(false);

  // Fetch student-role users for account linking
  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      const fetchStudentAccounts = async () => {
        setLoadingUsers(true);
        try {
          const res = await userService.getUsers({ role: 'student', limit: 100 });
          if (isMounted && res.success && res.data?.users) {
            setStudentUsers(res.data.users);
          }
        } catch (err) {
          if (isMounted) {
            setError(err.message || 'Could not load student accounts.');
          }
        } finally {
          if (isMounted) setLoadingUsers(false);
        }
      };
      fetchStudentAccounts();
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen]);

  // Populate or reset form on open or switch mode
  useEffect(() => {
    if (isOpen) {
      setError('');
      setValidationErrors({});
      setDuplicateWarning(null);
      setDuplicateOverride(false);

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
        setPhone(studentToEdit.phone || '');
        setAddress(studentToEdit.address || '');
        setPinCode(studentToEdit.pinCode || '');
        setState(studentToEdit.state || '');

        setEducationLevel(studentToEdit.educationLevel || '');
        setSchoolName(studentToEdit.schoolName || '');
        setGuardianName(studentToEdit.guardianName || '');
        setGuardianRelationship(studentToEdit.guardianRelationship || '');

        setStatus(studentToEdit.status || 'active');
        const existingUserId = studentToEdit.userId?._id || studentToEdit.userId || '';
        setUserId(existingUserId);
        setNotes(studentToEdit.notes || '');
      } else {
        // Reset form for fresh creation
        setRegistrationNumber('');
        setFirstName('');
        setLastName('');
        setDateOfBirth('');
        setGender('');

        setEmail('');
        setPhone('');
        setAddress('');
        setPinCode('');
        setState('');

        setEducationLevel('');
        setSchoolName('');
        setGuardianName('');
        setGuardianRelationship('');

        setStatus('active');
        setUserId('');
        setNotes('');
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

    if (phone && phone.trim()) {
      const cleanedPhone = phone.trim().replace(/[\s\-().]/g, '');
      let digits = cleanedPhone;
      if (digits.startsWith('+91')) digits = digits.slice(3);
      else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
      else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
      if (!/^[6-9]\d{9}$/.test(digits)) {
        errors.phone = 'Phone must be a valid 10-digit Indian mobile number (starting with 6-9)';
      }
    }

    if (pinCode && pinCode.trim()) {
      const cleanedPin = pinCode.trim().replace(/\s+/g, '');
      if (!/^[1-8][0-9]{5}$/.test(cleanedPin)) {
        errors.pinCode = 'PIN code must be a valid 6-digit Indian postal code starting with 1-8';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const executeSave = async (overrideDup = false) => {
    setLoading(true);
    setError('');

    // Pre-save duplicate check in create mode unless user explicitly overrode
    if (mode === 'create' && !overrideDup && !duplicateOverride) {
      try {
        const dupRes = await studentService.checkDuplicate({
          registrationNumber: registrationNumber.trim().toUpperCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dateOfBirth || null,
          phone: phone.trim(),
          email: email.trim().toLowerCase()
        });
        if (dupRes.success && dupRes.data?.isDuplicate && dupRes.data?.candidates?.length > 0) {
          setDuplicateWarning(dupRes.data.candidates);
          setLoading(false);
          return;
        }
      } catch (dupErr) {
        // Non-blocking if pre-check encounters an error
        console.warn('Duplicate pre-check skipped:', dupErr.message);
      }
    }

    try {
      // Build clean payload matching backend Zod schemas
      const payload = {
        registrationNumber: registrationNumber.trim().toUpperCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth ? dateOfBirth : null,
        gender: gender || '',
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        pinCode: pinCode.trim(),
        state: state.trim(),
        guardianName: guardianName.trim(),
        guardianRelationship: guardianRelationship.trim(),
        educationLevel: educationLevel.trim(),
        schoolName: schoolName.trim(),
        status: status || 'active',
        notes: notes.trim(),
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return; // Prevent double-clicking
    if (!validateForm()) return;
    executeSave(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container student-form-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="student-avatar-modal">
              <GraduationCap size={24} className="text-primary" />
            </div>
            <div>
              <h3>{mode === 'create' ? 'Add New Beneficiary / Student' : 'Edit Student Profile'}</h3>
              <p className="modal-header-desc">
                {mode === 'create' 
                  ? 'Enroll a new beneficiary into the digital record management system' 
                  : `Update enrollment profile for ${studentToEdit?.firstName || ''} ${studentToEdit?.lastName || ''}`
                }
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="modal-close-btn"
            aria-label="Close dialog"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form student-form">
          <div className="form-scrollable student-form-scrollable">
            {/* Global API Error Alert */}
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Pre-save Duplicate Warning Banner */}
            {duplicateWarning && (
              <div className="alert alert-warning duplicate-warning-banner" role="alert" style={{ display: 'block', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #f59e0b', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={18} className="text-warning flex-shrink-0" style={{ color: '#d97706' }} />
                  <strong style={{ color: '#b45309' }}>Potential Duplicate Beneficiary Detected</strong>
                </div>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-color, #374151)' }}>
                  Existing records in your organization share matching or highly similar demographic details. Real NGO policy requires confirmation before creating duplicate entries. <em>Records will never be automatically merged or overwritten.</em>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {duplicateWarning.map((candidate, idx) => (
                    <div key={idx} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.7)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{candidate.name}</strong>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                          {(candidate.confidence || 'MEDIUM').toUpperCase()} CONFIDENCE
                        </span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted, #6b7280)', marginTop: '2px' }}>
                        Registration: {candidate.registrationNumber || 'N/A'} • {candidate.reason}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                  >
                    Cancel & Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicateOverride(true);
                      setDuplicateWarning(null);
                      executeSave(true);
                    }}
                    className="btn-primary"
                    style={{ fontSize: '0.85rem', padding: '6px 12px', background: '#d97706', borderColor: '#b45309' }}
                  >
                    Acknowledge & Proceed
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 1: Personal Information */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-header-left">
                  <span className="section-icon"><User size={18} /></span>
                  <div>
                    <h4 className="form-section-title">1. Personal Information</h4>
                    <span className="form-section-desc">Primary beneficiary identity and basic demographics</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label htmlFor="student-regNum">
                    Registration Number <span className="required-star">*</span>
                  </label>
                  <input
                    id="student-regNum"
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. STU-2026-001"
                    disabled={loading}
                    className="input-uppercase"
                    required
                  />
                  {validationErrors.registrationNumber && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.registrationNumber}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="student-firstName">
                    First Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="student-firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Rahul"
                    disabled={loading}
                    required
                  />
                  {validationErrors.firstName && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.firstName}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="student-lastName">
                    Last Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="student-lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    disabled={loading}
                    required
                  />
                  {validationErrors.lastName && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.lastName}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: '12px' }}>
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
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.dateOfBirth}
                    </span>
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
                    <option value="">Select Gender (Optional)</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                  {validationErrors.gender && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.gender}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: Contact Information */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-header-left">
                  <span className="section-icon"><Mail size={18} /></span>
                  <div>
                    <h4 className="form-section-title">2. Contact Information</h4>
                    <span className="form-section-desc">Email and telephone coordinates for alerts and outreach</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
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
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.email}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="student-phone">Phone Number (Indian Mobile)</label>
                  <input
                    id="student-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210 or 10-digit mobile"
                    disabled={loading}
                  />
                  {validationErrors.phone && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.phone}
                    </span>
                  )}
                  <span className="form-help-text">Standard 10-digit Indian mobile starting with 6-9</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: Address Information */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-header-left">
                  <span className="section-icon"><MapPin size={18} /></span>
                  <div>
                    <h4 className="form-section-title">3. Address Information</h4>
                    <span className="form-section-desc">Residential location, regional territory and postal code</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group col-span-2">
                  <label htmlFor="student-address">Residential Address</label>
                  <textarea
                    id="student-address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, house/flat number, community or landmark..."
                    disabled={loading}
                  />
                  {validationErrors.address && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.address}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="student-pinCode">PIN Code (6 digits)</label>
                  <input
                    id="student-pinCode"
                    type="text"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="e.g. 560001"
                    disabled={loading}
                  />
                  {validationErrors.pinCode && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.pinCode}
                    </span>
                  )}
                  <span className="form-help-text">Indian postal code (digits 1-8 followed by 5 digits)</span>
                </div>

                <div className="form-group">
                  <label htmlFor="student-state">State / Region</label>
                  <input
                    id="student-state"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Karnataka, Maharashtra"
                    disabled={loading}
                  />
                  {validationErrors.state && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.state}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: Educational / Beneficiary Details */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-header-left">
                  <span className="section-icon"><School size={18} /></span>
                  <div>
                    <h4 className="form-section-title">4. Educational & Beneficiary Details</h4>
                    <span className="form-section-desc">Current academic level, institutional background, and guardian</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="student-eduLevel">Education Level</label>
                  <input
                    id="student-eduLevel"
                    type="text"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    placeholder="e.g. Class 10, Secondary, Diploma, Undergraduate"
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

                <div className="form-group">
                  <label htmlFor="student-guardianName">Guardian / Parent Name</label>
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
                  <label htmlFor="student-guardianRel">Guardian Relationship</label>
                  <input
                    id="student-guardianRel"
                    type="text"
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                    placeholder="e.g. Father, Mother, Legal Guardian, Sister"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 5: Additional Information & Account Linking */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-header-left">
                  <span className="section-icon"><FileText size={18} /></span>
                  <div>
                    <h4 className="form-section-title">5. Status, System Account & Notes</h4>
                    <span className="form-section-desc">Lifecycle enrollment status, optional web login link, and counselor notes</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="student-status">
                    Enrollment Status <span className="required-star">*</span>
                  </label>
                  <select
                    id="student-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="select-dropdown"
                    disabled={loading}
                  >
                    <option value="active">Active (Enrolled in Programs)</option>
                    <option value="graduated">Graduated (Completed Programs)</option>
                    <option value="transferred">Transferred (Moved to Another Center)</option>
                    <option value="inactive">Inactive (Suspended / On Leave)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="student-userId">Linked User Login (Optional)</label>
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
                    Link an existing user account so this beneficiary can sign in to view their profile.
                  </span>
                </div>

                <div className="form-group col-span-2">
                  <label htmlFor="student-notes">Notes & Observations</label>
                  <textarea
                    id="student-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special requirements, strengths, counseling notes, or background context..."
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
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
              {loading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} />}
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

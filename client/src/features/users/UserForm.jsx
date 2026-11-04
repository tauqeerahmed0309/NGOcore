import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  UserCheck, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Lock,
  Mail,
  User
} from 'lucide-react';
import userService from './userService';

export default function UserForm({ isOpen, mode = 'create', userToEdit = null, onClose, onSuccess }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setError('');
      setValidationErrors({});
      if (mode === 'edit' && userToEdit) {
        setFirstName(userToEdit.firstName || '');
        setLastName(userToEdit.lastName || '');
        setEmail(userToEdit.email || '');
        setRole(userToEdit.role === 'admin' ? 'staff' : userToEdit.role || 'student');
      } else {
        setFirstName('');
        setLastName('');
        setEmail('');
        setRole('student');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
      }
    }
  }, [isOpen, mode, userToEdit]);

  if (!isOpen) return null;

  const validateForm = () => {
    const errors = {};
    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Invalid email address format';
    }

    if (mode === 'create' && role !== 'student') {
      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        errors.password = 'Password must contain at least one letter and one number';
      }

      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
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
      if (mode === 'create') {
        const payload = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          role,
          ...(role === 'student' ? {} : { password })
        };
        const res = await userService.createUser(payload);
        if (res.success) {
          onSuccess(res.message || 'User created successfully!');
          onClose();
        }
      } else {
        const payload = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          role
        };
        const res = await userService.updateUser(userToEdit._id || userToEdit.id, payload);
        if (res.success) {
          onSuccess(res.message || 'User updated successfully!');
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to process request');
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
        className="modal-container user-form-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            {mode === 'create' ? (
              <UserPlus size={20} className="text-primary" />
            ) : (
              <UserCheck size={20} className="text-secondary" />
            )}
            <h3>{mode === 'create' ? 'Create New User' : `Edit User Details`}</h3>
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

        <form onSubmit={handleSubmit} className="modal-form user-form">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="user-firstName">First Name *</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  id="user-firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Rahul"
                  disabled={loading}
                />
              </div>
              {validationErrors.firstName && (
                <span className="field-error-text">{validationErrors.firstName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="user-lastName">Last Name *</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  id="user-lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Kumar"
                  disabled={loading}
                />
              </div>
              {validationErrors.lastName && (
                <span className="field-error-text">{validationErrors.lastName}</span>
              )}
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="user-email">Email Address *</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ngo.org"
                  disabled={loading}
                />
              </div>
              {validationErrors.email && (
                <span className="field-error-text">{validationErrors.email}</span>
              )}
            </div>

          </div>

          <div className="form-group">
            <label htmlFor="user-role">System Role *</label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="select-dropdown"
              disabled={loading}
            >
              <option value="student">Student (Beneficiary / Learner)</option>
              <option value="volunteer">Volunteer (Field Staff / Event Support)</option>
              <option value="staff">Staff (Coordinator / Program Supervisor)</option>
            </select>
            <span className="form-help-text">
              * Note: Admin accounts cannot be created or assigned through User Management.
            </span>
          </div>

          {mode === 'create' && role === 'student' && (
            <div className="alert alert-info">
              <Mail size={16} className="flex-shrink-0" />
              <span>A secure setup link will be emailed to the student so they can choose their own password.</span>
            </div>
          )}

          {mode === 'create' && role !== 'student' && (
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="user-password">Initial Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars with letter & number"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {validationErrors.password && (
                  <span className="field-error-text">{validationErrors.password}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="user-confirmPassword">Confirm Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="user-confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter initial password"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                {validationErrors.confirmPassword && (
                  <span className="field-error-text">{validationErrors.confirmPassword}</span>
                )}
              </div>
            </div>
          )}

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
                ? (mode === 'create' ? 'Creating...' : 'Saving...') 
                : (mode === 'create' ? 'Create User' : 'Save Changes')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

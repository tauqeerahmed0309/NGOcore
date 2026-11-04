import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { fadeUp } from '../../animations';
import GoogleSignInButton from './GoogleSignInButton';

export default function Login({ variant = 'default' }) {
  const { login, loginStudent, isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const isStudentVariant = variant === 'student';

  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => fadeUp(cardRef.current, { duration: 0.36, distance: 12 }), []);

  const redirectByRole = useCallback((role) => {
    switch (role) {
      case 'admin':    navigate('/admin/dashboard',    { replace: true }); break;
      case 'ngo_admin':navigate('/admin/dashboard',    { replace: true }); break;
      case 'staff':    navigate('/staff/dashboard',    { replace: true }); break;
      case 'volunteer':navigate('/volunteer/dashboard',{ replace: true }); break;
      case 'student':  navigate('/student/dashboard',  { replace: true }); break;
      default:         navigate('/',                   { replace: true });
    }
  }, [navigate]);

  // Already authenticated — redirect to role dashboard
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      redirectByRole(currentUser.role);
    }
  }, [isAuthenticated, currentUser, redirectByRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if ((isStudentVariant ? !studentId.trim() : !email.trim()) || !password) {
      setError(isStudentVariant
        ? 'Please enter your student record ID and password.'
        : 'Please enter your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const user = isStudentVariant
        ? await loginStudent(studentId.trim(), password)
        : await login(email.trim(), password);
      if (isStudentVariant && user.role !== 'student') {
        setError('This portal is for student accounts only. Please sign in with your student email and password.');
        return;
      }
      redirectByRole(user.role);
    } catch (err) {
      const validationErrors = Array.isArray(err.errors)
        ? err.errors
          .map(({ field, message }) => [field, message].filter(Boolean).join(': '))
          .filter(Boolean)
        : [];
      setError(validationErrors.length
        ? validationErrors.join(' ')
        : err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const brandLabel = isStudentVariant ? 'NGOcore Student Portal' : 'NGOcore';
  const brandSubLabel = isStudentVariant ? 'Student access portal' : 'Digital Records for NGOs';
  const headingText = isStudentVariant ? 'Student sign in' : 'Welcome back';
  const subHeadingText = isStudentVariant ? 'Access your student workspace' : 'Sign in to access your workspace';
  const submitText = isStudentVariant ? 'Access student portal' : 'Sign In';

  return (
    <div className="login-page">
      <div className={`login-card${isStudentVariant ? ' student-login-card' : ''}`} ref={cardRef}>
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="8" fill={isStudentVariant ? '#2563eb' : '#16a34a'} />
              <path d="M7 8h14M7 14h10M7 20h7" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="login-brand-text">
            <h1 className="login-brand-name">{brandLabel}</h1>
            <p className="login-brand-sub">{brandSubLabel}</p>
          </div>
        </div>

        {isStudentVariant && (
          <div className="student-login-badge">Student access</div>
        )}

        {/* Heading */}
        <div className="login-heading">
          <h2>{headingText}</h2>
          <p>{subHeadingText}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {error && (
            <div className="login-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {isStudentVariant ? (
            <div className="form-field">
              <label htmlFor="student-login-id" className="field-label">Student record ID</label>
              <div className="field-input-wrap">
                <Mail size={16} className="field-icon" aria-hidden="true" />
                <input
                  id="student-login-id"
                  type="text"
                  className="field-input"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Enter the ID provided by your NGO"
                  required
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <div className="form-field">
              <label htmlFor="login-email" className="field-label">Email address</label>
              <div className="field-input-wrap">
                <Mail size={16} className="field-icon" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  className="field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organisation.org"
                  required
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="login-password" className="field-label">Password</label>
            <div className="field-input-wrap">
              <Lock size={16} className="field-icon" aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="field-input field-input-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="field-toggle-btn"
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <p className="auth-link-row login-forgot-link">
            <Link to={isStudentVariant ? '/forgot-password?portal=student' : '/forgot-password'}>
              Forgot password?
            </Link>
          </p>

          <button
            type="submit"
            className={`btn-login${isStudentVariant ? ' btn-student-login' : ''}`}
            disabled={loading}
            id="login-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" aria-hidden="true" />
                <span>{isStudentVariant ? 'Accessing portal…' : 'Signing in…'}</span>
              </>
            ) : (
              <span>{submitText}</span>
            )}
          </button>
        </form>

        <div className="google-signin-separator"><span>or</span></div>
        <GoogleSignInButton
          role={isStudentVariant ? 'student' : undefined}
          onSuccess={(user) => redirectByRole(user.role)}
          onError={setError}
        />

        {/* Footer */}
        <p className="login-footer">
          {isStudentVariant ? 'Secure access to your student records' : 'Secure digital records for NGO operations'}
        </p>
        <p className="auth-link-row">
          {isStudentVariant ? (
            <>
              Need staff or admin access? <Link to="/login">Use main login</Link>
            </>
          ) : (
            <>
              New organization? <Link to="/signup">Create an account</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

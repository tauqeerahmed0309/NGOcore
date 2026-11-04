import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import authService from '../../services/authService';
import { fadeUp } from '../../animations';

export default function StudentPasswordSetup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => fadeUp(cardRef.current, { duration: 0.36, distance: 12 }), []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This invitation link is missing its setup token.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authService.setInvitedPassword(token, password);
      setComplete(true);
    } catch (requestError) {
      setError(requestError.message || 'Could not set your password. Request a new invitation from your NGO.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" ref={cardRef}>
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="8" fill="#2563eb" />
              <path d="M7 8h14M7 14h10M7 20h7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="login-brand-text">
            <h1 className="login-brand-name">NGOcore Student Portal</h1>
            <p className="login-brand-sub">Secure account setup</p>
          </div>
        </div>
        <div className="login-heading">
          <h2>{complete ? 'Password set' : 'Choose your password'}</h2>
          <p>{complete
            ? 'Your student account is ready. Sign in with the student record ID provided by your NGO.'
            : 'Create a password to activate your student portal account. This invitation expires after 24 hours.'}</p>
        </div>
        {error && (
          <div className="login-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        {complete ? (
          <div className="password-reset-complete">
            <CheckCircle2 size={32} />
            <Link className="btn-login" to="/student/login">Go to student sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="login-form" noValidate>
            <div className="form-field">
              <label htmlFor="student-new-password" className="field-label">New password</label>
              <div className="field-input-wrap">
                <Lock size={16} className="field-icon" aria-hidden="true" />
                <input id="student-new-password" type="password" className="field-input"
                  value={password} onChange={(event) => setPassword(event.target.value)}
                  minLength={8} autoComplete="new-password"
                  placeholder="At least 8 characters, with a letter and number" required disabled={loading} />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="student-confirm-password" className="field-label">Confirm password</label>
              <div className="field-input-wrap">
                <ShieldCheck size={16} className="field-icon" aria-hidden="true" />
                <input id="student-confirm-password" type="password" className="field-input"
                  value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password" required disabled={loading} />
              </div>
            </div>
            <button className="btn-login btn-student-login" type="submit" disabled={loading}>
              <KeyRound size={16} />
              Set password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

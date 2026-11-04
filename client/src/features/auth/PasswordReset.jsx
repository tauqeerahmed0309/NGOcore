import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import authService from '../../services/authService';
import { fadeUp } from '../../animations';

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const isStudentPortal = searchParams.get('portal') === 'student';
  const loginPath = isStudentPortal ? '/student/login' : '/login';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const cardRef = useRef(null);

  useEffect(() => fadeUp(cardRef.current, { duration: 0.36, distance: 12 }), []);

  const requestCode = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter the email address associated with your account.');
      return;
    }
    setLoading(true);
    try {
      await authService.requestPasswordReset(email.trim().toLowerCase());
      setNotice('If an eligible account exists for that email, a verification code will be sent. Check your inbox and spam folder.');
      setStep('reset');
    } catch (requestError) {
      setError(requestError.message || 'Could not request a verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        code,
        newPassword
      });
      setNotice('Your password has been reset. You can now sign in with your new password.');
      setStep('complete');
    } catch (requestError) {
      setError(requestError.message || 'Could not reset your password. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const title = isStudentPortal ? 'Reset student password' : 'Reset your password';
  const brand = isStudentPortal ? 'NGOcore Student Portal' : 'NGOcore';

  return (
    <div className="login-page">
      <div className={`login-card${isStudentPortal ? ' student-login-card' : ''}`} ref={cardRef}>
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="8" fill={isStudentPortal ? '#2563eb' : '#16a34a'} />
              <path d="M7 8h14M7 14h10M7 20h7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="login-brand-text">
            <h1 className="login-brand-name">{brand}</h1>
            <p className="login-brand-sub">Password recovery</p>
          </div>
        </div>

        <div className="login-heading">
          <h2>{step === 'complete' ? 'Password updated' : title}</h2>
          <p>
            {step === 'request' && 'Enter your account email and we will send a verification code.'}
            {step === 'reset' && `Enter the 6-digit code sent to ${email}.`}
            {step === 'complete' && 'Your account is ready to use again.'}
          </p>
        </div>

        {error && (
          <div className="login-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        {notice && step !== 'complete' && <p className="signup-notice" role="status">{notice}</p>}

        {step === 'request' && (
          <form onSubmit={requestCode} className="login-form" noValidate>
            <div className="form-field">
              <label htmlFor="reset-email" className="field-label">Email address</label>
              <div className="field-input-wrap">
                <Mail size={16} className="field-icon" aria-hidden="true" />
                <input
                  id="reset-email"
                  type="email"
                  className="field-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@organisation.org"
                  autoComplete="email"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>
            <button className={`btn-login${isStudentPortal ? ' btn-student-login' : ''}`} type="submit" disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <Mail size={16} />}
              Send verification code
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={submitReset} className="login-form" noValidate>
            <div className="form-field">
              <label htmlFor="reset-code" className="field-label">Email verification code</label>
              <div className="field-input-wrap">
                <ShieldCheck size={16} className="field-icon" aria-hidden="true" />
                <input
                  id="reset-code"
                  type="text"
                  className="field-input"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="reset-password" className="field-label">New password</label>
              <div className="field-input-wrap">
                <Lock size={16} className="field-icon" aria-hidden="true" />
                <input
                  id="reset-password"
                  type="password"
                  className="field-input"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters, with a letter and number"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="reset-password-confirm" className="field-label">Confirm new password</label>
              <div className="field-input-wrap">
                <KeyRound size={16} className="field-icon" aria-hidden="true" />
                <input
                  id="reset-password-confirm"
                  type="password"
                  className="field-input"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <button className={`btn-login${isStudentPortal ? ' btn-student-login' : ''}`} type="submit" disabled={loading || code.length !== 6}>
              {loading ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />}
              Reset password
            </button>
            <button className="signup-secondary-button" type="button" onClick={() => { setStep('request'); setError(''); setNotice(''); }} disabled={loading}>
              Use a different email
            </button>
          </form>
        )}

        {step === 'complete' && (
          <div className="password-reset-complete">
            <CheckCircle2 size={32} aria-hidden="true" />
            <p className="signup-notice" role="status">{notice}</p>
          </div>
        )}

        <p className="auth-link-row">
          <Link to={loginPath}>Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

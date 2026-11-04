import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, Mail, ShieldCheck } from 'lucide-react';
import authService from '../../services/authService';
import { fadeUp, staggerCards } from '../../animations';
import GoogleSignInButton from './GoogleSignInButton';

const emailKey = 'ngo_signup_email';

function AuthCard({ title, subtitle, children }) {
  const cardRef = useRef(null);
  useEffect(() => {
    const cleanupCard = fadeUp(cardRef.current, { duration: 0.34, distance: 12 });
    const cleanupFields = staggerCards(cardRef.current?.querySelectorAll('.form-field'), {
      duration: 0.22,
      stagger: 0.025,
      distance: 4
    });
    return () => {
      cleanupCard();
      cleanupFields();
    };
  }, [title]);

  return (
    <div className="login-page">
      <div className="login-card signup-card" ref={cardRef}>
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="8" fill="#16a34a" />
              <path d="M7 8h14M7 14h10M7 20h7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="login-brand-text">
            <h1 className="login-brand-name">NGOcore</h1>
            <p className="login-brand-sub">Digital Records for NGOs</p>
          </div>
        </div>
        <div className="login-heading">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ id, label, ...props }) {
  return (
    <div className="form-field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input className="field-input signup-input" id={id} {...props} />
    </div>
  );
}

export default function SignupFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => sessionStorage.getItem(emailKey) || '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    organizationName: '',
    firstName: '',
    lastName: '',
    password: ''
  });
  const [code, setCode] = useState('');
  const documentInputRef = useRef(null);
  const [onboarding, setOnboarding] = useState({
    organizationType: '',
    registrationNumber: '',
    address: ''
  });
  const [file, setFile] = useState(null);
  const stage = location.pathname.endsWith('/verify')
    ? 'verify'
    : location.pathname.endsWith('/onboarding')
      ? 'onboarding'
      : location.pathname.endsWith('/pending-approval')
        ? 'pending'
        : 'signup';

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const runAction = async (action, successMessage = '') => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await action();
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      const validationErrors = Array.isArray(err.errors)
        ? err.errors
          .map(({ field, message }) => [field, message].filter(Boolean).join(': '))
          .filter(Boolean)
        : [];
      setError(validationErrors.length
        ? `${err.message || 'Validation failed'}: ${validationErrors.join(' ')}`
        : err.message || 'The request could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = (event) => {
    event.preventDefault();
    runAction(async () => {
      const response = await authService.signup({ ...form, email: email.trim().toLowerCase() });
      const normalizedEmail = response.data?.email || email.trim().toLowerCase();
      sessionStorage.setItem(emailKey, normalizedEmail);
      setEmail(normalizedEmail);
      navigate('/signup/verify');
    });
  };

  const verifyCode = (event) => {
    event.preventDefault();
    runAction(async () => {
      await authService.verifySignupOtp(email, code);
      navigate('/signup/onboarding');
    });
  };

  const resendCode = () => runAction(
    () => authService.resendSignupOtp(email),
    'A new verification code was sent.'
  );

  const finishOnboarding = (event) => {
    event.preventDefault();
    if (!file) {
      setError('Upload at least one supporting document before submitting.');
      return;
    }
    runAction(async () => {
      await authService.uploadOnboardingDocument(file);
      await authService.completeOnboarding(onboarding);
      sessionStorage.removeItem(emailKey);
      navigate('/signup/pending-approval');
    });
  };

  const redirectGoogleUser = (user) => {
    const dashboardByRole = {
      admin: '/admin/dashboard',
      ngo_admin: '/admin/dashboard',
      staff: '/staff/dashboard',
      volunteer: '/volunteer/dashboard',
      student: '/student/dashboard'
    };
    navigate(dashboardByRole[user.role] || '/', { replace: true });
  };

  if (stage === 'pending') {
    return (
      <AuthCard title="Application submitted" subtitle="Your organization is pending approval">
        <div className="signup-success-mark"><CheckCircle2 size={30} /></div>
        <p className="signup-pending-copy">
          We received your organization details and supporting document. You can sign in once the platform team approves your organization.
        </p>
        <Link className="btn-login signup-button-link" to="/login">Return to sign in</Link>
      </AuthCard>
    );
  }

  if (stage === 'verify') {
    return (
      <AuthCard title="Verify your email" subtitle={`Enter the 6-digit code sent to ${email || 'your email address'}`}>
        <form onSubmit={verifyCode} className="login-form" noValidate>
          {error && <div className="login-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
          {notice && <p className="signup-notice" role="status">{notice}</p>}
          <Field
            id="signup-otp"
            label="Verification code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            required
            disabled={loading}
          />
          <button className="btn-login" type="submit" disabled={loading || code.length !== 6}>
            {loading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
            Verify email
          </button>
          <button className="signup-secondary-button" type="button" onClick={resendCode} disabled={loading}>
            Resend code
          </button>
          <Link className="signup-back-link" to="/signup"><ArrowLeft size={14} /> Change sign-up details</Link>
        </form>
      </AuthCard>
    );
  }

  if (stage === 'onboarding') {
    return (
      <AuthCard title="Organization details" subtitle="Complete your profile and upload one supporting document for review">
        <form onSubmit={finishOnboarding} className="login-form" noValidate>
          {error && <div className="login-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
          <Field
            id="organization-type"
            label="Organization type"
            name="organizationType"
            value={onboarding.organizationType}
            onChange={(event) => setOnboarding((current) => ({ ...current, organizationType: event.target.value }))}
            placeholder="Non-profit, trust, society…"
            required
            disabled={loading}
          />
          <Field
            id="registration-number"
            label="Registration number"
            name="registrationNumber"
            value={onboarding.registrationNumber}
            onChange={(event) => setOnboarding((current) => ({ ...current, registrationNumber: event.target.value }))}
            required
            disabled={loading}
          />
          <div className="form-field">
            <label className="field-label" htmlFor="organization-address">Organization address</label>
            <textarea
              className="field-input signup-textarea"
              id="organization-address"
              value={onboarding.address}
              onChange={(event) => setOnboarding((current) => ({ ...current, address: event.target.value }))}
              required
              disabled={loading}
              rows={3}
            />
          </div>
          <div className="form-field">
            <label className="field-label" htmlFor="supporting-document">Supporting document (PDF, JPEG or PNG)</label>
            <input
              ref={documentInputRef}
              id="supporting-document"
              className="signup-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
              disabled={loading}
            />
            <button
              className="signup-file-picker"
              type="button"
              onClick={() => documentInputRef.current?.click()}
              disabled={loading}
            >
              <FileText size={18} />
              <span>{file?.name || 'Add document'}</span>
            </button>
            <span className="signup-file-hint">Maximum 10 MB</span>
          </div>
          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
            Submit for approval
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your organization account" subtitle="Start managing your NGO's records in one secure workspace">
      <form onSubmit={submitSignup} className="login-form" noValidate>
        {error && <div className="login-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
        <Field id="organization-name" label="Organization name" name="organizationName" value={form.organizationName} onChange={updateForm} required disabled={loading} />
        <div className="signup-name-grid">
          <Field id="signup-first-name" label="First name" name="firstName" value={form.firstName} onChange={updateForm} required disabled={loading} />
          <Field id="signup-last-name" label="Last name" name="lastName" value={form.lastName} onChange={updateForm} required disabled={loading} />
        </div>
        <Field id="signup-email" label="Work email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={loading} />
        <Field id="signup-password" label="Password (at least 8 characters, with a letter and number)" name="password" type="password" value={form.password} onChange={updateForm} autoComplete="new-password" minLength={8} required disabled={loading} />
        <button className="btn-login" type="submit" disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Mail size={16} />}
          Send verification code
        </button>
      </form>
      <div className="google-signin-separator"><span>Already have an account?</span></div>
      <GoogleSignInButton
        onSuccess={redirectGoogleUser}
        onError={(message) => setError(message)}
      />
      <p className="auth-link-row">Already registered? <Link to="/login">Sign in with email</Link></p>
    </AuthCard>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { User, Mail, Phone, Lock, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { pageTransition } from '../../animations';
import api from '../../services/api';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import { isValidIndianPhone, normalizeIndianPhone } from '../../utils/format';

const SignUp = () => {
  const pageRef = useRef(null);
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Personal/Contact Details, 2: Security & Password
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    pageTransition(pageRef.current);
  }, []);

  useEffect(() => {
    let strength = 0;
    const p = formData.password;
    if (p.length >= 8) strength += 25;
    if (/[A-Z]/.test(p)) strength += 25;
    if (/[0-9]/.test(p)) strength += 25;
    if (/[^A-Za-z0-9]/.test(p)) strength += 25;
    setPasswordStrength(strength);
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      return setError('Please enter your full name');
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      return setError('Please enter a valid work email address');
    }
    if (!formData.phone.trim()) {
      return setError('Please enter a primary contact phone number');
    }
    if (!isValidIndianPhone(formData.phone)) {
      return setError('Enter a valid 10-digit Indian mobile number (e.g. +91 98765 43210)');
    }

    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (passwordStrength < 100) {
      return setError('Password must be at least 8 characters and include uppercase, number, and special character');
    }

    if (!formData.termsAccepted) {
      return setError('You must accept the Terms of Service and Privacy Policy');
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/signup', {
        name: formData.name,
        email: formData.email,
        phone: normalizeIndianPhone(formData.phone) || formData.phone,
        password: formData.password
      });

      if (res.data.success) {
        navigate('/verify-otp', { state: { email: formData.email } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={pageRef}
      className="min-h-screen flex bg-slate-50 relative overflow-hidden pt-20 sm:pt-24 lg:pt-0"
    >
      <Helmet>
        <title>Register NGO Organization &bull; NGOcore</title>
        <meta name="description" content="Register your non-profit organization vault on NGOcore." />
      </Helmet>

      {/* Left Brand Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 text-white flex-col justify-between p-12 xl:p-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 opacity-90 -z-10" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-teal-500/15 rounded-full blur-[90px] pointer-events-none -z-10" />
        <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none -z-10" />

        <Link to="/" className="flex items-center space-x-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-teal-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-white font-heading">
              NGO<span className="text-indigo-400">core</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Digital Record & AI Vault
            </span>
          </div>
        </Link>

        <div className="my-auto max-w-md space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-900/50 border border-teal-700/50 text-teal-300 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-teal-400"></span>
            <span>2-Step Compliant Onboarding</span>
          </div>
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight font-heading">
            Join the Next Generation of Verified Humanitarian Relief
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Register your organization to establish an isolated cryptographic vault for records, aid distribution, and donor-compliant audit logs.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
              <span>Full tenant isolation with zero cross-organization leakage</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
              <span>AI duplicate detection across spelling & phonetic variants</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
              <span>Polygon L2 Merkle tree verification for international grant audits</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-900 pt-6">
          <span>&copy; {new Date().getFullYear()} NGOcore</span>
          <span className="text-slate-400">Compliance Desk 24/7</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <AnimatedBackground showGrid={false} />

        <div className="max-w-md w-full space-y-7 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
          <div>
            <div className="lg:hidden flex items-center space-x-2.5 mb-6">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <span className="font-extrabold text-lg text-slate-900 font-heading">
                NGO<span className="text-indigo-600">core</span>
              </span>
            </div>

            {/* Visual Registration Stepper */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  1
                </div>
                <span className={`text-xs font-bold ${step === 1 ? 'text-indigo-600' : 'text-slate-700'}`}>
                  Admin Identity
                </span>
              </div>
              <div className="h-0.5 w-8 bg-slate-200" />
              <div className="flex items-center space-x-2">
                <div className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center ${
                  step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  2
                </div>
                <span className={`text-xs font-bold ${step === 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  Security Vault
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
              {step === 1 ? 'Register Organization' : 'Set Account Security'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {step === 1
                ? 'Create your NGO Executive Administrator profile'
                : 'Configure memory-hard Argon2id credentials for your vault'}
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start space-x-3 text-rose-700 text-sm animate-fade-in">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-4" onSubmit={handleNextStep}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    required
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Executive Director / Administrator Name"
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm outline-none text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Official Work Email
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    required
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="director@your-foundation.org"
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm outline-none text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Contact Phone Number
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    required
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm outline-none text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center space-x-2 py-3.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none cursor-pointer mt-4"
              >
                <span>Continue to Step 2</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form className="space-y-4 animate-fade-in" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Create Master Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    required
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 8 chars, uppercase, number & symbol"
                    className="block w-full pl-11 pr-11 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm outline-none text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength <= 25
                            ? 'bg-rose-500 w-1/4'
                            : passwordStrength <= 50
                            ? 'bg-amber-500 w-2/4'
                            : passwordStrength <= 75
                            ? 'bg-blue-500 w-3/4'
                            : 'bg-emerald-500 w-full'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {passwordStrength < 100
                        ? 'Requires 8+ chars, uppercase, digit, and special symbol'
                        : 'Strong password verified'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Confirm Master Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    required
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter master password"
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm outline-none text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-start pt-1">
                <input
                  required
                  id="termsAccepted"
                  name="termsAccepted"
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded mt-0.5 cursor-pointer"
                />
                <label htmlFor="termsAccepted" className="ml-2 text-xs text-slate-600 cursor-pointer select-none leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="text-indigo-600 font-bold hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and acknowledge the{' '}
                  <Link to="/privacy" target="_blank" className="text-indigo-600 font-bold hover:underline">
                    Data Governance Policy
                  </Link>
                  .
                </label>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center space-x-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-70 transition-all cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Create Account & Send OTP'}
                </button>
              </div>
            </form>
          )}

          <div className="text-center pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already have an organization vault?{' '}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

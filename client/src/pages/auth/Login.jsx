import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, ShieldAlert, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { pageTransition } from '../../animations';
import { useAuth } from '../../context/AuthContext';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const Login = () => {
  const pageRef = useRef(null);
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusAlert, setStatusAlert] = useState(null);

  useEffect(() => {
    pageTransition(pageRef.current);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setStatusAlert(null);

    try {
      setLoading(true);
      const res = await login(formData);

      if (res.success) {
        const { redirect, statusNotice } = res;

        // Handle status notices and redirects
        if (redirect && redirect !== '/dashboard') {
          navigate(redirect, { state: { email: formData.email, notice: statusNotice } });
        } else {
          navigate(redirect || '/dashboard');
        }
      }
    } catch (err) {
      const resp = err.response?.data;
      const message = resp?.message || 'Login failed. Please check your credentials.';
      const errorCode = resp?.errors?.[0]?.code;

      if (errorCode === 'UNVERIFIED_EMAIL') {
        setStatusAlert({
          type: 'unverified',
          email: formData.email,
          message: 'Your email address has not been verified yet.'
        });
      } else {
        setError(message);
      }
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
        <title>Sign In &bull; NGOcore</title>
        <meta name="description" content="Sign in to your organization's encrypted vault on NGOcore." />
      </Helmet>

      {/* Left Brand Showcase Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 text-white flex-col justify-between p-12 xl:p-16 overflow-hidden">
        {/* Ambient Gradient Mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 opacity-90 -z-10" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-teal-500/15 rounded-full blur-[90px] pointer-events-none -z-10" />
        <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none -z-10" />

        {/* Top Header */}
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

        {/* Center Mission & Highlights */}
        <div className="my-auto max-w-md space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
            <span>Zero-Trust Organization Vaults</span>
          </div>
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight font-heading">
            Secure, Verifiable Record Management for Humanitarian Relief
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Every session is protected by memory-hard Argon2id key derivation, rotating refresh tokens, and deterministic multi-tenant isolation.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
              <span>AES-256 field-level encryption for sensitive beneficiary PII</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
              <span>Immutable SHA-256 Merkle proofs anchored to Polygon L2</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0" />
              <span>Phonetic AI deduplication prevents double aid distribution</span>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-900 pt-6">
          <span>&copy; {new Date().getFullYear()} NGOcore</span>
          <span className="font-mono text-emerald-400 flex items-center space-x-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Ledger Nodes Online</span>
          </span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <AnimatedBackground showGrid={false} />

        <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
          <div>
            <div className="lg:hidden flex items-center space-x-2.5 mb-6">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <span className="font-extrabold text-lg text-slate-900 font-heading">
                NGO<span className="text-indigo-600">core</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              Welcome back
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
              Sign in to access your organization's encrypted records
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start space-x-3 text-rose-700 text-sm animate-fade-in">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Status Alert: Unverified Email */}
          {statusAlert?.type === 'unverified' && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-800 text-sm space-y-2 animate-fade-in">
              <div className="flex items-center space-x-2 font-semibold">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <span>Email Verification Required</span>
              </div>
              <p className="text-xs leading-relaxed">{statusAlert.message}</p>
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/verify-otp', { state: { email: statusAlert.email } })}
                  className="text-indigo-600 hover:text-indigo-700 font-bold text-xs inline-flex items-center space-x-1 cursor-pointer"
                >
                  <span>Enter verification OTP</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Work Email
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
                  placeholder="name@organization.org"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm outline-none text-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-11 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm outline-none text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-xs font-medium text-slate-600 cursor-pointer select-none">
                  Remember this device for 30 days
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all hover:shadow-indigo-500/30 hover:-translate-y-0.5 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign In to Account'}
            </button>
          </form>

          <div className="text-center pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Don't have an organization account yet?{' '}
              <Link to="/signup" className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                Register organization
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

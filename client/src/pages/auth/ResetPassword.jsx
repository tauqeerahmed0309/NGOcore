import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { pageTransition } from '../../animations';
import api from '../../services/api';

const ResetPassword = () => {
  const pageRef = useRef(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    pageTransition(pageRef.current);
  }, []);

  // Compute password strength
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  }, [password]);

  const getStrengthMeta = () => {
    if (passwordStrength <= 25) return { color: 'bg-rose-500', text: 'Weak', textColor: 'text-rose-600' };
    if (passwordStrength <= 50) return { color: 'bg-amber-500', text: 'Fair', textColor: 'text-amber-600' };
    if (passwordStrength <= 75) return { color: 'bg-blue-500', text: 'Good', textColor: 'text-blue-600' };
    return { color: 'bg-emerald-500', text: 'Strong', textColor: 'text-emerald-600' };
  };

  const strengthMeta = getStrengthMeta();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (passwordStrength < 100) {
      return setError('Password must be at least 8 characters and include uppercase, number, and special character');
    }

    try {
      setLoading(true);
      await api.post('/auth/reset-password', {
        token,
        password
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={pageRef}
      className="min-h-screen flex items-center justify-center bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 pt-28 relative overflow-hidden"
    >
      <Helmet>
        <title>Reset Password &bull; NGOcore</title>
      </Helmet>

      {/* Decorative Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 left-1/3 w-[350px] h-[250px] bg-teal-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none -z-10"></div>

      <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-50 to-teal-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Set new password</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create a strong, secure password for your administrator account
          </p>
        </div>

        {!token ? (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl text-rose-700 text-sm space-y-3">
            <div className="flex items-center space-x-2 font-bold">
              <AlertCircle className="h-5 w-5" />
              <span>Missing Reset Token</span>
            </div>
            <p className="text-xs leading-relaxed">This password reset link is invalid or incomplete. Please request a fresh link.</p>
            <div>
              <Link
                to="/forgot-password"
                className="text-indigo-600 font-bold hover:underline inline-flex items-center space-x-1 text-xs"
              >
                <span>Request new password reset link</span>
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-emerald-800 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="font-bold text-lg text-slate-900">Password Reset Complete!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your password has been securely updated. All previous active sessions across devices have been logged out to safeguard your account.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              Sign In with New Password
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl text-rose-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                New Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  required
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-11 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm outline-none text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Strength:</span>
                    <span className={`font-bold ${strengthMeta.textColor}`}>{strengthMeta.text}</span>
                  </div>
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`transition-all duration-300 ease-out h-full ${strengthMeta.color}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Must contain at least 8 characters, an uppercase letter, a number, and a symbol.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  required
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm outline-none text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all hover:shadow-indigo-500/30 hover:-translate-y-0.5 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Update Account Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

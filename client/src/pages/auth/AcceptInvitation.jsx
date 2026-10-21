import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { pageTransition } from '../../animations';
import api from '../../services/api';

const AcceptInvitation = () => {
  const pageRef = useRef(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    pageTransition(pageRef.current);
    if (!token) {
      setError('Missing invitation token. Please check the invitation link in your email.');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/invitations/verify/${token}`);
        if (res.data.success) {
          setInviteData(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired invitation link');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // Compute password strength
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
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const getStrengthMeta = () => {
    if (passwordStrength <= 25) return { color: 'bg-rose-500', text: 'Weak', textColor: 'text-rose-600' };
    if (passwordStrength <= 50) return { color: 'bg-amber-500', text: 'Fair', textColor: 'text-amber-600' };
    if (passwordStrength <= 75) return { color: 'bg-blue-500', text: 'Good', textColor: 'text-blue-600' };
    return { color: 'bg-emerald-500', text: 'Strong', textColor: 'text-emerald-600' };
  };

  const strengthMeta = getStrengthMeta();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password !== formData.confirmPassword) {
      return setFormError('Passwords do not match');
    }

    if (passwordStrength < 100) {
      return setFormError('Password must be at least 8 characters and include uppercase, number, and special character');
    }

    try {
      setSubmitting(true);
      const res = await api.post('/invitations/accept', {
        token,
        name: formData.name,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      if (res.data.success) {
        const { accessToken, user } = res.data.data;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        navigate('/dashboard');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={pageRef}
      className="min-h-screen flex items-center justify-center bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 pt-28 relative overflow-hidden"
    >
      <Helmet>
        <title>Accept Team Invitation &bull; NGOcore</title>
      </Helmet>

      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 left-1/3 w-[350px] h-[250px] bg-teal-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none -z-10"></div>

      <div className="max-w-md w-full space-y-6 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
        {loading ? (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mx-auto" />
            <p className="text-sm font-medium text-slate-600">Verifying invitation credentials...</p>
          </div>
        ) : error ? (
          <div className="text-center space-y-5">
            <div className="mx-auto h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invitation Inactive</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <span>Return to Homepage</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-3">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-400 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center">
                <div className="h-full w-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                  <UserCheck className="h-7 w-7 text-teal-400" />
                </div>
              </div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <Building2 className="h-3.5 w-3.5" />
                <span>{inviteData.ngo?.name}</span>
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Join Organization Team</h2>
              <p className="text-xs text-slate-500">
                You have been assigned the <strong className="text-indigo-600">{inviteData.role?.name}</strong> role.
              </p>
            </div>

            {formError && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-3.5 rounded-r-xl text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form className="space-y-4 pt-1" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  disabled
                  value={inviteData.email}
                  className="block w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed select-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    required
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs outline-none text-slate-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Choose Account Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    required
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs outline-none text-slate-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {formData.password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Strength:</span>
                      <span className={`font-bold ${strengthMeta.textColor}`}>{strengthMeta.text}</span>
                    </div>
                    <div className="flex h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`transition-all duration-300 ease-out h-full ${strengthMeta.color}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Confirm Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    required
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs outline-none text-slate-900 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all hover:shadow-indigo-500/30 hover:-translate-y-0.5 cursor-pointer mt-3"
              >
                {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Accept & Activate Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;

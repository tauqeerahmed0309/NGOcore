import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { KeyRound, Loader2, AlertCircle, ArrowLeft, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { pageTransition } from '../../animations';
import api from '../../services/api';
import AnimatedBackground from '../../components/common/AnimatedBackground';

const VerifyOTP = () => {
  const pageRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  // 6 individual digit slots
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
    pageTransition(pageRef.current);
    // Auto-focus the first OTP slot
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index, value) => {
    // Only accept numeric input
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newDigits = [...digits];

    if (cleanVal.length > 1) {
      // User typed or pasted multiple characters
      const chars = cleanVal.slice(0, 6).split('');
      chars.forEach((c, i) => {
        if (index + i < 6) {
          newDigits[index + i] = c;
        }
      });
      setDigits(newDigits);
      const nextFocus = Math.min(index + chars.length, 5);
      if (inputRefs.current[nextFocus]) {
        inputRefs.current[nextFocus].focus();
      }
      return;
    }

    newDigits[index] = cleanVal;
    setDigits(newDigits);

    // Auto-advance to next slot
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back and clear previous slot
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    pastedData.split('').forEach((char, i) => {
      newDigits[i] = char;
    });
    setDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      return setError('Please enter the complete 6-digit verification code');
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/verify-otp', { email, otp: otpCode });
      if (res.data.success) {
        if (res.data.data?.accessToken) {
          localStorage.setItem('accessToken', res.data.data.accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${res.data.data.accessToken}`;
        }
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError('');
    setResendSuccess(false);

    try {
      setResending(true);
      await api.post('/auth/send-otp', { email });
      setCooldown(60);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <div
      ref={pageRef}
      className="min-h-screen flex items-center justify-center bg-slate-50 py-16 px-4 pt-24 relative overflow-hidden"
    >
      <Helmet>
        <title>Verify Email &bull; NGOcore</title>
      </Helmet>

      <AnimatedBackground />

      <div className="max-w-md w-full bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 relative text-center">
        {/* Top Back Link */}
        <Link
          to="/signup"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-6 absolute left-8 top-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Change Email</span>
        </Link>

        {/* Brand Shield Icon */}
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-400 p-0.5 shadow-md shadow-indigo-500/20 mb-4 mt-4 flex items-center justify-center">
          <div className="h-full w-full bg-slate-900 rounded-[14px] flex items-center justify-center">
            <KeyRound className="h-7 w-7 text-teal-400" />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
          Verify Work Email
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
          We sent a 6-digit authentication code to <br />
          <span className="font-bold text-slate-800 break-all">{email}</span>
        </p>

        {error && (
          <div className="mt-6 bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-xl flex items-start space-x-2.5 text-rose-700 text-xs text-left animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {resendSuccess && (
          <div className="mt-6 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-xl flex items-start space-x-2.5 text-emerald-700 text-xs text-left animate-fade-in">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">New verification code has been dispatched.</div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Auto-advancing 6-slot OTP Input Box */}
          <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all shadow-2xs"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || digits.join('').length !== 6}
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-all cursor-pointer"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Confirm & Activate Vault'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Didn't receive the email?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="font-bold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
          >
            {resending && <RefreshCw className="animate-spin h-3.5 w-3.5" />}
            <span>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;

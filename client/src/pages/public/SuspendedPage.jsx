import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldBan, AlertTriangle, Mail, LogOut, ArrowRight, Lock } from 'lucide-react';
import { pageTransition } from '../../animations';
import { Link } from 'react-router-dom';

const SuspendedPage = () => {
  const pageRef = useRef(null);

  useEffect(() => {
    pageTransition(pageRef.current);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div
      ref={pageRef}
      className="min-h-screen flex items-center justify-center bg-slate-50 py-16 px-4 pt-28 relative overflow-hidden"
    >
      <Helmet>
        <title>Account Suspended &bull; NGOcore</title>
      </Helmet>

      {/* Decorative Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 left-1/3 w-[350px] h-[250px] bg-rose-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none -z-10"></div>

      <div className="max-w-lg w-full text-center space-y-6 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
        <div className="mx-auto h-20 w-20 bg-gradient-to-tr from-amber-50 to-amber-100 rounded-3xl border border-amber-200 flex items-center justify-center mb-4 shadow-xs">
          <ShieldBan className="h-10 w-10 text-amber-600" />
        </div>

        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          Security Alert: Tenant Vault Suspended
        </span>

        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Organization Suspended</h2>

        <p className="text-slate-600 text-sm leading-relaxed">
          Access to this organization vault has been temporarily suspended by the Platform Security & Compliance Team. All active user sessions are restricted from querying or updating records.
        </p>

        {/* Security Notice Card */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Lock className="h-4 w-4 text-amber-600" />
            <span>Why is an organization suspended?</span>
          </h4>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
              <span>Periodic DPDP or legal compliance recertification is overdue.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
              <span>Potential security anomaly or multiple invalid credential attempts detected.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
              <span>Administrative hold requested by your NGO’s primary trust administrator.</span>
            </li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Contact Security Desk</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspendedPage;

import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Clock, ShieldCheck, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { pageTransition } from '../../animations';
import { Link } from 'react-router-dom';

const PendingApproval = () => {
  const pageRef = useRef(null);

  useEffect(() => {
    pageTransition(pageRef.current);
  }, []);

  return (
    <div
      ref={pageRef}
      className="min-h-screen flex items-center justify-center bg-slate-50 py-16 px-4 pt-28 relative overflow-hidden"
    >
      <Helmet>
        <title>Application In Review &bull; NGOcore</title>
      </Helmet>

      {/* Decorative Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 left-1/3 w-[350px] h-[250px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none -z-10"></div>

      <div className="max-w-lg w-full text-center space-y-6 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
        <div className="mx-auto h-20 w-20 bg-gradient-to-tr from-amber-50 to-amber-100 rounded-3xl border border-amber-200 flex items-center justify-center mb-4 shadow-xs">
          <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
        </div>

        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          Status: Review In Progress
        </span>

        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Application Submitted</h2>

        <p className="text-slate-600 text-sm leading-relaxed">
          Thank you for submitting your organization's legal registration details. Our Platform Compliance Officers are currently auditing your verification documents.
        </p>

        {/* Informational Card */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Verification Procedure & Timelines</span>
          </h4>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
              <span>Entity verification against official charity commission / NGO registrar records.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
              <span>Review is typically completed within <strong>24 to 48 business hours</strong>.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
              <span>You will receive an automated email notification once your tenant vault is activated.</span>
            </li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <span>Return to Homepage</span>
          </Link>
          <Link
            to="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-3 rounded-xl text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            <span>Contact Verification Support</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;

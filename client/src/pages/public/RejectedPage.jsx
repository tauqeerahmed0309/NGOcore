import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { XCircle, ShieldAlert, Mail, ArrowRight, HelpCircle, FileText } from 'lucide-react';
import { pageTransition } from '../../animations';
import { Link } from 'react-router-dom';

const RejectedPage = () => {
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
        <title>Application Status: Rejected &bull; NGOcore</title>
      </Helmet>

      {/* Decorative Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-rose-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 left-1/3 w-[350px] h-[250px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none -z-10"></div>

      <div className="max-w-lg w-full text-center space-y-6 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
        <div className="mx-auto h-20 w-20 bg-gradient-to-tr from-rose-50 to-rose-100 rounded-3xl border border-rose-200 flex items-center justify-center mb-4 shadow-xs">
          <XCircle className="h-10 w-10 text-rose-600" />
        </div>

        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
          Status: Registration Not Approved
        </span>

        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Application Rejected</h2>

        <p className="text-slate-600 text-sm leading-relaxed">
          Our Platform Compliance Officers have reviewed your submitted legal documentation and were unable to verify your organization’s registration certificate.
        </p>

        {/* Informational Guidance */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <span>Common Rejection Reasons</span>
          </h4>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
              <span>Registration certificate scan was illegible, expired, or had blurred seal stamps.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
              <span>Name on application did not match the official government registrar record.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
              <span>Missing mandatory secondary documentation (tax exemption or authorized trustee deed).</span>
            </li>
          </ul>
        </div>

        {/* Appeal notice */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-left flex items-start space-x-3">
          <HelpCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            If you believe this decision was made in error or wish to submit updated documentation for re-verification, please reach out to our compliance desk with your application reference.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Appeal via Compliance Desk</span>
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <span>Return to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RejectedPage;

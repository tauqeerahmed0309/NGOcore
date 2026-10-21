import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileQuestion, ArrowLeft, Home, Compass } from 'lucide-react';
import { pageTransition } from '../../animations';
import { Link, useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const pageRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    pageTransition(pageRef.current);
  }, []);

  return (
    <div
      ref={pageRef}
      className="min-h-screen flex items-center justify-center bg-slate-50 py-16 px-4 pt-28 relative overflow-hidden"
    >
      <Helmet>
        <title>404 - Page Not Found &bull; NGOcore</title>
      </Helmet>

      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 left-1/3 w-[350px] h-[250px] bg-teal-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none -z-10"></div>

      <div className="max-w-lg w-full text-center space-y-6 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
        <div className="mx-auto h-24 w-24 bg-gradient-to-tr from-indigo-50 to-indigo-100 rounded-3xl border border-indigo-200 flex items-center justify-center mb-2 shadow-xs relative">
          <FileQuestion className="h-12 w-12 text-indigo-600 animate-pulse" />
          <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white shadow-sm">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed max-w-sm mx-auto">
            The resource, document, or route you requested does not exist or may have been relocated to an encrypted partition.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Go Back</span>
          </button>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-6 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

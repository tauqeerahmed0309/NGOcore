import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { pageTransition } from '../../animations';

const GenericPage = ({ title, subtitle, content }) => {
  const pageRef = useRef(null);

  useEffect(() => {
    pageTransition(pageRef.current);
  }, [title]);

  return (
    <div ref={pageRef} className="min-h-screen pt-32 pb-24 bg-slate-50 relative overflow-hidden">
      <Helmet>
        <title>{title} &bull; NGOcore</title>
      </Helmet>

      {/* Decorative ambient background */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[250px] bg-teal-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-10">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-3">
            <Sparkles className="h-3 w-3" />
            <span>NGOcore Knowledge & Governance</span>
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Content Card */}
        <div className="bg-white/95 backdrop-blur-md p-8 sm:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 leading-relaxed text-slate-700 space-y-6">
          {content}
        </div>
      </div>
    </div>
  );
};

export default GenericPage;

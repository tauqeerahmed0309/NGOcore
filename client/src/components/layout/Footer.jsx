import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Lock, Cpu, Database } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 relative overflow-hidden border-t border-slate-800/80">
      {/* Decorative top ambient glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand Info & Mission */}
          <div className="lg:col-span-2 space-y-5">
            <Link to="/" data-brand="true" className="brand-logo flex items-center space-x-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-400 p-0.5 shadow-md">
                <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <ShieldCheck className="h-4.5 w-4.5 text-teal-400" />
                </div>
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight font-heading">
                NGO<span className="text-indigo-400">core</span>
              </span>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The high-trust digital record and AI management system for non-profits. Empowering organizations with zero-trust multi-tenancy, AI-powered duplicate detection, and tamper-evident blockchain verification.
            </p>

            {/* Platform Status Pill */}
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>All Systems Operational &bull; Cryptographic Ledger Active</span>
            </div>
          </div>

          {/* Column 1: Platform Capabilities */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 font-heading">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/features" className="hover:text-indigo-400 transition-colors">Encrypted Vault</Link></li>
              <li><Link to="/features" className="hover:text-indigo-400 transition-colors">Beneficiary Tracking</Link></li>
              <li><Link to="/features" className="hover:text-indigo-400 transition-colors">Blockchain Audit Logs</Link></li>
              <li><Link to="/features" className="hover:text-indigo-400 transition-colors">AI Deduplication Engine</Link></li>
              <li><Link to="/features" className="hover:text-indigo-400 transition-colors">Role-Based Access (RBAC)</Link></li>
            </ul>
          </div>

          {/* Column 2: Governance & Security */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 font-heading">Security & Trust</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-slate-300">Strict Tenant Scoping</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-slate-300">AES-256 Field Encryption</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-slate-300">Argon2id Session Guard</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-slate-300">DPDP & GDPR Compliant</span>
              </li>
              <li><Link to="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Governance</Link></li>
            </ul>
          </div>

          {/* Column 3: Organization */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 font-heading">Organization</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/about" className="hover:text-indigo-400 transition-colors">About NGOcore</Link></li>
              <li><Link to="/contact" className="hover:text-indigo-400 transition-colors">Support & Verification</Link></li>
              <li><Link to="/faq" className="hover:text-indigo-400 transition-colors">Frequently Asked Questions</Link></li>
              <li><Link to="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-4 sm:space-y-0">
          <p>&copy; {new Date().getFullYear()} NGOcore. Built for humanitarian transparency and data protection.</p>
          <div className="flex items-center space-x-6">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Use</Link>
            <Link to="/contact" className="hover:text-slate-300 transition-colors">Compliance Desk</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

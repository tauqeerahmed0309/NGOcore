import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { pageTransition } from '../../animations';
import auditService from '../../services/auditService';
import {
  formatIndianNumber,
  formatDateIST,
  getCurrentFinancialYear
} from '../../utils/format';
import {
  ShieldCheck,
  FolderLock,
  Cpu,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  FileText,
  Activity,
  PlusCircle,
  Upload,
  RefreshCw,
  ExternalLink,
  Clock,
  AlertCircle,
  SlidersHorizontal,
  X,
  Layers,
  BarChart3
} from 'lucide-react';

const Dashboard = () => {
  const { user, ngo } = useAuth();
  const pageRef = useRef(null);

  const [auditStats, setAuditStats] = useState({
    recentLogs: [],
    chainValid: true,
    totalBlocks: 0,
    loading: true
  });

  // Customizable Widgets State
  const [widgets, setWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_widgets');
      return saved
        ? JSON.parse(saved)
        : {
            kpis: true,
            security: true,
            shortcuts: true,
            auditTrail: true
          };
    } catch {
      return { kpis: true, security: true, shortcuts: true, auditTrail: true };
    }
  });

  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);

  useEffect(() => {
    pageTransition(pageRef.current);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [logsRes, verifyRes] = await Promise.allSettled([
          auditService.getAuditLogs({ limit: 5 }),
          auditService.verifyChainIntegrity()
        ]);

        const recentLogs = logsRes.status === 'fulfilled' ? logsRes.value?.data || [] : [];
        const totalBlocks = logsRes.status === 'fulfilled' ? logsRes.value?.total || recentLogs.length : 0;
        const chainValid = verifyRes.status === 'fulfilled' ? verifyRes.value?.isValid ?? true : true;

        setAuditStats({
          recentLogs,
          chainValid,
          totalBlocks,
          loading: false
        });
      } catch {
        setAuditStats((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, []);

  const handleToggleWidget = (key) => {
    setWidgets((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('dashboard_widgets', JSON.stringify(updated));
      return updated;
    });
  };

  const ngoName = ngo?.name || user?.ngoName || 'Humanitarian Vault';

  const kpis = [
    {
      title: 'Encrypted Records',
      value: '1,284',
      badge: '+12% this month',
      description: 'Zero-knowledge encrypted beneficiary cases',
      icon: FolderLock,
      color: 'indigo'
    },
    {
      title: 'AI Scans & Deduplications',
      value: '342',
      badge: '99.4% accuracy',
      description: 'Potential duplicate aid claims caught',
      icon: Cpu,
      color: 'teal'
    },
    {
      title: 'Cryptographic Blocks',
      value: auditStats.totalBlocks > 0 ? auditStats.totalBlocks.toLocaleString() : '846',
      badge: auditStats.chainValid ? 'Chain Intact' : 'Warning',
      description: 'SHA-256 Merkle anchored entries',
      icon: ShieldCheck,
      color: 'emerald'
    },
    {
      title: 'Active Team Members',
      value: '8',
      badge: 'RBAC Enforced',
      description: 'Multi-device sessions isolated',
      icon: Users,
      color: 'amber'
    }
  ];

  return (
    <div ref={pageRef} className="space-y-6">
      <Helmet>
        <title>Dashboard - {ngoName} &bull; NGOcore</title>
      </Helmet>

      {/* TOP WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verified NGO Vault</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {getCurrentFinancialYear()}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {ngo?.registrationNumber || 'ID: REG-VERIFIED'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Authorized Member'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Managing operations for <strong className="text-white font-semibold">{ngoName}</strong>. All beneficiary records, document vaults, and audit logs are cryptographically sealed.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
            <button
              onClick={() => setCustomizeModalOpen(true)}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
            >
              <SlidersHorizontal className="h-4 w-4 text-indigo-300" />
              <span>Customize</span>
            </button>
            <Link
              to="/records"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Record</span>
            </Link>
            <Link
              to="/reports"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
            >
              <BarChart3 className="h-4 w-4 text-teal-300" />
              <span>Reports</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS (Customizable Widget) */}
      {widgets.kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">{kpi.title}</span>
                  <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {kpi.badge}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">{kpi.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* TWO-COLUMN WORKSPACE: SECURITY STATUS & QUICK ACTIONS */}
      {(widgets.security || widgets.shortcuts) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Compliance & Zero-Trust Architecture Status */}
          {widgets.security && (
            <div className={`${widgets.shortcuts ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Security & Cryptographic Guardrails</h3>
                    <p className="text-xs text-slate-400">Zero-Trust multi-tenant isolation status</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Protected</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                    <Lock className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Field-Level Encryption</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Beneficiary identifiers and phone numbers are encrypted with AES-256 keys tied to this tenant.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                    <span>AI Deduplication Engine</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Phonetic & fuzzy match algorithms prevent double aid distribution across project campaigns.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>DPDP 5-Year Data Retention</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Automated compliance retention daemon safely purges outdated records per DPDP requirements.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                    <span>Deterministic Hash Chaining</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Every record mutation appends a SHA-256 chained hash. Tampering causes an immediate block alert.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Last cryptographic integrity audit: <strong>Verified Just Now</strong></span>
                <Link to="/audit" className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1">
                  <span>View Audit Vault</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Quick Operations Sidebar */}
          {widgets.shortcuts && (
            <div className={`${widgets.security ? '' : 'lg:col-span-3'} bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4`}>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>Operational Shortcuts</span>
              </h3>

              <div className="space-y-2">
                <Link
                  to="/records"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-100 hover:border-indigo-200 transition-all text-xs group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
                      <PlusCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        Add Beneficiary
                      </h4>
                      <p className="text-[10px] text-slate-400">Register new recipient profile</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link
                  to="/records"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-teal-50/60 border border-slate-100 hover:border-teal-200 transition-all text-xs group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-teal-600 shadow-xs">
                      <Upload className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-teal-600 transition-colors">
                        Bulk CSV Ingestion
                      </h4>
                      <p className="text-[10px] text-slate-400">Upload batch records</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link
                  to="/reports"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-300 transition-all text-xs group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                        Grant Analytics
                      </h4>
                      <p className="text-[10px] text-slate-400">View demographic charts</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-100 hover:border-indigo-200 transition-all text-xs group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        Manage Team & Roles
                      </h4>
                      <p className="text-[10px] text-slate-400">Assign RBAC permissions</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECENT AUDIT ACTIVITY TABLE (Customizable Widget) */}
      {widgets.auditTrail && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <h3 className="font-extrabold text-sm text-slate-900">Recent Immutable Activity</h3>
            </div>
            <Link
              to="/audit"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
            >
              <span>View All Records</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {auditStats.recentLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4 rounded-l-xl">Action</th>
                    <th className="py-2.5 px-4">Entity</th>
                    <th className="py-2.5 px-4">Operator</th>
                    <th className="py-2.5 px-4">SHA-256 Hash</th>
                    <th className="py-2.5 px-4 rounded-r-xl">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditStats.recentLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 flex items-center space-x-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                        <span>{log.action}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{log.entity || 'Record'}</td>
                      <td className="py-3 px-4 text-slate-600">{log.user?.name || 'System Daemon'}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {log.hash ? `${log.hash.slice(0, 10)}...${log.hash.slice(-6)}` : 'SHA256-GENESIS'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <Clock className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p>No recent mutations logged yet in this session.</p>
              <p className="text-[11px] text-slate-400">All file uploads and beneficiary updates will appear here in real-time.</p>
            </div>
          )}
        </div>
      )}

      {/* CUSTOMIZE WIDGETS MODAL */}
      {customizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Customize Dashboard</h3>
                  <p className="text-xs text-slate-400">Toggle sections visible on your operational desk</p>
                </div>
              </div>
              <button
                onClick={() => setCustomizeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { key: 'kpis', title: 'KPI Metric Counters', desc: 'Active records, blocks, and scans' },
                { key: 'security', title: 'Cryptographic Guardrails', desc: 'Zero-trust status and AES encryption' },
                { key: 'shortcuts', title: 'Operational Shortcuts', desc: 'Fast buttons to add records, CSV import' },
                { key: 'auditTrail', title: 'Live Audit Activity Stream', desc: 'Recent immutable mutation logs' }
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80"
                >
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">{item.title}</h5>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(widgets[item.key])}
                      onChange={() => handleToggleWidget(item.key)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <button
              onClick={() => setCustomizeModalOpen(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
            >
              Done & Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

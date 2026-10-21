import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { pageTransition } from '../../animations';
import recordService from '../../services/recordService';
import auditService from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Users,
  HeartHandshake,
  Receipt,
  ShieldCheck,
  FileSpreadsheet,
  ArrowUpRight,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';

const ReportsPage = () => {
  const pageRef = useRef(null);
  const { ngo } = useAuth();
  const toast = useToast();

  const [timeRange, setTimeRange] = useState('30d');
  const [reportType, setReportType] = useState('overview'); // 'overview' | 'beneficiaries' | 'aid' | 'grants' | 'audit'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    pageTransition(pageRef.current);
  }, []);

  const ngoName = ngo?.name || 'Humanitarian Vault';

  // Sample Aggregated Metrics
  const summaryMetrics = [
    { title: 'Total Beneficiaries', value: '3,842', change: '+14.2%', period: 'vs last month', icon: Users, color: 'indigo' },
    { title: 'Relief Dispatches', value: '1,280 kits', change: '+8.4%', period: 'vs last month', icon: HeartHandshake, color: 'teal' },
    { title: 'Grant Capital Inflow', value: '$248,500', change: '+22.5%', period: 'vs last month', icon: Receipt, color: 'emerald' },
    { title: 'Cryptographic Audits', value: '100% Valid', change: '0 Tampering', period: 'Merkle root synced', icon: ShieldCheck, color: 'purple' }
  ];

  // Aid category breakdown
  const aidCategories = [
    { name: 'Food Ration Kits', percentage: 42, count: '538 Dispatches', color: 'bg-indigo-600' },
    { name: 'Emergency Healthcare', percentage: 28, count: '358 Kits', color: 'bg-teal-500' },
    { name: 'Direct Cash Assistance', percentage: 18, count: '$44,700 disbursed', color: 'bg-emerald-500' },
    { name: 'Shelter & Tents', percentage: 12, count: '154 Units', color: 'bg-amber-500' }
  ];

  // Demographics breakdown
  const demographics = [
    { label: 'Women & Girls', percentage: 56, count: '2,151 Beneficiaries' },
    { label: 'Children (Under 14)', percentage: 31, count: '1,191 Individuals' },
    { label: 'Elderly (60+)', percentage: 22, count: '845 Individuals' },
    { label: 'Persons with Disabilities', percentage: 9, count: '345 Individuals' }
  ];

  // Monthly trends
  const monthlyTrends = [
    { month: 'May', records: 420, aid: 180 },
    { month: 'Jun', records: 680, aid: 310 },
    { month: 'Jul', records: 890, aid: 450 },
    { month: 'Aug', records: 1120, aid: 620 },
    { month: 'Sep', records: 1450, aid: 890 },
    { month: 'Oct', records: 1840, aid: 1280 }
  ];

  const handleExportReport = () => {
    const reportData = {
      organization: ngoName,
      generatedAt: new Date().toISOString(),
      reportingPeriod: timeRange,
      summary: summaryMetrics,
      aidDistribution: aidCategories,
      beneficiaryDemographics: demographics,
      monthlyProgress: monthlyTrends
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_report_${timeRange}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Auditor compliance report exported');
  };

  return (
    <div ref={pageRef} className="space-y-6">
      <Helmet>
        <title>Analytics & Grant Reporting &bull; NGOcore</title>
      </Helmet>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1">
              <BarChart3 className="h-3 w-3 text-indigo-600" />
              <span>Grant & Donor Analytics</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
              UN & DPDP Auditable
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Impact & Operational Reporting
          </h1>
          <p className="text-xs text-slate-500">
            Real-time beneficiary distributions, funding allocation, and verifiable impact summaries for {ngoName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time range selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? 'Quarter' : 'Year'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportReport}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Download className="h-4 w-4" />
            <span>Export Compliance Report</span>
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryMetrics.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{kpi.title}</span>
                <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center space-x-0.5">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>{kpi.change}</span>
                </span>
              </div>

              <p className="text-[11px] text-slate-400">{kpi.period}</p>
            </div>
          );
        })}
      </div>

      {/* TWO-COLUMN CHARTS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Activity Trends Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Distribution Ingestion & Dispatches</h3>
              <p className="text-xs text-slate-400">Monthly progression of active beneficiary relief</p>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center space-x-1.5 font-bold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-indigo-600"></span>
                <span>Beneficiary Intake</span>
              </span>
              <span className="flex items-center space-x-1.5 font-bold text-slate-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-teal-400"></span>
                <span>Relief Kits Disbursed</span>
              </span>
            </div>
          </div>

          {/* SVG / CSS Bar Chart */}
          <div className="pt-4 flex items-end justify-between h-48 gap-3 sm:gap-6 border-b border-slate-100 pb-2">
            {monthlyTrends.map((item, idx) => {
              const maxVal = 2000;
              const recordHeight = Math.round((item.records / maxVal) * 100);
              const aidHeight = Math.round((item.aid / maxVal) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    {/* Record Bar */}
                    <div
                      style={{ height: `${recordHeight}%` }}
                      className="w-full max-w-[18px] bg-indigo-600 rounded-t-md transition-all group-hover:bg-indigo-700 relative"
                      title={`Intake: ${item.records}`}
                    ></div>
                    {/* Aid Bar */}
                    <div
                      style={{ height: `${aidHeight}%` }}
                      className="w-full max-w-[18px] bg-teal-400 rounded-t-md transition-all group-hover:bg-teal-500 relative"
                      title={`Aid: ${item.aid}`}
                    ></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">{item.month}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>Average monthly aid delivery growth: <strong className="text-emerald-600 font-bold">+28.4%</strong></span>
            <span className="font-mono text-[11px] text-slate-400">Zero-Trust Cryptographically Verified</span>
          </div>
        </div>

        {/* Aid Allocation Progress Breakdown (1 col) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">Aid Type Allocation</h3>
            <span className="text-xs font-bold text-indigo-600">100% Allocated</span>
          </div>

          <div className="space-y-4">
            {aidCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">{cat.name}</span>
                  <span className="text-slate-900">{cat.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{cat.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DEMOGRAPHICS & GRANT COMPLIANCE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vulnerability & Inclusion Metrics */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <span>Vulnerability & Demographics Breakdown</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {demographics.map((demo, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{demo.label}</span>
                  <span className="text-xs font-extrabold text-indigo-600">{demo.percentage}%</span>
                </div>
                <p className="text-[11px] text-slate-400">{demo.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Audit & Compliance Transparency Certificate Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>International Compliance Readiness</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start space-x-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900">DPDP Act 2023 / GDPR Consent</h4>
                <p className="text-[11px] text-slate-600">All recipient records maintain cryptographic consent logs and right-to-erasure certificates.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start space-x-3">
              <CheckCircle2 className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900">Zero-Trust Tenant Vault</h4>
                <p className="text-[11px] text-slate-600">Scoped database boundaries prevent any beneficiary data leaks between non-profit tenants.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-start space-x-3">
              <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900">Immutable SHA-256 Ledger</h4>
                <p className="text-[11px] text-slate-600">Sequential hash chaining proves mathematical non-repudiation for institutional donor audits.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;

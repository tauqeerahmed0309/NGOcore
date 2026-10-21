import React, { useState, useEffect, useRef } from 'react';
import { pageTransition } from '../../animations';
import auditService from '../../services/auditService';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  User,
  Globe,
  Database,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Link as LinkIcon,
  Sparkles
} from 'lucide-react';

export default function AuditLogs() {
  const pageRef = useRef(null);

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [actionStats, setActionStats] = useState([]);
  const [currentRootHash, setCurrentRootHash] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResource, setSelectedResource] = useState('');

  // Integrity Verification State
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Inspector Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Export State
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (pageRef.current) {
      pageTransition(pageRef.current);
    }
    fetchLogs(1);
    handleVerifyChain();
  }, []);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 20,
        search: search.trim() || undefined,
        action: selectedAction || undefined,
        resource: selectedResource || undefined
      };
      const data = await auditService.getAuditLogs(params);
      setLogs(data?.data || []);
      setPagination(data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      setActionStats(data?.actionStats || []);
      if (data?.currentRootHash) {
        setCurrentRootHash(data.currentRootHash);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedAction('');
    setSelectedResource('');
    setTimeout(() => {
      auditService.getAuditLogs({ page: 1, limit: 20 }).then((data) => {
        setLogs(data?.data || []);
        setPagination(data?.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      });
    }, 10);
  };

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const result = await auditService.verifyChainIntegrity();
      setVerificationResult(result);
    } catch (err) {
      setVerificationResult({
        isValid: false,
        error: err.response?.data?.message || 'Verification service temporarily unavailable.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await auditService.exportAuditLogs('csv');
    } catch (err) {
      setError('Failed to export audit trail to CSV.');
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const getActionBadgeColor = (action) => {
    if (/LOGIN_FAILED|REVOKED|SUSPENDED|DELETED/i.test(action)) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (/CREATED|INVITED|ACCEPTED|APPROVED/i.test(action)) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (/UPDATED|CHANGED|MODIFIED/i.test(action)) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div ref={pageRef} className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Global Feedback */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3 shadow-sm animate-fade-in">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hero Header */}
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>APPEND-ONLY COMPLIANCE VAULT</span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  SHA-256 HASH CHAINED
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Immutable Audit Trail & Activity Logs
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Every critical event—including sign-ups, logins, role changes, invitations, and configuration updates—is permanently recorded in a tamper-evident cryptographic hash chain.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleVerifyChain}
                disabled={verifying}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:shadow transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {verifying ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>Verify Hash Chain</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={exporting}
                className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold shadow-md hover:shadow transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {exporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-900" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cryptographic Chain Integrity Banner */}
        {verificationResult && (
          <div
            className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in ${
              verificationResult.isValid
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <div
                className={`p-2.5 rounded-2xl flex-shrink-0 mt-0.5 ${
                  verificationResult.isValid
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {verificationResult.isValid ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <ShieldAlert className="h-6 w-6" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-extrabold text-sm sm:text-base">
                    {verificationResult.isValid
                      ? 'Cryptographic Chain Integrity Intact'
                      : 'Cryptographic Hash Chain Tampering Detected!'}
                  </h4>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-emerald-300 text-emerald-800">
                    {verificationResult.totalLogsVerified} Blocks Checked
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-snug">
                  {verificationResult.message || verificationResult.error}
                </p>
              </div>
            </div>

            {verificationResult.rootHash && (
              <div className="p-3 rounded-2xl bg-white border border-emerald-200/80 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">
                    Chain Root Hash
                  </span>
                  <code className="font-mono text-slate-800 font-bold text-xs truncate max-w-[200px] sm:max-w-[280px] block">
                    {verificationResult.rootHash}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(verificationResult.rootHash)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                  title="Copy Root Hash"
                >
                  {copiedHash ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by action, resource, or IP address..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
              />
            </div>

            {/* Action Filter */}
            <div className="w-full md:w-56">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm text-slate-900 transition-all outline-none bg-white"
              >
                <option value="">All Action Types</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
                <option value="PROFILE_UPDATED">PROFILE_UPDATED</option>
                <option value="NGO_PROFILE_UPDATED">NGO_PROFILE_UPDATED</option>
                <option value="NGO_SETTINGS_UPDATED">NGO_SETTINGS_UPDATED</option>
                <option value="ROLE_CREATED">ROLE_CREATED</option>
                <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
                <option value="USER_INVITED">USER_INVITED</option>
                <option value="INVITATION_ACCEPTED">INVITATION_ACCEPTED</option>
                <option value="SESSION_REVOKED">SESSION_REVOKED</option>
                <option value="ALL_OTHER_SESSIONS_REVOKED">ALL_OTHER_SESSIONS_REVOKED</option>
              </select>
            </div>

            {/* Resource Filter */}
            <div className="w-full md:w-48">
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm text-slate-900 transition-all outline-none bg-white"
              >
                <option value="">All Resources</option>
                <option value="User">User</option>
                <option value="Role">Role</option>
                <option value="NGO">NGO</option>
                <option value="Session">Session</option>
                <option value="Invitation">Invitation</option>
                <option value="File">File</option>
              </select>
            </div>

            {/* Submit & Reset Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filter</span>
              </button>

              {(search || selectedAction || selectedResource) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </form>

          {/* Quick Action Badges */}
          {actionStats.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none text-xs">
              <span className="text-slate-400 font-semibold text-[11px] whitespace-nowrap">Filter Quick:</span>
              {actionStats.slice(0, 6).map((stat) => (
                <button
                  key={stat._id}
                  onClick={() => {
                    setSelectedAction(stat._id === selectedAction ? '' : stat._id);
                    setTimeout(() => fetchLogs(1), 10);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap border ${
                    selectedAction === stat._id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {stat._id} ({stat.count})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-600 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Resource</th>
                  <th className="py-3.5 px-4">Network / IP</th>
                  <th className="py-3.5 px-4">Hash Chain Proof</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500">
                      <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto mb-2" />
                      <span>Loading immutable audit records...</span>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Database className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <span className="font-medium text-sm text-slate-600 block">No audit records found</span>
                      <span className="text-xs">Adjust your search filters or record new activities.</span>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {log.userId ? (
                          <div className="flex items-center space-x-2">
                            <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-200/70 flex items-center justify-center font-bold text-indigo-700 text-xs">
                              {log.userId.name ? log.userId.name.slice(0, 2).toUpperCase() : 'U'}
                            </div>
                            <div className="truncate max-w-[140px]">
                              <span className="font-bold text-slate-900 block truncate text-xs">
                                {log.userId.name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {log.userId.email}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">System</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Resource */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{log.resource || 'N/A'}</span>
                        {log.resourceId && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[100px]">
                            {log.resourceId}
                          </span>
                        )}
                      </td>

                      {/* IP */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Globe className="h-3 w-3 text-slate-400" />
                          <span className="font-mono text-[11px]">{log.ip || 'Unknown'}</span>
                        </div>
                      </td>

                      {/* Hash Chain Proof */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {log.hash ? (
                          <span
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-mono text-[10px] border border-slate-200 transition-colors"
                            title="SHA-256 Block Hash"
                          >
                            <LinkIcon className="h-2.5 w-2.5" />
                            <span>{log.hash.slice(0, 10)}...</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Genesis</span>
                        )}
                      </td>

                      {/* View Action */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pagination.pages > 1 && (
            <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> ({pagination.total} total logs)
              </span>

              <div className="flex items-center space-x-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cryptographic Inspector Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-5">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getActionBadgeColor(
                        selectedLog.action
                      )}`}
                    >
                      {selectedLog.action}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Audit Block Inspector
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Cryptographic Hashes Card */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-teal-400 block font-sans font-bold uppercase tracking-wider">
                    Block SHA-256 Hash
                  </span>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-slate-200 text-xs break-all">
                      {selectedLog.hash || 'N/A'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedLog.hash)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white flex-shrink-0"
                      title="Copy Hash"
                    >
                      {copiedHash ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-indigo-400 block font-sans font-bold uppercase tracking-wider">
                    Previous Block Hash (Chain Link)
                  </span>
                  <span className="text-slate-400 text-xs break-all block pt-1">
                    {selectedLog.previousHash || 'GENESIS'}
                  </span>
                </div>
              </div>

              {/* Actor & Metadata */}
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Actor</span>
                  <span className="font-bold text-slate-800 block">
                    {selectedLog.userId?.name || 'System / Platform Admin'}
                  </span>
                  <span className="text-slate-500 block truncate">
                    {selectedLog.userId?.email || 'N/A'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Network Context</span>
                  <span className="font-bold text-slate-800 block">IP: {selectedLog.ip || 'Unknown'}</span>
                  <span className="text-slate-500 block truncate text-[11px]" title={selectedLog.userAgent}>
                    {selectedLog.userAgent || 'Unknown Device'}
                  </span>
                </div>
              </div>

              {/* Payload Details JSON */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Event Payload Details
                </span>
                <pre className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              {/* Close Button */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

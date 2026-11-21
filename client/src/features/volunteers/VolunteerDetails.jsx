import React, { useState } from 'react';
import {
  X,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  ShieldCheck,
  Plus,
  AlertCircle
} from 'lucide-react';

export default function VolunteerDetails({
  isOpen,
  volunteer = null,
  auditLogs = [],
  userRole = 'staff',
  onClose,
  onOpenLogHours,
  onReviewHours
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'hours' | 'audit'
  const [rejectingLogId, setRejectingLogId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !volunteer) return null;

  const canReview = userRole === 'admin' || userRole === 'ngo_admin' || userRole === 'staff';

  const formatUser = (u) => {
    if (!u) return 'System / Staff';
    if (typeof u === 'string') return u;
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return name ? `${name} (${u.email || ''})` : (u.email || 'Staff');
  };

  const formatDate = (d, fallback = '—') => {
    if (!d) return fallback;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? fallback : dt.toLocaleDateString();
  };

  const formatDateTime = (d, fallback = '—') => {
    if (!d) return fallback;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? fallback : dt.toLocaleString();
  };

  const handleApprove = async (logId) => {
    setError('');
    setReviewing(true);
    try {
      await onReviewHours(volunteer._id, logId, { status: 'approved' });
    } catch (err) {
      setError(err.message || 'Failed to approve hours.');
    } finally {
      setReviewing(false);
    }
  };

  const handleRejectConfirm = async (logId) => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setError('Please provide a descriptive reason for rejecting these hours.');
      return;
    }

    setError('');
    setReviewing(true);
    try {
      await onReviewHours(volunteer._id, logId, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim()
      });
      setRejectingLogId(null);
      setRejectionReason('');
    } catch (err) {
      setError(err.message || 'Failed to reject hours.');
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Active
          </span>
        );
      case 'on_leave':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            On Leave
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            Pending Approval
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Inactive
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-base">
              {volunteer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {volunteer.name}
                </h2>
                {getStatusBadge(volunteer.status)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {volunteer.volunteerNumber} • Joined {formatDate(volunteer.joinedDate)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-750 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 transition ${activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            Volunteer Profile
          </button>
          <button
            onClick={() => setActiveTab('hours')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${activeTab === 'hours'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <span>Service Hours Log</span>
            <span className="px-1.5 py-0.2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
              {volunteer.hoursLogs?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 border-b-2 transition ${activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            Audit Trail
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Stat highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 uppercase font-semibold">
                    Approved Hours
                  </span>
                  <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1">
                    {volunteer.totalApprovedHours || 0} hrs
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                    Availability
                  </span>
                  <div className="text-lg font-bold text-gray-900 dark:text-white capitalize mt-1">
                    {String(volunteer.availability || '').replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                    Assigned Programs
                  </span>
                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {volunteer.assignedPrograms?.length || 0} initiatives
                  </div>
                </div>
              </div>

              {/* Contact & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Contact Information
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{volunteer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{volunteer.phone || 'No phone provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Emergency Contact
                  </h4>
                  {volunteer.emergencyContact?.name ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {volunteer.emergencyContact.name} ({volunteer.emergencyContact.relationship || 'Emergency'})
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">
                        {volunteer.emergencyContact.phone}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No emergency contact recorded</p>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                  Skills &amp; Capabilities
                </h4>
                {volunteer.skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {volunteer.skills.map((skill, sIdx) => {
                      const skillStr = typeof skill === 'string' ? skill : (skill?.name || String(skill || ''));
                      return (
                        <span
                          key={skillStr + '_' + sIdx}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 capitalize"
                        >
                          {skillStr.replace(/_/g, ' ')}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No skills listed</p>
                )}
              </div>

              {/* Assigned Programs */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Assigned Programs &amp; Initiatives
                </h4>
                {volunteer.assignedPrograms?.length > 0 ? (
                  <div className="space-y-1.5">
                    {volunteer.assignedPrograms.map((prog) => (
                      <div
                        key={prog._id}
                        className="p-2 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-between text-xs border border-gray-200 dark:border-gray-700"
                      >
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {prog.name}
                          </span>
                          <span className="text-gray-400 ml-2 font-mono">({prog.code})</span>
                        </div>
                        <span className="capitalize text-emerald-600 dark:text-emerald-400 font-medium">
                          {prog.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Not assigned to any specific program yet (Available for direct outreach)
                  </p>
                )}
              </div>

              {/* Notes */}
              {volunteer.notes && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                    Coordinator Notes
                  </h4>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {volunteer.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HOURS LOG */}
          {activeTab === 'hours' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Logged Activity Entries
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Service hours verified by program coordinators and staff.
                  </p>
                </div>
                <button
                  onClick={() => onOpenLogHours(volunteer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Hours
                </button>
              </div>

              {(!volunteer.hoursLogs || volunteer.hoursLogs.length === 0) ? (
                <div className="py-12 text-center text-gray-400 border border-dashed rounded-xl">
                  No hours have been logged for this volunteer yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {volunteer.hoursLogs.map((log) => {
                    const isPending = log.status === 'pending';
                    const isRejectingThis = rejectingLogId === log._id;

                    return (
                      <div
                        key={log._id}
                        className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-bold text-gray-900 dark:text-white">
                              {log.hours} Hours
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(log.date)}
                            </span>
                            {log.programId && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                {typeof log.programId === 'object' ? (log.programId.name || log.programId.code || '') : String(log.programId)}
                              </span>
                            )}
                          </div>

                          <div>
                            {log.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Approved
                              </span>
                            )}
                            {log.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                            {log.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {log.activityDescription}
                        </p>

                        {log.status === 'rejected' && log.rejectionReason && (
                          <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
                            <strong>Reason:</strong> {log.rejectionReason}
                          </div>
                        )}

                        {log.status === 'approved' && log.approvedBy && (
                          <div className="text-xs text-gray-400">
                            Approved by {formatUser(log.approvedBy)} on {formatDate(log.approvedAt)}
                          </div>
                        )}

                        {/* Review buttons if pending */}
                        {isPending && canReview && !isRejectingThis && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <button
                              onClick={() => {
                                setRejectingLogId(log._id);
                                setRejectionReason('');
                              }}
                              disabled={reviewing}
                              className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprove(log._id)}
                              disabled={reviewing}
                              className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition"
                            >
                              Approve Hours
                            </button>
                          </div>
                        )}

                        {/* Rejection input box */}
                        {isRejectingThis && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-2 mt-2">
                            <label className="block text-xs font-semibold text-red-800 dark:text-red-300">
                              Reason for Rejection:
                            </label>
                            <input
                              type="text"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="e.g. Unverified hours or missing coordinator approval"
                              className="w-full px-2.5 py-1.5 text-xs border rounded border-red-300 dark:border-red-700 bg-white dark:bg-gray-800"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setRejectingLogId(null)}
                                className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleRejectConfirm(log._id)}
                                disabled={reviewing}
                                className="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Confirm Rejection
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Audit Trail &amp; Activity History
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                {auditLogs.map((log) => (
                  <div key={log._id} className="p-3 bg-white dark:bg-gray-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white capitalize">
                        {String(log.action || '').replace(/_/g, ' ')}
                      </span>
                      <p className="text-gray-500 dark:text-gray-400">
                        {log.metadata ? (typeof log.metadata === 'object' ? JSON.stringify(log.metadata) : String(log.metadata)) : 'Audit event registered'}
                      </p>
                      {log.actorId && (
                        <p className="text-gray-400 text-xs">
                          By {formatUser(log.actorId)}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="p-6 text-center text-gray-400">
                    No audit records available.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

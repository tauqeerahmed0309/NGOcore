import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  User,
  Building2,
  Clock,
  CheckCircle,
  ShieldCheck,
  Edit2
} from 'lucide-react';

export default function TaskDetails({
  isOpen,
  task = null,
  auditLogs = [],
  onClose,
  onEdit,
  onStatusChange,
  onChecklistToggle
}) {
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!isOpen || !task) return null;

  const handleStatusClick = async (newStatus) => {
    if (newStatus === 'completed') {
      setShowCompletePrompt(true);
      return;
    }

    setUpdating(true);
    try {
      await onStatusChange(task._id, { status: newStatus });
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmComplete = async () => {
    setUpdating(true);
    try {
      await onStatusChange(task._id, {
        status: 'completed',
        completionNotes: completionNotes.trim() || undefined
      });
      setShowCompletePrompt(false);
      setCompletionNotes('');
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
            High Priority
          </span>
        );
      case 'low':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            Low
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            Medium
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <Clock className="w-3.5 h-3.5" /> In Progress
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            In Review
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            To Do
          </span>
        );
    }
  };

  const completedChecklistCount = (task.checklist || []).filter((i) => i.isCompleted).length;
  const totalChecklistCount = (task.checklist || []).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-gray-500 dark:text-gray-400 text-sm">
                  {task.taskNumber}
                </span>
                {getStatusBadge(task.status)}
                {getPriorityBadge(task.priority)}
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                {task.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {/* Quick Status Workflow Action Bar */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Change Status:
            </span>
            <div className="flex flex-wrap gap-2">
              {['todo', 'in_progress', 'review', 'completed'].map((st) => {
                const isCurrent = task.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleStatusClick(st)}
                    disabled={isCurrent || updating}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                      isCurrent
                        ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900 cursor-default'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-650'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Complete Prompt Modal overlay */}
          {showCompletePrompt && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                Mark Task as Completed
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Provide optional completion notes summarizing outcomes, deliverables, or follow-ups.
              </p>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Completed inventory check, all 50 units dispatched."
                className="w-full p-2.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCompletePrompt(false)}
                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmComplete}
                  disabled={updating}
                  className="px-3.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
                >
                  Confirm Completion
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                Operational Description
              </span>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line text-xs">
                {task.description}
              </p>
            </div>
          )}

          {/* Assignees & Program */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Staff Assignee */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1">
              <span className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Staff Assigned
              </span>
              {task.assignedTo ? (
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-xs">
                    {task.assignedTo.firstName} {task.assignedTo.lastName}
                  </p>
                  <p className="text-gray-400 text-xs truncate">{task.assignedTo.email}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No staff assigned</p>
              )}
            </div>

            {/* Volunteer Assignee */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1">
              <span className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Volunteer Assigned
              </span>
              {task.assignedVolunteerId ? (
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-xs">
                    {task.assignedVolunteerId.name}
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 text-xs font-mono">
                    {task.assignedVolunteerId.volunteerNumber}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No volunteer assigned</p>
              )}
            </div>

            {/* Program Link */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1">
              <span className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Associated Program
              </span>
              {task.programId ? (
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-xs truncate">
                    {task.programId.name}
                  </p>
                  <p className="text-gray-400 text-xs font-mono">{task.programId.code}</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">General Activity</p>
              )}
            </div>
          </div>

          {/* Checklist */}
          {task.checklist?.length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Action Checklist
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {completedChecklistCount} of {totalChecklistCount} completed
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 transition-all duration-300"
                  style={{
                    width: `${totalChecklistCount > 0 ? (completedChecklistCount / totalChecklistCount) * 100 : 0}%`
                  }}
                />
              </div>

              <div className="space-y-1.5 pt-1">
                {task.checklist.map((item, index) => (
                  <label
                    key={index}
                    className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => onChecklistToggle(task, index)}
                      className="rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    <span className={item.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200 font-medium'}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Completion Info if Completed */}
          {task.status === 'completed' && task.completedAt && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                <CheckCircle className="w-4 h-4" /> Task Concluded
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Completed on {new Date(task.completedAt).toLocaleString()}
                {task.completedBy && ` by ${task.completedBy.firstName} ${task.completedBy.lastName}`}
              </p>
              {task.completionNotes && (
                <p className="mt-2 text-gray-800 dark:text-gray-200 italic bg-white/60 dark:bg-gray-800/60 p-2 rounded">
                  "{task.completionNotes}"
                </p>
              )}
            </div>
          )}

          {/* Audit Trail */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Audit Log History
            </h4>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-200 dark:divide-gray-700 text-xs">
              {auditLogs.map((log) => (
                <div key={log._id} className="p-3 bg-white dark:bg-gray-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">
                      {log.action?.replace('_', ' ')}
                    </span>
                    <p className="text-gray-500 dark:text-gray-400">
                      {log.metadata ? JSON.stringify(log.metadata) : 'Task record modified'}
                    </p>
                  </div>
                  <span className="text-gray-400 text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="p-4 text-center text-gray-400 text-xs">
                  No audit entries recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <button
            onClick={() => onEdit(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Task Details
          </button>
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

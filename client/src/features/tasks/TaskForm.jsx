import React, { useState, useEffect } from 'react';
import {
  X,
  CheckSquare,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import api from '../../services/api';

const CATEGORIES = [
  { value: 'program_ops', label: 'Program Operations' },
  { value: 'fundraising', label: 'Fundraising & Donors' },
  { value: 'field_work', label: 'Field Work & Outreach' },
  { value: 'administrative', label: 'Administrative & HR' },
  { value: 'logistics', label: 'Logistics & Supplies' },
  { value: 'compliance', label: 'Compliance & Audits' },
  { value: 'beneficiary_support', label: 'Beneficiary Support' },
  { value: 'other', label: 'Other Operational Work' }
];

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent (Critical Priority)' },
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' }
];

export default function TaskForm({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  task = null,
  onClose,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    taskNumber: '',
    title: '',
    description: '',
    category: 'program_ops',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
    assignedTo: '',
    assignedVolunteerId: '',
    programId: '',
    checklist: []
  });

  const [usersList, setUsersList] = useState([]);
  const [volunteersList, setVolunteersList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Load lookups for assignees and programs
    const loadLookups = async () => {
      try {
        const [usersRes, volsRes, progsRes] = await Promise.allSettled([
          api.get('/users', { params: { limit: 100 } }),
          api.get('/volunteers', { params: { limit: 100, status: 'active' } }),
          api.get('/programs', { params: { limit: 100 } })
        ]);

        if (usersRes.status === 'fulfilled') {
          const uVal = usersRes.value;
          setUsersList(uVal?.data?.users || uVal?.users || uVal?.data?.data?.users || []);
        }
        if (volsRes.status === 'fulfilled') {
          const vVal = volsRes.value;
          setVolunteersList(vVal?.data?.volunteers || vVal?.volunteers || vVal?.data?.data?.volunteers || []);
        }
        if (progsRes.status === 'fulfilled') {
          const pVal = progsRes.value;
          setProgramsList(pVal?.data?.programs || pVal?.programs || pVal?.data?.data?.programs || []);
        }
      } catch (err) {
        console.error('Failed to load lookups for task:', err);
      }
    };
    loadLookups();

    if (mode === 'edit' && task) {
      setFormData({
        taskNumber: task.taskNumber || '',
        title: task.title || '',
        description: task.description || '',
        category: task.category || 'program_ops',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
        assignedTo: task.assignedTo?._id || task.assignedTo || '',
        assignedVolunteerId: task.assignedVolunteerId?._id || task.assignedVolunteerId || '',
        programId: task.programId?._id || task.programId || '',
        checklist: task.checklist || []
      });
      setError('');
    } else {
      setFormData({
        taskNumber: '',
        title: '',
        description: '',
        category: 'program_ops',
        priority: 'medium',
        status: 'todo',
        dueDate: '',
        assignedTo: '',
        assignedVolunteerId: '',
        programId: '',
        checklist: []
      });
      setError('');
    }
  }, [isOpen, mode, task]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { text: newChecklistText.trim(), isCompleted: false }]
    }));
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || formData.title.trim().length < 3) {
      setError('Task Title must be at least 3 characters.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate ? formData.dueDate : null,
      assignedTo: formData.assignedTo ? formData.assignedTo : null,
      assignedVolunteerId: formData.assignedVolunteerId ? formData.assignedVolunteerId : null,
      programId: formData.programId ? formData.programId : null,
      checklist: formData.checklist
    };

    if (mode === 'create' && formData.taskNumber.trim()) {
      payload.taskNumber = formData.taskNumber.trim();
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Operation failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {mode === 'create' ? 'Create New Operational Task' : `Edit Task: ${task?.taskNumber}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Conduct initial baseline assessment of new students"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date & Custom Task # */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Target Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {mode === 'create' ? (
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                  Custom Task Number (Optional)
                </label>
                <input
                  type="text"
                  name="taskNumber"
                  value={formData.taskNumber}
                  onChange={handleChange}
                  placeholder="Auto-assigned (TSK-XXXX) if blank"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                  Task ID
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.taskNumber}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-750 text-gray-500 cursor-not-allowed"
                />
              </div>
            )}
          </div>

          {/* Assignees: Staff & Volunteer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Assign to Staff Member
              </label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">-- No Staff Assigned --</option>
                {usersList.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Assign to Volunteer
              </label>
              <select
                name="assignedVolunteerId"
                value={formData.assignedVolunteerId}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">-- No Volunteer Assigned --</option>
                {volunteersList.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.volunteerNumber} — {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Associated Program */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
              Associated Program
            </label>
            <select
              name="programId"
              value={formData.programId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">-- General / Non-Program Activity --</option>
              {programsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Checklist Builder */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
              Action Checklist / Subtasks
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Add subtask step (e.g. Call supplier for quote)"
                className="flex-1 px-3 py-1.5 border rounded-lg text-xs border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {formData.checklist.length > 0 && (
              <div className="space-y-1.5 p-2 bg-gray-50 dark:bg-gray-750 rounded-lg max-h-32 overflow-y-auto">
                {formData.checklist.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs p-1.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <span className="truncate">{item.text}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(index)}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
              Detailed Operational Instructions
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Outline specific objectives, stakeholders involved, and success criteria..."
              className="w-full px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

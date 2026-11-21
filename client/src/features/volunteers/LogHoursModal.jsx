import React, { useState, useEffect } from 'react';
import { Clock, X, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function LogHoursModal({
  isOpen,
  volunteer = null,
  onClose,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    programId: '',
    hours: '',
    activityDescription: ''
  });

  const [programsList, setProgramsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      date: new Date().toISOString().slice(0, 10),
      programId: '',
      hours: '',
      activityDescription: ''
    });
    setError('');

    // Fetch programs list
    const loadPrograms = async () => {
      try {
        const res = await api.get('/programs', { params: { limit: 100 } });
        const p = res?.data?.programs || res?.data?.data?.programs || res?.programs || [];
        setProgramsList(Array.isArray(p) ? p : []);
      } catch (err) {
        console.error('Failed to load programs for hours log:', err);
      }
    };
    loadPrograms();
  }, [isOpen]);

  if (!isOpen || !volunteer) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedHours = parseFloat(formData.hours);
    if (isNaN(parsedHours) || parsedHours < 0.25 || parsedHours > 24) {
      setError('Hours must be between 0.25 and 24.0.');
      return;
    }

    if (!formData.activityDescription.trim() || formData.activityDescription.trim().length < 3) {
      setError('Please provide a descriptive explanation of the activity (at least 3 characters).');
      return;
    }

    const payload = {
      date: formData.date,
      programId: formData.programId ? formData.programId : null,
      hours: parsedHours,
      activityDescription: formData.activityDescription.trim()
    };

    setSubmitting(true);
    try {
      await onSubmit(volunteer._id, payload);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to log hours';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Log Volunteer Service Hours
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Volunteer snapshot */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center text-sm">
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">{volunteer.name}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2 font-mono text-xs">({volunteer.volunteerNumber})</span>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
              {volunteer.totalApprovedHours || 0} hrs approved
            </span>
          </div>

          {/* Date & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date of Activity <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hours Spent <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                name="hours"
                value={formData.hours}
                onChange={handleChange}
                placeholder="e.g. 3.5"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
              />
            </div>
          </div>

          {/* Linked Program */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Associated Program (Optional)
            </label>
            <select
              name="programId"
              value={formData.programId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">-- General Field Activity / Direct Outreach --</option>
              {programsList.map((prog) => (
                <option key={prog._id} value={prog._id}>
                  {prog.code} — {prog.name}
                </option>
              ))}
            </select>
          </div>

          {/* Activity Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Activity Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="activityDescription"
              value={formData.activityDescription}
              onChange={handleChange}
              rows={3}
              placeholder="Describe tasks performed, students/beneficiaries assisted, or event support provided..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Log for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

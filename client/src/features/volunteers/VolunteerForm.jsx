import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';

const SKILL_OPTIONS = [
  'teaching',
  'first_aid',
  'event_coordination',
  'fundraising',
  'technology',
  'counseling',
  'logistics',
  'translation',
  'content_writing',
  'childcare',
  'sports',
  'arts_crafts'
];

const AVAILABILITY_OPTIONS = [
  { value: 'flexible', label: 'Flexible / As Needed' },
  { value: 'weekends', label: 'Weekends Only' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'evenings', label: 'Evenings' },
  { value: 'full_time', label: 'Full Time' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending_approval', label: 'Pending Approval' }
];

export default function VolunteerForm({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  volunteer = null,
  onClose,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    volunteerNumber: '',
    name: '',
    email: '',
    phone: '',
    skills: [],
    availability: 'flexible',
    status: 'active',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    assignedPrograms: [],
    notes: ''
  });

  const [programsList, setProgramsList] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const res = await api.get('/programs', { params: { limit: 100 } });
        const p = res?.data?.programs || res?.data?.data?.programs || res?.programs || [];
        setProgramsList(Array.isArray(p) ? p : []);
      } catch (err) {
        console.error('Failed to load programs for volunteer form:', err);
      } finally {
        setLoadingPrograms(false);
      }
    };
    loadPrograms();

    if (mode === 'edit' && volunteer) {
      setFormData({
        volunteerNumber: volunteer.volunteerNumber || '',
        name: volunteer.name || '',
        email: volunteer.email || '',
        phone: volunteer.phone || '',
        skills: volunteer.skills || [],
        availability: volunteer.availability || 'flexible',
        status: volunteer.status || 'active',
        street: volunteer.address?.street || '',
        city: volunteer.address?.city || '',
        state: volunteer.address?.state || '',
        postalCode: volunteer.address?.postalCode || '',
        emergencyName: volunteer.emergencyContact?.name || '',
        emergencyPhone: volunteer.emergencyContact?.phone || '',
        emergencyRelationship: volunteer.emergencyContact?.relationship || '',
        assignedPrograms: (volunteer.assignedPrograms || []).map((p) => p._id || p),
        notes: volunteer.notes || ''
      });
      setError('');
    } else {
      setFormData({
        volunteerNumber: '',
        name: '',
        email: '',
        phone: '',
        skills: [],
        availability: 'flexible',
        status: 'active',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        emergencyName: '',
        emergencyPhone: '',
        emergencyRelationship: '',
        assignedPrograms: [],
        notes: ''
      });
      setError('');
    }
  }, [isOpen, mode, volunteer]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSkillToggle = (skill) => {
    setFormData((prev) => {
      const skills = prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills };
    });
  };

  const handleProgramToggle = (programId) => {
    setFormData((prev) => {
      const assignedPrograms = prev.assignedPrograms.includes(programId)
        ? prev.assignedPrograms.filter((id) => id !== programId)
        : [...prev.assignedPrograms, programId];
      return { ...prev, assignedPrograms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Full Name must be at least 2 characters.');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email address is required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || undefined,
      skills: formData.skills,
      availability: formData.availability,
      status: formData.status,
      address: {
        street: formData.street.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined
      },
      emergencyContact: {
        name: formData.emergencyName.trim() || undefined,
        phone: formData.emergencyPhone.trim() || undefined,
        relationship: formData.emergencyRelationship.trim() || undefined
      },
      assignedPrograms: formData.assignedPrograms,
      notes: formData.notes.trim() || undefined
    };

    if (mode === 'create' && formData.volunteerNumber.trim()) {
      payload.volunteerNumber = formData.volunteerNumber.trim();
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
            <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {mode === 'create' ? 'Register New Volunteer' : `Edit Volunteer: ${volunteer?.name}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Volunteer ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Radhika Sharma"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            {mode === 'create' ? (
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                  Volunteer ID (Optional)
                </label>
                <input
                  type="text"
                  name="volunteerNumber"
                  value={formData.volunteerNumber}
                  onChange={handleChange}
                  placeholder="Auto-assigned (VOL-XXXX) if blank"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                  Volunteer ID
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.volunteerNumber}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-750 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            )}
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="radhika@example.org"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Availability & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Availability Schedule
              </label>
              <select
                name="availability"
                value={formData.availability}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
                Volunteer Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Skills Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-2">
              Skills &amp; Capabilities
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => {
                const isSelected = formData.skills.includes(skill);
                return (
                  <button
                    type="button"
                    key={skill}
                    onClick={() => handleSkillToggle(skill)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition capitalize ${isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {skill.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assigned Programs */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-2">
              Assigned Programs &amp; Initiatives
            </label>
            {loadingPrograms ? (
              <p className="text-xs text-gray-400">Loading programs...</p>
            ) : programsList.length === 0 ? (
              <p className="text-xs text-gray-400">No active programs available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border rounded-lg border-gray-200 dark:border-gray-700">
                {programsList.map((prog) => {
                  const isChecked = formData.assignedPrograms.includes(prog._id);
                  return (
                    <label
                      key={prog._id}
                      className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 p-1.5 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleProgramToggle(prog._id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="truncate">
                        <strong>{prog.code}</strong> — {prog.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
              Address &amp; Location
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City (e.g. Pune)"
                className="px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
              />
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State (e.g. Maharashtra)"
                className="px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
              />
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="Postal Code"
                className="px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
              Emergency Contact
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                name="emergencyName"
                value={formData.emergencyName}
                onChange={handleChange}
                placeholder="Contact Person Name"
                className="px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
              />
              <input
                type="text"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleChange}
                placeholder="Contact Phone"
                className="px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
              />
              <input
                type="text"
                name="emergencyRelationship"
                value={formData.emergencyRelationship}
                onChange={handleChange}
                placeholder="Relationship (e.g. Parent, Spouse)"
                className="px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 mb-1">
              Coordinator Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Background, certifications, preferences..."
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
              {submitting ? 'Saving...' : mode === 'create' ? 'Register Volunteer' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

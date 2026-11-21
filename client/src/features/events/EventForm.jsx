import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, AlertCircle } from 'lucide-react';
import eventService from './eventService';

const CATEGORIES = [
  { value: 'workshop', label: 'Workshop / Seminar' },
  { value: 'health_camp', label: 'Health & Medical Camp' },
  { value: 'fundraiser', label: 'Fundraising Event' },
  { value: 'distribution', label: 'Supply / Relief Distribution' },
  { value: 'training', label: 'Skill Training Session' },
  { value: 'community_outreach', label: 'Community Outreach' },
  { value: 'meeting', label: 'Stakeholder / Board Meeting' },
  { value: 'other', label: 'Other Special Event' }
];

const STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function EventForm({ isOpen, onClose, event, onSaved, showNotification }) {
  const isEdit = Boolean(event);

  const [formData, setFormData] = useState({
    eventNumber: '',
    title: '',
    category: 'workshop',
    description: '',
    startDate: '',
    endDate: '',
    venueName: '',
    venueAddress: '',
    venueCity: '',
    venueState: '',
    virtualLink: '',
    capacity: '',
    budget: '',
    actualExpenses: '',
    status: 'scheduled',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (event) {
      setFormData({
        eventNumber: event.eventNumber || '',
        title: event.title || '',
        category: event.category || 'workshop',
        description: event.description || '',
        startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
        endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
        venueName: event.venue?.name || '',
        venueAddress: event.venue?.address || '',
        venueCity: event.venue?.city || '',
        venueState: event.venue?.state || '',
        virtualLink: event.venue?.virtualLink || '',
        capacity: event.capacity !== null && event.capacity !== undefined ? event.capacity : '',
        budget: event.budget || '',
        actualExpenses: event.actualExpenses || '',
        status: event.status || 'scheduled',
        notes: event.notes || ''
      });
    } else {
      const now = new Date();
      const inTwoHours = new Date(now.getTime() + 2 * 3600000);
      setFormData({
        eventNumber: '',
        title: '',
        category: 'workshop',
        description: '',
        startDate: now.toISOString().slice(0, 16),
        endDate: inTwoHours.toISOString().slice(0, 16),
        venueName: '',
        venueAddress: '',
        venueCity: '',
        venueState: '',
        virtualLink: '',
        capacity: '',
        budget: '',
        actualExpenses: '',
        status: 'scheduled',
        notes: ''
      });
    }
    setError('');
  }, [event, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Event title is required (min 3 characters).');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Start date and end date are required.');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date must be equal to or after start date.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      description: formData.description.trim(),
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      venue: {
        name: formData.venueName.trim(),
        address: formData.venueAddress.trim(),
        city: formData.venueCity.trim(),
        state: formData.venueState.trim(),
        virtualLink: formData.virtualLink.trim()
      },
      capacity: formData.capacity === '' ? null : Number(formData.capacity),
      budget: formData.budget === '' ? 0 : Number(formData.budget),
      actualExpenses: formData.actualExpenses === '' ? 0 : Number(formData.actualExpenses),
      status: formData.status,
      notes: formData.notes.trim()
    };

    if (!isEdit && formData.eventNumber.trim()) {
      payload.eventNumber = formData.eventNumber.trim();
    }

    setLoading(true);
    try {
      if (isEdit) {
        await eventService.updateEvent(event._id, payload);
        showNotification('success', 'Event updated successfully!');
      } else {
        await eventService.createEvent(payload);
        showNotification('success', 'Event scheduled successfully!');
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save event:', err);
      const errDetails = Array.isArray(err?.errors) ? err.errors.map(e => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ') : '';
      const msg = errDetails || err?.message || err?.response?.data?.message || 'Failed to save event';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-200" />
            <h2 className="text-lg font-bold">
              {isEdit ? `Edit Event — ${event.eventNumber}` : 'Schedule New Event'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Annual Community Health & Nutrition Camp"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {!isEdit && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Custom Event # (Optional)
                </label>
                <input
                  type="text"
                  name="eventNumber"
                  value={formData.eventNumber}
                  onChange={handleChange}
                  placeholder="Auto-generated (EVT-XXXX)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Start Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                End Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="endDate"
                required
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Venue & Location */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Venue & Location
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    name="venueName"
                    value={formData.venueName}
                    onChange={handleChange}
                    placeholder="Venue Name (e.g. City Community Hall)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="venueCity"
                    value={formData.venueCity}
                    onChange={handleChange}
                    placeholder="City (e.g. Mumbai)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    name="venueAddress"
                    value={formData.venueAddress}
                    onChange={handleChange}
                    placeholder="Street Address"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="url"
                    name="virtualLink"
                    value={formData.virtualLink}
                    onChange={handleChange}
                    placeholder="Virtual Meeting Link (Zoom, Google Meet, etc.)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Attendance & Budget */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Capacity & Financials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    min="0"
                    value={formData.capacity}
                    onChange={handleChange}
                    placeholder="Leave blank for unlimited"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Budget (INR)</label>
                  <input
                    type="number"
                    name="budget"
                    min="0"
                    step="0.01"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="₹ 0.00"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Actual Expenses (INR)</label>
                  <input
                    type="number"
                    name="actualExpenses"
                    min="0"
                    step="0.01"
                    value={formData.actualExpenses}
                    onChange={handleChange}
                    placeholder="₹ 0.00"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Description & Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                placeholder="Overview, objectives, and agenda..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Notes</label>
              <textarea
                name="notes"
                rows="2"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Logistics reminders, volunteer instructions, sponsor notes..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

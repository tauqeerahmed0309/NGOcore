import React, { useState } from 'react';
import { X, UserPlus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import eventService from './eventService';

export default function EventAttendeeModal({ isOpen, onClose, event, onUpdated, showNotification }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Register attendee form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen || !event) return null;

  const attendees = event.registeredAttendees || [];
  const capacity = event.capacity;
  const isFull = capacity !== null && capacity !== undefined && attendees.length >= capacity;

  const filteredAttendees = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Attendee name is required.');
      return;
    }

    setLoading(true);
    try {
      await eventService.registerAttendee(event._id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
      showNotification('success', 'Attendee registered successfully!');
      setName('');
      setEmail('');
      setPhone('');
      setActiveTab('list');
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to register attendee:', err);
      const errDetails = Array.isArray(err?.errors) ? err.errors.map(e => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ') : '';
      const msg = errDetails || err?.message || err?.response?.data?.message || 'Failed to register attendee';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (attendeeId) => {
    setLoading(true);
    try {
      await eventService.checkInAttendee(event._id, attendeeId);
      showNotification('success', 'Attendee checked in successfully!');
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to check in attendee:', err);
      const errDetails = Array.isArray(err?.errors) ? err.errors.map(e => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ') : '';
      const msg = errDetails || err?.message || err?.response?.data?.message || 'Failed to check in attendee';
      showNotification('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-emerald-800 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/20 text-white">
                {event.eventNumber}
              </span>
              <h2 className="text-lg font-bold truncate max-w-md">{event.title}</h2>
            </div>
            <p className="text-xs text-teal-100 mt-1">
              Registered Attendees: {attendees.length}
              {capacity ? ` / ${capacity} max capacity` : ' (Unlimited capacity)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'list'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Attendee Roster ({attendees.length})
          </button>
          <button
            onClick={() => setActiveTab('register')}
            disabled={isFull}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'register'
              ? 'border-teal-600 text-teal-700'
              : isFull
                ? 'border-transparent text-gray-300 cursor-not-allowed'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <UserPlus className="w-4 h-4" />
            Register Attendee {isFull && '(Capacity Reached)'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'list' ? (
            <div>
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search attendees by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {filteredAttendees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No registered attendees found.</p>
                  {!isFull && (
                    <button
                      onClick={() => setActiveTab('register')}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Register the first attendee
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAttendees.map((att) => (
                    <div
                      key={att._id}
                      className="py-3 flex items-center justify-between hover:bg-gray-50/50 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">{att.name}</span>
                          {att.attended ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3 h-3" /> Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" /> Registered
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                          {att.email && <span>{att.email}</span>}
                          {att.phone && <span>{att.phone}</span>}
                          {att.checkedInAt && (
                            <span className="text-emerald-700">
                              Checked in: {new Date(att.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {!att.attended && (
                        <button
                          onClick={() => handleCheckIn(att._id)}
                          disabled={loading}
                          className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          Check In
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya.sharma@example.org"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Register Attendee'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

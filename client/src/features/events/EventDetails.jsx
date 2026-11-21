import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  History,
  FileText,
  ExternalLink,
  Edit2
} from 'lucide-react';
import eventService from './eventService';

export default function EventDetails({
  isOpen,
  onClose,
  eventId,
  onEdit,
  onManageAttendees,
  showNotification
}) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'audit'

  useEffect(() => {
    if (isOpen && eventId) {
      loadEventDetails();
    } else {
      setEvent(null);
      setActiveTab('overview');
    }
  }, [isOpen, eventId]);

  const loadEventDetails = async () => {
    setLoading(true);
    try {
      const res = await eventService.getEventById(eventId);
      const payload = res?.data?.data || res?.data || res;
      setEvent(payload || null);
    } catch (err) {
      console.error('Failed to load event details:', err);
      showNotification('error', 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status) => {
    const config = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Scheduled' },
      ongoing: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Ongoing' },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const attendees = event?.registeredAttendees || [];
  const checkedInCount = attendees.filter((a) => a.attended).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/20 text-white">
              {event?.eventNumber || 'EVT-XXXX'}
            </span>
            <h2 className="text-lg font-bold truncate max-w-lg">
              {event?.title || 'Event Details'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {event && onEdit && (
              <button
                onClick={() => onEdit(event)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Overview & Logistics
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'audit'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <History className="w-4 h-4" />
            Audit Trail ({event?.auditLogs?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              Loading event details...
            </div>
          ) : !event ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Event record not found or could not be loaded.
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Top Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Status</span>
                  <div className="mt-1">{getStatusBadge(event.status)}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Category</span>
                  <span className="text-sm font-semibold text-gray-900 capitalize block mt-1">
                    {event.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Attendees</span>
                  <span className="text-sm font-semibold text-teal-700 block mt-1">
                    {attendees.length} {event.capacity ? `/ ${event.capacity}` : ''}
                    <span className="text-xs text-gray-500 font-normal">
                      {' '}
                      ({checkedInCount} checked in)
                    </span>
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 block">Budget vs Actual</span>
                  <span className="text-sm font-semibold text-gray-900 block mt-1">
                    ₹{event.actualExpenses || 0} / ₹{event.budget || 0}
                  </span>
                </div>
              </div>

              {/* Timing & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-600" /> Date & Schedule
                  </h3>
                  <div className="text-xs space-y-1 text-gray-700">
                    <div>
                      <span className="font-semibold text-gray-500">Starts: </span>
                      {new Date(event.startDate).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Ends: </span>
                      {new Date(event.endDate).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" /> Venue & Access
                  </h3>
                  <div className="text-xs space-y-1 text-gray-700">
                    {event.venue?.name && <div className="font-semibold">{event.venue.name}</div>}
                    {event.venue?.address && <div>{event.venue.address}</div>}
                    {event.venue?.city && (
                      <div className="text-gray-500">
                        {event.venue.city}
                        {event.venue.state ? `, ${event.venue.state}` : ''}
                      </div>
                    )}
                    {event.venue?.virtualLink && (
                      <a
                        href={event.venue.virtualLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium mt-1"
                      >
                        Join Virtual Meeting <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendee Quick Action Banner */}
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-teal-900">Attendance Roster</h4>
                  <p className="text-xs text-teal-700 mt-0.5">
                    {attendees.length} registered participant{attendees.length === 1 ? '' : 's'} •{' '}
                    {checkedInCount} verified check-in{checkedInCount === 1 ? '' : 's'}.
                  </p>
                </div>
                {onManageAttendees && (
                  <button
                    onClick={() => onManageAttendees(event)}
                    className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors shadow-sm"
                  >
                    Manage Roster & Check-In
                  </button>
                )}
              </div>

              {/* Description & Notes */}
              {event.description && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Description & Objectives
                  </h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                    {event.description}
                  </p>
                </div>
              )}

              {event.notes && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Internal Logistics Notes
                  </h3>
                  <p className="text-sm text-gray-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100 leading-relaxed">
                    {event.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {event.auditLogs?.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No audit logs recorded for this event yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {event.auditLogs.map((log) => (
                    <div key={log._id} className="py-2.5 text-xs text-gray-700 flex justify-between">
                      <div>
                        <span className="font-semibold uppercase tracking-wider text-teal-700">
                          {log.action}
                        </span>{' '}
                        by{' '}
                        <span className="font-medium text-gray-900">
                          {log.actorId?.firstName
                            ? `${log.actorId.firstName} ${log.actorId.lastName}`
                            : log.actorId?.email || 'System'}
                        </span>
                        {log.metadata?.actionDetail && (
                          <span className="text-gray-500 ml-1">
                            ({log.metadata.actionDetail})
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400">
                        {new Date(log.timestamp || log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

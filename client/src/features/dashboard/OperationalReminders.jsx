import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Bell, Calendar, GraduationCap, RefreshCw } from 'lucide-react';
import { reportService } from '../reports/reportService';

export default function OperationalReminders() {
  const [reminders, setReminders] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await reportService.getReminders();
      setReminders(response.data);
    } catch (requestError) {
      setError(requestError.message || 'Could not load operational reminders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="card operational-reminders">
      <div className="table-header-bar">
        <div className="table-header-info"><Bell size={18} /><h3>Follow-ups &amp; reminders</h3></div>
        <button type="button" className="btn-action btn-refresh" onClick={load} disabled={loading} aria-label="Refresh reminders">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {error && <div className="alert alert-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
      {loading && !reminders ? <p className="form-help-text">Loading reminders…</p> : reminders && (
        <div className="reminder-list">
          {reminders.incompleteStudentCount > 0 && (
            <Link to="/students" className="reminder-item">
              <GraduationCap size={18} />
              <span><strong>{reminders.incompleteStudentCount} student records</strong> need profile information completed.</span>
            </Link>
          )}
          {reminders.upcomingPrograms.map((program) => (
            <Link to="/programs" className="reminder-item" key={`upcoming-${program._id}`}>
              <Calendar size={18} />
              <span><strong>{program.name}</strong> starts {new Date(program.startDate).toLocaleDateString()}.</span>
            </Link>
          ))}
          {reminders.unfilledPrograms.map((program) => (
            <Link to="/programs" className="reminder-item" key={`unfilled-${program.id}`}>
              <Bell size={18} />
              <span><strong>{program.name}</strong> has no active student enrollments.</span>
            </Link>
          ))}
          {!reminders.incompleteStudentCount && !reminders.upcomingPrograms.length && !reminders.unfilledPrograms.length && (
            <p className="reminders-empty">No follow-ups right now. Your active records and programs look up to date.</p>
          )}
        </div>
      )}
    </section>
  );
}

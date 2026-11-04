import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarCheck, CheckCircle2, Loader2, UserPlus, X } from 'lucide-react';
import programService from './programService';
import studentService from '../students/studentService';

const localDate = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

export default function ProgramOperations({ program, role, onClose }) {
  const canManage = role === 'admin' || role === 'ngo_admin' || role === 'staff';
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [roster, setRoster] = useState([]);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [enrollmentPagination, setEnrollmentPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [date, setDate] = useState(localDate());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const programId = program?._id || program?.id;

  const enrolledIds = useMemo(
    () => new Set(enrollments.map(({ studentId }) => String(studentId?._id || studentId?.id || studentId))),
    [enrollments]
  );

  const load = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    setError('');
    try {
      const [enrollmentResponse, studentResponse] = await Promise.all([
        programService.getEnrollments(programId, { page: enrollmentPage, limit: 100 }),
        canManage ? studentService.getStudents({ page: 1, limit: 100, status: 'active' }) : Promise.resolve(null)
      ]);
      setEnrollments(enrollmentResponse.data?.enrollments || []);
      if (enrollmentResponse.data?.pagination) {
        setEnrollmentPagination(enrollmentResponse.data.pagination);
      }
      setStudents(studentResponse?.data?.students || []);
      if (canManage) {
        const attendanceResponse = await programService.getAttendance(programId, date);
        setRoster(attendanceResponse.data?.roster || []);
      } else {
        setRoster([]);
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not load program enrollments and attendance.');
    } finally {
      setLoading(false);
    }
  }, [programId, date, canManage, enrollmentPage]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEnroll = async (event) => {
    event.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await programService.enrollStudent(programId, selectedStudent);
      setSelectedStudent('');
      setNotice('Student enrolled.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Could not enroll this student.');
    } finally {
      setSaving(false);
    }
  };

  const updateRoster = (studentId, key, value) => {
    setRoster((items) => items.map((item) => (
      String(item.student._id || item.student.id) === String(studentId)
        ? { ...item, [key]: value }
        : item
    )));
  };

  const handleSaveAttendance = async () => {
    if (roster.some(({ status }) => !status)) {
      setError('Choose an attendance status for every enrolled student.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await programService.saveAttendance(programId, date, roster.map(({ student, status, note }) => ({
        studentId: student._id || student.id,
        status,
        note: note || ''
      })));
      setNotice('Attendance saved for this session.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const changeEnrollment = async (enrollment, status) => {
    const student = enrollment.studentId;
    try {
      await programService.updateEnrollment(programId, student._id || student.id, status);
      setNotice(status === 'withdrawn' ? 'Student withdrawn from the program.' : 'Enrollment completed.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Could not update enrollment.');
    }
  };

  const availableStudents = students.filter((student) => !enrolledIds.has(String(student._id || student.id)));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-container program-operations-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-header-title">
            <CalendarCheck size={20} className="text-primary" />
            <div>
              <h3>{program.name}</h3>
              <p className="page-subtitle">Enroll students and record session attendance</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close program operations">
            <X size={18} />
          </button>
        </header>

        {error && <div className="alert alert-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>}
        {notice && <div className="alert alert-success" role="status"><CheckCircle2 size={16} /><span>{notice}</span></div>}

        <div className="program-operations-content">
          {canManage && (
            <section className="details-section">
              <h4 className="section-title"><UserPlus size={15} /><span>Program enrollment</span></h4>
              <form className="program-enroll-form" onSubmit={handleEnroll}>
                <label htmlFor="enroll-student">Active student record</label>
                <select id="enroll-student" className="select-dropdown" value={selectedStudent}
                  onChange={(event) => setSelectedStudent(event.target.value)} disabled={loading || saving}>
                  <option value="">Choose a student</option>
                  {availableStudents.map((student) => (
                    <option key={student._id || student.id} value={student._id || student.id}>
                      {student.firstName} {student.lastName} — {student.registrationNumber}
                    </option>
                  ))}
                </select>
                <button className="btn-primary" type="submit" disabled={!selectedStudent || saving}>
                  Enroll student
                </button>
              </form>
              {program.capacity && <p className="form-help-text">Program capacity: {program.capacity}</p>}
            </section>
          )}

          <section className="details-section">
            <h4 className="section-title"><CalendarCheck size={15} /><span>Enrolled students ({enrollmentPagination.totalItems})</span></h4>
            {loading ? <p className="form-help-text">Loading enrollment…</p> : enrollments.length ? (
              <>
              <div className="program-roster-list">
                {enrollments.map((enrollment) => {
                  const student = enrollment.studentId || {};
                  return (
                    <div className="program-roster-row" key={enrollment._id}>
                      <div>
                        <strong>{student.firstName} {student.lastName}</strong>
                        <span>{student.registrationNumber} · {enrollment.status}</span>
                      </div>
                      {canManage && enrollment.status === 'enrolled' && (
                        <div className="program-roster-actions">
                          <button type="button" className="btn-secondary" onClick={() => changeEnrollment(enrollment, 'completed')}>Complete</button>
                          <button type="button" className="btn-secondary" onClick={() => changeEnrollment(enrollment, 'withdrawn')}>Withdraw</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {enrollmentPagination.totalPages > 1 && (
                <div className="pagination-bar">
                  <span className="pagination-info">
                    Page {enrollmentPagination.currentPage} of {enrollmentPagination.totalPages}
                  </span>
                  <div className="pagination-controls">
                    <button type="button" className="btn-pagination" disabled={!enrollmentPagination.hasPrevPage || loading}
                      onClick={() => setEnrollmentPage((current) => Math.max(1, current - 1))}>
                      Previous
                    </button>
                    <button type="button" className="btn-pagination" disabled={!enrollmentPagination.hasNextPage || loading}
                      onClick={() => setEnrollmentPage((current) => current + 1)}>
                      Next
                    </button>
                  </div>
                </div>
              )}
              </>
            ) : <p className="form-help-text">No students are enrolled in this program yet.</p>}
          </section>

          {canManage && (
            <section className="details-section">
              <div className="attendance-heading">
                <h4 className="section-title"><CalendarCheck size={15} /><span>Session attendance</span></h4>
                <label htmlFor="attendance-date">Session date</label>
                <input id="attendance-date" type="date" className="filter-select" value={date}
                  onChange={(event) => setDate(event.target.value)} disabled={saving} />
              </div>
              {!roster.length ? (
                <p className="form-help-text">Enroll students to create an attendance register for this program.</p>
              ) : (
                <>
                  <div className="program-roster-list">
                    {roster.map(({ student, status, note }) => {
                      const id = student._id || student.id;
                      return (
                        <div className="program-attendance-row" key={id}>
                          <div>
                            <strong>{student.firstName} {student.lastName}</strong>
                            <span>{student.registrationNumber}</span>
                          </div>
                          <select className="select-dropdown" aria-label={`Attendance for ${student.firstName} ${student.lastName}`}
                            value={status} onChange={(event) => updateRoster(id, 'status', event.target.value)} disabled={saving}>
                            <option value="">Choose status</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="excused">Excused</option>
                          </select>
                          <input type="text" maxLength={300} value={note}
                            onChange={(event) => updateRoster(id, 'note', event.target.value)}
                            placeholder="Optional note" aria-label={`Optional attendance note for ${student.firstName}`}
                            disabled={saving} />
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" className="btn-primary" onClick={handleSaveAttendance}
                    disabled={saving || roster.some(({ status }) => !status)}>
                    {saving ? <Loader2 size={16} className="spin" /> : null}
                    Save attendance
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

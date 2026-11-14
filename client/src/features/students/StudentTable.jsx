import React from 'react';
import { 
  Eye, 
  Edit3, 
  RefreshCw, 
  GraduationCap, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2
} from 'lucide-react';

export default function StudentTable({
  students = [],
  loading = false,
  currentUserRole = 'staff',
  onView,
  onEdit,
  onChangeStatus,
  onDelete
}) {
  const canManage = currentUserRole === 'admin' || currentUserRole === 'ngo_admin' || currentUserRole === 'staff';
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'ngo_admin';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="status-pill status-active">
            <span className="status-dot"></span>
            Active
          </span>
        );
      case 'graduated':
        return (
          <span className="status-pill status-graduated">
            <span className="status-dot"></span>
            Graduated
          </span>
        );
      case 'transferred':
        return (
          <span className="status-pill status-transferred">
            <span className="status-dot"></span>
            Transferred
          </span>
        );
      case 'inactive':
        return (
          <span className="status-pill status-inactive">
            <span className="status-dot"></span>
            Inactive
          </span>
        );
      default:
        return (
          <span className="status-pill status-outline">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="table-loading-container">
        <div className="auth-spinner"></div>
        <p>Loading student records...</p>
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="table-empty-state">
        <AlertTriangle size={36} className="text-muted" />
        <h4>No Student Records Found</h4>
        <p>There are no students matching your search query or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive-wrapper">
      <table className="user-data-table student-data-table">
        <thead>
          <tr>
            <th>Registration No</th>
            <th>Student Name</th>
            <th>School</th>
            <th>Education Level</th>
            <th>Status</th>
            <th>Login Account</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const studentId = student._id || student.id;
            const linkedUser = student.userId;

            return (
              <tr 
                key={studentId} 
                className={student.status === 'inactive' ? 'row-inactive' : ''}
              >
                {/* 1. Registration Number */}
                <td>
                  <span className="reg-badge-cell">
                    {student.registrationNumber}
                  </span>
                </td>

                {/* 2. Student Name & Meta */}
                <td>
                  <div className="user-cell-meta">
                    <div className="student-table-avatar">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <div className="user-name-title">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="user-email-subtitle">
                        {student.email ? student.email : (student.gender ? `Gender: ${student.gender}` : '')}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 3. School */}
                <td>
                  <span className="school-cell-text" title={student.schoolName || ''}>
                    {student.schoolName ? student.schoolName : <span className="text-dim">—</span>}
                  </span>
                </td>

                {/* 4. Education Level */}
                <td>
                  <span className="edu-level-text">
                    {student.educationLevel ? student.educationLevel : <span className="text-dim">—</span>}
                  </span>
                </td>

                {/* 5. Status */}
                <td>
                  {getStatusBadge(student.status)}
                </td>

                {/* 6. Login Account */}
                <td>
                  {linkedUser ? (
                    <div className="linked-account-pill linked">
                      <CheckCircle2 size={13} className="text-success flex-shrink-0" />
                      <span title={typeof linkedUser === 'object' ? `${linkedUser.email} (${linkedUser.isActive ? 'Active' : 'Inactive'})` : 'Linked'}>
                        Linked
                      </span>
                    </div>
                  ) : (
                    <div className="linked-account-pill unlinked">
                      <XCircle size={13} className="text-dim flex-shrink-0" />
                      <span>None</span>
                    </div>
                  )}
                </td>

                {/* 7. Actions */}
                <td className="text-right">
                  <div className="action-buttons-group">
                    <button
                      type="button"
                      onClick={() => onView(student)}
                      className="btn-table-action btn-view"
                      title="View student profile"
                    >
                      <Eye size={15} />
                      <span>View</span>
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEdit(student)}
                          className="btn-table-action btn-edit"
                          title="Edit student profile"
                        >
                          <Edit3 size={15} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onChangeStatus(student)}
                          className="btn-table-action btn-change-status"
                          title="Change enrollment status"
                        >
                          <RefreshCw size={14} />
                          <span>Status</span>
                        </button>

                        {isAdmin && onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(student)}
                            className="btn-table-action btn-delete"
                            title="Safely delete or archive beneficiary"
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

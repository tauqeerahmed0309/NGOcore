import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Layers, 
  Award,
} from 'lucide-react';
import programService from './programService';
import userService from '../users/userService';

const PRESET_TYPES = [
  { value: 'class', label: 'School Class' },
  { value: 'course', label: 'Course' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'training', label: 'Vocational / Skill Training' },
  { value: 'awareness', label: 'Awareness Campaign' },
  { value: 'event', label: 'Community Event' },
  { value: 'camp', label: 'Camp (Summer / Health / Sports)' },
  { value: 'custom', label: 'Custom Program Type (Type your own)...' }
];

const PRESET_CATEGORIES = [
  'Education',
  'Skill Development',
  'Health & Hygiene',
  'Community Outreach',
  'Sports & Fitness',
  'Career Guidance',
  'Digital Literacy',
  'Arts & Culture',
  'Other'
];

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

export default function ProgramForm({
  isOpen,
  mode = 'create',
  programToEdit = null,
  onClose,
  onSuccess
}) {
  // Basic Info
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [selectedType, setSelectedType] = useState('workshop');
  const [customType, setCustomType] = useState('');
  const [category, setCategory] = useState('Education');
  const [description, setDescription] = useState('');

  // Schedule
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [selectedDays, setSelectedDays] = useState(['saturday', 'sunday']);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Location & Capacity
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState('active');

  // People & Assignments
  const [coordinator, setCoordinator] = useState('');
  const [assignedStaff, setAssignedStaff] = useState([]);
  const [assignedVolunteers, setAssignedVolunteers] = useState([]);

  // Available users list
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Dynamic Custom Attributes: [{ key: '', value: '' }]
  const [customAttributesList, setCustomAttributesList] = useState([]);

  // Form State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch available users for coordinator, staff, and volunteers
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const res = await userService.getUsers({ limit: 100 });
          if (res.success && res.data?.users) {
            // Only active users
            const activeUsers = res.data.users.filter((u) => u.isActive);
            setUsersList(activeUsers);
          }
        } catch (err) {
          setError(err.message || 'Could not load users for program assignments.');
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  // Populate form for Edit vs Create
  useEffect(() => {
    if (isOpen) {
      setError('');
      setValidationErrors({});

      if (mode === 'edit' && programToEdit) {
        setName(programToEdit.name || '');
        setCode(programToEdit.code || '');

        const existingType = programToEdit.type || '';
        const isPreset = PRESET_TYPES.some((pt) => pt.value === existingType);
        if (isPreset) {
          setSelectedType(existingType);
          setCustomType('');
        } else {
          setSelectedType('custom');
          setCustomType(existingType);
        }

        setCategory(programToEdit.category || 'Education');
        setDescription(programToEdit.description || '');

        setStartDate(
          programToEdit.startDate
            ? new Date(programToEdit.startDate).toISOString().split('T')[0]
            : ''
        );
        setEndDate(
          programToEdit.endDate
            ? new Date(programToEdit.endDate).toISOString().split('T')[0]
            : ''
        );

        const schedule = programToEdit.schedule || {};
        setFrequency(schedule.frequency || 'weekly');
        setSelectedDays(Array.isArray(schedule.days) ? schedule.days : []);
        setStartTime(schedule.startTime || '');
        setEndTime(schedule.endTime || '');

        setLocation(programToEdit.location || '');
        setCapacity(programToEdit.capacity ? String(programToEdit.capacity) : '');
        setStatus(programToEdit.status || 'active');

        // Coordinator
        const coordId = programToEdit.coordinator?._id || programToEdit.coordinator || '';
        setCoordinator(coordId);

        // Staff
        const staffIds = Array.isArray(programToEdit.assignedStaff)
          ? programToEdit.assignedStaff.map((s) => s._id || s)
          : [];
        setAssignedStaff(staffIds);

        // Volunteers
        const volIds = Array.isArray(programToEdit.assignedVolunteers)
          ? programToEdit.assignedVolunteers.map((v) => v._id || v)
          : [];
        setAssignedVolunteers(volIds);

        // Custom attributes
        if (programToEdit.customAttributes && typeof programToEdit.customAttributes === 'object') {
          const pairs = Object.entries(programToEdit.customAttributes).map(([k, v]) => ({
            key: k,
            value: typeof v === 'object' ? JSON.stringify(v) : String(v)
          }));
          setCustomAttributesList(pairs);
        } else {
          setCustomAttributesList([]);
        }
      } else {
        // Reset for Create
        setName('');
        setCode('');
        setSelectedType('workshop');
        setCustomType('');
        setCategory('Education');
        setDescription('');

        setStartDate('');
        setEndDate('');
        setFrequency('weekly');
        setSelectedDays(['saturday', 'sunday']);
        setStartTime('10:00');
        setEndTime('12:30');

        setLocation('');
        setCapacity('25');
        setStatus('active');

        setCoordinator('');
        setAssignedStaff([]);
        setAssignedVolunteers([]);
        setCustomAttributesList([
          { key: 'Target Age', value: '15-18' },
          { key: 'Language', value: 'English' }
        ]);
      }
    }
  }, [isOpen, mode, programToEdit]);

  if (!isOpen) return null;

  // Day toggle handler
  const handleToggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // Staff checkbox toggle handler
  const handleToggleStaff = (staffId) => {
    if (assignedStaff.includes(staffId)) {
      setAssignedStaff(assignedStaff.filter((id) => id !== staffId));
    } else {
      setAssignedStaff([...assignedStaff, staffId]);
    }
  };

  // Volunteer checkbox toggle handler
  const handleToggleVolunteer = (volId) => {
    if (assignedVolunteers.includes(volId)) {
      setAssignedVolunteers(assignedVolunteers.filter((id) => id !== volId));
    } else {
      setAssignedVolunteers([...assignedVolunteers, volId]);
    }
  };

  // Custom attributes list handlers
  const handleAddAttribute = () => {
    setCustomAttributesList([...customAttributesList, { key: '', value: '' }]);
  };

  const handleUpdateAttribute = (index, field, val) => {
    const updated = [...customAttributesList];
    updated[index][field] = val;
    setCustomAttributesList(updated);
  };

  const handleRemoveAttribute = (index) => {
    setCustomAttributesList(customAttributesList.filter((_, i) => i !== index));
  };

  // Validation
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Program Name is required';
    }

    if (!code.trim()) {
      errors.code = 'Program Code is required';
    } else if (code.trim().length < 3) {
      errors.code = 'Program Code must be at least 3 characters';
    }

    const effectiveType = selectedType === 'custom' ? customType.trim() : selectedType;
    if (!effectiveType) {
      errors.type = 'Program Type is required. Enter a custom type name.';
    }

    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        errors.endDate = 'End Date cannot be earlier than Start Date';
      }
    }

    if (capacity && capacity.trim() !== '') {
      const capNum = parseInt(capacity, 10);
      if (isNaN(capNum) || capNum <= 0) {
        errors.capacity = 'Capacity must be a positive integer greater than zero';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const effectiveType = (
        selectedType === 'custom' ? customType.trim() : selectedType
      ).toLowerCase();

      // Convert custom attributes array to clean object
      const customAttributesObj = {};
      customAttributesList.forEach((attr) => {
        const k = attr.key.trim();
        if (k) {
          customAttributesObj[k] = attr.value.trim();
        }
      });

      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type: effectiveType,
        category: category.trim(),
        description: description.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        schedule: {
          days: selectedDays,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          frequency: frequency.trim()
        },
        location: location.trim(),
        capacity: capacity ? parseInt(capacity, 10) : null,
        status,
        coordinator: coordinator || null,
        assignedStaff,
        assignedVolunteers,
        customAttributes: customAttributesObj
      };

      if (mode === 'create') {
        const res = await programService.createProgram(payload);
        if (res.success) {
          onSuccess(res.message || 'Program created successfully!');
          onClose();
        }
      } else {
        const programId = programToEdit._id || programToEdit.id;
        const res = await programService.updateProgram(programId, payload);
        if (res.success) {
          onSuccess(res.message || 'Program updated successfully!');
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save program');
      if (err.errors && Array.isArray(err.errors)) {
        const backendErrors = {};
        err.errors.forEach((e) => {
          if (e.field) backendErrors[e.field] = e.message;
        });
        setValidationErrors(backendErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  // Grouped active users for assignments
  const coordinatorCandidates = usersList.filter(
    (u) => u.role === 'admin' || u.role === 'ngo_admin' || u.role === 'staff'
  );
  const staffCandidates = usersList.filter((u) => u.role === 'staff');
  const volunteerCandidates = usersList.filter((u) => u.role === 'volunteer');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container program-form-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <Calendar size={22} className="text-primary" />
            <div>
              <h3>{mode === 'create' ? 'Create New Program' : 'Edit Program Details'}</h3>
              <p className="modal-header-desc">
                {mode === 'create'
                  ? 'Define a dynamic NGO course, class, workshop, or community activity'
                  : `Update specifications for ${programToEdit?.name}`}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="modal-close-btn"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form program-form">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="program-form-scrollable">
            {/* Section 1: Basic Information */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <Layers size={16} />
                <span>1. Basic Information</span>
              </h4>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="program-name">Program Name *</label>
                  <input
                    id="program-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Weekend Python Training"
                    disabled={loading}
                  />
                  {validationErrors.name && (
                    <span className="field-error-text">{validationErrors.name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="program-code">Program Code (Unique) *</label>
                  <input
                    id="program-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PY-WEEKEND-2026"
                    disabled={loading}
                    className="input-uppercase"
                  />
                  {validationErrors.code && (
                    <span className="field-error-text">{validationErrors.code}</span>
                  )}
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="program-type">Program Type *</label>
                  <select
                    id="program-type"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="select-dropdown"
                    disabled={loading}
                  >
                    {PRESET_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="program-category">Category</label>
                  <select
                    id="program-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="select-dropdown"
                    disabled={loading}
                  >
                    {PRESET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedType === 'custom' && (
                <div className="form-group">
                  <label htmlFor="program-custom-type">Enter Custom Program Type *</label>
                  <input
                    id="program-custom-type"
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="e.g. Health Awareness, Drone Coding, Community Solar, etc."
                    disabled={loading}
                  />
                  {validationErrors.type && (
                    <span className="field-error-text">{validationErrors.type}</span>
                  )}
                  <span className="form-help-text">
                    * Define any new program type dynamically without database restrictions.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="program-description">Description & Objectives</label>
                <textarea
                  id="program-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Goals, target beneficiaries, curriculum overview..."
                  disabled={loading}
                />
              </div>
            </div>

            {/* Section 2: Schedule & Timeline */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <Clock size={16} />
                <span>2. Schedule & Timeline</span>
              </h4>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="program-startDate">Start Date</label>
                  <input
                    id="program-startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="program-endDate">End Date</label>
                  <input
                    id="program-endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={loading}
                  />
                  {validationErrors.endDate && (
                    <span className="field-error-text">{validationErrors.endDate}</span>
                  )}
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="program-frequency">Frequency</label>
                  <select
                    id="program-frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="select-dropdown"
                    disabled={loading}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="once">Once (One-time event)</option>
                    <option value="custom">Custom Schedule</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="program-startTime">Start Time</label>
                  <input
                    id="program-startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="program-endTime">End Time</label>
                  <input
                    id="program-endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Recurring Days of Week</label>
                <div className="days-picker-group">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleToggleDay(day)}
                        className={`day-toggle-btn ${isSelected ? 'selected' : ''}`}
                      >
                        {day.slice(0, 3).toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 3: Location & Capacity */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <MapPin size={16} />
                <span>3. Location & Capacity</span>
              </h4>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="program-location">Location / Classroom / Center</label>
                  <input
                    id="program-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Atria Community Center Room 204"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="program-capacity">Capacity (Max Students)</label>
                  <input
                    id="program-capacity"
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g. 25 (Leave blank if flexible)"
                    disabled={loading}
                  />
                  {validationErrors.capacity && (
                    <span className="field-error-text">{validationErrors.capacity}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="program-status">Status</label>
                <select
                  id="program-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="select-dropdown"
                  disabled={loading}
                >
                  <option value="active">Active (Ongoing / Enrolling)</option>
                  <option value="draft">Draft (Planning stage)</option>
                  <option value="paused">Paused (Temporarily on hold)</option>
                  <option value="completed">Completed (Finished activity)</option>
                  <option value="cancelled">Cancelled (Terminated)</option>
                </select>
              </div>
            </div>

            {/* Section 4: Leadership & Personnel Assignments */}
            <div className="form-section-group">
              <h4 className="form-section-title">
                <Users size={16} />
                <span>4. Team & Personnel Assignments</span>
              </h4>

              {/* Coordinator */}
              <div className="form-group">
                <label htmlFor="program-coordinator">Lead Coordinator (Staff or Admin)</label>
                <select
                  id="program-coordinator"
                  value={coordinator}
                  onChange={(e) => setCoordinator(e.target.value)}
                  className="select-dropdown"
                  disabled={loading || loadingUsers}
                >
                  <option value="">Unassigned (None)</option>
                  {coordinatorCandidates.map((u) => {
                    const uId = u._id || u.id;
                    return (
                      <option key={uId} value={uId}>
                        {u.firstName} {u.lastName} ({u.email}) — [{u.role.toUpperCase()}]
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Assigned Staff Multi-check */}
              <div className="form-group">
                <label>Assigned Staff (Staff Role Only)</label>
                <div className="assignments-checklist">
                  {staffCandidates.length > 0 ? (
                    staffCandidates.map((staff) => {
                      const sId = staff._id || staff.id;
                      const isChecked = assignedStaff.includes(sId);
                      return (
                        <label key={sId} className="assignment-check-row">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStaff(sId)}
                            disabled={loading}
                          />
                          <span>
                            <strong>{staff.firstName} {staff.lastName}</strong> ({staff.email})
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <span className="text-dim">No active staff members registered.</span>
                  )}
                </div>
              </div>

              {/* Assigned Volunteers Multi-check */}
              <div className="form-group">
                <label>Assigned Volunteers (Volunteer Role Only)</label>
                <div className="assignments-checklist">
                  {volunteerCandidates.length > 0 ? (
                    volunteerCandidates.map((vol) => {
                      const vId = vol._id || vol.id;
                      const isChecked = assignedVolunteers.includes(vId);
                      return (
                        <label key={vId} className="assignment-check-row">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleVolunteer(vId)}
                            disabled={loading}
                          />
                          <span>
                            <strong>{vol.firstName} {vol.lastName}</strong> ({vol.email})
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <span className="text-dim">No active volunteers registered.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 5: Dynamic Custom Attributes */}
            <div className="form-section-group">
              <div className="section-title-with-btn">
                <h4 className="form-section-title" style={{ borderBottom: 'none', margin: 0, paddingBottom: 0 }}>
                  <Award size={16} />
                  <span>5. Dynamic Custom Attributes</span>
                </h4>
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="btn-add-attr"
                >
                  <Plus size={14} />
                  <span>Add Attribute</span>
                </button>
              </div>
              <p className="form-help-text">
                Store custom NGO requirements (e.g. Funding Source, Language, Target Age, Equipment, etc.) without altering code.
              </p>

              <div className="custom-attr-table">
                {customAttributesList.map((attr, idx) => (
                  <div key={idx} className="custom-attr-row">
                    <input
                      type="text"
                      placeholder="Field Name (e.g. Funded By)"
                      value={attr.key}
                      onChange={(e) => handleUpdateAttribute(idx, 'key', e.target.value)}
                      className="attr-key-input"
                      disabled={loading}
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. ABC Foundation)"
                      value={attr.value}
                      onChange={(e) => handleUpdateAttribute(idx, 'value', e.target.value)}
                      className="attr-val-input"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttribute(idx)}
                      className="btn-remove-attr"
                      title="Remove field"
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {customAttributesList.length === 0 && (
                  <div className="text-dim" style={{ fontSize: '0.8125rem' }}>
                    No custom attributes added. Click "+ Add Attribute" to define custom NGO properties.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading
                ? mode === 'create'
                  ? 'Creating Program...'
                  : 'Saving Changes...'
                : mode === 'create'
                ? 'Create Program'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

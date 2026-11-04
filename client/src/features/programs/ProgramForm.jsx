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
  Loader2,
  FileText
} from 'lucide-react';
import programService from './programService';
import userService from '../users/userService';

const PRESET_TYPES = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'class', label: 'School Class' },
  { value: 'course', label: 'Course' },
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
  // 1. Program Information
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [selectedType, setSelectedType] = useState('workshop');
  const [customType, setCustomType] = useState('');
  const [category, setCategory] = useState('Education');

  // 2. Description & Custom Attributes
  const [description, setDescription] = useState('');
  const [customAttributesList, setCustomAttributesList] = useState([]);

  // 3. Schedule, Timing & Location
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [selectedDays, setSelectedDays] = useState(['saturday', 'sunday']);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');

  // 4. Status & Assignments
  const [status, setStatus] = useState('active');
  const [capacity, setCapacity] = useState('');
  const [coordinator, setCoordinator] = useState('');
  const [assignedStaff, setAssignedStaff] = useState([]);
  const [assignedVolunteers, setAssignedVolunteers] = useState([]);

  // Available users list
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch available users for coordinator, staff, and volunteers
  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
          const res = await userService.getUsers({ limit: 100 });
          if (isMounted && res.success && res.data?.users) {
            const activeUsers = res.data.users.filter((u) => u.isActive);
            setUsersList(activeUsers);
          }
        } catch (err) {
          if (isMounted) {
            setError(err.message || 'Could not load users for program assignments.');
          }
        } finally {
          if (isMounted) setLoadingUsers(false);
        }
      };
      fetchUsers();
      return () => {
        isMounted = false;
      };
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

        const existingType = (programToEdit.type || '').toLowerCase();
        const isPreset = PRESET_TYPES.some((pt) => pt.value === existingType && pt.value !== 'custom');
        if (isPreset) {
          setSelectedType(existingType);
          setCustomType('');
        } else {
          setSelectedType('custom');
          setCustomType(programToEdit.type || '');
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
    setCustomAttributesList(customAttributesList.filter((_, idx) => idx !== index));
  };

  // Filter candidates by role
  const coordinatorCandidates = usersList.filter(
    (u) => u.role === 'admin' || u.role === 'ngo_admin' || u.role === 'staff'
  );
  const staffCandidates = usersList.filter((u) => u.role === 'staff');
  const volunteerCandidates = usersList.filter((u) => u.role === 'volunteer');

  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Program Name is required';
    }

    if (!code.trim()) {
      errors.code = 'Program Code is required';
    } else if (code.trim().length < 2) {
      errors.code = 'Program Code must be at least 2 characters';
    }

    const effectiveType = (
      selectedType === 'custom' ? customType.trim() : selectedType
    );
    if (!effectiveType) {
      errors.type = 'Program Type is required';
    }

    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        errors.endDate = 'End Date cannot be earlier than Start Date';
      }
    }

    if (capacity && String(capacity).trim() !== '') {
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
    if (loading) return; // Prevent double-clicking
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
        capacity: capacity && String(capacity).trim() !== '' ? parseInt(capacity, 10) : null,
        status: status || 'active',
        coordinator: coordinator || null,
        assignedStaff: Array.isArray(assignedStaff) ? assignedStaff : [],
        assignedVolunteers: Array.isArray(assignedVolunteers) ? assignedVolunteers : [],
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container program-form-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="program-avatar-modal">
              <Calendar size={24} className="text-primary" />
            </div>
            <div>
              <h3>{mode === 'create' ? 'Create New Program / Event' : 'Edit Program Details'}</h3>
              <p className="modal-header-desc">
                {mode === 'create' 
                  ? 'Define educational curricula, community workshops, or field initiatives' 
                  : `Update specifications for ${programToEdit?.name || ''}`
                }
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="modal-close-btn"
            aria-label="Close dialog"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form program-form">
          <div className="form-scrollable program-form-scrollable">
            {/* Global API Error Alert */}
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION 1: Program Information */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-header-left">
                  <span className="section-icon"><Layers size={18} /></span>
                  <div>
                    <h4 className="form-section-title">1. Program Information</h4>
                    <span className="form-section-desc">Core identifiers, activity classification, and domain category</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="program-name">
                    Program Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="program-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Basic Digital Literacy Workshop"
                    disabled={loading}
                    required
                  />
                  {validationErrors.name && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.name}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="program-code">
                    Program Code <span className="required-star">*</span>
                  </label>
                  <input
                    id="program-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PRG-2026-DIG"
                    disabled={loading}
                    className="input-uppercase"
                    required
                  />
                  {validationErrors.code && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.code}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="program-type">
                    Program Type <span className="required-star">*</span>
                  </label>
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
                  {validationErrors.type && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.type}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="program-category">Focus Category</label>
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

                {selectedType === 'custom' && (
                  <div className="form-group col-span-2">
                    <label htmlFor="program-customType">
                      Specify Custom Program Type <span className="required-star">*</span>
                    </label>
                    <input
                      id="program-customType"
                      type="text"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="e.g. Robotics Bootcamp, Evening Coaching, Mobile Health Van"
                      disabled={loading}
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: Description and Objectives */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-header-left">
                  <span className="section-icon"><FileText size={18} /></span>
                  <div>
                    <h4 className="form-section-title">2. Description and Objectives</h4>
                    <span className="form-section-desc">Program goals, intended learning outcomes, and custom attributes</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group col-span-2">
                  <label htmlFor="program-description">Detailed Description</label>
                  <textarea
                    id="program-description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Curriculum summary, target age group, prerequisites, and milestone objectives..."
                    disabled={loading}
                  />
                  {validationErrors.description && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.description}
                    </span>
                  )}
                </div>

                {/* Custom Attributes */}
                <div className="form-group col-span-2">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ margin: 0 }}>Target Attributes & Parameters</label>
                    <button
                      type="button"
                      onClick={handleAddAttribute}
                      className="btn-add-attr"
                      disabled={loading}
                    >
                      <Plus size={14} />
                      <span>Add Attribute</span>
                    </button>
                  </div>
                  <span className="form-help-text" style={{ marginBottom: '8px' }}>
                    Flexible parameters such as Target Age, Language, Certificate Available, Equipment, or Sponsor.
                  </span>

                  <div className="custom-attrs-list">
                    {customAttributesList.map((attr, idx) => (
                      <div key={idx} className="custom-attr-row">
                        <input
                          type="text"
                          value={attr.key}
                          onChange={(e) => handleUpdateAttribute(idx, 'key', e.target.value)}
                          placeholder="Attribute Name (e.g. Target Age)"
                          disabled={loading}
                        />
                        <input
                          type="text"
                          value={attr.value}
                          onChange={(e) => handleUpdateAttribute(idx, 'value', e.target.value)}
                          placeholder="Value (e.g. 15-18 or English)"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAttribute(idx)}
                          className="btn-icon-danger"
                          title="Delete attribute"
                          disabled={loading}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    {customAttributesList.length === 0 && (
                      <span className="form-help-text" style={{ fontStyle: 'italic' }}>
                        No custom attributes defined. Click &quot;Add Attribute&quot; to configure custom parameters.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Schedule, Timing & Location */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-header-left">
                  <span className="section-icon"><Clock size={18} /></span>
                  <div>
                    <h4 className="form-section-title">3. Schedule, Dates and Venue</h4>
                    <span className="form-section-desc">Date boundaries, weekly calendar days, operating hours, and location</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="program-startDate">Start Date</label>
                  <input
                    id="program-startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={loading}
                  />
                  {validationErrors.startDate && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.startDate}
                    </span>
                  )}
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
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.endDate}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="program-frequency">Schedule Frequency</label>
                  <select
                    id="program-frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="select-dropdown"
                    disabled={loading}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly (Fortnightly)</option>
                    <option value="monthly">Monthly</option>
                    <option value="daily">Daily</option>
                    <option value="one-time">One-time Event</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="program-location">Location / Venue</label>
                  <input
                    id="program-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Center Room 2A, Main Hall, or Zoom"
                    disabled={loading}
                  />
                </div>

                <div className="form-group col-span-2">
                  <label>Scheduled Days of the Week</label>
                  <div className="days-selector-grid">
                    {DAYS_OF_WEEK.map((day) => {
                      const isActive = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDay(day)}
                          className={`day-pill-btn ${isActive ? 'active' : ''}`}
                          disabled={loading}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  <span className="form-help-text">Click to toggle the operating days for this program</span>
                </div>

                <div className="form-group">
                  <label htmlFor="program-startTime">Daily Start Time</label>
                  <input
                    id="program-startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="program-endTime">Daily End Time</label>
                  <input
                    id="program-endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Status and Additional Details */}
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-header-left">
                  <span className="section-icon"><Users size={18} /></span>
                  <div>
                    <h4 className="form-section-title">4. Status, Capacity & Team Assignments</h4>
                    <span className="form-section-desc">Enrollment capacity, lifecycle state, coordinator, and personnel</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="program-status">
                    Program Lifecycle Status <span className="required-star">*</span>
                  </label>
                  <select
                    id="program-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="select-dropdown"
                    disabled={loading}
                  >
                    <option value="active">Active (Enrolling & Conducting Sessions)</option>
                    <option value="draft">Draft (Planning Phase)</option>
                    <option value="paused">Paused (Temporarily on Hold)</option>
                    <option value="completed">Completed (Successfully Concluded)</option>
                    <option value="cancelled">Cancelled (Terminated)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="program-capacity">Maximum Beneficiary Capacity</label>
                  <input
                    id="program-capacity"
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g. 25 (leave blank for unlimited)"
                    disabled={loading}
                  />
                  {validationErrors.capacity && (
                    <span className="field-error-text">
                      <AlertCircle size={13} />
                      {validationErrors.capacity}
                    </span>
                  )}
                  <span className="form-help-text">Leave blank or empty for unlimited / flexible capacity</span>
                </div>

                <div className="form-group col-span-2">
                  <label htmlFor="program-coordinator">Lead Coordinator (Admin or Staff)</label>
                  <select
                    id="program-coordinator"
                    value={coordinator}
                    onChange={(e) => setCoordinator(e.target.value)}
                    className="select-dropdown"
                    disabled={loading || loadingUsers}
                  >
                    <option value="">Unassigned (No designated coordinator)</option>
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

                {/* Assigned Staff */}
                <div className="form-group">
                  <label>Assigned Staff Members (Staff Role)</label>
                  <div className="user-select-list">
                    {staffCandidates.length > 0 ? (
                      staffCandidates.map((staff) => {
                        const sId = staff._id || staff.id;
                        const isChecked = assignedStaff.includes(sId);
                        return (
                          <label key={sId} className="user-checkbox-item">
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
                      <span className="form-help-text" style={{ padding: '6px' }}>No active staff members registered.</span>
                    )}
                  </div>
                </div>

                {/* Assigned Volunteers */}
                <div className="form-group">
                  <label>Assigned Volunteers (Volunteer Role)</label>
                  <div className="user-select-list">
                    {volunteerCandidates.length > 0 ? (
                      volunteerCandidates.map((vol) => {
                        const vId = vol._id || vol.id;
                        const isChecked = assignedVolunteers.includes(vId);
                        return (
                          <label key={vId} className="user-checkbox-item">
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
                      <span className="form-help-text" style={{ padding: '6px' }}>No active volunteers registered.</span>
                    )}
                  </div>
                </div>
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
              {loading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} />}
              {loading 
                ? (mode === 'create' ? 'Creating Program...' : 'Saving Changes...') 
                : (mode === 'create' ? 'Create Program' : 'Save Changes')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

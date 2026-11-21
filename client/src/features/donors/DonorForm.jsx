import React, { useState, useEffect } from 'react';
import {
  X,
  HeartHandshake,
  User,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import donorService from './donorService';

const DONOR_CATEGORIES = [
  { value: 'individual', label: 'Individual Donor' },
  { value: 'corporate', label: 'Corporate Partner' },
  { value: 'foundation', label: 'Philanthropic Foundation' },
  { value: 'major_donor', label: 'Major Donor / High Net Worth' },
  { value: 'regular', label: 'Regular / Monthly Contributor' },
  { value: 'grant_maker', label: 'Institutional Grant Maker' },
  { value: 'patron', label: 'Patron' },
  { value: 'other', label: 'Other Category' }
];

const COMMUNICATION_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'postal', label: 'Postal Mail' },
  { value: 'none', label: 'Do Not Contact' }
];

export default function DonorForm({
  isOpen,
  mode = 'create',
  donorToEdit = null,
  onClose,
  onSuccess
}) {
  const [donorNumber, setDonorNumber] = useState('');
  const [type, setType] = useState('individual');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [category, setCategory] = useState('individual');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('India');

  const [preferredChannel, setPreferredChannel] = useState('email');
  const [optOut, setOptOut] = useState(false);
  const [newsletter, setNewsletter] = useState(true);

  const [registrationDate, setRegistrationDate] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && donorToEdit) {
        setDonorNumber(donorToEdit.donorNumber || '');
        setType(donorToEdit.type || 'individual');
        setName(donorToEdit.name || '');
        setContactPerson(donorToEdit.contactPerson || '');
        setCategory(donorToEdit.category || 'individual');

        setEmail(donorToEdit.email || '');
        setPhone(donorToEdit.phone || '');
        setAlternatePhone(donorToEdit.alternatePhone || '');

        setAddress(donorToEdit.address || '');
        setCity(donorToEdit.city || '');
        setState(donorToEdit.state || '');
        setPinCode(donorToEdit.pinCode || '');
        setCountry(donorToEdit.country || 'India');

        setPreferredChannel(donorToEdit.communicationPreferences?.preferredChannel || 'email');
        setOptOut(Boolean(donorToEdit.communicationPreferences?.optOut));
        setNewsletter(donorToEdit.communicationPreferences?.newsletter !== false);

        if (donorToEdit.registrationDate) {
          try {
            setRegistrationDate(new Date(donorToEdit.registrationDate).toISOString().split('T')[0]);
          } catch {
            setRegistrationDate('');
          }
        } else {
          setRegistrationDate('');
        }

        setStatus(donorToEdit.status || 'active');
        setNotes(donorToEdit.notes || '');
      } else {
        // Reset form for create mode
        setDonorNumber('');
        setType('individual');
        setName('');
        setContactPerson('');
        setCategory('individual');

        setEmail('');
        setPhone('');
        setAlternatePhone('');

        setAddress('');
        setCity('');
        setState('');
        setPinCode('');
        setCountry('India');

        setPreferredChannel('email');
        setOptOut(false);
        setNewsletter(true);

        setRegistrationDate(new Date().toISOString().split('T')[0]);
        setStatus('active');
        setNotes('');
      }

      setError('');
      setValidationErrors({});
    }
  }, [isOpen, mode, donorToEdit]);

  if (!isOpen) return null;

  const validateForm = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Donor or organization name is required.';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    const payload = {
      name: name.trim(),
      type,
      contactPerson: contactPerson.trim(),
      category,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      alternatePhone: alternatePhone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: pinCode.trim(),
      country: country.trim() || 'India',
      communicationPreferences: {
        preferredChannel,
        optOut,
        newsletter
      },
      status,
      notes: notes.trim()
    };

    if (donorNumber.trim()) {
      payload.donorNumber = donorNumber.trim().toUpperCase();
    }

    if (registrationDate) {
      payload.registrationDate = new Date(registrationDate);
    }

    try {
      if (mode === 'create') {
        const res = await donorService.createDonor(payload);
        if (res.success) {
          onSuccess(res.message || 'Donor profile created successfully!');
          onClose();
        }
      } else {
        const donorId = donorToEdit._id || donorToEdit.id;
        const res = await donorService.updateDonor(donorId, payload);
        if (res.success) {
          onSuccess(res.message || 'Donor profile updated successfully!');
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save donor profile');
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
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', width: '95%' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                background: 'var(--brand-green-muted)',
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HeartHandshake size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {mode === 'create' ? 'Register New Donor' : 'Edit Donor Profile'}
              </h3>
              <p className="modal-header-desc" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {mode === 'create'
                  ? 'Add an individual supporter, corporate sponsor, or foundation partner to the organization records'
                  : `Update record and preferences for ${donorToEdit?.name || ''}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ padding: 6, color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            style={{
              margin: '16px 24px 0 24px',
              padding: '12px 16px',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.875rem'
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>
            {/* 1. Basic Information Section */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={16} /> Basic Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {/* Donor Type */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Donor Type <span style={{ color: 'var(--status-danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input
                        type="radio"
                        name="donorType"
                        value="individual"
                        checked={type === 'individual'}
                        onChange={() => setType('individual')}
                      />
                      Individual
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input
                        type="radio"
                        name="donorType"
                        value="organization"
                        checked={type === 'organization'}
                        onChange={() => setType('organization')}
                      />
                      Organization / Corporate
                    </label>
                  </div>
                </div>

                {/* Donor ID */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Donor ID / Code
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. DNR-001 (Leave blank to auto-generate)"
                    value={donorNumber}
                    onChange={(e) => setDonorNumber(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                  {validationErrors.donorNumber && (
                    <span style={{ color: 'var(--status-danger)', fontSize: '0.75rem', marginTop: 4 }}>
                      {validationErrors.donorNumber}
                    </span>
                  )}
                </div>

                {/* Donor / Organization Name */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    {type === 'organization' ? 'Organization / Company Name' : 'Donor Full Name'}{' '}
                    <span style={{ color: 'var(--status-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={type === 'organization' ? 'e.g. Tata Trusts or Infosys Foundation' : 'e.g. Ramesh Patel'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                  {validationErrors.name && (
                    <span style={{ color: 'var(--status-danger)', fontSize: '0.75rem', marginTop: 4 }}>
                      {validationErrors.name}
                    </span>
                  )}
                </div>

                {/* Contact Person (if organization) */}
                {type === 'organization' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                      Primary Contact Representative
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sunita Rao, Head of CSR Initiatives"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                    />
                  </div>
                )}

                {/* Category */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Donor Category <span style={{ color: 'var(--status-danger)' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    {DONOR_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Registration Date */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Registration Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Contact Details Section */}
            <div style={{ marginBottom: 24, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={16} /> Contact & Communication
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {/* Email */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="donor@example.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                  {validationErrors.email && (
                    <span style={{ color: 'var(--status-danger)', fontSize: '0.75rem', marginTop: 4 }}>
                      {validationErrors.email}
                    </span>
                  )}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>

                {/* Alternate Phone */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Alternate Phone
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Optional second number"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>

                {/* Preferred Channel */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Preferred Communication Channel
                  </label>
                  <select
                    className="form-select"
                    value={preferredChannel}
                    onChange={(e) => setPreferredChannel(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    {COMMUNICATION_CHANNELS.map((ch) => (
                      <option key={ch.value} value={ch.value}>
                        {ch.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={newsletter}
                    onChange={(e) => setNewsletter(e.target.checked)}
                  />
                  Subscribe to organization updates & newsletters
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: optOut ? 'var(--status-danger)' : 'inherit' }}>
                  <input
                    type="checkbox"
                    checked={optOut}
                    onChange={(e) => setOptOut(e.target.checked)}
                  />
                  Opt-out from solicitation campaigns
                </label>
              </div>
            </div>

            {/* 3. Address Section */}
            <div style={{ marginBottom: 24, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} /> Location & Address
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Street Address
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Office / residential address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    City
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mumbai, Bengaluru"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    State / Region
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    PIN / Postal Code
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 400001"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Country
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Record Status & Internal Notes */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} /> Operational Status & Authorized Notes
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Donor Record Status
                  </label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    Authorized Internal Donor Notes
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Internal relationship notes, philanthropic focus areas, or engagement guidelines..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                padding: '8px 22px',
                borderRadius: 6,
                background: 'var(--brand-green)',
                color: '#fff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : mode === 'create' ? (
                'Save Donor Record'
              ) : (
                'Update Donor'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

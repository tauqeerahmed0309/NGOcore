import React, { useState, useEffect } from 'react';
import {
  X,
  HeartHandshake,
  AlertCircle,
  Lock
} from 'lucide-react';
import donorService from '../donors/donorService';
import api from '../../services/api';

export default function DonationForm({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  donation = null,
  onClose,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    donorId: '',
    donorName: '',
    donorEmail: '',
    donorPhone: '',
    donationNumber: '',
    donationType: 'monetary',
    amount: '',
    currency: 'INR',
    inKindDescription: '',
    donationDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'upi',
    transactionReference: '',
    category: 'general',
    purpose: '',
    programId: '',
    notes: ''
  });

  const [donorsList, setDonorsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [donorSource, setDonorSource] = useState('existing'); // 'existing' | 'manual'

  // Financial lock if donation is already approved or reversed
  const isApprovedOrReversed = donation && (donation.status === 'approved' || donation.status === 'reversed' || donation.status === 'cancelled');

  useEffect(() => {
    if (!isOpen) return;

    // Load active donors and programs for dropdowns
    const loadLookups = async () => {
      setLoadingLookups(true);
      try {
        const [donorsRes, programsRes] = await Promise.allSettled([
          donorService.getDonors({ limit: 100, status: 'active' }),
          api.get('/programs', { params: { limit: 100 } })
        ]);

        if (donorsRes.status === 'fulfilled') {
          const val = donorsRes.value;
          const donorsData = val?.data?.donors || val?.data?.data?.donors || val?.donors || (Array.isArray(val?.data) ? val.data : []);
          setDonorsList(Array.isArray(donorsData) ? donorsData : []);
        }
        if (programsRes.status === 'fulfilled') {
          const val = programsRes.value;
          const progsData = val?.data?.programs || val?.data?.data?.programs || val?.programs || (Array.isArray(val?.data) ? val.data : []);
          setProgramsList(Array.isArray(progsData) ? progsData : []);
        }
      } catch (err) {
        console.error('Error fetching lookups for donation form:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    loadLookups();

    if (mode === 'edit' && donation) {
      setFormData({
        donorId: donation.donorId?._id || donation.donorId || '',
        donorName: donation.donorSnapshot?.name || '',
        donorEmail: donation.donorSnapshot?.email || '',
        donorPhone: donation.donorSnapshot?.phone || '',
        donationNumber: donation.donationNumber || '',
        donationType: donation.donationType || 'monetary',
        amount: donation.amount !== undefined ? String(donation.amount) : '',
        currency: donation.currency || 'INR',
        inKindDescription: donation.inKindDescription || '',
        donationDate: donation.donationDate ? new Date(donation.donationDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        paymentMethod: donation.paymentMethod || 'cash',
        transactionReference: donation.transactionReference || '',
        category: donation.category || 'general',
        purpose: donation.purpose || '',
        programId: donation.programId?._id || donation.programId || '',
        notes: donation.notes || ''
      });
      setDonorSource(donation.donorId ? 'existing' : 'manual');
    } else {
      // Reset form
      setFormData({
        donorId: '',
        donorName: '',
        donorEmail: '',
        donorPhone: '',
        donationNumber: '',
        donationType: 'monetary',
        amount: '',
        currency: 'INR',
        inKindDescription: '',
        donationDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'upi',
        transactionReference: '',
        category: 'general',
        purpose: '',
        programId: '',
        notes: ''
      });
      setDonorSource('existing');
    }
    setError('');
  }, [isOpen, mode, donation]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDonorSelect = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setFormData((prev) => ({
        ...prev,
        donorId: '',
        donorName: '',
        donorEmail: '',
        donorPhone: ''
      }));
      return;
    }

    const selected = donorsList.find((d) => d._id === selectedId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        donorId: selected._id,
        donorName: selected.name,
        donorEmail: selected.email || '',
        donorPhone: selected.phone || ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Donation amount must be greater than zero.');
      return;
    }

    if (formData.donationType === 'in_kind' && !formData.inKindDescription.trim()) {
      setError('Please provide a description of the in-kind items or estimated assets.');
      return;
    }

    if (donorSource === 'existing' && !formData.donorId) {
      setError('Please select an existing donor, or switch to manual donor details.');
      return;
    }

    if (donorSource === 'manual' && !formData.donorName.trim()) {
      setError('Donor name is required.');
      return;
    }

    const payload = {
      ...formData,
      amount: Number(formData.amount),
      programId: formData.programId || null,
      donorId: donorSource === 'existing' && formData.donorId ? formData.donorId : null
    };

    if (donorSource === 'manual') {
      payload.donorSnapshot = {
        name: formData.donorName.trim(),
        email: formData.donorEmail.trim(),
        phone: formData.donorPhone.trim()
      };
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save donation record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HeartHandshake size={20} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {mode === 'create' ? 'Record New Donation' : `Edit Donation ${donation?.donationNumber}`}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                {mode === 'create'
                  ? 'Capture monetary contributions and in-kind donation receipts'
                  : 'Update record attributes and notes'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid #fecaca',
                color: 'var(--status-danger)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          {/* Financial Lock Banner */}
          {isApprovedOrReversed && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--status-warning-bg)',
                border: '1px solid #fde68a',
                color: 'var(--status-warning)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '16px'
              }}
            >
              <Lock size={18} flexShrink={0} style={{ marginTop: 2 }} />
              <div>
                <strong>Financial Lock Active:</strong> This donation is <strong>{donation.status}</strong>. In accordance with financial audit safeguards, the amount, currency, and payment details are locked. To adjust financial values, reverse this donation with an audit reason.
              </div>
            </div>
          )}

          {/* Section 1: Donor Identification */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12 }}>
              1. Donor Identification
            </h4>

            {mode === 'create' && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="donorSource"
                    value="existing"
                    checked={donorSource === 'existing'}
                    onChange={() => setDonorSource('existing')}
                  />
                  Select Existing Donor Profile
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="donorSource"
                    value="manual"
                    checked={donorSource === 'manual'}
                    onChange={() => setDonorSource('manual')}
                  />
                  Enter One-off / Anonymous Donor
                </label>
              </div>
            )}

            {donorSource === 'existing' ? (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Select Donor <span style={{ color: 'var(--status-danger)' }}>*</span>
                </label>
                <select
                  name="donorId"
                  value={formData.donorId}
                  onChange={handleDonorSelect}
                  disabled={isApprovedOrReversed}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">-- Choose a donor --</option>
                  {donorsList.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.donorNumber}) {d.email ? `- ${d.email}` : ''}
                    </option>
                  ))}
                </select>
                {loadingLookups && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading donors...</span>}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Donor Full Name <span style={{ color: 'var(--status-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="donorName"
                    value={formData.donorName}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Bajaj / Anonymous"
                    disabled={isApprovedOrReversed}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Donor Email
                  </label>
                  <input
                    type="email"
                    name="donorEmail"
                    value={formData.donorEmail}
                    onChange={handleChange}
                    placeholder="donor@example.com"
                    disabled={isApprovedOrReversed}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Donor Phone
                  </label>
                  <input
                    type="text"
                    name="donorPhone"
                    value={formData.donorPhone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    disabled={isApprovedOrReversed}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Financial & Contribution Details */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12 }}>
              2. Contribution Details
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Contribution Type
                </label>
                <select
                  name="donationType"
                  value={formData.donationType}
                  onChange={handleChange}
                  disabled={isApprovedOrReversed}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="monetary">Monetary (Cash / Digital / Cheque)</option>
                  <option value="in_kind">In-Kind (Goods / Laptops / Food)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Amount / Est. Value <span style={{ color: 'var(--status-danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={isApprovedOrReversed}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  disabled={isApprovedOrReversed}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Donation Date <span style={{ color: 'var(--status-danger)' }}>*</span>
                </label>
                <input
                  type="date"
                  name="donationDate"
                  value={formData.donationDate}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {formData.donationType === 'in_kind' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  In-Kind Description & Asset Details <span style={{ color: 'var(--status-danger)' }}>*</span>
                </label>
                <textarea
                  name="inKindDescription"
                  value={formData.inKindDescription}
                  onChange={handleChange}
                  placeholder="e.g. 20 Lenovo laptops with chargers, 50 school bags..."
                  rows={2}
                  disabled={isApprovedOrReversed}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Payment Method <span style={{ color: 'var(--status-danger)' }}>*</span>
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  disabled={isApprovedOrReversed}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="upi">UPI / QR Code</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="cheque">Cheque / Demand Draft</option>
                  <option value="online_card">Credit / Debit Card</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Transaction / Cheque Reference {formData.paymentMethod !== 'cash' && '(Required for audits)'}
                </label>
                <input
                  type="text"
                  name="transactionReference"
                  value={formData.transactionReference}
                  onChange={handleChange}
                  placeholder="e.g. UTR12345678, CHQ-00124"
                  disabled={isApprovedOrReversed}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {mode === 'create' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Custom Donation # (Auto-assigned if empty)
                  </label>
                  <input
                    type="text"
                    name="donationNumber"
                    value={formData.donationNumber}
                    onChange={handleChange}
                    placeholder="e.g. DON-2026-001"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Allocation, Category & Notes */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12 }}>
              3. Program Allocation & Notes
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Category <span style={{ color: 'var(--status-danger)' }}>*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="general">General NGO Fund</option>
                  <option value="education">Education & Scholarships</option>
                  <option value="healthcare">Healthcare & Medical Relief</option>
                  <option value="disaster_relief">Disaster Relief & Aid</option>
                  <option value="infrastructure">Infrastructure & Facility</option>
                  <option value="livelihood">Livelihood & Vocational</option>
                  <option value="other">Other Dedicated Purpose</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Link to Program (Optional)
                </label>
                <select
                  name="programId"
                  value={formData.programId}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">-- No specific program link --</option>
                  {programsList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Designated Purpose / Donor Request
              </label>
              <input
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="e.g. Annual sponsorship for girl child education"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Internal Audit Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any special handling, acknowledgment notes, or compliance comments..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)'
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Saving...' : mode === 'create' ? 'Record Donation' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

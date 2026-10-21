import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Building2,
  UploadCloud,
  Loader2,
  AlertCircle,
  FileCheck2,
  MapPin,
  Phone,
  Hash,
  Layers,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CreditCard
} from 'lucide-react';
import { pageTransition } from '../../animations';
import api from '../../services/api';
import {
  INDIAN_STATES,
  NGO_REGISTRATION_TYPES,
  isValidPan,
  isValidPincode,
  isValidIndianPhone,
  normalizeIndianPhone
} from '../../utils/format';

const Onboarding = () => {
  const pageRef = useRef(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    type: 'Education',
    registrationType: 'Registered Public Charitable Trust',
    registrationNumber: '',
    registrationYear: new Date().getFullYear().toString(),
    pan: '',
    registration12A: '',
    registration80G: '',
    fcraNumber: '',
    ngoDarpanId: '',
    csr1Number: '',
    gstin: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: 'Karnataka',
    pincode: '',
    country: 'India',
    contactPhone: ''
  });

  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/login');
    }
    pageTransition(pageRef.current);
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    // Only accept digits, max 10
    const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setFormData((p) => ({ ...p, contactPhone: digits }));
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 5) {
      setError('Maximum 5 documents allowed.');
      e.target.value = null;
    } else {
      setError('');
      setDocuments(e.target.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field Validations
    if (!formData.name.trim()) {
      return setError('Please enter the official organization name.');
    }
    if (!formData.registrationNumber.trim()) {
      return setError('Please enter your legal registration/trust deed number.');
    }
    if (!formData.pan.trim() || !isValidPan(formData.pan)) {
      return setError('Please enter a valid 10-character Indian Organization PAN (e.g. AABCT1234F).');
    }
    if (!formData.contactPhone || !isValidIndianPhone(formData.contactPhone)) {
      return setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
    }
    if (!formData.addressLine1.trim() || !formData.city.trim() || !formData.district.trim()) {
      return setError('Please provide complete registered address details (Line 1, City, and District).');
    }
    if (!formData.pincode.trim() || !isValidPincode(formData.pincode)) {
      return setError('Please enter a valid 6-digit Indian PIN Code.');
    }
    if (!documents || documents.length === 0) {
      return setError('Please upload at least one verification document (Registration Certificate, Trust Deed, PAN Card, or 12A/80G Order).');
    }

    const data = new FormData();
    // Normalize phone with +91
    const normalizedPhone = normalizeIndianPhone(formData.contactPhone);

    Object.keys(formData).forEach((key) => {
      if (key === 'contactPhone') {
        data.append('contactPhone', normalizedPhone);
      } else if (key === 'pan') {
        data.append('pan', formData.pan.toUpperCase().trim());
      } else {
        data.append(key, formData[key]);
      }
    });

    // Synthesize combined address for backward compatibility
    const combinedAddress = `${formData.addressLine1}${formData.addressLine2 ? ', ' + formData.addressLine2 : ''}, ${formData.city}, ${formData.district}, ${formData.state} - ${formData.pincode}, India`;
    data.append('address', combinedAddress);

    Array.from(documents).forEach((file) => data.append('documents', file));

    try {
      setLoading(true);
      const res = await api.post('/ngo/onboard', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        navigate('/pending-approval');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Onboarding submission failed. Please verify details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={pageRef}
      className="min-h-screen flex items-center justify-center bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 pt-28 relative overflow-hidden"
    >
      <Helmet>
        <title>Organization Onboarding &bull; NGOcore</title>
      </Helmet>

      {/* Decorative Background */}
      <div className="absolute top-20 right-1/3 w-[500px] h-[300px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-20 left-1/3 w-[450px] h-[300px] bg-teal-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none -z-10"></div>

      <div className="max-w-3xl w-full space-y-8 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-400 p-0.5 shadow-md shadow-indigo-500/20 mb-4 flex items-center justify-center">
            <div className="h-full w-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Building2 className="h-7 w-7 text-teal-400" />
            </div>
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
            <span>Step 2 of 2: India Statutory Profile & Verification</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Complete Organization Profile</h2>
          <p className="mt-2 text-sm text-slate-500">
            Submit your NGO's Indian statutory registrations (PAN, 12A/80G, Darpan ID) and documents for platform verification.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start space-x-3 text-rose-700 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* SECTION 1: LEGAL IDENTITY */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2 flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                1. Legal Organization & Statutory Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Official Organization Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    required
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Pratham Shiksha Foundation"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Registration Entity Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  name="registrationType"
                  value={formData.registrationType}
                  onChange={handleChange}
                  className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all cursor-pointer"
                >
                  {NGO_REGISTRATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Primary Focus / Sector <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all cursor-pointer"
                >
                  <option>Education</option>
                  <option>Healthcare</option>
                  <option>Nutrition & Food Security</option>
                  <option>Skill Training & Livelihood</option>
                  <option>Disaster Relief</option>
                  <option>Environment & Climate</option>
                  <option>Women Empowerment</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Legal Registration Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Hash className="h-4 w-4" />
                  </div>
                  <input
                    required
                    name="registrationNumber"
                    type="text"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="e.g. TRUST/2021/BLR/4921"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Year of Registration <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <input
                    required
                    name="registrationYear"
                    type="number"
                    min="1860"
                    max={new Date().getFullYear()}
                    value={formData.registrationYear}
                    onChange={handleChange}
                    placeholder="e.g. 2018"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Organization PAN <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <input
                    required
                    name="pan"
                    type="text"
                    maxLength={10}
                    value={formData.pan}
                    onChange={(e) => setFormData((p) => ({ ...p, pan: e.target.value.toUpperCase() }))}
                    placeholder="e.g. AABCT1234F"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-mono uppercase outline-none text-slate-900 transition-all"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">5 uppercase letters, 4 digits, 1 letter</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  12A Registration Order Number
                </label>
                <input
                  name="registration12A"
                  type="text"
                  value={formData.registration12A}
                  onChange={handleChange}
                  placeholder="e.g. AAETA1234FE20214"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  80G Registration Order Number
                </label>
                <input
                  name="registration80G"
                  type="text"
                  value={formData.registration80G}
                  onChange={handleChange}
                  placeholder="e.g. AAETA1234FE20215"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  NGO Darpan Unique ID (NITI Aayog)
                </label>
                <input
                  name="ngoDarpanId"
                  type="text"
                  value={formData.ngoDarpanId}
                  onChange={handleChange}
                  placeholder="e.g. KA/2021/0284918"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  CSR-1 Number (MCA)
                </label>
                <input
                  name="csr1Number"
                  type="text"
                  value={formData.csr1Number}
                  onChange={handleChange}
                  placeholder="e.g. CSR00018492"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  FCRA Registration (If applicable)
                </label>
                <input
                  name="fcraNumber"
                  type="text"
                  value={formData.fcraNumber}
                  onChange={handleChange}
                  placeholder="e.g. 094421234"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  GSTIN (Optional)
                </label>
                <input
                  name="gstin"
                  type="text"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => setFormData((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 29AABCT1234F1Z5"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-mono uppercase outline-none text-slate-900 transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: INDIAN REGISTERED ADDRESS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="border-b border-slate-100 pb-2 flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                2. Registered Office Address (India)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Address Line 1 <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  name="addressLine1"
                  type="text"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="Building No, Flat/Door, Street Name"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Address Line 2 (Area / Locality)
                </label>
                <input
                  name="addressLine2"
                  type="text"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Area, Landmark, Post Office"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  City / Town <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Bengaluru"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  District <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  name="district"
                  type="text"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="e.g. Bengaluru Urban"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  State / Union Territory <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="block w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all cursor-pointer"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  PIN Code <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  name="pincode"
                  type="text"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="e.g. 560001"
                  className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Official Contact Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex rounded-xl shadow-xs">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-700 text-sm font-bold select-none">
                    🇮🇳 +91
                  </span>
                  <input
                    required
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={handlePhoneChange}
                    placeholder="98765 43210"
                    maxLength={10}
                    className="block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-r-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">10-digit Indian mobile number for administrative verification</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: DOCUMENT UPLOAD */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="border-b border-slate-100 pb-2 flex items-center space-x-2">
              <FileCheck2 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                3. Verification Documents Upload <span className="text-rose-500">*</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Attach self-attested copies of your <strong>Registration Certificate, PAN Card, 12A/80G orders, FCRA certificate (if applicable), and Address Proof</strong>.
            </p>

            <div className="mt-1 flex justify-center px-6 pt-6 pb-6 border-2 border-slate-300 border-dashed rounded-2xl hover:border-indigo-500 transition-colors bg-slate-50/60 group">
              <div className="space-y-2 text-center">
                <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-indigo-600 group-hover:scale-105 transition-transform shadow-xs">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div className="flex text-sm text-slate-600 justify-center items-center">
                  <label className="relative cursor-pointer rounded-md font-bold text-indigo-600 hover:text-indigo-700">
                    <span>Click to upload verification files</span>
                    <input
                      name="documents"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-400">PDF, PNG, JPG up to 5MB each (Max 5 files)</p>
                {documents && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold mt-2">
                    <FileCheck2 className="h-3.5 w-3.5" />
                    <span>{documents.length} document(s) attached</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all hover:shadow-indigo-500/30 hover:-translate-y-0.5 cursor-pointer mt-6"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Submit for Platform Verification'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;

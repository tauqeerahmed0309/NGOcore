import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { pageTransition } from '../../animations';
import ngoService from '../../services/ngoService';
import {
  INDIAN_STATES,
  NGO_REGISTRATION_TYPES,
  isValidPan,
  isValidPincode,
  normalizeIndianPhone
} from '../../utils/format';
import {
  Building,
  ShieldCheck,
  Settings,
  Globe,
  Mail,
  Phone,
  MapPin,
  FileCheck2,
  Users,
  KeyRound,
  Lock,
  Save,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  Shield,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  ChevronRight,
  Database,
  Bell,
  ToggleLeft,
  ToggleRight,
  Hash,
  CreditCard,
  Calendar
} from 'lucide-react';

export default function NgoSettings() {
  const pageRef = useRef(null);
  const logoInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'regional' | 'security' | 'hub'
  const [ngo, setNgo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    type: '',
    registrationType: 'Registered Public Charitable Trust',
    registrationNumber: '',
    registrationYear: '',
    pan: '',
    registration12A: '',
    registration80G: '',
    fcraNumber: '',
    ngoDarpanId: '',
    csr1Number: '',
    gstin: '',
    address: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: 'Karnataka',
    pincode: '',
    country: 'India',
    contactPhone: '',
    website: '',
    description: '',
    logoUrl: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    retentionDays: 1825,
    require2FA: false,
    sessionTimeoutMinutes: 120,
    emailNotifications: {
      notifyOnNewMember: true,
      notifyOnRecordExport: true,
      notifyOnSecurityAlert: true
    }
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (pageRef.current) {
      pageTransition(pageRef.current);
    }
    fetchNgoData();
  }, []);

  const fetchNgoData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ngoService.getProfile();
      setNgo(data);

      setProfileForm({
        name: data.name || '',
        type: data.type || '',
        registrationType: data.registrationType || 'Registered Public Charitable Trust',
        registrationNumber: data.registrationNumber || '',
        registrationYear: data.registrationYear ? String(data.registrationYear) : '',
        pan: data.pan || '',
        registration12A: data.registration12A || '',
        registration80G: data.registration80G || '',
        fcraNumber: data.fcraNumber || '',
        ngoDarpanId: data.ngoDarpanId || '',
        csr1Number: data.csr1Number || '',
        gstin: data.gstin || '',
        address: data.address || '',
        addressLine1: data.addressLine1 || '',
        addressLine2: data.addressLine2 || '',
        city: data.city || '',
        district: data.district || '',
        state: data.state || 'Karnataka',
        pincode: data.pincode || '',
        country: data.country || 'India',
        contactPhone: data.contactPhone || '',
        website: data.website || '',
        description: data.description || '',
        logoUrl: data.logoUrl || ''
      });
      setLogoPreview(data.logoUrl || '');

      if (data.settings) {
        setSettingsForm({
          currency: data.settings.currency || 'INR',
          timezone: data.settings.timezone || 'Asia/Kolkata',
          dateFormat: data.settings.dateFormat || 'DD/MM/YYYY',
          retentionDays: data.settings.retentionDays || 1825,
          require2FA: !!data.settings.require2FA,
          sessionTimeoutMinutes: data.settings.sessionTimeoutMinutes || 120,
          emailNotifications: {
            notifyOnNewMember: data.settings.emailNotifications?.notifyOnNewMember ?? true,
            notifyOnRecordExport: data.settings.emailNotifications?.notifyOnRecordExport ?? true,
            notifyOnSecurityAlert: data.settings.emailNotifications?.notifyOnSecurityAlert ?? true
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load organization profile and settings.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file size must be less than 5MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setError(null);

      let payload;
      if (logoFile) {
        payload = new FormData();
        Object.entries(profileForm).forEach(([key, val]) => {
          if (val !== undefined && val !== null) payload.append(key, val);
        });
        payload.append('logo', logoFile);
      } else {
        payload = profileForm;
      }

      const updated = await ngoService.updateProfile(payload);
      setNgo(updated);
      showNotification('Organization profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update organization profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setError(null);

      const updatedSettings = await ngoService.updateSettings(settingsForm);
      setNgo(prev => ({ ...prev, settings: updatedSettings }));
      showNotification('Organization settings and policies updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update organization settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 max-w-6xl mx-auto flex flex-col items-center justify-center">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Loading organization profile & settings...</p>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Global Feedback Banners */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3 shadow-sm animate-fade-in">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start space-x-3 shadow-sm animate-fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hero Organization Identity Card */}
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-10 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Logo with Trigger */}
            <div className="relative group">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden ring-4 ring-indigo-500/30 shadow-2xl bg-slate-800 flex items-center justify-center p-2">
                {logoPreview ? (
                  <img src={logoPreview} alt={ngo?.name} className="h-full w-full object-contain" />
                ) : (
                  <Building className="h-12 w-12 text-indigo-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  logoInputRef.current?.click();
                }}
                className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg border-2 border-slate-900 transition-all hover:scale-110"
                title="Change Logo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* NGO Legal Identity */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {ngo?.name}
                </h1>
                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>VERIFIED TENANT VAULT</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <FileCheck2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Reg: <strong>{ngo?.registrationNumber || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <Mail className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{ngo?.contactEmail}</span>
                </div>
                {ngo?.contactPhone && (
                  <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    <Phone className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{ngo.contactPhone}</span>
                  </div>
                )}
              </div>

              {/* Organization Telemetry Pills */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-200">
                  <Users className="h-3.5 w-3.5 text-indigo-300" />
                  <span>Staff Roster: <strong>{ngo?.stats?.staffCount ?? 0} Active</strong></span>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-600/30 border border-teal-500/40 text-teal-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-300" />
                  <span>Custom Roles: <strong>{ngo?.stats?.rolesCount ?? 0} Defined</strong></span>
                </div>
                {(ngo?.stats?.pendingInvitationsCount || 0) > 0 && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200">
                    <Clock className="h-3.5 w-3.5 text-amber-300" />
                    <span>Pending Invites: <strong>{ngo.stats.pendingInvitationsCount}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex md:flex-col items-center gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-md hover:shadow transition-all"
              >
                Edit Info
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all flex items-center space-x-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Security</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Organization Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('regional')}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'regional'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>Tenant & Regional</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Governance & Security</span>
          </button>

          <button
            onClick={() => setActiveTab('hub')}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'hub'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Team & Access Hub</span>
          </button>
        </div>

        {/* TAB 1: ORGANIZATION PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-4xl mx-auto animate-fade-in space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900">Organization Information</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage your legal registration details, official contact numbers, office location, and brand logo.
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Logo Selection Row */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-center gap-5">
                <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-800 ring-2 ring-indigo-500/30 flex items-center justify-center flex-shrink-0 p-2">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <Building className="h-8 w-8 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-700 block">Organization Logo</span>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, or SVG logo (max 5MB). Displayed on public exports and donor grant audit reports.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoChange}
                      accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Upload New Logo</span>
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview('');
                          setProfileForm(prev => ({ ...prev, logoUrl: '' }));
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid: Name & Registration Entity Type */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Legal Organization Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Asha Hope Foundation"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registration Entity Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={profileForm.registrationType}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, registrationType: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none bg-white"
                  >
                    {NGO_REGISTRATION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid: Registration Number, Year & PAN */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={profileForm.registrationNumber}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, registrationNumber: e.target.value }))}
                    placeholder="e.g. TRUST/IND/2024/8849"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registration Year
                  </label>
                  <input
                    type="number"
                    min="1860"
                    max={new Date().getFullYear()}
                    value={profileForm.registrationYear}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, registrationYear: e.target.value }))}
                    placeholder="e.g. 2018"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Organization PAN
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={profileForm.pan}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                    placeholder="e.g. AABTA4582K"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-mono uppercase text-slate-900 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Grid: 12A, 80G, NGO Darpan & CSR-1 */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    12A Registration Order Number
                  </label>
                  <input
                    type="text"
                    value={profileForm.registration12A}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, registration12A: e.target.value }))}
                    placeholder="e.g. AAETA1234FE20214"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    80G Certificate Number
                  </label>
                  <input
                    type="text"
                    value={profileForm.registration80G}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, registration80G: e.target.value }))}
                    placeholder="e.g. AAETA1234FE20215"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    NGO Darpan Unique ID (NITI Aayog)
                  </label>
                  <input
                    type="text"
                    value={profileForm.ngoDarpanId}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, ngoDarpanId: e.target.value }))}
                    placeholder="e.g. MP/2021/0284918"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    CSR-1 Registration Number (MCA)
                  </label>
                  <input
                    type="text"
                    value={profileForm.csr1Number}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, csr1Number: e.target.value }))}
                    placeholder="e.g. CSR00018492"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    FCRA Registration (Foreign Contributions)
                  </label>
                  <input
                    type="text"
                    value={profileForm.fcraNumber}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, fcraNumber: e.target.value }))}
                    placeholder="e.g. 094421234"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={profileForm.gstin}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                    placeholder="e.g. 23AABTA4582K1Z5"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-mono uppercase text-slate-900 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Grid: Phone & Website */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={profileForm.contactPhone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="+91 98260 12345"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="url"
                      value={profileForm.website}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://www.yourorganization.org"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Registered Indian Address Fields */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Registered Indian Address
                </span>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={profileForm.addressLine1}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                      placeholder="Address Line 1: Building / Street / Door No."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City / Town (e.g. Indore, Pune)"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={profileForm.district}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="District"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <select
                      value={profileForm.state}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none bg-white"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={profileForm.pincode}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, pincode: e.target.value }))}
                      placeholder="6-digit PIN Code (e.g. 452001)"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Mission Statement */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mission Statement & Humanitarian Objectives
                </label>
                <textarea
                  rows={3}
                  value={profileForm.description}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Summarize your NGO's core mission, focus areas, and primary beneficiary communities..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none resize-none"
                />
              </div>

              {/* Primary Contact Email (Read-Only) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Primary Contact & Tenant Email</span>
                  <span>{ngo?.contactEmail}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Locked to Tenant Identity</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Organization Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: TENANT & REGIONAL SETTINGS */}
        {activeTab === 'regional' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-4xl mx-auto animate-fade-in space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900">Tenant & Regional Settings</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Configure primary operational currency, date formatting, and regional timezone applied to reports and dashboards.
              </p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-5">
                {/* Currency */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Operating Currency
                  </label>
                  <select
                    value={settingsForm.currency}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none bg-white"
                  >
                    <option value="INR">₹ INR (Indian Rupee - Official Standard)</option>
                    <option value="EUR">€ EUR (Euro - Foreign FCRA Grants)</option>
                    <option value="GBP">£ GBP (British Pound - Foreign FCRA Grants)</option>
                    <option value="USD">USD (US Dollar - Foreign FCRA Grants)</option>
                  </select>
                  <span className="text-[11px] text-slate-500 block mt-1">Default for donation & aid records</span>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Timezone
                  </label>
                  <select
                    value={settingsForm.timezone}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none bg-white"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30)</option>
                    <option value="UTC">UTC (Universal Time)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST, UTC+04:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+08:00)</option>
                  </select>
                  <span className="text-[11px] text-slate-500 block mt-1">Applied to blockchain timestamps</span>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date Format
                  </label>
                  <select
                    value={settingsForm.dateFormat}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, dateFormat: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none bg-white"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard, e.g. 21/10/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard, e.g. 2026-10-21)</option>
                  </select>
                  <span className="text-[11px] text-slate-500 block mt-1">Applied to reports and tables</span>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {savingSettings ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Updating Settings...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Regional Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: GOVERNANCE & SECURITY */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-4xl mx-auto animate-fade-in space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900">Governance & Security Policies</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Organization-wide security mandates, session expiry rules, and DPDP compliance retention policies.
              </p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              {/* Policy 1: DPDP Data Retention Period */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      DPDP Data Retention & Minimization Policy
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Specifies the maximum retention duration for beneficiary and attendance records before archiving.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700">
                    {Math.round(settingsForm.retentionDays / 365)} Years ({settingsForm.retentionDays} Days)
                  </span>
                </div>

                <div className="pt-2">
                  <select
                    value={settingsForm.retentionDays}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, retentionDays: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none bg-white"
                  >
                    <option value={365}>1 Year (365 days) - Minimal</option>
                    <option value={1095}>3 Years (1,095 days) - Standard NGO Grant</option>
                    <option value={1825}>5 Years (1,825 days) - Recommended (DPDP)</option>
                    <option value={2555}>7 Years (2,555 days) - Extended Grant Audit</option>
                    <option value={3650}>10 Years (3,650 days) - Permanent Trust Archive</option>
                  </select>
                </div>
              </div>

              {/* Policy 2: Enforce 2FA Mandate */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Mandate Two-Factor Authentication (2FA)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 max-w-lg">
                    When enabled, all case workers, coordinators, and administrators must verify an email OTP upon each login.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSettingsForm(prev => ({ ...prev, require2FA: !prev.require2FA }))}
                  className="text-2xl transition-transform hover:scale-105"
                >
                  {settingsForm.require2FA ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold">
                      Enforced
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-xs font-bold">
                      Optional
                    </span>
                  )}
                </button>
              </div>

              {/* Policy 3: Maximum Idle Session Timeout */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Maximum Idle Session Timeout
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Automatically invalidates sessions if a device remains inactive.
                    </p>
                  </div>
                </div>

                <select
                  value={settingsForm.sessionTimeoutMinutes}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, sessionTimeoutMinutes: Number(e.target.value) }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none bg-white"
                >
                  <option value={30}>30 Minutes - High Security</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                  <option value={120}>120 Minutes (2 Hours) - Recommended</option>
                  <option value={240}>240 Minutes (4 Hours)</option>
                  <option value={480}>480 Minutes (8 Hours / Full Workday)</option>
                </select>
              </div>

              {/* Policy 4: Security Notifications & Alerts */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900">Automated Email Security Notifications</h4>
                </div>

                <div className="space-y-2.5 pt-1 text-xs">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.emailNotifications.notifyOnNewMember}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        emailNotifications: { ...prev.emailNotifications, notifyOnNewMember: e.target.checked }
                      }))}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-slate-700 font-medium">Send alert when a new team member joins or accepts invitation</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.emailNotifications.notifyOnRecordExport}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        emailNotifications: { ...prev.emailNotifications, notifyOnRecordExport: e.target.checked }
                      }))}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-slate-700 font-medium">Send notification when bulk beneficiary records or CSV exports are requested</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.emailNotifications.notifyOnSecurityAlert}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        emailNotifications: { ...prev.emailNotifications, notifyOnSecurityAlert: e.target.checked }
                      }))}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-slate-700 font-medium">Alert on suspicious login attempts or multi-device revocations</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {savingSettings ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving Governance Policies...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Apply Security Policies</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: TEAM & ACCESS HUB */}
        {activeTab === 'hub' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Governance & Access Management Hub</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Central control point to manage organization users, grant granular permissions, and inspect immutable audit logs.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Card 1: Users & Invitations */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 w-fit">
                    <Users className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Staff Roster & Invitations</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Invite case workers, social workers, and program coordinators. Review active sessions and activate or suspend accounts.
                  </p>
                  <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 font-semibold flex items-center justify-between">
                    <span>Active Team:</span>
                    <strong className="text-indigo-600">{ngo?.stats?.staffCount ?? 0} Members</strong>
                  </div>
                </div>

                <Link
                  to="/users"
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Manage Staff Roster</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Card 2: Custom Roles */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:border-teal-300 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 w-fit">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Custom Roles & RBAC</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Design custom non-profit roles with tailored access: restrict sensitive financial fields, limit export capabilities, and enforce least privilege.
                  </p>
                  <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 font-semibold flex items-center justify-between">
                    <span>Configured Roles:</span>
                    <strong className="text-teal-600">{ngo?.stats?.rolesCount ?? 0} Roles</strong>
                  </div>
                </div>

                <Link
                  to="/roles"
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Configure Custom Roles</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Card 3: Audit Trail */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-slate-100 text-slate-800 w-fit">
                    <FileCheck2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Audit Trail & Compliance</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Review append-only compliance logs for logins, role updates, record exports, and document changes with tamper-evident cryptographic chaining.
                  </p>
                  <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 font-semibold flex items-center justify-between">
                    <span>Auditing Engine:</span>
                    <strong className="text-emerald-600">Append-Only Active</strong>
                  </div>
                </div>

                <Link
                  to="/audit"
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Inspect Audit Logs</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

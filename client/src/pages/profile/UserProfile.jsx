import React, { useState, useEffect, useRef } from 'react';
import { pageTransition } from '../../animations';
import userService from '../../services/userService';
import {
  User,
  Shield,
  ShieldCheck,
  KeyRound,
  Laptop,
  Smartphone,
  Globe,
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
  Building,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  X,
  FileCheck2,
  Database,
  Users as UsersIcon,
  Layers,
  FileText
} from 'lucide-react';

const PERMISSIONS_METADATA = [
  {
    category: 'Record Management Engine',
    icon: Database,
    items: [
      { key: 'records:read', label: 'View Records', desc: 'Query and view beneficiary, student, and NGO records' },
      { key: 'records:create', label: 'Create Records', desc: 'Create new records and input beneficiary details' },
      { key: 'records:update', label: 'Update Records', desc: 'Edit and modify existing organization records' },
      { key: 'records:delete', label: 'Delete Records', desc: 'Safely remove or archive records' },
      { key: 'records:export', label: 'Export Records', desc: 'Download CSV, Excel, and PDF record exports' },
    ]
  },
  {
    category: 'Cloud File Vault',
    icon: FileCheck2,
    items: [
      { key: 'files:read', label: 'Access Documents', desc: 'View and download uploaded certificates and receipts' },
      { key: 'files:upload', label: 'Upload Files', desc: 'Upload verification documents, receipts, and photos' },
      { key: 'files:delete', label: 'Delete Files', desc: 'Remove obsolete documents from the cloud vault' },
    ]
  },
  {
    category: 'Staff & Team Access',
    icon: UsersIcon,
    items: [
      { key: 'users:read', label: 'View Staff Roster', desc: 'Inspect team members, designations, and account status' },
      { key: 'users:invite', label: 'Send Invitations', desc: 'Invite new staff and case workers to the NGO' },
      { key: 'users:update', label: 'Manage Staff Status', desc: 'Activate, deactivate, or change roles of staff' },
    ]
  },
  {
    category: 'Governance & Security',
    icon: Shield,
    items: [
      { key: 'roles:manage', label: 'Custom Roles & RBAC', desc: 'Create, modify, and assign custom organization roles' },
      { key: 'audit:read', label: 'Audit Trail Logs', desc: 'Inspect immutable append-only compliance logs' },
      { key: 'reports:generate', label: 'Generate Reports', desc: 'Produce official donor grant and audit summaries' },
    ]
  }
];

export default function UserProfile() {
  const pageRef = useRef(null);
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'edit' | 'roles_permissions' | 'security'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Edit Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    designation: '',
    avatarUrl: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Change Password Form State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  // Active Sessions State
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    if (pageRef.current) {
      pageTransition(pageRef.current);
    }
    fetchProfile();
    fetchSessions();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getProfile();
      setProfile(data);
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        designation: data.designation || '',
        avatarUrl: data.avatarUrl || ''
      });
      setAvatarPreview(data.avatarUrl || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await userService.getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Avatar file size must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdatingProfile(true);
      setError(null);

      let payload;
      if (avatarFile) {
        payload = new FormData();
        payload.append('name', formData.name);
        payload.append('phone', formData.phone);
        payload.append('designation', formData.designation);
        payload.append('avatar', avatarFile);
      } else {
        payload = {
          name: formData.name,
          phone: formData.phone,
          designation: formData.designation,
          avatarUrl: formData.avatarUrl
        };
      }

      const updated = await userService.updateProfile(payload);
      setProfile(updated);
      showNotification('Profile updated successfully!');
      setActiveTab('overview');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      setChangingPass(true);
      setError(null);
      const res = await userService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });

      showNotification(res.message || 'Password changed successfully! All other sessions terminated.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      setRevokingSessionId(sessionId);
      await userService.revokeSession(sessionId);
      showNotification('Device session revoked successfully.');
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke session.');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!window.confirm('Are you sure you want to log out of all other devices? This action cannot be undone.')) {
      return;
    }

    try {
      setRevokingAll(true);
      const res = await userService.revokeAllOtherSessions();
      showNotification(res.message || 'All other device sessions have been terminated.');
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke all other sessions.');
    } finally {
      setRevokingAll(false);
    }
  };

  // Password Strength Calculation
  const passCriteria = {
    length: passwords.newPassword.length >= 8,
    upper: /[A-Z]/.test(passwords.newPassword),
    number: /[0-9]/.test(passwords.newPassword),
    special: /[^A-Za-z0-9]/.test(passwords.newPassword)
  };
  const strengthScore = Object.values(passCriteria).filter(Boolean).length;

  const permissionsList = profile?.roleId?.permissions || [];
  const isSuperAdminRole = permissionsList.includes('*');

  const hasPermission = (permKey) => {
    if (isSuperAdminRole) return true;
    return permissionsList.includes(permKey);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 max-w-6xl mx-auto flex flex-col items-center justify-center">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Loading your profile & security credentials...</p>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Global Notifications */}
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

        {/* Hero Profile Header Card */}
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* User Avatar with Edit Trigger */}
            <div className="relative group">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden ring-4 ring-indigo-500/30 shadow-2xl bg-slate-800 flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={profile?.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-extrabold text-indigo-300">
                    {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'US'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('edit');
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg border-2 border-slate-900 transition-all hover:scale-110"
                title="Change Avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Identity Details */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {profile?.name}
                </h1>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{profile?.status ? profile.status.toUpperCase() : 'ACTIVE'}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-slate-300">
                {profile?.designation && (
                  <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{profile.designation}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <Mail className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{profile?.email}</span>
                </div>
                {profile?.phone && (
                  <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    <Phone className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>

              {/* Organization & Role Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-200">
                  <Building className="h-3.5 w-3.5 text-indigo-300" />
                  <span className="font-semibold">{profile?.ngoId?.name || 'Assigned Organization'}</span>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-600/30 border border-teal-500/40 text-teal-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-300" />
                  <span>Role: <strong>{profile?.roleId?.name || 'NGO Member'}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Stats / Action Pill */}
            <div className="flex md:flex-col items-center gap-2">
              <button
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-md hover:shadow transition-all"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all flex items-center space-x-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Security</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Profile Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'edit'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('roles_permissions')}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'roles_permissions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Assigned Role & Permissions</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center space-x-2 ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Security & Sessions</span>
            {sessions.length > 0 && (
              <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${
                activeTab === 'security' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {sessions.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: PROFILE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
            {/* Personal Details Column */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2.5">
                    <User className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
                  >
                    Edit Information
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Full Legal Name</span>
                    <span className="font-bold text-slate-800">{profile?.name || 'Not provided'}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Email Address</span>
                    <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                      <span>{profile?.email}</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Official Designation</span>
                    <span className="font-bold text-slate-800">{profile?.designation || 'Staff Member'}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Contact Phone</span>
                    <span className="font-bold text-slate-800">{profile?.phone || 'No phone added'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <span className="text-slate-600">
                      Member Account Created: <strong>{new Date(profile?.createdAt).toLocaleDateString()}</strong>
                    </span>
                  </div>
                  <span className="text-indigo-700 font-semibold">Strict Multi-Tenant Scoped</span>
                </div>
              </div>

              {/* Organization Affiliation Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-4">
                  <Building className="h-5 w-5 text-teal-600" />
                  <h3 className="text-lg font-bold text-slate-900">Organization Details</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Organization Name</span>
                    <span className="font-bold text-slate-800">{profile?.ngoId?.name || 'NGO'}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Registration / Deed Number</span>
                    <span className="font-bold text-slate-800">{profile?.ngoId?.registrationNumber || 'REG-PENDING'}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Legal Entity Type</span>
                    <span className="font-bold text-slate-800">{profile?.ngoId?.type || 'Trust / Society'}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Compliance Status</span>
                    <span className="inline-flex items-center space-x-1 font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>{profile?.ngoId?.status?.toUpperCase() || 'APPROVED'}</span>
                    </span>
                  </div>
                </div>

                {profile?.ngoId?.address && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium block mb-1">Registered Address</span>
                    <p className="font-medium text-slate-700">{profile.ngoId.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Role & Security Snapshot */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                  <h4 className="font-bold text-slate-900 text-base">Your Access Level</h4>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-teal-50/50 border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-900 text-base">
                      {profile?.roleId?.name || 'NGO Staff'}
                    </span>
                    {profile?.roleId?.isSystem && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-200 text-indigo-800">
                        System Role
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {profile?.roleId?.description || 'Standard non-profit staff member access with tenant isolation.'}
                  </p>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Assigned Permissions:</span>
                    <strong className="text-indigo-600">
                      {isSuperAdminRole ? 'Full Access (*)' : `${permissionsList.length} Grants`}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Audit Anchoring:</span>
                    <strong className="text-emerald-600">SHA-256 Enabled</strong>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('roles_permissions')}
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  View Granular Permissions
                </button>
              </div>

              {/* Active Sessions Mini Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
                    <Laptop className="h-5 w-5 text-indigo-600" />
                    <span>Logged In Devices</span>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700">
                    {sessions.length} Active
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Protect your account by regularly auditing logged-in browsers and revoking unfamiliar devices.
                </p>

                <button
                  onClick={() => setActiveTab('security')}
                  className="w-full py-2.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Manage Active Sessions</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EDIT PROFILE */}
        {activeTab === 'edit' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-3xl mx-auto animate-fade-in space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-900">Edit Profile Information</h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Update your personal contact details, organizational designation, and public avatar.
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Avatar Selector Section */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-center gap-5">
                <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-800 ring-2 ring-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-700 block">Profile Avatar</span>
                  <p className="text-xs text-slate-500">
                    Upload a square image (JPG, PNG max 5MB) or specify an image URL below.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFileChange}
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Upload Photo</span>
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview('');
                          setFormData(prev => ({ ...prev, avatarUrl: '' }));
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Avatar URL input (alternative option) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Or Image Web URL
                </label>
                <input
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, avatarUrl: e.target.value }));
                    if (!avatarFile) setAvatarPreview(e.target.value);
                  }}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                />
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Designation Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Designation / Role Title
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g. Executive Director, Field Coordinator"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Readonly Email Info */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Registered Email</span>
                  <span>{profile?.email}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Cannot be modified</span>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {updatingProfile ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: ASSIGNED ROLE & PERMISSIONS */}
        {activeTab === 'roles_permissions' && (
          <div className="space-y-6 animate-fade-in">
            {/* Role Header Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {profile?.roleId?.name || 'NGO Member'}
                  </h3>
                  {profile?.roleId?.isSystem && (
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      System Role
                    </span>
                  )}
                  {isSuperAdminRole && (
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center space-x-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Superadmin (*)</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {profile?.roleId?.description || 'Assigned role governing what actions you may perform in this organization vault.'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 md:text-right">
                <span className="block text-slate-400">Total Granted Capabilities:</span>
                <span className="font-extrabold text-indigo-700 text-sm">
                  {isSuperAdminRole ? 'All Operations Allowed (*)' : `${permissionsList.length} Active Permissions`}
                </span>
              </div>
            </div>

            {/* Categorized Permissions Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {PERMISSIONS_METADATA.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">{cat.category}</h4>
                    </div>

                    <div className="space-y-3">
                      {cat.items.map((perm) => {
                        const granted = hasPermission(perm.key);
                        return (
                          <div
                            key={perm.key}
                            className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                              granted
                                ? 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200'
                                : 'bg-slate-50/50 border-slate-100 opacity-60'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-sm text-slate-900">{perm.label}</span>
                                <code className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
                                  {perm.key}
                                </code>
                              </div>
                              <p className="text-xs text-slate-500 leading-snug">{perm.desc}</p>
                            </div>

                            <span
                              className={`flex-shrink-0 inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                granted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200/70 text-slate-600'
                              }`}
                            >
                              {granted ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Granted</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3" />
                                  <span>Locked</span>
                                </>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY & ACTIVE SESSIONS */}
        {activeTab === 'security' && (
          <div className="space-y-8 animate-fade-in">

            {/* Change Password Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-3xl space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2.5">
                  <KeyRound className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-xl font-extrabold text-slate-900">Change Password</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Secure your account using a high-entropy password. Updating your password invalidates all other active login sessions.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter your current password"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new strong password"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {passwords.newPassword && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Password Strength:</span>
                        <span className={`font-bold ${
                          strengthScore === 4 ? 'text-emerald-600' : strengthScore >= 2 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {strengthScore === 4 ? 'Strong' : strengthScore >= 2 ? 'Moderate' : 'Weak'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-300 ${
                            strengthScore === 4 ? 'bg-emerald-500 w-full' : strengthScore >= 2 ? 'bg-amber-500 w-1/2' : 'bg-rose-500 w-1/4'
                          }`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                        <span className={passCriteria.length ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                          ✓ 8+ characters
                        </span>
                        <span className={passCriteria.upper ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                          ✓ Uppercase letter
                        </span>
                        <span className={passCriteria.number ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                          ✓ Numeric digit
                        </span>
                        <span className={passCriteria.special ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                          ✓ Special character
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your new password"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm text-slate-900 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changingPass || strengthScore < 3}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {changingPass ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Active Sessions Management Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <Laptop className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-xl font-extrabold text-slate-900">Active Multi-Device Sessions</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage and inspect every active login session associated with your account across all platforms.
                  </p>
                </div>

                {sessions.length > 1 && (
                  <button
                    onClick={handleRevokeAllOtherSessions}
                    disabled={revokingAll}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center space-x-1.5 self-start sm:self-auto disabled:opacity-50"
                  >
                    {revokingAll ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" />
                    )}
                    <span>Revoke All Other Sessions</span>
                  </button>
                )}
              </div>

              {loadingSessions ? (
                <div className="py-8 text-center text-sm text-slate-500 flex items-center justify-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>Loading device sessions...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl">
                  No other active sessions detected.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((sess) => {
                    const isMobile = /mobile|iphone|android|ipad/i.test(sess.deviceInfo);
                    const DeviceIcon = isMobile ? Smartphone : Laptop;

                    return (
                      <div
                        key={sess._id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          sess.isCurrent
                            ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3.5">
                          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                            sess.isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <DeviceIcon className="h-5 w-5" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-slate-900">
                                {sess.deviceInfo || 'Web Browser'}
                              </span>
                              {sess.isCurrent && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Current Device</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center space-x-1">
                                <Globe className="h-3 w-3 text-slate-400" />
                                <span>IP: <strong>{sess.ip || 'Unknown IP'}</strong></span>
                              </span>
                              <span>•</span>
                              <span>Signed In: <strong>{new Date(sess.createdAt).toLocaleString()}</strong></span>
                            </div>
                          </div>
                        </div>

                        {!sess.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(sess._id)}
                            disabled={revokingSessionId === sess._id}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors flex items-center space-x-1.5 self-end sm:self-auto disabled:opacity-50"
                          >
                            {revokingSessionId === sess._id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <LogOut className="h-3 w-3" />
                            )}
                            <span>Revoke Access</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

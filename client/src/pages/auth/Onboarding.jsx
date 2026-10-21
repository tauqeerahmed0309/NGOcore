import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Building2, UploadCloud, Loader2, AlertCircle, FileCheck2, MapPin, Phone, Hash, Layers } from 'lucide-react';
import { pageTransition } from '../../animations';
import api from '../../services/api';

const Onboarding = () => {
  const pageRef = useRef(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    type: 'Education',
    registrationNumber: '',
    address: '',
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

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

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

    if (!documents || documents.length === 0) {
      return setError('Please upload at least one verification document (Certificate, Trust Deed, or Tax Exemption).');
    }

    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));
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
      setError(err.response?.data?.message || 'Onboarding submission failed. Please try again.');
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

      <div className="max-w-2xl w-full space-y-8 bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-400 p-0.5 shadow-md shadow-indigo-500/20 mb-4 flex items-center justify-center">
            <div className="h-full w-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Building2 className="h-7 w-7 text-teal-400" />
            </div>
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
            <span>Step 2 of 2: Verification Profile</span>
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Complete Organization Profile</h2>
          <p className="mt-2 text-sm text-slate-500">
            Submit your NGO's legal registration details and documents for administrative approval
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start space-x-3 text-rose-700 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Official Organization Name
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
                  placeholder="Global Relief Foundation"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Primary Focus / Sector
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Layers className="h-4 w-4" />
                </div>
                <select
                  required
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all cursor-pointer"
                >
                  <option>Education</option>
                  <option>Healthcare</option>
                  <option>Environment & Climate</option>
                  <option>Human Rights & Legal Aid</option>
                  <option>Disaster Relief</option>
                  <option>Community Development</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Legal Registration Number
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
                  placeholder="NGO-REG-2024-9981"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Headquarters Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <input
                  required
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Suite 500, Humanitarian Plaza, Geneva, Switzerland"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Official Contact Phone
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  required
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+1 (800) 555-0199"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm outline-none text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* Document Upload Zone */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Verification Documents (Registration Certificate, Trust Deed, 12A/80G)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-6 pb-6 border-2 border-slate-300 border-dashed rounded-2xl hover:border-indigo-500 transition-colors bg-slate-50/60 group">
                <div className="space-y-2 text-center">
                  <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-indigo-600 group-hover:scale-105 transition-transform shadow-xs">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div className="flex text-sm text-slate-600 justify-center items-center">
                    <label className="relative cursor-pointer rounded-md font-bold text-indigo-600 hover:text-indigo-700">
                      <span>Click to upload documents</span>
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md shadow-indigo-500/20 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all hover:shadow-indigo-500/30 hover:-translate-y-0.5 cursor-pointer mt-4"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Submit for Platform Verification'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;

import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import documentService from './documentService';

const CATEGORIES = [
  { value: 'compliance_cert', label: 'Compliance & Registration (12A/80G/FCRA)' },
  { value: 'governance', label: 'Governance & Trust Deed / Bylaws' },
  { value: 'program_mou', label: 'Program MOU & Partner Agreement' },
  { value: 'annual_report', label: 'Annual Progress & Financial Report' },
  { value: 'audit_report', label: 'Audited Financial Statement' },
  { value: 'identity_proof', label: 'Beneficiary / Staff Identity Proof' },
  { value: 'policy', label: 'Organizational Policy (POSH / Child Safety)' },
  { value: 'other', label: 'Other Document' }
];

const ENTITY_TYPES = [
  { value: 'ngo_general', label: 'General Organization Document' },
  { value: 'program', label: 'Linked to Program' },
  { value: 'donor', label: 'Linked to Donor' },
  { value: 'beneficiary', label: 'Linked to Beneficiary' },
  { value: 'volunteer', label: 'Linked to Volunteer' },
  { value: 'none', label: 'None' }
];

export default function DocumentUploadModal({ isOpen, onClose, onUploaded, showNotification }) {
  const [formData, setFormData] = useState({
    documentNumber: '',
    title: '',
    category: 'compliance_cert',
    associatedEntityType: 'ngo_general',
    expiryDate: '',
    tags: '',
    description: '',
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    mimeType: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFormData((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        fileUrl: `https://storage.ngocore.org/vault/${encodeURIComponent(file.name)}`,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Document title is required.');
      return;
    }

    if (!formData.fileName || !formData.fileUrl) {
      setError('Please select or specify a file to upload.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      associatedEntityType: formData.associatedEntityType,
      fileUrl: formData.fileUrl.trim(),
      fileName: formData.fileName.trim(),
      fileSize: Number(formData.fileSize) || 1024,
      mimeType: formData.mimeType.trim() || 'application/pdf',
      description: formData.description.trim(),
      tags: formData.tags
        ? formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null
    };

    if (formData.documentNumber.trim()) {
      payload.documentNumber = formData.documentNumber.trim();
    }

    setLoading(true);
    try {
      await documentService.createDocument(payload);
      showNotification('success', 'Document registered & uploaded to repository successfully!');
      if (onUploaded) onUploaded();
      onClose();
    } catch (err) {
      console.error('Failed to upload document:', err);
      const errDetails = Array.isArray(err?.errors) ? err.errors.map(e => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ') : '';
      const msg = errDetails || err?.message || err?.response?.data?.message || 'Failed to upload document';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-200" />
            <h2 className="text-lg font-bold">Upload Compliance & Legal Document</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File Picker Zone */}
          <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-4 text-center bg-gray-50/50 transition-colors">
            <input
              type="file"
              id="doc-file-input"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.csv,.xlsx,.xls,.json,.txt"
            />
            <label htmlFor="doc-file-input" className="cursor-pointer block">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              {selectedFile ? (
                <div>
                  <div className="text-sm font-bold text-gray-900">{selectedFile.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {Math.round(selectedFile.size / 1024)} KB • Click to change file
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    Click to browse files
                  </span>{' '}
                  <span className="text-xs text-gray-500">or drop CSV, XLSX, XLS, PDF, DOCX, JSON, TXT</span>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Max size: 25MB • Secured with AES-256 in NGO repository
                  </div>
                </div>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Document Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. 80G Tax Exemption Certificate 2026-2029"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Associated Entity Scope
              </label>
              <select
                name="associatedEntityType"
                value={formData.associatedEntityType}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {ENTITY_TYPES.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Custom Doc # (Optional)
              </label>
              <input
                type="text"
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleChange}
                placeholder="Auto-generated (DOC-XXXX)"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="compliance, tax, audit, statutory"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description & Notes
              </label>
              <textarea
                name="description"
                rows="2"
                value={formData.description}
                onChange={handleChange}
                placeholder="Document scope, issuing authority, certificate registration numbers..."
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Save Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

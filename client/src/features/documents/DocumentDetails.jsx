import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  ExternalLink,
  History,
  AlertTriangle
} from 'lucide-react';
import documentService from './documentService';

export default function DocumentDetails({
  isOpen,
  onClose,
  documentId,
  isAdmin,
  onVerified,
  showNotification
}) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'audit'

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocument();
    } else {
      setDoc(null);
      setActiveTab('overview');
    }
  }, [isOpen, documentId]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      const res = await documentService.getDocumentById(documentId);
      const payload = res?.data || res;
      setDoc(payload?.document || payload?.data || payload || null);
    } catch (err) {
      console.error('Failed to load document details:', err);
      showNotification('error', 'Failed to load document details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleVerify = async (status) => {
    try {
      await documentService.verifyDocument(documentId, {
        status,
        verificationNotes: 'Verified via NGO compliance portal review'
      });
      showNotification('success', `Document status updated to ${status}.`);
      loadDocument();
      if (onVerified) onVerified();
    } catch (err) {
      console.error('Failed to verify document:', err);
      showNotification('error', 'Failed to update verification status.');
    }
  };

  const isExpired = doc?.expiryDate && new Date(doc.expiryDate) <= new Date();

  const getStatusBadge = (status) => {
    const config = {
      active: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Active / Valid' },
      pending_verification: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending Verification' },
      expired: { bg: 'bg-red-100', text: 'text-red-800', label: 'Expired' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Archived' }
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/20 text-white">
              {doc?.documentNumber || 'DOC-XXXX'}
            </span>
            <h2 className="text-base font-bold truncate max-w-md">{doc?.title || 'Document Record'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview & Verification
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Trail ({doc?.auditLogs?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              Loading document details...
            </div>
          ) : !doc ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Document record not found or could not be loaded.
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Verification Status:</span>
                  {getStatusBadge(doc.status)}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  Category: <strong>{doc.category.replace('_', ' ')}</strong>
                </div>
              </div>

              {/* Expired Warning Banner */}
              {isExpired && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>
                    <strong>Attention:</strong> This compliance certificate expired on{' '}
                    {new Date(doc.expiryDate).toLocaleDateString()}. Renewal is required.
                  </span>
                </div>
              )}

              {/* File Info Card */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{doc.fileName}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Math.round(doc.fileSize / 1024)} KB • {doc.mimeType}
                    </p>
                  </div>
                </div>

                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View / Download
                </a>
              </div>

              {/* Parameters Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <span className="text-gray-400 block">Validity / Expiry Date</span>
                  <span className="font-semibold text-gray-900 block">
                    {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'Permanent / No Expiry'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <span className="text-gray-400 block">Associated Entity</span>
                  <span className="font-semibold text-gray-900 block capitalize">
                    {doc.associatedEntityType.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <span className="text-gray-400 block">Uploaded By</span>
                  <span className="font-semibold text-gray-900 block">
                    {doc.uploadedBy
                      ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName} (${doc.uploadedBy.role})`
                      : 'System'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                  <span className="text-gray-400 block">Verified By</span>
                  <span className="font-semibold text-gray-900 block">
                    {doc.verifiedBy
                      ? `${doc.verifiedBy.firstName} ${doc.verifiedBy.lastName}`
                      : 'Pending Verification'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {doc.description && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Description & Issuance Notes
                  </h4>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                    {doc.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {doc.tags?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Verification Action Bar */}
              {isAdmin && (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-700" /> Compliance Verification Controls
                    </h4>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Review document validity and mark status in statutory ledger.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.status !== 'active' && (
                      <button
                        onClick={() => handleVerify('active')}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
                      >
                        Mark Active
                      </button>
                    )}
                    {doc.status !== 'expired' && (
                      <button
                        onClick={() => handleVerify('expired')}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm"
                      >
                        Mark Expired
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {doc.auditLogs?.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No audit logs recorded for this document yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {doc.auditLogs.map((log) => (
                    <div key={log._id} className="py-2.5 text-xs text-gray-700 flex justify-between">
                      <div>
                        <span className="font-semibold uppercase tracking-wider text-blue-700">
                          {log.action}
                        </span>{' '}
                        by{' '}
                        <span className="font-medium text-gray-900">
                          {log.actorId?.firstName
                            ? `${log.actorId.firstName} ${log.actorId.lastName}`
                            : log.actorId?.email || 'System'}
                        </span>
                        {log.metadata?.actionDetail && (
                          <span className="text-gray-500 ml-1">
                            ({log.metadata.actionDetail})
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400">
                        {new Date(log.timestamp || log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

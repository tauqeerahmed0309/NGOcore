import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Award,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import documentService from './documentService';
import DocumentTable from './DocumentTable';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentDetails from './DocumentDetails';

export default function DocumentManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'staff';
  const isAdmin = userRole === 'admin' || userRole === 'ngo_admin';
  const isStaff = userRole === 'staff';

  // Data state
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 10
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const statusFilter = 'all';
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [docToArchive, setDocToArchive] = useState(null);

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current));
    }, 4000);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      const res = await documentService.getDocumentSummary();
      const payload = res?.data || res;
      setSummary(payload?.data || payload || null);
    } catch (err) {
      console.error('Failed to load document summary:', err);
    }
  }, []);

  // Fetch documents list
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        category: categoryFilter,
        status: statusFilter,
        expiredOnly: expiredOnly ? 'true' : undefined,
        search: debouncedSearch.trim() || undefined
      };
      const res = await documentService.getDocuments(params);
      const payload = res?.data || res;
      const dataObj = payload?.data || payload;
      setDocuments(dataObj?.documents || (Array.isArray(dataObj) ? dataObj : []));
      setPagination(dataObj?.pagination || { total: 0, totalPages: 1, page: 1, limit: 10 });
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      showNotification('error', 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, categoryFilter, statusFilter, expiredOnly, debouncedSearch, showNotification]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Handle open actions
  const handleOpenUpload = () => {
    setIsUploadOpen(true);
  };

  const handleOpenDetails = (id) => {
    setSelectedDocId(id);
    setIsDetailsOpen(true);
  };

  const handleOpenArchive = (id, title) => {
    setDocToArchive({ id, title });
    setArchiveModalOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!docToArchive) return;
    try {
      await documentService.deleteDocument(docToArchive.id);
      showNotification('success', `Document "${docToArchive.title}" archived successfully.`);
      setArchiveModalOpen(false);
      setDocToArchive(null);
      fetchDocuments();
      loadSummary();
    } catch (err) {
      console.error('Failed to archive document:', err);
      showNotification('error', 'Failed to archive document.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await documentService.exportDocuments({
        category: categoryFilter,
        status: statusFilter,
        expiredOnly: expiredOnly ? 'true' : undefined,
        search: debouncedSearch.trim() || undefined
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `documents_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('success', 'Documents catalog exported to CSV successfully.');
    } catch (err) {
      console.error('Failed to export documents CSV:', err);
      showNotification('error', 'Failed to export documents CSV.');
    }
  };

  return (
    <div className="feature-page-container" style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: notification.type === 'error' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
            color: notification.type === 'error' ? 'var(--status-danger)' : 'var(--status-success)',
            border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ color: 'inherit', padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: 'var(--brand-green-muted)',
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileText size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Documents &amp; Legal
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Maintain statutory certifications (12A, 80G, FCRA), MOUs, policies, and governance records
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportCsv}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Download size={16} />
            Export CSV
          </button>

          {(isAdmin || isStaff) && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenUpload}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                background: 'var(--brand-green)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: 'var(--shadow-sm)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Upload size={16} />
              Upload Document
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        {/* Total Documents */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Total Documents
            </span>
            <FileText size={18} style={{ color: 'var(--brand-green)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {summary?.totalDocuments ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Stored in compliance vault
          </div>
        </div>

        {/* Active / Verified */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Active / Verified
            </span>
            <ShieldCheck size={18} style={{ color: 'var(--status-success)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-success)', marginTop: 4 }}>
            {summary?.statusCounts?.active ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Legally active records
          </div>
        </div>

        {/* Compliance Certs */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Compliance Certs
            </span>
            <Award size={18} style={{ color: '#2563eb' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
            {summary?.categoryCounts?.compliance_cert ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            80G, 12A, FCRA, etc.
          </div>
        </div>

        {/* Expired / Alerts */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Expired / Alerts
            </span>
            <AlertTriangle size={18} style={{ color: 'var(--status-danger)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: ((summary?.expiredCount || 0) + (summary?.expiringSoonCount || 0)) > 0 ? 'var(--status-danger)' : 'var(--text-primary)', marginTop: 4 }}>
            {(summary?.expiredCount || 0) + (summary?.expiringSoonCount || 0)}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {summary?.expiredCount || 0} expired &bull; {summary?.expiringSoonCount || 0} expiring soon
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search by title, doc #, file name, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.875rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div style={{ minWidth: 190 }}>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Document Categories</option>
              <option value="compliance_cert">Compliance &amp; Registration</option>
              <option value="governance">Governance &amp; Bylaws</option>
              <option value="program_mou">Program MOUs</option>
              <option value="annual_report">Annual Reports</option>
              <option value="audit_report">Audit Reports</option>
              <option value="identity_proof">Identity Proofs</option>
              <option value="policy">Policies &amp; Procedures</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Expired Only Toggle Button */}
          <div>
            <button
              type="button"
              onClick={() => {
                setExpiredOnly(!expiredOnly);
                setPage(1);
              }}
              style={{
                padding: '9px 14px',
                borderRadius: 6,
                border: `1px solid ${expiredOnly ? '#fecaca' : 'var(--border)'}`,
                background: expiredOnly ? 'var(--status-danger-bg)' : 'var(--bg-surface)',
                color: expiredOnly ? 'var(--status-danger)' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <AlertTriangle size={14} />
              <span>Expired Only</span>
            </button>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => {
              fetchDocuments();
              loadSummary();
            }}
            disabled={loading}
            title="Refresh List"
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <DocumentTable
          documents={documents}
          isAdmin={isAdmin}
          onView={handleOpenDetails}
          onDelete={handleOpenArchive}
        />

        {/* Pagination Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <span>
            Showing <strong>{documents.length}</strong> of <strong>{pagination.total || 0}</strong> documents (Page <strong>{pagination.page || 1}</strong> of <strong>{pagination.totalPages || 1}</strong>)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>

            <button
              type="button"
              className="btn btn-outline"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: pagination.page > 1 ? 1 : 0.4,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: pagination.page > 1 ? 'pointer' : 'default'
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: pagination.page < pagination.totalPages ? 1 : 0.4,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: pagination.page < pagination.totalPages ? 'pointer' : 'default'
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => {
          fetchDocuments();
          loadSummary();
        }}
        showNotification={showNotification}
      />

      <DocumentDetails
        isOpen={isDetailsOpen}
        documentId={selectedDocId}
        isAdmin={isAdmin}
        onClose={() => setIsDetailsOpen(false)}
        onVerified={() => {
          fetchDocuments();
          loadSummary();
        }}
        showNotification={showNotification}
      />

      {/* Archive Modal */}
      {archiveModalOpen && docToArchive && (
        <div className="modal-overlay" onClick={() => setArchiveModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Archive Document
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Are you sure you want to archive document "{docToArchive.title}"? The document will be
              soft-deleted and marked as archived, preserving full audit history.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setArchiveModalOpen(false)}
                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleArchiveConfirm}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  background: 'var(--status-danger)',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Archive Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

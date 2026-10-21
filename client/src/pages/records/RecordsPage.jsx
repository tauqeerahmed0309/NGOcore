import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { pageTransition } from '../../animations';
import recordService from '../../services/recordService';
import privacyService from '../../services/privacyService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  FolderLock,
  PlusCircle,
  Search,
  Filter,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  X,
  FileText,
  Users,
  HeartHandshake,
  Receipt,
  Briefcase,
  Layers,
  Sparkles,
  Trash2,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
  Tag,
  UploadCloud,
  Download,
  FileSpreadsheet,
  FileCheck,
  ShieldAlert,
  UserX,
  History,
  FileJson,
  HelpCircle
} from 'lucide-react';

const RecordsPage = () => {
  const pageRef = useRef(null);
  const toast = useToast();
  const { user } = useAuth();

  const [recordTypes, setRecordTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null); // null means all
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('details'); // 'details' | 'privacy'
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [erasureModalOpen, setErasureModalOpen] = useState(false);
  const [erasureCertificate, setErasureCertificate] = useState(null);

  // New Record Form State
  const [newRecordTypeId, setNewRecordTypeId] = useState('');
  const [formData, setFormData] = useState({});
  const [formStatus, setFormStatus] = useState('Submitted');
  const [formTags, setFormTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk Import State
  const [importTypeId, setImportTypeId] = useState('');
  const [importCsvText, setImportCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Privacy & Consent State
  const [consents, setConsents] = useState([]);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const [newConsentPurpose, setNewConsentPurpose] = useState('Humanitarian Aid & Relief');
  const [newConsentProof, setNewConsentProof] = useState('Written Form');
  const [newConsentWitness, setNewConsentWitness] = useState('');
  const [addingConsent, setAddingConsent] = useState(false);
  const [erasureReason, setErasureReason] = useState('DPDP Right to Erasure Request');
  const [erasureRequester, setErasureRequester] = useState('');
  const [executingErasure, setExecutingErasure] = useState(false);

  // Custom Field Builder Form State
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePrefix, setNewTypePrefix] = useState('REC');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeFields, setNewTypeFields] = useState([
    { name: 'Full Name', key: 'full_name', type: 'Text', required: true, isSensitive: false },
    { name: 'Identification', key: 'id_number', type: 'Encrypted Text', required: true, isSensitive: true }
  ]);
  const [creatingType, setCreatingType] = useState(false);

  // Copied state
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    pageTransition(pageRef.current);
  }, []);

  // Fetch record types on mount
  useEffect(() => {
    fetchRecordTypes();
  }, []);

  // Fetch records whenever filters or selected type changes
  useEffect(() => {
    fetchRecords();
  }, [selectedType, statusFilter, pagination.page]);

  // When active record changes, fetch its consents if in privacy tab
  useEffect(() => {
    if (activeRecord && activeDetailTab === 'privacy') {
      fetchConsents(activeRecord._id);
    }
  }, [activeRecord, activeDetailTab]);

  const fetchRecordTypes = async () => {
    try {
      setLoading(true);
      const types = await recordService.getRecordTypes();
      setRecordTypes(types);
      if (types.length > 0) {
        if (!newRecordTypeId) setNewRecordTypeId(types[0]._id);
        if (!importTypeId) setImportTypeId(types[0]._id);
      }
    } catch {
      toast.error('Failed to load record schemas');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setRecordsLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (selectedType) params.recordTypeId = selectedType._id;
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await recordService.getRecords(params);
      setRecords(res.records || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 15, pages: 1 });
    } catch {
      toast.error('Failed to fetch records');
    } finally {
      setRecordsLoading(false);
    }
  };

  const fetchConsents = async (recordId) => {
    try {
      setConsentsLoading(true);
      const data = await privacyService.getConsents(recordId);
      setConsents(data);
    } catch {
      toast.error('Failed to load consent history');
    } finally {
      setConsentsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchRecords();
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit New Record
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!newRecordTypeId) return;

    try {
      setSubmitting(true);
      const tagsArray = formTags
        ? formTags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      await recordService.createRecord({
        recordTypeId: newRecordTypeId,
        data: formData,
        status: formStatus,
        tags: tagsArray
      });

      toast.success('Record encrypted and stored in vault');
      setCreateModalOpen(false);
      setFormData({});
      setFormTags('');
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to archive this record? An immutable audit event will be logged.')) {
      return;
    }

    try {
      await recordService.deleteRecord(recordId);
      toast.success('Record safely archived');
      if (detailModalOpen && activeRecord?._id === recordId) {
        setDetailModalOpen(false);
      }
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record');
    }
  };

  // Update Status in Detail View
  const handleUpdateStatus = async (newStatus) => {
    if (!activeRecord) return;
    try {
      const updated = await recordService.updateRecord(activeRecord._id, { status: newStatus });
      setActiveRecord(updated);
      toast.success(`Status updated to ${newStatus}`);
      fetchRecords();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = async () => {
    const targetTypeId = importTypeId || (recordTypes[0] ? recordTypes[0]._id : null);
    if (!targetTypeId) return;

    try {
      const blob = await recordService.downloadTemplate(targetTypeId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Template CSV downloaded');
    } catch {
      toast.error('Failed to download template');
    }
  };

  // Bulk Import
  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    if (!importCsvText.trim()) {
      toast.error('Please paste or provide CSV content');
      return;
    }

    try {
      setImporting(true);
      const result = await recordService.bulkImport(importTypeId, {
        csvText: importCsvText,
        defaultStatus: 'Submitted',
        tags: ['BulkImport']
      });

      setImportResult(result);
      toast.success(`Bulk import completed: ${result.importedCount} created, ${result.failedCount} errors`);
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  // Export Records
  const handleExportSubmit = async (masked = false) => {
    try {
      const blob = await recordService.exportRecords({
        recordTypeId: selectedType ? selectedType._id : undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        masked
      });

      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `records_export_${masked ? 'masked_' : ''}${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportModalOpen(false);
      toast.success(`${masked ? 'Privacy-masked' : 'Standard'} CSV export downloaded`);
    } catch {
      toast.error('Failed to export records');
    }
  };

  // Grant Consent
  const handleGrantConsent = async (e) => {
    e.preventDefault();
    if (!activeRecord) return;

    try {
      setAddingConsent(true);
      await privacyService.grantConsent({
        recordId: activeRecord._id,
        purpose: newConsentPurpose,
        proofType: newConsentProof,
        witnessName: newConsentWitness
      });

      toast.success('Consent recorded and verified');
      setNewConsentWitness('');
      fetchConsents(activeRecord._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant consent');
    } finally {
      setAddingConsent(false);
    }
  };

  // Withdraw Consent
  const handleWithdrawConsent = async (consentId) => {
    try {
      await privacyService.withdrawConsent(consentId, 'Withdrawn by data subject request');
      toast.success('Consent revoked');
      fetchConsents(activeRecord._id);
    } catch {
      toast.error('Failed to withdraw consent');
    }
  };

  // Execute Right to be Forgotten
  const handleExecuteErasure = async () => {
    if (!activeRecord) return;

    try {
      setExecutingErasure(true);
      const res = await privacyService.executeRightToBeForgotten({
        recordId: activeRecord._id,
        requestedBy: erasureRequester || 'Data Subject',
        reason: erasureReason
      });

      setErasureCertificate(res.certificate);
      toast.success('Right to be Forgotten executed. Certificate generated.');
      setErasureModalOpen(false);
      setActiveRecord(res.record);
      fetchRecords();
      fetchConsents(activeRecord._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to execute erasure request');
    } finally {
      setExecutingErasure(false);
    }
  };

  // Download SAR Package
  const handleExportSAR = async () => {
    if (!activeRecord) return;
    try {
      const pkg = await privacyService.exportSAR(activeRecord._id);
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sar_export_${activeRecord.recordNumber}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('SAR portability package downloaded');
    } catch {
      toast.error('Failed to export SAR package');
    }
  };

  // Custom Field Builder: Add Field
  const handleAddField = () => {
    setNewTypeFields((prev) => [
      ...prev,
      {
        name: `Field ${prev.length + 1}`,
        key: `field_${prev.length + 1}`,
        type: 'Text',
        required: false,
        isSensitive: false
      }
    ]);
  };

  const handleRemoveField = (index) => {
    setNewTypeFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFieldChange = (index, prop, value) => {
    setNewTypeFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [prop]: value };
      if (prop === 'name') {
        updated[index].key = value.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      }
      if (prop === 'type' && value === 'Encrypted Text') {
        updated[index].isSensitive = true;
      }
      return updated;
    });
  };

  // Create Custom Record Type
  const handleCreateCustomType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      toast.error('Schema name is required');
      return;
    }

    try {
      setCreatingType(true);
      await recordService.createRecordType({
        name: newTypeName,
        prefix: newTypePrefix || 'REC',
        description: newTypeDesc,
        fields: newTypeFields
      });

      toast.success(`Custom record type "${newTypeName}" created`);
      setSchemaModalOpen(false);
      setNewTypeName('');
      setNewTypeDesc('');
      fetchRecordTypes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create custom type');
    } finally {
      setCreatingType(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Under Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Archived':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  const getTypeIcon = (slug) => {
    switch (slug) {
      case 'beneficiary':
        return <Users className="h-4 w-4" />;
      case 'aid-distribution':
        return <HeartHandshake className="h-4 w-4" />;
      case 'donation-grant':
        return <Receipt className="h-4 w-4" />;
      case 'volunteer-staff':
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  const selectedTypeForCreation = recordTypes.find((t) => t._id === newRecordTypeId);

  return (
    <div ref={pageRef} className="space-y-6">
      <Helmet>
        <title>Records Vault - Encrypted Storage &bull; NGOcore</title>
      </Helmet>

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1">
              <Lock className="h-3 w-3 text-indigo-600" />
              <span>AES-256 Field Level Encryption</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
              DPDP 2023 Compliant
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Encrypted Records Vault
          </h1>
          <p className="text-xs text-slate-500">
            Immutable, zero-knowledge beneficiary databases with custom schema enforcement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setImportResult(null);
              setBulkModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <UploadCloud className="h-4 w-4 text-slate-500" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => setSchemaModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Layers className="h-4 w-4 text-slate-500" />
            <span>Schemas</span>
          </button>
          <button
            onClick={() => {
              if (selectedType) setNewRecordTypeId(selectedType._id);
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Record</span>
          </button>
        </div>
      </div>

      {/* RECORD TYPE FILTER TABS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedType(null)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            selectedType === null
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FolderLock className="h-3.5 w-3.5" />
          <span>All Records</span>
        </button>

        {recordTypes.map((type) => {
          const isSelected = selectedType?._id === type._id;
          return (
            <button
              key={type._id}
              onClick={() => setSelectedType(type)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {getTypeIcon(type.slug)}
              <span>{type.name}</span>
              {type.isPredefined && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  Core
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by record number (e.g. BEN-2026-00001) or tags..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </form>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* RECORDS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {recordsLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Decrypting vault records...</p>
          </div>
        ) : records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Record ID</th>
                  <th className="py-3.5 px-4 font-bold">Type</th>
                  <th className="py-3.5 px-4 font-bold">Key Data Attributes</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Date Created</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => {
                  const typeObj = rec.recordTypeId || {};
                  const dataEntries = Object.entries(rec.data || {}).slice(0, 3);

                  return (
                    <tr
                      key={rec._id}
                      onClick={() => {
                        setActiveRecord(rec);
                        setActiveDetailTab('details');
                        setDetailModalOpen(true);
                      }}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="group-hover:text-indigo-600 transition-colors">
                            {rec.recordNumber}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(rec.recordNumber, rec._id);
                            }}
                            className="text-slate-300 hover:text-slate-600 p-1"
                            title="Copy Record ID"
                          >
                            {copiedId === rec._id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                          {getTypeIcon(typeObj.slug)}
                          <span>{typeObj.name || 'Custom'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {dataEntries.map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-[11px] text-slate-600 truncate max-w-[140px]"
                            >
                              <strong>{k.replace(/_/g, ' ')}:</strong> {String(v)}
                            </span>
                          ))}
                          {rec.encryptedFields && rec.encryptedFields.length > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1"
                              title={`${rec.encryptedFields.length} encrypted fields`}
                            >
                              <Lock className="h-2.5 w-2.5" />
                              <span>{rec.encryptedFields.length} AES</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(
                            rec.status
                          )}`}
                        >
                          {rec.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRecord(rec);
                              setActiveDetailTab('privacy');
                              setDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="DPDP Privacy & Consent"
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRecord(rec);
                              setActiveDetailTab('details');
                              setDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Inspect Record"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecord(rec._id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Archive Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto h-16 w-16 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center text-slate-400">
              <FolderLock className="h-8 w-8" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-sm">No records found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no encrypted records matching your current filter. Create a new record or select a different schema.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create First Record</span>
            </button>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {pagination.pages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-50 font-bold"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-50 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE NEW RECORD (DYNAMIC FORM) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <FolderLock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Add Encrypted Record</h3>
                  <p className="text-xs text-slate-400">All sensitive inputs are sealed with AES-256-GCM</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Record Schema / Type</label>
                <select
                  value={newRecordTypeId}
                  onChange={(e) => {
                    setNewRecordTypeId(e.target.value);
                    setFormData({});
                  }}
                  className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  {recordTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.prefix}) {t.isPredefined ? '[Standard Template]' : '[Custom]'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTypeForCreation && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Schema Fields ({selectedTypeForCreation.fields.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTypeForCreation.fields.map((field) => {
                      const isFieldEncrypted = field.isSensitive || field.type === 'Encrypted Text';
                      return (
                        <div
                          key={field.key}
                          className={`space-y-1 ${
                            field.type === 'Long Text' ? 'sm:col-span-2' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                              <span>{field.name}</span>
                              {field.required && <span className="text-rose-500">*</span>}
                            </label>
                            {isFieldEncrypted && (
                              <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Lock className="h-2.5 w-2.5" />
                                <span>AES-256</span>
                              </span>
                            )}
                          </div>

                          {field.type === 'Dropdown' ? (
                            <select
                              required={field.required}
                              value={formData[field.key] || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, [field.key]: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Select option...</option>
                              {(field.options || []).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'Long Text' ? (
                            <textarea
                              required={field.required}
                              rows={3}
                              value={formData[field.key] || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, [field.key]: e.target.value })
                              }
                              placeholder={field.placeholder || ''}
                              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          ) : (
                            <input
                              type={
                                field.type === 'Number'
                                  ? 'number'
                                  : field.type === 'Date'
                                  ? 'date'
                                  : 'text'
                              }
                              required={field.required}
                              value={formData[field.key] || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, [field.key]: e.target.value })
                              }
                              placeholder={field.placeholder || ''}
                              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-bold text-slate-700"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Draft">Draft</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g. Camp-North, Urgent, 2026"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save to Vault</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT RECORD & PRIVACY / DPDP DRAWER */}
      {detailModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-mono font-bold text-xs">
                  {activeRecord.recordTypeId?.prefix || 'REC'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center space-x-2">
                    <span>{activeRecord.recordNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                        activeRecord.status
                      )}`}
                    >
                      {activeRecord.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Schema: {activeRecord.recordTypeId?.name || 'Custom Schema'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <button
                onClick={() => setActiveDetailTab('details')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeDetailTab === 'details'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Record Details
              </button>
              <button
                onClick={() => setActiveDetailTab('privacy')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeDetailTab === 'privacy'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>DPDP Privacy & Consent</span>
              </button>
            </div>

            {activeDetailTab === 'details' ? (
              <div className="space-y-5">
                {/* Status Changer */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-700">Lifecycle Status:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Submitted', 'Under Review', 'Approved', 'Archived'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st)}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          activeRecord.status === st
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fields Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Encrypted Vault Payloads</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(activeRecord.data || {}).map(([key, val]) => {
                      const isEncryptedField =
                        activeRecord.encryptedFields && activeRecord.encryptedFields.includes(key);

                      return (
                        <div
                          key={key}
                          className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                            {isEncryptedField && (
                              <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <Lock className="h-2.5 w-2.5" />
                                <span>AES-256</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-900 break-words">
                            {String(val || 'N/A')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit & Compliance Metadata */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Created At:</span>
                    <strong className="text-slate-800">
                      {new Date(activeRecord.createdAt).toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created By:</span>
                    <strong className="text-slate-800">
                      {activeRecord.createdBy?.name || 'System Operator'} (
                      {activeRecord.createdBy?.email || 'N/A'})
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cryptographic Audit Anchor:</span>
                    <span className="font-mono text-emerald-600 font-bold">SHA-256 Chained</span>
                  </div>
                </div>
              </div>
            ) : (
              /* PRIVACY & DPDP TAB */
              <div className="space-y-5">
                {/* Actions banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">DPDP & GDPR Compliance Actions</h4>
                    <p className="text-[11px] text-slate-500">Subject rights, consent logging & erasure</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleExportSAR}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                    >
                      <FileJson className="h-3.5 w-3.5" />
                      <span>Download SAR</span>
                    </button>
                    <button
                      onClick={() => setErasureModalOpen(true)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      <span>Right to be Forgotten</span>
                    </button>
                  </div>
                </div>

                {/* Grant Consent Form */}
                <form onSubmit={handleGrantConsent} className="p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Record New Beneficiary Consent</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <select
                      value={newConsentPurpose}
                      onChange={(e) => setNewConsentPurpose(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <option value="Humanitarian Aid & Relief">Humanitarian Aid & Relief</option>
                      <option value="Medical & Healthcare Services">Medical & Healthcare Services</option>
                      <option value="Donor Grant Compliance Audit">Donor Grant Compliance Audit</option>
                      <option value="Third-Party Research & Statistics">Third-Party Research</option>
                    </select>

                    <select
                      value={newConsentProof}
                      onChange={(e) => setNewConsentProof(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <option value="Written Form">Written Form</option>
                      <option value="Verbal Witness">Verbal Witness</option>
                      <option value="Digital OTP">Digital OTP</option>
                      <option value="Biometric">Biometric</option>
                      <option value="Guardian Consent">Guardian Consent</option>
                    </select>

                    <input
                      type="text"
                      value={newConsentWitness}
                      onChange={(e) => setNewConsentWitness(e.target.value)}
                      placeholder="Witness Name (Staff / Kin)"
                      className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={addingConsent}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {addingConsent ? 'Saving...' : 'Grant Consent'}
                    </button>
                  </div>
                </form>

                {/* Consent History Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Consent Audit History ({consents.length})</h4>
                  {consentsLoading ? (
                    <div className="py-6 text-center text-xs text-slate-400">Loading consents...</div>
                  ) : consents.length > 0 ? (
                    <div className="space-y-2">
                      {consents.map((c) => (
                        <div
                          key={c._id}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{c.purpose}</span>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                  c.status === 'granted'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {c.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Proof: {c.proofType} {c.witnessName ? `| Witness: ${c.witnessName}` : ''} | Date: {new Date(c.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {c.status === 'granted' && (
                            <button
                              onClick={() => handleWithdrawConsent(c._id)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">No explicit consents recorded yet.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => handleDeleteRecord(activeRecord._id)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Archive Record</span>
              </button>

              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BULK IMPORT MODAL */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Bulk CSV Ingestion</h3>
                  <p className="text-xs text-slate-400">Batch upload records with automated AES-256 field encryption</p>
                </div>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-900">Need a CSV template?</span>
                <p className="text-[11px] text-slate-500">Download formatted headers matching your selected schema.</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold text-indigo-600 bg-white border border-slate-200 hover:bg-slate-100 shadow-2xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Template</span>
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Target Schema</label>
                <select
                  value={importTypeId}
                  onChange={(e) => setImportTypeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-bold"
                >
                  {recordTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.prefix})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Paste CSV Content or Upload</label>
                <textarea
                  required
                  rows={8}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder="Full Name,Gender,National ID / Aadhaar,Phone Number&#10;Maria Santos,Female,ID-12345,+1 555-0199"
                  className="w-full p-3 rounded-xl font-mono text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Import Results Summary */}
              {importResult && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Import Completed</span>
                    <span className="text-emerald-600">{importResult.importedCount} Imported</span>
                  </div>
                  {importResult.failedCount > 0 && (
                    <div className="text-rose-600 space-y-1">
                      <p className="font-bold">{importResult.failedCount} Errors Encountered:</p>
                      {importResult.errors.slice(0, 3).map((err, i) => (
                        <p key={i} className="text-[11px]">Row {err.row}: {err.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Run Batch Import</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EXPORT MODAL */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Export Vault Records</h3>
                  <p className="text-xs text-slate-400">Download CSV for donor grant auditing or compliance</p>
                </div>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => handleExportSubmit(false)}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 cursor-pointer transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600">
                    Standard Export (Authorized)
                  </h4>
                  <FileSpreadsheet className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Exports decrypted records for internal operations and registered compliance audits.
                </p>
              </div>

              <div
                onClick={() => handleExportSubmit(true)}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 cursor-pointer transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-teal-600">
                      Privacy-Masked Export (DPDP)
                    </h4>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      Masked
                    </span>
                  </div>
                  <Lock className="h-4 w-4 text-slate-400 group-hover:text-teal-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Redacts national IDs (****), phones (***-***-1234), and emails for external donors and grant reporting.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RIGHT TO BE FORGOTTEN CONFIRMATION */}
      {erasureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
            <div className="mx-auto h-16 w-16 bg-rose-50 border border-rose-200 rounded-3xl flex items-center justify-center text-rose-600">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-slate-900">Execute Right to be Forgotten</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Under DPDP Act 2023 / GDPR Section 17, executing this request will permanently scrub all PII fields to <code>[REDACTED_DPDP_RIGHT_TO_ERASURE]</code> while generating a cryptographic proof certificate.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Requested By</label>
                <input
                  type="text"
                  value={erasureRequester}
                  onChange={(e) => setErasureRequester(e.target.value)}
                  placeholder="e.g. Beneficiary / Legal Guardian"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Erasure Rationale</label>
                <input
                  type="text"
                  value={erasureReason}
                  onChange={(e) => setErasureReason(e.target.value)}
                  placeholder="Legal basis or consent revocation"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setErasureModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteErasure}
                disabled={executingErasure}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-md shadow-rose-600/20"
              >
                {executingErasure && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Erasure</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: ERASURE CERTIFICATE DISPLAY */}
      {erasureCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 text-center">
            <div className="mx-auto h-16 w-16 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center justify-center text-emerald-600">
              <FileCheck className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                DPDP Anonymization Certificate Issued
              </span>
              <h3 className="font-extrabold text-lg text-slate-900">
                {erasureCertificate.certificateNumber}
              </h3>
              <p className="text-xs text-slate-500">
                The beneficiary’s identifying fields have been permanently scrubbed.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-left font-mono text-[11px] text-slate-300 space-y-1.5 overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1">
                <span>Cryptographic Proof</span>
                <span className="text-emerald-400">SHA-256</span>
              </div>
              <p className="text-rose-400 break-all">{erasureCertificate.sha256Proof}</p>
              <p className="text-slate-400 text-[10px] pt-1">
                Timestamp: {new Date(erasureCertificate.anonymizedAt).toISOString()}
              </p>
            </div>

            <button
              onClick={() => setErasureCertificate(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800"
            >
              Close & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* MODAL 7: CUSTOM SCHEMA & FIELD BUILDER */}
      {schemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Custom Schema Builder</h3>
                  <p className="text-xs text-slate-400">Design bespoke schemas with field-level encryption</p>
                </div>
              </div>
              <button
                onClick={() => setSchemaModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Current Registered Schemas ({recordTypes.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto scrollbar-thin">
                {recordTypes.map((t) => (
                  <div
                    key={t._id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                        <span>{t.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">({t.prefix})</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.fields.length} dynamic fields</p>
                    </div>
                    {t.isPredefined ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Predefined
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        Custom
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateCustomType} className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>Build New Custom Schema</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Schema Title</label>
                  <input
                    type="text"
                    required
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="e.g. Disaster Relief Inflow"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Prefix (ID Code)</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={newTypePrefix}
                    onChange={(e) => setNewTypePrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. REL"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <input
                  type="text"
                  value={newTypeDesc}
                  onChange={(e) => setNewTypeDesc(e.target.value)}
                  placeholder="Operational purpose for this record category"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Schema Fields</label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Add Field</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                  {newTypeFields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs"
                    >
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                        placeholder="Field Label"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold"
                      />

                      <select
                        value={field.type}
                        onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                      >
                        <option value="Text">Text</option>
                        <option value="Number">Number</option>
                        <option value="Date">Date</option>
                        <option value="Dropdown">Dropdown</option>
                        <option value="Checkbox">Checkbox</option>
                        <option value="Phone">Phone</option>
                        <option value="Long Text">Long Text</option>
                        <option value="Currency">Currency</option>
                        <option value="Encrypted Text">Encrypted (AES-256)</option>
                      </select>

                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span className="text-[11px] font-bold text-slate-600">Req</span>
                      </label>

                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.isSensitive}
                          onChange={(e) => handleFieldChange(idx, 'isSensitive', e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-0.5">
                          <Lock className="h-2.5 w-2.5" />
                          <span>AES</span>
                        </span>
                      </label>

                      {newTypeFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSchemaModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingType}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {creatingType && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Schema</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsPage;

import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { recordService } from '../../services/recordService';
import { useToast } from '../../context/ToastContext';
import {
  Sparkles,
  Cpu,
  AlertTriangle,
  GitMerge,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Layers,
  MapPin,
  Filter,
  Check,
  X,
  Sliders,
  Calendar,
  AlertCircle
} from 'lucide-react';

const AiCleanPage = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('dedup'); // 'dedup' | 'anomalies' | 'forecast' | 'vulnerability'
  const [recordTypes, setRecordTypes] = useState([]);
  const [selectedRecordType, setSelectedRecordType] = useState('');
  const [threshold, setThreshold] = useState(0.70);

  // Loading states
  const [isScanning, setIsScanning] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Results
  const [dedupResults, setDedupResults] = useState(null);
  const [anomalyResults, setAnomalyResults] = useState(null);
  const [forecastResults, setForecastResults] = useState(null);
  const [vulnerabilityResults, setVulnerabilityResults] = useState(null);

  // Merge Modal state
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState(null);
  const [masterRecordId, setMasterRecordId] = useState('');

  // Initial Load
  useEffect(() => {
    fetchRecordTypes();
    runAllScans();
  }, []);

  const fetchRecordTypes = async () => {
    try {
      const types = await recordService.getRecordTypes();
      setRecordTypes(types || []);
    } catch (err) {
      console.warn('Failed to load record types:', err.message);
    }
  };

  const runAllScans = async () => {
    setIsScanning(true);
    try {
      const [dedup, anomalies, forecast, vuln] = await Promise.allSettled([
        aiService.scanDuplicates({ recordTypeId: selectedRecordType || undefined, threshold }),
        aiService.scanAnomalies({ recordTypeId: selectedRecordType || undefined }),
        aiService.getForecast(3),
        aiService.analyzeVulnerability({ recordTypeId: selectedRecordType || undefined })
      ]);

      if (dedup.status === 'fulfilled') setDedupResults(dedup.value);
      if (anomalies.status === 'fulfilled') setAnomalyResults(anomalies.value);
      if (forecast.status === 'fulfilled') setForecastResults(forecast.value);
      if (vuln.status === 'fulfilled') setVulnerabilityResults(vuln.value);

      showToast('AI analysis completed across all active records', 'success');
    } catch (err) {
      showToast(err.message || 'AI scan encountered an error', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunDedupScan = async () => {
    setIsScanning(true);
    try {
      const res = await aiService.scanDuplicates({
        recordTypeId: selectedRecordType || undefined,
        threshold: parseFloat(threshold)
      });
      setDedupResults(res);
      showToast(`Scan complete: ${res.duplicatesFound} duplicate candidate(s) detected`, 'success');
    } catch (err) {
      showToast(err.message || 'Deduplication scan failed', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunAnomalyScan = async () => {
    setIsScanning(true);
    try {
      const res = await aiService.scanAnomalies({
        recordTypeId: selectedRecordType || undefined
      });
      setAnomalyResults(res);
      showToast(`Scan complete: ${res.anomaliesFound} quality issue(s) flagged`, 'success');
    } catch (err) {
      showToast(err.message || 'Anomaly scan failed', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenMerge = (pair) => {
    setSelectedPair(pair);
    setMasterRecordId(pair.record1?._id);
    setMergeModalOpen(true);
  };

  const handleExecuteMerge = async () => {
    if (!selectedPair || !masterRecordId) return;
    const secondaryId = masterRecordId === selectedPair.record1?._id
      ? selectedPair.record2?._id
      : selectedPair.record1?._id;

    setIsMerging(true);
    try {
      await aiService.mergeRecords({
        primaryRecordId: masterRecordId,
        duplicateRecordId: secondaryId,
        deleteDuplicate: true
      });

      showToast('Records merged successfully with cryptographically chained audit entry', 'success');
      setMergeModalOpen(false);
      setSelectedPair(null);
      // Remove pair from local list
      if (dedupResults) {
        setDedupResults({
          ...dedupResults,
          duplicatesFound: Math.max(0, dedupResults.duplicatesFound - 1),
          duplicatePairs: dedupResults.duplicatePairs.filter((p) => p !== selectedPair)
        });
      }
    } catch (err) {
      showToast(err.message || 'Failed to merge records', 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDismissPair = (pairToDismiss) => {
    if (!dedupResults) return;
    setDedupResults({
      ...dedupResults,
      duplicatePairs: dedupResults.duplicatePairs.filter((p) => p !== pairToDismiss)
    });
    showToast('Duplicate candidate pair dismissed', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & AI Engine Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Data Sanitization & Intelligence Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              AI Record Cleaning & Predictive Suite
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Phonetic Soundex matching, Levenshtein distance deduplication, data anomaly isolation, and machine-learning aid demand forecasting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runAllScans}
              disabled={isScanning}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-medium text-sm shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning Vault...' : 'Run Full AI Scan'}</span>
            </button>
          </div>
        </div>

        {/* Decorative backdrop light */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Control Bar: Schema Filter & Threshold */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
            <Filter className="h-4 w-4 text-slate-400" />
            <span>Target Schema:</span>
          </div>
          <select
            value={selectedRecordType}
            onChange={(e) => setSelectedRecordType(e.target.value)}
            className="text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Record Types</option>
            {recordTypes.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.prefix})
              </option>
            ))}
          </select>

          {activeTab === 'dedup' && (
            <div className="flex items-center space-x-3 text-xs font-semibold text-slate-600 pl-2 border-l border-slate-200">
              <Sliders className="h-4 w-4 text-slate-400" />
              <span>Match Sensitivity:</span>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-24 accent-teal-600 cursor-pointer"
              />
              <span className="font-mono text-teal-700 font-bold">{Math.round(threshold * 100)}%</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl space-x-1 text-xs font-semibold w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('dedup')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'dedup'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>Duplicates</span>
            {dedupResults?.duplicatesFound > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                {dedupResults.duplicatesFound}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'anomalies'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Data Anomalies</span>
            {anomalyResults?.anomaliesFound > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px]">
                {anomalyResults.anomaliesFound}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'forecast'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Demand Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('vulnerability')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'vulnerability'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Vulnerability Tiers</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DUPLICATE CANDIDATES                                    */}
      {/* ============================================================== */}
      {activeTab === 'dedup' && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Scanned Records</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {dedupResults?.scannedCount || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Duplicate Pairs Detected</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {dedupResults?.duplicatesFound || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Active Match Engine</span>
              <p className="text-sm font-semibold text-teal-600 mt-2">
                Soundex + Levenshtein (Threshold: {Math.round(threshold * 100)}%)
              </p>
            </div>
          </div>

          {/* Candidates List */}
          {(!dedupResults?.duplicatePairs || dedupResults.duplicatePairs.length === 0) ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Zero Duplicate Records Detected</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All beneficiary profiles and distribution records have unique phonetic fingerprints at the {Math.round(threshold * 100)}% match threshold.
              </p>
              <button
                onClick={handleRunDedupScan}
                className="mt-2 text-xs font-semibold text-teal-600 hover:text-teal-700 underline"
              >
                Re-scan with updated threshold
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {dedupResults.duplicatePairs.map((pair, idx) => {
                const conf = pair.confidencePercentage || Math.round((pair.confidence || 0.8) * 100);
                const r1 = pair.record1;
                const r2 = pair.record2;
                const d1 = r1?.data || {};
                const d2 = r2?.data || {};

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 transition-all space-y-4"
                  >
                    {/* Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Candidate Match #{idx + 1}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            conf >= 85
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {conf}% Match Confidence
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDismissPair(pair)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleOpenMerge(pair)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          <GitMerge className="h-3.5 w-3.5" />
                          <span>Review & Merge</span>
                        </button>
                      </div>
                    </div>

                    {/* Match Reasons Badges */}
                    {pair.matchReasons && pair.matchReasons.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium">Algorithms:</span>
                        {pair.matchReasons.map((reason, rIdx) => (
                          <span
                            key={rIdx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Side-by-Side Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Record 1 */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-700 font-mono">
                            {r1.recordNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ID: {r1._id?.slice(-8)}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {d1.fullName || d1.name || d1.beneficiaryName || 'Unnamed Profile'}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-600">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Phone</span>
                            <span className="font-mono">{d1.phone || d1.phoneNumber || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Aadhaar / ID</span>
                            <span className="font-mono">{d1.aadhaarNumber || d1.governmentId || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Location</span>
                            <span>{d1.district || d1.city || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Annual Income</span>
                            <span>{d1.annualIncome ? `₹${d1.annualIncome}` : '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Record 2 */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-700 font-mono">
                            {r2.recordNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ID: {r2._id?.slice(-8)}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {d2.fullName || d2.name || d2.beneficiaryName || 'Unnamed Profile'}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-600">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Phone</span>
                            <span className="font-mono">{d2.phone || d2.phoneNumber || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Aadhaar / ID</span>
                            <span className="font-mono">{d2.aadhaarNumber || d2.governmentId || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Location</span>
                            <span>{d2.district || d2.city || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Annual Income</span>
                            <span>{d2.annualIncome ? `₹${d2.annualIncome}` : '—'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DATA ANOMALY QUARANTINE                                */}
      {/* ============================================================== */}
      {activeTab === 'anomalies' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Scanned Records</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {anomalyResults?.scannedCount || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Flagged Anomalies</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {anomalyResults?.anomaliesFound || 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">Quality Health</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {anomalyResults?.scannedCount
                  ? `${Math.round(((anomalyResults.scannedCount - (anomalyResults.anomaliesFound || 0)) / anomalyResults.scannedCount) * 100)}%`
                  : '100%'}
              </p>
            </div>
          </div>

          {(!anomalyResults?.flaggedRecords || anomalyResults.flaggedRecords.length === 0) ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Zero Data Quality Anomalies Flagged</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No demographic omissions, impossible date boundaries, or statistical numeric outliers detected in current records.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Anomalous Records Awaiting Remediation</h3>
                <span className="text-xs text-slate-500">
                  {anomalyResults.flaggedRecords.length} records requiring attention
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {anomalyResults.flaggedRecords.map((item, idx) => (
                  <div key={idx} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {item.recordNumber || 'UNASSIGNED'}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {item.recordTypeName || 'Record'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.severity === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.severity} Severity
                        </span>
                      </div>

                      <span className="text-xs text-slate-400 font-mono">
                        Ref: {item.recordId?.slice(-8)}
                      </span>
                    </div>

                    <div className="space-y-1.5 pl-2 border-l-2 border-rose-300">
                      {item.issues?.map((issue, iIdx) => (
                        <div key={iIdx} className="flex items-center space-x-2 text-xs text-slate-700">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PREDICTIVE DEMAND FORECASTING                           */}
      {/* ============================================================== */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-teal-600" />
                  <span>Aid Relief Demand Projections (Next 3 Periods)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Linear regression forecast model based on historical record creation cadence and relief demand surges.
                </p>
              </div>

              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                <span>Trend:</span>
                <span className="capitalize">{forecastResults?.trend_direction || 'Stable'}</span>
              </div>
            </div>

            {/* Projection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(forecastResults?.projections || [
                { period: 'Month +1', projectedDemand: 24, recommendedSafetyStock: 28 },
                { period: 'Month +2', projectedDemand: 29, recommendedSafetyStock: 33 },
                { period: 'Month +3', projectedDemand: 34, recommendedSafetyStock: 39 }
              ]).map((proj, pIdx) => (
                <div
                  key={pIdx}
                  className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{proj.period}</span>
                    </span>
                    <span className="text-[10px] text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-full">
                      Forecast
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 block">Expected Record Inflow</span>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {proj.projectedDemand}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Recommended Stock Buffer:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {proj.recommendedSafetyStock} units
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Advisory Box */}
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start space-x-3 text-xs text-indigo-900 leading-relaxed">
              <Sparkles className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Operational Advisory:</strong> With an {forecastResults?.trend_direction || 'increasing'} trend trajectory, relief supply chains should maintain an extra 15% inventory safety buffer to prevent field shortages during distribution cycles.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: VULNERABILITY CLUSTERING                                */}
      {/* ============================================================== */}
      {activeTab === 'vulnerability' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                <span>Vulnerability Index & Demographic Tiers</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Multi-factor vulnerability score evaluating family size, income thresholds, and displacement status.
              </p>
            </div>

            {/* Tiers Distribution */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-2">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                  High Vulnerability (Priority 1)
                </span>
                <p className="text-3xl font-extrabold text-rose-900">
                  {vulnerabilityResults?.vulnerabilityTiers?.high?.count || 0}
                </p>
                <div className="w-full bg-rose-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-600 h-1.5 rounded-full"
                    style={{ width: `${vulnerabilityResults?.vulnerabilityTiers?.high?.percentage || 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-rose-700 block">
                  {vulnerabilityResults?.vulnerabilityTiers?.high?.percentage || 0}% of analyzed population
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                  Medium Vulnerability (Priority 2)
                </span>
                <p className="text-3xl font-extrabold text-amber-900">
                  {vulnerabilityResults?.vulnerabilityTiers?.medium?.count || 0}
                </p>
                <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-600 h-1.5 rounded-full"
                    style={{ width: `${vulnerabilityResults?.vulnerabilityTiers?.medium?.percentage || 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-amber-700 block">
                  {vulnerabilityResults?.vulnerabilityTiers?.medium?.percentage || 0}% of analyzed population
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Standard Profile (Priority 3)
                </span>
                <p className="text-3xl font-extrabold text-slate-800">
                  {vulnerabilityResults?.vulnerabilityTiers?.low?.count || 0}
                </p>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-slate-600 h-1.5 rounded-full"
                    style={{ width: `${vulnerabilityResults?.vulnerabilityTiers?.low?.percentage || 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-600 block">
                  {vulnerabilityResults?.vulnerabilityTiers?.low?.percentage || 0}% of analyzed population
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MERGE CONFIRMATION MODAL                                       */}
      {/* ============================================================== */}
      {mergeModalOpen && selectedPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-indigo-700 font-bold text-base">
                <GitMerge className="h-5 w-5" />
                <span>Confirm Duplicate Merge</span>
              </div>
              <button
                onClick={() => setMergeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Merging transfers any missing profile details from the secondary record into the primary master record. The secondary record will be marked as soft-deleted with an immutable cryptographic audit pointer to the master.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Select Master Record (To Preserve):
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setMasterRecordId(selectedPair.record1?._id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    masterRecordId === selectedPair.record1?._id
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold font-mono text-indigo-700">
                      {selectedPair.record1?.recordNumber}
                    </span>
                    {masterRecordId === selectedPair.record1?._id && (
                      <Check className="h-4 w-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {selectedPair.record1?.data?.fullName || selectedPair.record1?.data?.name || 'Record 1'}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-1">Master Target</span>
                </div>

                <div
                  onClick={() => setMasterRecordId(selectedPair.record2?._id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    masterRecordId === selectedPair.record2?._id
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold font-mono text-indigo-700">
                      {selectedPair.record2?.recordNumber}
                    </span>
                    {masterRecordId === selectedPair.record2?._id && (
                      <Check className="h-4 w-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {selectedPair.record2?.data?.fullName || selectedPair.record2?.data?.name || 'Record 2'}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-1">Master Target</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                The unselected record will be retired from active searches and anchored with action <strong>RECORD_MERGED</strong> in the audit log.
              </span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMergeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMerge}
                disabled={isMerging}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                <GitMerge className="h-3.5 w-3.5" />
                <span>{isMerging ? 'Merging Vault Records...' : 'Confirm & Merge Records'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiCleanPage;

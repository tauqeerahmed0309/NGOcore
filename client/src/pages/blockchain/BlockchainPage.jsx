import React, { useState, useEffect } from 'react';
import { blockchainService } from '../../services/blockchainService';
import { useToast } from '../../context/ToastContext';
import {
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Layers,
  Cpu,
  Clock,
  Sparkles,
  Database,
  ArrowRight,
  Filter,
  AlertCircle,
  FileCheck2
} from 'lucide-react';

const BlockchainPage = () => {
  const { showToast } = useToast();

  const [anchors, setAnchors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [batchTypeFilter, setBatchTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Integrity Check State
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [integrityReport, setIntegrityReport] = useState(null);

  // Anchoring Action State
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [anchorType, setAnchorType] = useState('audit_logs');

  // Manual Leaf Verification State
  const [verifyInput, setVerifyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [leafVerificationResult, setLeafVerificationResult] = useState(null);

  // Inspector Modal State
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [copiedText, setCopiedText] = useState('');

  useEffect(() => {
    fetchAnchors(1);
    runIntegrityCheck(false);
  }, [batchTypeFilter]);

  const fetchAnchors = async (page = 1) => {
    setLoading(true);
    try {
      const data = await blockchainService.getAnchors({
        page,
        limit: 10,
        batchType: batchTypeFilter || undefined
      });
      setAnchors(data.anchors || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      showToast(err.message || 'Failed to load blockchain anchors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const runIntegrityCheck = async (showNotification = true) => {
    setCheckingIntegrity(true);
    try {
      const report = await blockchainService.checkIntegrity();
      setIntegrityReport(report);
      if (showNotification) {
        if (report.isSystemIntact) {
          showToast(`Integrity check complete: ${report.intactCount} anchored entries validated`, 'success');
        } else {
          showToast(`Warning: ${report.tamperedCount} cryptographic mismatch detected!`, 'error');
        }
      }
    } catch (err) {
      console.warn('Integrity check error:', err.message);
    } finally {
      setCheckingIntegrity(false);
    }
  };

  const handleAnchorBatch = async () => {
    setIsAnchoring(true);
    try {
      const res = await blockchainService.anchorBatch({ batchType: anchorType, limit: 100 });
      if (res.alreadyAnchored) {
        showToast('Batch state already anchored on-chain with identical Merkle root', 'info');
      } else {
        showToast('New Merkle root successfully anchored to Polygon L2', 'success');
        fetchAnchors(1);
        runIntegrityCheck(false);
      }
    } catch (err) {
      showToast(err.message || 'Failed to anchor batch', 'error');
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleVerifyLeaf = async (e) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;

    setIsVerifying(true);
    setLeafVerificationResult(null);
    try {
      const res = await blockchainService.verifyLeaf({ leafHash: verifyInput.trim() });
      setLeafVerificationResult(res);
      if (res.verified) {
        showToast('Cryptographic leaf verified on-chain', 'success');
      } else {
        showToast('Leaf hash not found in anchored Merkle trees', 'warning');
      }
    } catch (err) {
      showToast(err.message || 'Verification query failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedText(''), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Polygon Amoy L2 Testnet • EVM RecordAnchor.sol</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Immutable Blockchain Merkle Ledger
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Cryptographically anchors batch Merkle roots of records and audit trails to the Polygon blockchain, enabling mathematical proof of non-tampering for international donors and UN audits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => runIntegrityCheck(true)}
              disabled={checkingIntegrity}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingIntegrity ? 'animate-spin' : ''}`} />
              <span>{checkingIntegrity ? 'Verifying...' : 'Check Database Integrity'}</span>
            </button>

            <button
              onClick={handleAnchorBatch}
              disabled={isAnchoring}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isAnchoring ? 'animate-spin' : ''}`} />
              <span>{isAnchoring ? 'Anchoring to Polygon...' : 'Anchor Batch to Blockchain'}</span>
            </button>
          </div>
        </div>

        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Integrity Health Status Banner */}
      {integrityReport && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
            integrityReport.isSystemIntact
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div
              className={`p-2 rounded-xl flex-shrink-0 ${
                integrityReport.isSystemIntact
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {integrityReport.isSystemIntact ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold">
                {integrityReport.isSystemIntact
                  ? 'Cryptographic Tamper-Proof Integrity: 100% Verified'
                  : `Integrity Alert: ${integrityReport.tamperedCount} Modified Record(s) Detected!`}
              </h4>
              <p className="text-xs opacity-85 mt-0.5">
                {integrityReport.isSystemIntact
                  ? `All ${integrityReport.intactCount} anchored cryptographic leaves recalculate deterministically with zero database discrepancies.`
                  : 'Direct unauthorized modifications or deletions were detected in records that deviate from the on-chain Polygon anchor.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono font-semibold">
            <span>Anchored Batches: {integrityReport.totalAnchors}</span>
            <span>Verified Leaves: {integrityReport.intactCount}</span>
          </div>
        </div>
      )}

      {/* Manual Leaf Verifier Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Search className="h-4 w-4 text-indigo-600" />
              <span>Independent Leaf & Record Hash Verifier</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste any record SHA-256 hash or audit leaf to mathematically verify its inclusion on the Polygon blockchain.
            </p>
          </div>
        </div>

        <form onSubmit={handleVerifyLeaf} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Paste 64-char leaf hash (0x... or sha256)..."
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            className="flex-grow text-xs sm:text-sm font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={isVerifying || !verifyInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isVerifying ? 'Checking Merkle Tree...' : 'Verify On-Chain'}
          </button>
        </form>

        {/* Verification Result Card */}
        {leafVerificationResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-3 animate-fade-in ${
              leafVerificationResult.verified
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center space-x-2">
                {leafVerificationResult.verified ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Proof Valid: Leaf Is Permanently Anchored to Polygon</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>Leaf Hash Not Found in Anchored Merkle Roots</span>
                  </>
                )}
              </span>
              <span className="font-mono text-[11px] opacity-75">
                Proof Sibling Count: {leafVerificationResult.proof?.length || 0}
              </span>
            </div>

            {leafVerificationResult.verified && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px]">
                <div>
                  <span className="text-[10px] text-emerald-700 block font-sans">Merkle Root</span>
                  <span className="truncate block">{leafVerificationResult.merkleRoot}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block font-sans">Polygon Block</span>
                  <span>#{leafVerificationResult.blockNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block font-sans">Transaction Hash</span>
                  <span className="truncate block">{leafVerificationResult.transactionHash}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block font-sans">Explorer</span>
                  <a
                    href={leafVerificationResult.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>PolygonScan</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Anchors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Anchored Merkle Roots ({pagination.total || 0})
            </h3>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={batchTypeFilter}
              onChange={(e) => setBatchTypeFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Batches</option>
              <option value="audit_logs">Audit Logs</option>
              <option value="records">Records Vault</option>
              <option value="files">Files</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <span className="text-xs">Loading on-chain anchors...</span>
          </div>
        ) : anchors.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <LinkIcon className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No Batches Anchored Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Anchor your first batch of records or audit logs to establish an immutable cryptographic proof on Polygon.
            </p>
            <button
              onClick={handleAnchorBatch}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Anchor Current Records
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Merkle Root</th>
                  <th className="py-3 px-4">Batch Type</th>
                  <th className="py-3 px-4">Leaves</th>
                  <th className="py-3 px-4">Polygon Block</th>
                  <th className="py-3 px-4">Tx Hash</th>
                  <th className="py-3 px-4">Anchored At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {anchors.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      <div className="flex items-center space-x-2">
                        <span className="truncate max-w-[140px] sm:max-w-[200px]">
                          {item.merkleRoot}
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.merkleRoot, item._id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {copiedText === item._id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 capitalize font-semibold text-slate-700">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                        {item.batchType?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {item.leafCount} items
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      #{item.blockNumber}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-indigo-600">
                      <a
                        href={item.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center space-x-1"
                      >
                        <span className="truncate max-w-[100px]">{item.transactionHash}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(item.anchoredAt || item.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedAnchor(item)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        Inspect Tree
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspector Modal */}
      {selectedAnchor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-indigo-700 font-bold text-base">
                <Layers className="h-5 w-5" />
                <span>Merkle Tree Structure & On-Chain Proof</span>
              </div>
              <button
                onClick={() => setSelectedAnchor(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  32-Byte Merkle Root (Polygon Amoy L2)
                </span>
                <span className="font-mono text-indigo-700 font-bold break-all block p-2 bg-indigo-50/60 rounded-lg border border-indigo-100">
                  {selectedAnchor.merkleRoot}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Transaction Hash
                  </span>
                  <a
                    href={selectedAnchor.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-indigo-600 hover:underline break-all block"
                  >
                    {selectedAnchor.transactionHash}
                  </a>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Contract Address
                  </span>
                  <span className="font-mono text-slate-700 break-all block">
                    {selectedAnchor.contractAddress}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Anchored Leaf Hashes ({selectedAnchor.leaves?.length || 0})
                </span>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 font-mono text-[11px] bg-slate-50">
                  {selectedAnchor.leaves?.map((l, i) => (
                    <div key={i} className="p-2 flex items-center justify-between">
                      <span className="text-slate-700 truncate max-w-md">{l.hash}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-sans">
                        Leaf #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedAnchor(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockchainPage;

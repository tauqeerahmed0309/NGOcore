import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Database,
  Cpu,
  Lock,
  FileCheck2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Activity,
  Layers,
  ChevronRight,
  Zap,
  Building2,
  FileText,
  KeyRound,
  Shield,
  HelpCircle
} from 'lucide-react';
import { fadeUp, staggerCards, parallax, heroEntrance } from '../../animations';
import SpotlightCard from '../../components/common/SpotlightCard';
import TiltCard from '../../components/common/TiltCard';
import MagneticButton from '../../components/common/MagneticButton';
import AnimatedBackground from '../../components/common/AnimatedBackground';
import Accordion from '../../components/common/Accordion';

const Home = () => {
  const heroRef = useRef(null);
  const badgeRef = useRef(null);
  const headlineRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctasRef = useRef(null);
  const showcaseRef = useRef(null);
  const statsRef = useRef(null);
  const statCardsRef = useRef([]);
  const featuresRef = useRef(null);
  const stepperRef = useRef(null);
  const stepCardsRef = useRef([]);
  const cardsRef = useRef([]);
  const faqRef = useRef(null);
  const ctaRef = useRef(null);

  // Interactive showcase state
  const [activeTab, setActiveTab] = useState('vault'); // 'vault' | 'blockchain' | 'ai'
  const [tickerIndex, setTickerIndex] = useState(0);

  const sampleTickerEvents = [
    { type: 'ledger', text: 'Polygon Anchor: SHA-256 Merkle Root anchored at Block #58,491,756 for Asha Hope Foundation.' },
    { type: 'ai', text: 'AI Clean Scan: Phonetic match check completed — 0 duplicate beneficiary anomalies detected.' },
    { type: 'security', text: 'Tenant Boundary: Cryptographic isolation verified for organization vault [NGO-IND-2024-8849].' },
    { type: 'session', text: 'Session Shield: Argon2id token rotation enforced for Caseworker session across 2 devices.' }
  ];

  const faqItems = [
    {
      question: 'How long does the NGO verification and onboarding process take?',
      answer: 'Our Platform Compliance Officers review submitted registration certificates and trust deeds within 24 to 48 business hours. You will receive an automated notification as soon as your organization vault is activated.'
    },
    {
      question: 'Can other NGOs or third parties view our beneficiary records?',
      answer: "Never. NGOcore is built from the ground up on zero-trust multi-tenancy. Every record query, upload, and update is cryptographically scoped to your NGO ID. No organization can access or query another tenant's vault."
    },
    {
      question: 'How does the immutable blockchain audit anchoring work?',
      answer: 'Whenever records or files are created or modified, a deterministic cryptographic SHA-256 hash is computed and bundled into a Merkle root anchored to an immutable ledger (Polygon L2). Auditors can mathematically verify that no records were tampered with retroactively.'
    },
    {
      question: 'How does AI duplicate detection help our field operations?',
      answer: 'During food aid, medical supplies, or cash assistance drives, beneficiaries may register multiple times under slight phonetic variations or spelling errors. Our AI fuzzy matching detects duplicate registrations instantly, preventing duplicate aid distribution and preserving resources.'
    },
    {
      question: 'What happens if a staff member loses their phone or laptop?',
      answer: 'NGO Administrators can immediately view all active multi-device sessions and terminate any specific session remotely. Furthermore, our rotating token family automatically invalidates any replayed refresh cookies.'
    },
    {
      question: 'Are records compliant with UN, GDPR, and international donor grant audits?',
      answer: 'Yes. NGOcore supports one-click cryptographic audit exports, full field-level encryption (AES-256), and complete GDPR/DPDP-compliant right-to-be-forgotten certificate generation.'
    }
  ];

  useEffect(() => {
    // Hero Entrance Choreography
    heroEntrance({
      badge: badgeRef.current,
      headline: headlineRef.current,
      subtitle: subtitleRef.current,
      ctas: ctasRef.current,
      showcase: showcaseRef.current
    });

    // Scroll-reveal animations (fade-up with card stagger)
    fadeUp(statsRef.current, 0.1);
    if (statCardsRef.current.length > 0 && statsRef.current) {
      staggerCards(statsRef.current, statCardsRef.current.filter(Boolean));
    }

    if (cardsRef.current.length > 0 && featuresRef.current) {
      staggerCards(featuresRef.current, cardsRef.current.filter(Boolean));
    }

    fadeUp(stepperRef.current, 0.1);
    if (stepCardsRef.current.length > 0 && stepperRef.current) {
      staggerCards(stepperRef.current, stepCardsRef.current.filter(Boolean));
    }

    if (faqRef.current) {
      fadeUp(faqRef.current, 0.15);
    }

    if (ctaRef.current) {
      fadeUp(ctaRef.current, 0.15);
    }

    const bgEl = heroRef.current?.querySelector('.hero-bg');
    if (bgEl) {
      parallax(bgEl, 0.15);
    }

    // Auto-cycle live ticker
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % sampleTickerEvents.length);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Database className="h-6 w-6 text-indigo-600" />,
      title: 'Strict Multi-Tenant Isolation',
      desc: 'Each NGO operates within a dedicated, cryptographically scoped database boundary. Zero cross-tenant data bleed guaranteed at the query and indexing layers.',
      tag: 'Tenant Boundary'
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-teal-600" />,
      title: 'Polygon Merkle Proofs',
      desc: 'Beneficiary and aid distribution audit logs are bundled into SHA-256 Merkle trees and anchored to Polygon L2, making retroactive record alteration mathematically impossible.',
      tag: 'Cryptographic Proof'
    },
    {
      icon: <Cpu className="h-6 w-6 text-indigo-600" />,
      title: 'AI Deduplication & Cleaning',
      desc: 'Dual-algorithm fuzzy matching (Soundex phonetic + Levenshtein distance) catches spelling variations and duplicate aid claims across relief missions.',
      tag: 'AI Matching'
    },
    {
      icon: <Users className="h-6 w-6 text-teal-600" />,
      title: 'Granular Role-Based Access',
      desc: 'Define custom permission matrices for Executive Admins, Program Directors, Field Caseworkers, and External Auditors with resource-level wildcards.',
      tag: 'RBAC Matrices'
    },
    {
      icon: <Lock className="h-6 w-6 text-indigo-600" />,
      title: 'Multi-Device Session Shield',
      desc: 'Argon2id password hashing, rotating refresh cookies, and remote session revocation ensure credentials cannot be hijacked by token-replay attacks.',
      tag: 'Argon2id Guard'
    },
    {
      icon: <FileCheck2 className="h-6 w-6 text-teal-600" />,
      title: 'Audit-Ready Donor Reports',
      desc: 'Generate instant verifiable impact packages and export cryptographic integrity certificates compliant with UN, USAID, and European grant audits.',
      tag: 'Audit Ready'
    }
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Register Organization',
      desc: 'Submit your registered NGO name, official contact, and Executive Administrator credentials to initiate tenant isolation.',
      icon: Building2
    },
    {
      step: '02',
      title: 'Legal Verification',
      desc: 'Platform compliance officers review government registration certificates and trust deeds within 24–48 hours.',
      icon: FileText
    },
    {
      step: '03',
      title: 'Vault Activation',
      desc: 'Your isolated database boundary is instantiated with custom AES-256 encryption keys and default administrative roles.',
      icon: KeyRound
    },
    {
      step: '04',
      title: 'Operational Management',
      desc: 'Record beneficiary cases, execute AI duplicate scans, assign team permissions, and verify immutable blockchain audit trails.',
      icon: Shield
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      <Helmet>
        <title>NGOcore | High-Trust Digital Record & AI Vault</title>
        <meta
          name="description"
          content="NGOcore: Enterprise multi-tenant digital record management platform for NGOs with AES-256 encrypted vaults, AI deduplication, and blockchain audit verification."
        />
      </Helmet>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden flex flex-col items-center text-center px-4 sm:px-6 lg:px-8"
      >
        <AnimatedBackground />

        {/* Announcement Pill: Clean single-layer SaaS badge */}
        <div
          ref={badgeRef}
          className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-white/95 border border-indigo-200/80 shadow-xs mb-8 text-xs font-semibold text-indigo-900 hover:border-indigo-400 hover:shadow-sm transition-all cursor-default select-none"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
          </span>
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Enterprise Multi-Tenant Infrastructure &bull; Verified Organization Vaults</span>
        </div>

        {/* Hero Headline: Fluid Typography with clamp (Fix Bug #5) */}
        <h1
          ref={headlineRef}
          className="text-fluid-h1 text-slate-900 tracking-tight max-w-4xl mb-6 font-heading"
        >
          Empowering Humanitarian Impact with{' '}
          <span className="gradient-text">Verifiable, Intelligent Data</span>
        </h1>

        {/* Subtitle / Lead Paragraph */}
        <p
          ref={subtitleRef}
          className="text-fluid-lead text-slate-600 mb-10 font-normal leading-relaxed mx-auto"
        >
          Replace vulnerable spreadsheets and fragmented silos with an encrypted, AI-enhanced, blockchain-anchored platform built specifically for humanitarian organizations.
        </p>

        {/* CTAs with Magnetic Effect */}
        <div
          ref={ctasRef}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-16"
        >
          <MagneticButton
            to="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition-all text-base group cursor-pointer"
          >
            <span>Register Your Organization</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
          </MagneticButton>
          <MagneticButton
            to="/about"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-8 py-3.5 rounded-xl font-bold shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all text-base cursor-pointer"
          >
            <span>Platform Security Architecture</span>
          </MagneticButton>
        </div>

        {/* Showcase Container with 3D Mouse Tilt & Non-Overlapping Edge Floating Badges */}
        <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 relative">
          {/* Floating Live Badge Left: Positioned safely at outer perimeter, never overlapping content */}
          <div className="hidden xl:flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-200/50 absolute -left-12 top-20 z-20 pointer-events-none select-none animate-float-badge cursor-default">
            <div className="h-7 w-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-slate-900 block">Strict Tenant Boundary</span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Deterministic Tenant Scoping</span>
              </span>
            </div>
          </div>

          {/* Floating Live Badge Right: Positioned safely at outer perimeter, never overlapping content */}
          <div className="hidden xl:flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-200/50 absolute -right-12 bottom-20 z-20 pointer-events-none select-none animate-float-badge-delayed cursor-default">
            <div className="h-7 w-7 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-bold text-slate-900 block">Blockchain Verification</span>
              <span className="text-[10px] text-teal-700 font-semibold font-mono">
                Polygon L2 Merkle Proofs
              </span>
            </div>
          </div>

          {/* 3D Perspective Card with Light Specular Sheen */}
          <TiltCard
            ref={showcaseRef}
            maxTilt={5}
            className="rounded-2xl p-1 bg-gradient-to-b from-indigo-500/20 via-slate-200/60 to-slate-200/30 shadow-2xl shadow-indigo-950/10"
          >
            <div className="bg-white rounded-[14px] border border-slate-200/80 overflow-hidden text-left shadow-inner">
              {/* Window Header Bar with Honest Sample Preview Banner (Fix Bug #6) */}
              <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400 inline-block"></span>
                  <span className="h-3 w-3 rounded-full bg-amber-400 inline-block"></span>
                  <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block"></span>
                  <span className="text-xs font-mono text-slate-500 ml-3 hidden sm:inline">
                    vault.ngocore.org &bull; Asha Hope Foundation [Sample Preview]
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 cursor-default">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Approved & Verified Vault</span>
                </div>
              </div>

              {/* Showcase Body */}
              <div className="p-4 sm:p-6 bg-slate-50/50">
                {/* Metric Quick-Pills with Gentle Hover Float */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 cursor-default">
                    <span className="text-xs font-medium text-slate-500 block">Beneficiary Records</span>
                    <span className="text-lg font-bold text-slate-900 font-heading">Encrypted Cases</span>
                    <span className="text-[11px] text-indigo-600 font-semibold block mt-0.5">AES-256 Field Security</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 cursor-default">
                    <span className="text-xs font-medium text-slate-500 block">Blockchain Anchors</span>
                    <span className="text-lg font-bold text-slate-900 font-heading">Polygon L2</span>
                    <span className="text-[11px] text-teal-600 font-semibold block mt-0.5">SHA-256 Merkle Roots</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 cursor-default">
                    <span className="text-xs font-medium text-slate-500 block">AI Deduplication</span>
                    <span className="text-lg font-bold text-slate-900 font-heading">Phonetic Scan</span>
                    <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">Soundex + Levenshtein</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 cursor-default">
                    <span className="text-xs font-medium text-slate-500 block">Tenancy Scoping</span>
                    <span className="text-lg font-bold text-slate-900 font-heading">Zero-Trust</span>
                    <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">Strict Tenant Boundary</span>
                  </div>
                </div>

                {/* Interactive Feature Tabs */}
                <div className="flex items-center space-x-2 mb-4 border-b border-slate-200 pb-3 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('vault')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'vault'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Encrypted Beneficiary Vault
                  </button>
                  <button
                    onClick={() => setActiveTab('blockchain')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'blockchain'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Blockchain Ledger Stream
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'ai'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    AI Smart Clean Engine
                  </button>
                </div>

                {/* Tab 1: Beneficiary Vault Table */}
                {activeTab === 'vault' && (
                  <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs animate-fade-in">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/60 font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Beneficiary Code</th>
                            <th className="px-4 py-2.5">Program</th>
                            <th className="px-4 py-2.5">Location</th>
                            <th className="px-4 py-2.5">Verification</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          <tr className="hover:bg-indigo-50/50 transition-colors cursor-pointer group">
                            <td className="px-4 py-3 font-mono font-semibold text-indigo-700 group-hover:text-indigo-900">
                              BEN-2026-00001
                            </td>
                            <td className="px-4 py-3 font-medium">Emergency Food Relief</td>
                            <td className="px-4 py-3 text-slate-500">Indore District Hub</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-400 group-hover:text-indigo-600">
                              0xf428...300b
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Verified
                              </span>
                            </td>
                          </tr>
                          <tr className="hover:bg-indigo-50/50 transition-colors cursor-pointer group">
                            <td className="px-4 py-3 font-mono font-semibold text-indigo-700 group-hover:text-indigo-900">
                              BEN-2026-00002
                            </td>
                            <td className="px-4 py-3 font-medium">Primary Healthcare Aid</td>
                            <td className="px-4 py-3 text-slate-500">Community Health Post</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-400 group-hover:text-teal-600">
                              0x6fa2...1cf1
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                Anchored
                              </span>
                            </td>
                          </tr>
                          <tr className="hover:bg-indigo-50/50 transition-colors cursor-pointer group">
                            <td className="px-4 py-3 font-mono font-semibold text-indigo-700 group-hover:text-indigo-900">
                              BEN-2026-00003
                            </td>
                            <td className="px-4 py-3 font-medium">Child Nutrition Drive</td>
                            <td className="px-4 py-3 text-slate-500">Residency Area Ward 4</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-400 group-hover:text-indigo-600">
                              0xd6a1...3201
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Audited
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab 2: Blockchain Ledger Stream */}
                {activeTab === 'blockchain' && (
                  <div className="bg-slate-950 text-slate-300 p-5 rounded-xl border border-slate-800 font-mono text-xs space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                      <span>Ledger Anchor: Polygon Amoy L2 Testnet</span>
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Synchronized</span>
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-slate-900 transition-colors">
                        <span className="text-indigo-400 font-bold">ROOT: 0xd6a1...3201</span>
                        <span className="text-slate-400">BATCH_ANCHOR (3 Records)</span>
                        <span className="text-emerald-400 font-semibold">BLOCK #58491756</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-slate-900 transition-colors">
                        <span className="text-indigo-400 font-bold">TX: 0x6fa2...1cf1</span>
                        <span className="text-slate-400">MERKLE_ROOT_POSTED</span>
                        <span className="text-emerald-400 font-semibold">CONFIRMED</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-slate-900 transition-colors">
                        <span className="text-indigo-400 font-bold">PROOF: INCLUSION_VERIFIED</span>
                        <span className="text-slate-400">BEN-2026-00001</span>
                        <span className="text-emerald-400 font-semibold">VALIDATED</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: AI Smart Clean View */}
                {activeTab === 'ai' && (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 text-xs space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Cpu className="h-5 w-5 text-indigo-600" />
                        <span className="font-bold text-sm text-slate-900">AI Phonetic & Spelling Deduplication</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        Algorithms: Soundex + Levenshtein
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block mb-1">Phonetic Similarity</span>
                        <span className="text-sm font-bold text-slate-800">Soundex Algorithm</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Catches spelling variations</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block mb-1">Levenshtein Distance</span>
                        <span className="text-sm font-bold text-teal-600">Threshold: 85%+</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Precision duplicate ranking</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block mb-1">Audit Record Merge</span>
                        <span className="text-sm font-bold text-indigo-600">One-Click Merge</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Soft-retires duplicates</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Activity Ticker */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
                    <span className="font-semibold text-slate-700">Audit Stream:</span>
                    <span className="font-mono text-slate-600 truncate transition-all duration-300">
                      {sampleTickerEvents[tickerIndex].text}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-600 font-bold ml-2 flex-shrink-0">
                    Live Engine
                  </span>
                </div>
              </div>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* Platform Core Architectural Standards (Authentic & Factual Strip) */}
      <section
        ref={statsRef}
        id="security"
        className="py-16 sm:py-20 bg-slate-900 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 opacity-90"></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-teal-400 text-xs font-bold uppercase tracking-wider block mb-2">
              Architectural Security Principles
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
              Built on Zero-Trust Cryptography & Human Rights Privacy
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div ref={(el) => (statCardsRef.current[0] = el)} className="h-full">
              <SpotlightCard
                spotlightColor="rgba(99, 102, 241, 0.28)"
                className="h-full p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:border-indigo-400/60 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Database className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5 font-heading">Zero-Trust Tenancy</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deterministic tenant injection guarantees no organization can ever view or query another NGO's database vault.
                </p>
              </SpotlightCard>
            </div>

            <div ref={(el) => (statCardsRef.current[1] = el)} className="h-full">
              <SpotlightCard
                spotlightColor="rgba(20, 184, 166, 0.28)"
                className="h-full p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:border-teal-400/60 hover:-translate-y-2 hover:shadow-xl hover:shadow-teal-500/20 transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-400/20 flex items-center justify-center text-teal-400 mb-4">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5 font-heading">AES-256 Field Security</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sensitive beneficiary PII (national IDs, phone numbers, addresses) is encrypted at rest using AES-256-GCM.
                </p>
              </SpotlightCard>
            </div>

            <div ref={(el) => (statCardsRef.current[2] = el)} className="h-full">
              <SpotlightCard
                spotlightColor="rgba(99, 102, 241, 0.28)"
                className="h-full p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:border-indigo-400/60 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-400/20 flex items-center justify-center text-indigo-400 mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5 font-heading">Polygon Merkle Anchors</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cryptographic Merkle tree roots are pinned to public Polygon blocks, rendering audit trails tamper-evident.
                </p>
              </SpotlightCard>
            </div>

            <div ref={(el) => (statCardsRef.current[3] = el)} className="h-full">
              <SpotlightCard
                spotlightColor="rgba(16, 185, 129, 0.28)"
                className="h-full p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:border-emerald-400/60 hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 mb-4">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5 font-heading">DPDP & GDPR Compliance</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Complete consent lifecycle management, right-to-be-forgotten cryptographic certificates, and 5-year retention rules.
                </p>
              </SpotlightCard>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section ref={featuresRef} id="features" className="py-24 sm:py-32 bg-slate-50 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-indigo-600 font-bold text-xs uppercase tracking-wider block mb-2">
              Comprehensive Capability Suite
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 font-heading">
              Engineered for Humanitarian Relief & Audit Rigor
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Every feature is built strictly around zero-trust multi-tenancy, international data privacy, and humanitarian operational ease.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={f.title}
                ref={(el) => (cardsRef.current[i] = el)}
                className="h-full"
              >
                <SpotlightCard
                  spotlightColor="rgba(99, 102, 241, 0.16)"
                  className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-2xl hover:shadow-indigo-500/12 hover:border-indigo-300 hover:-translate-y-2 hover:ring-1 hover:ring-indigo-400/20 transition-all duration-300 group cursor-default h-full flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-gradient-to-tr group-hover:from-indigo-600 group-hover:to-teal-500 group-hover:text-white transition-all duration-300 shadow-xs">
                        {f.icon}
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                        {f.tag}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors font-heading">
                      {f.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center text-xs font-bold text-indigo-600">
                    <span>Active Security Capability</span>
                    <CheckCircle2 className="h-3.5 w-3.5 ml-1.5 text-teal-600" />
                  </div>
                </SpotlightCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* "How It Works" 4-Step Flow */}
      <section ref={stepperRef} id="how-it-works" className="py-24 bg-white border-y border-slate-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-teal-600 font-bold text-xs uppercase tracking-wider block mb-2">
              Onboarding & Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4 font-heading">
              From Registration to Verified Operation
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Our compliant onboarding process ensures only legitimate charities and relief missions access the platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  ref={(el) => (stepCardsRef.current[idx] = el)}
                  className="relative group h-full"
                >
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 h-full hover:bg-white hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black text-indigo-600/30 font-heading">
                        {step.step}
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs group-hover:scale-110 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">{step.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section ref={faqRef} id="faq" className="py-24 bg-slate-50 scroll-mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-indigo-600 font-bold text-xs uppercase tracking-wider block mb-2">
              Answers & Documentation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4 font-heading">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Clear answers regarding zero-trust tenancy, blockchain anchors, and compliance verification.
            </p>
          </div>

          <Accordion items={faqItems} />
        </div>
      </section>

      {/* Pre-Footer Conversion CTA */}
      <section ref={ctaRef} id="contact" className="py-20 bg-slate-50 relative overflow-hidden scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-10 sm:p-14 text-center text-white shadow-2xl overflow-hidden border border-indigo-800/40">
            {/* Glowing Orbs */}
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading">
                Ready to Upgrade Your Organization's Digital Records?
              </h2>
              <p className="text-indigo-200 text-base leading-relaxed">
                Join verified humanitarian organizations operating on NGOcore with complete tenant isolation and cryptographic verification.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <MagneticButton
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white hover:bg-slate-100 text-slate-950 px-8 py-3.5 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all text-sm group cursor-pointer"
                >
                  <span>Register Organization Account</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
                </MagneticButton>
                <MagneticButton
                  to="/contact"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold text-white border border-indigo-400/30 hover:bg-white/10 hover:border-indigo-400/60 transition-all text-sm cursor-pointer"
                >
                  <span>Compliance Desk Consultation</span>
                </MagneticButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

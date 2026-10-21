import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/guards/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CustomCursor from './components/common/CustomCursor';
import Accordion from './components/common/Accordion';

// Public Pages
import Home from './pages/public/Home';
import GenericPage from './pages/public/GenericPage';
import PendingApproval from './pages/public/PendingApproval';
import RejectedPage from './pages/public/RejectedPage';
import SuspendedPage from './pages/public/SuspendedPage';
import NotFoundPage from './pages/public/NotFoundPage';
import ForbiddenPage from './pages/public/ForbiddenPage';

// Auth Pages
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import VerifyOTP from './pages/auth/VerifyOTP';
import Onboarding from './pages/auth/Onboarding';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AcceptInvitation from './pages/auth/AcceptInvitation';

// Authenticated Application Pages
import Dashboard from './pages/dashboard/Dashboard';
import UserProfile from './pages/profile/UserProfile';
import NgoSettings from './pages/ngo/NgoSettings';
import AuditLogs from './pages/audit/AuditLogs';
import RecordsPage from './pages/records/RecordsPage';
import ReportsPage from './pages/reports/ReportsPage';
import AiCleanPage from './pages/ai/AiCleanPage';
import BlockchainPage from './pages/blockchain/BlockchainPage';

import {
  ShieldCheck,
  CheckCircle2,
  Database,
  Cpu,
  Users,
  Mail,
  Phone,
  MapPin,
  FileCheck2
} from 'lucide-react';

/**
 * Public Layout with Header and Footer
 */
const PublicLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
      answer: 'Whenever records or files are created or modified, a deterministic cryptographic SHA-256 hash is computed and bundled into a Merkle root anchored to an immutable ledger (such as Polygon). Auditors can mathematically verify that no records were tampered with retroactively.'
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
      answer: 'Yes. NGOcore supports one-click cryptographic audit exports, full field-level encryption (AES-256), and complete GDPR-compliant right-to-be-forgotten certificate generation.'
    }
  ];

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <CustomCursor />
          <Routes>
            {/* PUBLIC & MARKETING LAYOUT */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />

              {/* About Us Page */}
              <Route
                path="/about"
                element={
                  <GenericPage
                    title="About NGOcore"
                    subtitle="The mission-critical digital operating system engineered for non-profit organizations and humanitarian foundations worldwide."
                    content={
                      <div className="space-y-6">
                        <p className="text-base text-slate-600 leading-relaxed">
                          Founded on the principle that humanitarian teams deserve the same caliber of security, AI automation, and verifiable auditing as the world's leading financial institutions, <strong>NGOcore</strong> provides an end-to-end digital records infrastructure.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4 pt-2">
                          <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 hover:border-indigo-300 transition-colors">
                            <ShieldCheck className="h-6 w-6 text-indigo-600 mb-2" />
                            <h4 className="font-bold text-slate-900 text-sm mb-1">Zero-Trust Isolation</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Every NGO tenant has an isolated cryptographic scope. Beneficiary details, staff rosters, and financial records never leak across tenants.
                            </p>
                          </div>

                          <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-100 hover:border-teal-300 transition-colors">
                            <FileCheck2 className="h-6 w-6 text-teal-600 mb-2" />
                            <h4 className="font-bold text-slate-900 text-sm mb-1">Blockchain Verification</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Every recorded activity and document hash is permanently anchored to an immutable ledger, ensuring 100% transparency for grant audits.
                            </p>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 pt-4">Our Core Values</h3>
                        <ul className="space-y-3 text-sm text-slate-600">
                          <li className="flex items-start space-x-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Humanitarian Data Dignity:</strong> We safeguard vulnerable beneficiary data with state-of-the-art encryption standards.</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Audit Absolute Trust:</strong> Empowering NGOs to pass donor, UN, and government compliance audits effortlessly.</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Operational Efficiency:</strong> Eliminating manual paperwork with AI-driven deduplication and real-time syncing.</span>
                          </li>
                        </ul>
                      </div>
                    }
                  />
                }
              />

              {/* Features Page */}
              <Route
                path="/features"
                element={
                  <GenericPage
                    title="Platform Architecture & Features"
                    subtitle="Explore our comprehensive suite of record vaults, AI cleaning engines, and multi-tenant security layers."
                    content={
                      <div className="space-y-6">
                        <div className="grid gap-6">
                          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-3 mb-2">
                              <Database className="h-5 w-5 text-indigo-600" />
                              <h3 className="font-bold text-slate-900 text-base">Encrypted Record Vaults</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                              Securely manage beneficiary files, social casework records, healthcare history, and emergency distribution logs. All fields are protected by AES-256 field-level encryption with strict tenant isolation.
                            </p>
                          </div>

                          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-3 mb-2">
                              <Cpu className="h-5 w-5 text-teal-600" />
                              <h3 className="font-bold text-slate-900 text-base">AI Deduplication & Data Sanitization</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                              Intelligent fuzzy matching algorithms identify duplicate beneficiary registrations across regional distribution drives, eliminating duplicate aid allocation and conserving NGO resources.
                            </p>
                          </div>

                          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                            <div className="flex items-center space-x-3 mb-2">
                              <Users className="h-5 w-5 text-indigo-600" />
                              <h3 className="font-bold text-slate-900 text-base">Granular Role-Based Access Control (RBAC)</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                              Assign explicit permissions per role: NGO Admins, Project Officers, Caseworkers, and External Auditors. Wildcard permission structures allow strict least-privilege enforcement.
                            </p>
                          </div>
                        </div>
                      </div>
                    }
                  />
                }
              />

              {/* Contact Page */}
              <Route
                path="/contact"
                element={
                  <GenericPage
                    title="Contact Verification & Support"
                    subtitle="Our compliance and engineering desks are standing by to assist your non-profit organization."
                    content={
                      <div className="space-y-6">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Have questions regarding onboarding approval, grant compliance, or security verifications? Get in touch with our team directly.
                        </p>

                        <div className="grid sm:grid-cols-3 gap-4 pt-2">
                          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 hover:border-indigo-300 transition-colors">
                            <Mail className="h-6 w-6 text-indigo-600 mx-auto" />
                            <h4 className="font-bold text-slate-900 text-xs">Email Desk</h4>
                            <p className="text-xs text-slate-500">support@ngocore.org</p>
                          </div>

                          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 hover:border-teal-300 transition-colors">
                            <Phone className="h-6 w-6 text-teal-600 mx-auto" />
                            <h4 className="font-bold text-slate-900 text-xs">Emergency Helpline</h4>
                            <p className="text-xs text-slate-500">+91 1800 555 0199</p>
                          </div>

                          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 hover:border-indigo-300 transition-colors">
                            <MapPin className="h-6 w-6 text-indigo-600 mx-auto" />
                            <h4 className="font-bold text-slate-900 text-xs">India Compliance HQ</h4>
                            <p className="text-xs text-slate-500">Bengaluru, Karnataka, India</p>
                          </div>
                        </div>
                      </div>
                    }
                  />
                }
              />

              {/* Privacy Policy */}
              <Route
                path="/privacy"
                element={
                  <GenericPage
                    title="Privacy & Data Governance Policy"
                    subtitle="How NGOcore protects beneficiary records, NGO credentials, and operational metadata."
                    content={
                      <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        <p>
                          <strong>1. Tenant Data Isolation:</strong> Every record entered by an NGO is strictly encapsulated within that NGO's database boundary. Our backend enforces tenancy scoping at both the middleware and database schema index levels.
                        </p>
                        <p>
                          <strong>2. Zero Knowledge Passwords:</strong> User passwords are never stored in plaintext or reversible formats. We enforce memory-hard Argon2id key derivation functions with unique cryptographic salts.
                        </p>
                        <p>
                          <strong>3. Encrypted File Storage:</strong> Verification files and uploaded beneficiary documents are encrypted before persistence in redundant cloud storage buckets.
                        </p>
                        <p>
                          <strong>4. Digital Personal Data Protection (DPDP) Act 2023:</strong> In accordance with India's DPDP Act 2023 and global privacy standards, organizations can request data export packages or cryptographically verified record purge certificates at any time. Masked Aadhaar storage ensures zero plain Aadhaar numbers are persisted or exposed.
                        </p>
                      </div>
                    }
                  />
                }
              />

              {/* Terms of Use */}
              <Route
                path="/terms"
                element={
                  <GenericPage
                    title="Terms of Service"
                    subtitle="Operational terms, verified NGO responsibilities, and platform guarantees."
                    content={
                      <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                        <p>
                          <strong>1. Verification Mandate:</strong> Only legitimately registered non-governmental organizations, charities, and philanthropic trusts may operate active vaults on the NGOcore platform. Platform administrators reserve the right to demand recertification of legal documents.
                        </p>
                        <p>
                          <strong>2. Beneficiary Consent:</strong> Organizations using NGOcore to collect sensitive beneficiary information confirm they have obtained necessary local consents for record keeping and humanitarian relief distribution.
                        </p>
                        <p>
                          <strong>3. Security Integrity:</strong> Unauthorized attempts to bypass tenant boundaries, execute replay attacks, or tamper with blockchain audit hashes will result in immediate tenant revocation and referral to relevant regulatory bodies.
                        </p>
                      </div>
                    }
                  />
                }
              />

              {/* FAQ */}
              <Route
                path="/faq"
                element={
                  <GenericPage
                    title="Frequently Asked Questions"
                    subtitle="Clear answers to common questions about onboarding, verification, and technical security."
                    content={<Accordion items={faqItems} />}
                  />
                }
              />

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/rejected" element={<RejectedPage />} />
              <Route path="/suspended" element={<SuspendedPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
            </Route>

            {/* AUTHENTICATED APPSHELL LAYOUT */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/beneficiaries" element={<RecordsPage />} />
              <Route path="/ai-clean" element={<AiCleanPage />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/settings" element={<NgoSettings />} />
              <Route path="/ngo/settings" element={<NgoSettings />} />
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/blockchain" element={<BlockchainPage />} />
              <Route path="/verify" element={<BlockchainPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            {/* ERROR & STATUS ROUTES */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

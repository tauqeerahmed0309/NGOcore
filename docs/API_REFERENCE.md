# NGOcore API Reference Specification

Base URL: `http://localhost:5000/api/v1`

All authenticated endpoints require an `Authorization: Bearer <access_token>` header or authenticated HTTP-only session cookies.

---

## 1. Authentication & Session (`/auth`)
- `POST /auth/register` - Create new NGO and Administrator account.
- `POST /auth/login` - Authenticate with email/password; returns JWT access token and sets rotating refresh cookie.
- `POST /auth/logout` - Invalidate current session token family.
- `POST /auth/refresh` - Refresh access token using rotating refresh token.
- `POST /auth/verify-otp` - Verify email OTP code during onboarding.
- `POST /auth/forgot-password` - Request password recovery token via email.
- `POST /auth/reset-password` - Reset password using verified reset token.

---

## 2. Records Vault & Custom Schema (`/records`)
- `GET /records/types` - List custom and predefined record schemas for current NGO.
- `POST /records/types` - Create bespoke custom record schema with custom fields and encryption flags.
- `POST /records/types/seed` - Provision non-profit standard predefined schemas.
- `GET /records` - Query paginated records with optional search, status, and schema filters.
- `GET /records/:id` - Fetch single record details (transparently decrypts authorized fields).
- `POST /records` - Create new record with automatic sequential numbering and AES-256 field encryption.
- `PATCH /records/:id` - Update existing record data and re-encrypt sensitive fields.
- `DELETE /records/:id` - Soft-delete record with cryptographic audit trail.
- `GET /records/template/:recordTypeId` - Download RFC-4180 CSV import template.
- `POST /records/import/:recordTypeId` - Bulk import multi-row CSV dataset.
- `GET /records/export` - Export records to CSV with optional DPDP privacy redaction.

---

## 3. Data Privacy & DPDP Compliance (`/privacy`)
- `POST /privacy/consent` - Capture digital consent certificate with valid purpose and proof type.
- `PATCH /privacy/consent/:id/withdraw` - Revoke consent upon data principal notice.
- `POST /privacy/erasure` - Execute DPDP Right to be Forgotten (redacts PII to `[REDACTED_DPDP_RIGHT_TO_ERASURE]`).
- `GET /privacy/portability/:recordId` - Export GDPR/DPDP Subject Access Request (SAR) compliance bundle.

---

## 4. AI Engine & Data Sanitization (`/ai`)
- `POST /ai/deduplicate` - Phonetic Soundex and Levenshtein similarity duplicate candidate scan.
- `POST /ai/anomalies` - Detect demographic omissions, invalid phone formats, and statistical outliers.
- `POST /ai/merge` - Merge duplicate records into master profile; soft-deletes secondary record with audit pointer.
- `POST /ai/vulnerability` - Cluster beneficiaries into High, Medium, and Low vulnerability priority tiers.
- `GET /ai/forecast` - Project future relief aid resource demand for next $N$ periods.
- `GET /ai/history` - Retrieve past AI execution scan summaries.

---

## 5. Blockchain Anchoring & Merkle Proofs (`/blockchain`)
- `POST /blockchain/anchor` - Anchor a batch of audit logs or records into a Merkle root on Polygon L2.
- `POST /blockchain/verify-leaf` - Verify inclusion of a specific leaf hash or entity on-chain with Merkle proofs.
- `GET /blockchain/integrity` - Recalculate live database entity hashes to detect out-of-band database tampering.
- `GET /blockchain/anchors` - Query all historical on-chain anchors with PolygonScan Amoy explorer links.

---

## 6. Immutable Audit Trail (`/audit`)
- `GET /audit` - Query chronological append-only audit trail logs with SHA-256 hash chaining.
- `GET /audit/verify` - Validate mathematical hash continuity of the entire audit chain.
- `GET /audit/export` - Export verifiable audit log report for donor grant compliance.

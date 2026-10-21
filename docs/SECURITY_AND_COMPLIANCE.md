# NGOcore Security & Compliance Whitepaper

## 1. Compliance Standards Alignment
NGOcore is specifically architected to guarantee compliance with:
- **Digital Personal Data Protection (DPDP) Act 2023 (India)**
- **General Data Protection Regulation (GDPR) (EU 2016/679)**
- **UN OCHA Data Responsibility Guidelines for Humanitarian Action**

---

## 2. Cryptographic Security Safeguards

### A. Password Security (Argon2id)
All user passwords are encrypted using memory-hard **Argon2id** key derivation functions. Passwords are never stored in plaintext or with reversible encryption.

### B. Vault Field-Level Encryption (AES-256-GCM)
Sensitive PII fields designated by administrators (such as National ID, Phone Number, Healthcare notes, and Bank details) are encrypted at rest using AES-256 in Galois/Counter Mode (GCM).
- Every encryption operation generates a unique 12-byte initialization vector (IV).
- The 16-byte authentication tag guarantees ciphertext integrity against bit-flipping attacks.
- Format: `enc:v1:<hex_iv>:<hex_ciphertext>:<hex_auth_tag>`.

### C. Cryptographic Audit Hash Chaining (SHA-256)
Every critical action in the system is immutably recorded in the `AuditLog` collection.
- Each log document incorporates the deterministic hash of the previous log document (`previousHash`), forming a continuous SHA-256 hash chain starting from `GENESIS_HASH`.
- Pre-save hooks prevent document modification or deletion (`isNew` guard).
- The mathematical continuity of the chain can be verified with a single click.

---

## 3. Data Subject Rights & DPDP Implementation

1. **Digital Consent Management**:
   Every beneficiary record captures explicit purpose tags (`'Humanitarian Aid & Relief'`, `'Medical Services'`, etc.) and collection proof methods (`'Written Form'`, `'Digital OTP'`, `'Verbal Witness'`). Consents can be withdrawn at any time.

2. **Right to be Forgotten (Cryptographic PII Redaction)**:
   When an erasure request is executed:
   - Sensitive fields in the database are overwritten with `[REDACTED_DPDP_RIGHT_TO_ERASURE]`.
   - Field ciphertext references are cleared from `encryptedFields`.
   - The primary record ID, chronological timestamps, and audit log history are preserved to prevent breaking relational constraints and grant accounting records.
   - An immutable erasure certificate is issued with a deterministic SHA-256 proof.

3. **Subject Access Request (SAR) Portability**:
   Generates a JSON compliance bundle containing all consents, personal profile entries, aid distribution logs, and file attachments mapped to the requesting data subject.

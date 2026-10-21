# NGOcore System Architecture

## 1. High-Level Topology

NGOcore is engineered as a zero-trust, multi-tenant digital records operating system for non-governmental foundations and humanitarian relief organizations. The system decouples sensitive record vaults, AI data sanitization microservices, and immutable blockchain auditing.

```
                    ┌────────────────────────────────────────┐
                    │      React 19 + Tailwind Client        │
                    │   (Vite SPA + Glassmorphic Accents)    │
                    └───────────────────┬────────────────────┘
                                        │ HTTPS / WSS
                                        ▼
                    ┌────────────────────────────────────────┐
                    │        Node.js Express 5 API           │
                    │  (Tenant Scoping, AES-256 Encryption,  │
                    │   Argon2id Auth, Merkle Tree Engine)   │
                    └───────┬──────────────┬──────────────┬──┘
                            │              │              │
             Internal HTTP  │              │ Mongoose     │ JSON-RPC
          (X-Service-Secret)│              │              │
                            ▼              ▼              ▼
     ┌────────────────────────┐  ┌───────────────────┐  ┌─────────────────────┐
     │  Python FastAPI Engine │  │   MongoDB 7.0     │  │  Polygon Amoy (L2)  │
     │  - Soundex & Levenshtein│ │ (Compound Scoped  │  │  RecordAnchor.sol   │
     │  - Anomaly Quarantine  │  │  Vault Collections│  │  (Immutable Merkle  │
     │  - Scikit Clustering   │  │  & Audit Chains)  │  │   Root Anchoring)   │
     │  - Demand Forecasting  │  └───────────────────┘  └─────────────────────┘
     └────────────────────────┘
```

---

## 2. Multi-Tenant Cryptographic Boundaries

1. **Schema-Level Enforcement**: Every persistent document (`Record`, `RecordType`, `Consent`, `File`, `BlockchainAnchor`, `AiResult`, `AuditLog`) enforces a required `{ ngoId: ObjectId }` field backed by compound multi-tenant indexes.
2. **Middleware Interceptor (`ngoScope.js`)**: Resolves tenant identity strictly from authenticated JWT tokens. Cross-tenant queries are blocked at the controller boundary.
3. **AES-256-GCM Field-Level Encryption**: Sensitive PII fields (e.g. National ID, Aadhaar, Phone Numbers, Medical Diagnostics) are encrypted before insertion into MongoDB using authenticated ciphertexts prefixed with `enc:v1:<iv>:<ciphertext>:<authTag>`.

---

## 3. Blockchain Merkle Anchoring Architecture

To satisfy strict UN, donor grant, and government audits without incurring high public blockchain transaction fees:
1. Records and audit log entries are grouped into daily or on-demand batches.
2. An OpenZeppelin-compatible binary Merkle tree is computed using `keccak256` hashing with sorted sibling pairs.
3. The single 32-byte Merkle root is anchored to Polygon Amoy via the `RecordAnchor.sol` smart contract.
4. Any auditor can independently verify inclusion of any single record or audit event using an $O(\log n)$ Merkle proof without revealing third-party confidential beneficiary data.
5. The `checkIntegrity()` engine continuously recomputes live database hashes against on-chain roots to immediately detect any unauthorized out-of-band modifications.

---

## 4. AI Sanitization & Data Quality Engine

- **Phonetic Deduplication**: Uses American Soundex phonetic encoding combined with normalized Levenshtein distance across beneficiary names and phone digits.
- **Anomaly Quarantine**: Flags missing mandatory attributes, malformed phone numbers (<10 digits), invalid RFC email syntax, future dates of birth, and statistical numerical outliers.
- **Predictive Demand Forecasting**: Computes linear trend trajectories on chronological distribution volumes and recommends a 15% safety stock buffer for humanitarian field operations.

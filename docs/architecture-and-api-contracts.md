# Architecture & API Contracts

## 1. System Boundaries & Communication

- **Frontend (React)**: Communicates exclusively with the Node/Express backend via HTTP. Does NOT talk directly to MongoDB, FastAPI, or Blockchain services.
- **Backend (Node/Express)**: The central hub. Handles all routing, validation, business logic, authorization (role/permissions/ngoId isolation), and database interactions. It proxies relevant requests to the AI service or Blockchain layer.
- **Database (MongoDB)**: Accessed solely by the Node/Express backend.
- **File Storage (Cloudinary)**: Accessed by the Node/Express backend for secure upload/deletion. Signed URLs can be returned to the client for direct viewing of private documents.
- **AI Service (FastAPI)**: Accessed only by the Node/Express backend over HTTP. Authenticated using a shared service secret (`AI_SERVICE_SECRET`).
- **Blockchain (Solidity/Hardhat)**: Accessed by the Node/Express backend via `ethers.js` to store/verify cryptographic hashes of records.

## 2. Global JSON Response Format

Every endpoint in the Node.js backend must return the following standardized JSON format, regardless of success or failure:

```json
{
  "success": true,        // Boolean indicating overall request outcome
  "message": "String",    // Human-readable message (e.g., "User created successfully" or "Validation failed")
  "data": {},             // The requested payload or result data (can be an object, array, or null)
  "errors": []            // Array of specific error details, usually empty on success. Example format: [{ "field": "email", "message": "Invalid email" }]
}
```

## 3. API Versioning

All API routes in the Node/Express backend will be prefixed with `/api/v1`.
For example:
- `POST /api/v1/auth/login`
- `GET /api/v1/records/students`

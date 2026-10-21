# NGOcore Deployment & Operations Runbook

## 1. Quickstart (Local Development)

### Prerequisites
- Node.js 18+ (tested on Node 20 & 22)
- MongoDB 6.0+ (running locally at `mongodb://127.0.0.1:27017`)
- Python 3.10+ (tested on Python 3.11 & 3.13)

### Step 1: Install Dependencies
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install

# AI Microservice
cd ../ai-service
pip install -r requirements.txt
```

### Step 2: Seed Demo Data
```bash
cd server
npm run seed:admin
npm run seed:demo
```

### Step 3: Start Services
```bash
# Terminal 1: AI Engine
cd ai-service
uvicorn main:app --port 8000 --reload

# Terminal 2: Node.js API
cd server
npm run dev

# Terminal 3: Vite Client
cd client
npm run dev
```

---

## 2. Docker Compose Production Deployment

To run all four services (MongoDB, Python AI Engine, Node.js API, and Nginx-powered React Client) in isolated containers:

```bash
docker-compose up -d --build
```

- Web Client: `http://localhost:3000`
- API Backend: `http://localhost:5000/api/v1`
- AI Microservice: `http://localhost:8000`
- MongoDB: `localhost:27017`

---

## 3. Disaster Recovery Operations

### On-Demand Secure Snapshot
```bash
cd server
npm run backup
```
Produces an encrypted snapshot with a signed SHA-256 manifest in `server/backups/`.

### Restoration from Backup
```bash
cd server
npm run restore
```
Verifies cryptographic manifest checksums before executing zero-downtime upserting.

---

## 4. Test Suite Execution Runbook

To run all full-stack automated test suites:

```bash
# 1. AI Service Algorithms & Routers (Python)
cd ai-service
python test_ai_service.py

# 2. Record Management Engine (Node.js)
cd ../server
node tests/test_records_engine.js

# 3. Bulk CSV & DPDP Privacy Compliance (Node.js)
node tests/test_bulk_and_privacy.js

# 4. Cloud File Management & Security (Node.js)
node tests/test_cloud_files.js

# 5. AI Engine & Data Quality (Node.js)
node tests/test_ai_module.js

# 6. Blockchain & Merkle Anchoring Engine (Node.js)
node tests/test_blockchain_engine.js

# 7. End-to-End & Security Penetration Suite (Node.js)
node tests/test_e2e_and_security.js

# 8. Frontend Client Production Build
cd ../client
npm run build
```

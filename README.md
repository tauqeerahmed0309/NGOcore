# NGOcore — Digital Record System for NGOs

A secure, centralized digital record and operations management system engineered specifically for non-governmental organizations (NGOs), non-profits, and educational initiatives. NGOcore streamlines beneficiary record keeping, dynamic program scheduling, and role-based operational coordination.

---

## 1. Project Overview

NGOs often manage operations across disparate spreadsheets, paper files, and informal groups. **NGOcore** provides a unified, audit-ready platform with:
- **Centralized Authentication & RBAC**: Granular permissions across 4 distinct roles (`admin`, `staff`, `volunteer`, `student`).
- **User Account Management**: Admin-controlled lifecycle for staff, volunteers, and student user accounts.
- **Beneficiary & Student Management**: Complete profile records, educational details, guardian contacts, and enrollment status tracking.
- **Dynamic Program Management**: Flexible creation and management of diverse NGO initiatives (school classes, vocational workshops, awareness drives, camps).
- **Responsive Light-Theme Interface**: A clean, accessible interface designed for daily NGO administration on desktop, tablet, and mobile.
- **Production-Ready Architecture**: Decoupled React SPA frontend and Node.js/Express REST API backend ready for modern cloud hosting.

---

## 2. Tech Stack

- **Frontend**:
  - React 19 + Vite 6
  - React Router v7 (Client-side SPA routing)
  - Axios (HTTP client with credentialed httpOnly-cookie sessions)
  - Lucide React (Clean icon set)
  - Pure Vanilla CSS (Light-theme design system)
- **Backend**:
  - Node.js (v18+) + Express 5
  - MongoDB + Mongoose 9 (Document database)
  - JSON Web Tokens (`jsonwebtoken`) + `bcrypt` password hashing
  - Helmet + Express Rate Limit + gzip response compression (API protection and transfer efficiency)
  - Zod (Strict schema validation)
- **Testing**:
  - Automated regression suites covering authentication, RBAC, users, students, programs, onboarding, and operations

---

## 3. Folder Structure

```
Digital Record System For NGO's/
├── client/                     # Frontend Application (React + Vite)
│   ├── public/                 # Static assets (favicons, SVG icons)
│   ├── src/
│   │   ├── assets/             # Brand logos and images
│   │   ├── components/         # Shared UI (AppShell, Header, Sidebar, AccessDenied)
│   │   ├── context/            # AuthContext (JWT auth state & session management)
│   │   ├── features/           # Feature modules
│   │   │   ├── auth/           # Login, ChangePasswordModal
│   │   │   ├── dashboard/      # Role-specific dashboards (Admin, Staff, Volunteer, Student)
│   │   │   ├── programs/       # Dynamic program creation, editing, filtering & status management
│   │   │   ├── students/       # Beneficiary profiles, forms, details modal & status dialogs
│   │   │   └── users/          # Admin user management, creation & activation controls
│   │   ├── routes/             # AppRoutes, ProtectedRoute, RoleGuard
│   │   ├── services/           # Axios instance (`api.js`) & API service modules
│   │   ├── index.css           # Global design system & component styles (Light mode)
│   │   └── main.jsx            # Application entrypoint
│   ├── .env.example            # Client environment template
│   ├── vercel.json             # Vercel SPA rewrite configuration
│   ├── vite.config.js          # Vite configuration
│   └── package.json            # Frontend dependencies & build scripts
├── server/                     # Backend API Server (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Database connection (`db.js`) & Environment parser (`env.js`)
│   │   ├── controllers/        # Route controllers (auth, user, student, program)
│   │   ├── middlewares/        # JWT auth, RBAC authorization, error handler, rate limiters
│   │   ├── models/             # Mongoose schemas (User, Student, Program)
│   │   ├── routes/             # Express API routes (`/api/v1/...`)
│   │   ├── scripts/            # Admin seed script & automated regression runner
│   │   ├── services/           # Business logic layer
│   │   ├── utils/              # Password hashing, JWT helpers, API response formatters, logger
│   │   ├── validations/        # Zod validation schemas
│   │   ├── app.js              # Express app setup, CORS, Helmet, middleware mounting
│   │   └── server.js           # Server bootstrap & listener (`0.0.0.0` host binding)
│   ├── uploads/                # Local uploads directory (`.gitkeep` tracked)
│   ├── .env.example            # Backend environment template
│   └── package.json            # Backend dependencies, test scripts & start command
├── .gitignore                  # Git ignore rules for root, client, and server
├── package.json                # Root package runner scripts
└── README.md                   # Project documentation
```

---

## 4. Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` OR a MongoDB Atlas cluster URI.

### Step 1: Clone Repository
```bash
git clone <your-github-repo-url>
cd "Digital Record System For NGO's"
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Return to root
cd ..
```

---

## 5. Environment Variables

Create `.env` files in both `server/` and `client/` using their respective `.env.example` templates.

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/ngocore_db
JWT_SECRET=<generate-a-random-secret-of-at-least-32-characters>
JWT_EXPIRES_IN=20m
JWT_REFRESH_EXPIRES_IN=7d
MAX_FILE_SIZE_MB=10
ADMIN_EMAIL=admin@ngo.org
ADMIN_PASSWORD=<generate-a-unique-strong-password>
```

JSON API responses use `{ success, message, data, errors }`; paginated record and enrollment lists include their pagination details in `data`. The API stores access and refresh tokens in `httpOnly` cookies; access tokens expire after 20 minutes and refresh tokens rotate on use, expiring after 7 days of inactivity. Refresh-token reuse revokes that device session. Users can end the current session with `POST /api/v1/auth/logout` or all sessions with `POST /api/v1/auth/logout-all` (also available from the user menu). Do not commit `.env` files. The server `.gitignore` already excludes them. The admin password is used by the seed script when creating the initial admin account. Development seeding creates only the configured administrator; it no longer inserts sample staff, volunteer, or student accounts.

### Frontend (`client/.env`)
```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 6. How to Run Backend

From the repository root:
```bash
npm run dev:server
```
Or directly from the `server` directory:
```bash
cd server
npm run dev     # Starts with nodemon live reload
npm start       # Production start mode (node src/server.js)
```

The backend server will start on `http://localhost:5000`.
- **Health check endpoint**: `http://localhost:5000/api/v1/health`
- **API Root**: `http://localhost:5000/api/v1`
- **Authentication**: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, and `POST /api/v1/auth/logout-all` manage rotating per-device sessions. Student and organization-admin password recovery uses `POST /api/v1/auth/password/forgot` and `POST /api/v1/auth/password/reset`. Login is limited to 10 attempts per IP every 15 minutes.

### Seeding Initial Admin
If running against a fresh database, seed the initial administrator:
```bash
cd server
npm run seed:admin
```
If you change `ADMIN_PASSWORD` in `.env` after the administrator already exists, seeding will not overwrite its stored password. To explicitly synchronize that existing admin account with the configured password, run:
```bash
npm run reset:admin-password
```
This only resets the configured active admin account and requires its organization to be approved.

### Multi-organization setup and approvals
For an existing database, run the one-time backfill before restarting the API so current users and records are assigned to an approved legacy organization:
```bash
cd server
npm run migrate:ngo
```
New organizations default to `pending`; their users cannot sign in until approved. A trusted database operator can approve/reject/suspend one by its MongoDB ObjectId:
```bash
npm run ngo:set-status -- <ngoId> approved
```
Student, program, and user list/detail/update requests are scoped to the authenticated user's organization. The client cannot select or change that scope.

### Organization signup email
Self-service signup requires an SMTP account. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` from `server/.env.example`. OTPs are HMAC-hashed in MongoDB, expire after 10 minutes, allow at most five checks, and can be resent once every 60 seconds. Onboarding documents (PDF/JPEG/PNG, up to `MAX_FILE_SIZE_MB`) are stored under `server/private-uploads/` and are not served by the public uploads route. After an organization completes onboarding, approve it using its MongoDB ObjectId as described above.

The **Forgot password?** link on the main and student login pages provides email OTP recovery for active, verified student and organization-admin accounts. Reset codes expire after 10 minutes, allow at most five attempts, and are rate-limited; successful resets invalidate existing sessions. The same SMTP settings are used, and responses do not reveal whether an email belongs to an eligible account.

### Student login and Google sign-in
NGO staff create a student login account in User Management; NGOcore emails a single-use password setup link that expires after 24 hours. The account can then be linked to the student's record. The student signs in at `/student/login` with the record system ID shown in student details and the password they chose. Administrators can resend an unused setup invitation. Password recovery requests an OTP using the email address registered on the linked user account.

Google sign-in is available for existing verified user accounts only; it does not create accounts or bypass organization approval. Create a Google OAuth Web Client ID in Google Cloud Console, allow the client origins used by the app (for local development, `http://localhost:5173`), and set the same client ID as `VITE_GOOGLE_CLIENT_ID` in `client/.env` and `GOOGLE_CLIENT_ID` in `server/.env`. Restart/redeploy both apps after configuration. The Google button remains unavailable until the client ID is configured.

### Program enrollment, attendance, and reports
Administrators and staff can enroll active student records into active programs, track completions or withdrawals, and record a dated attendance roster with present, absent, or excused status. Student accounts can view their own enrolled programs and schedule from the student portal. Participation records are scoped to the signed-in NGO. Administrator and staff dashboards surface incomplete student profiles, programs starting within seven days, and active programs with no current enrollments. The Reports & Exports page downloads a CSV participation report with enrollment and attendance totals for a selected date range.

### AI-assisted data review and insights
The Students and Programs lists include an explicit **Clean my data** action. It flags likely duplicates, missing required fields, and selected format issues across the authenticated NGO's records. Each proposed change requires an individual accept/reject decision; no records are automatically merged or modified. Review decisions are audit logged.

The admin dashboard's **Generate insights** action aggregates six months of Student or Program counts and status groups within the authenticated NGO. Optional summaries use only these aggregated metrics, never raw records. Configure `ANTHROPIC_API_KEY` and optionally `ANTHROPIC_MODEL` to enable summaries; without a key or when the AI API is unavailable, the metrics remain visible without a summary.

### Public landing page and motion
Unauthenticated visitors are shown the public landing page at `/`; `/login` and `/signup` remain directly accessible while the session cookie is checked. Reusable GSAP helpers in `client/src/animations/` power the landing-page reveals, counters, timeline, restrained dashboard motion, and route transitions. All helpers honor `prefers-reduced-motion`; frequently visited data screens use only short, subtle entrance and hover effects. Run `npm run build` from `client` to validate the frontend.

### MVP module progress
- [x] 1. Login and sessions: role redirects, status-aware sign-in, hashed per-device refresh sessions, refresh rotation/reuse detection, current-session logout, and logout from all devices.
- [ ] 2. NGO onboarding and document upload
- [ ] 3. Platform admin and approval
- [ ] 4. Authentication and NGO isolation middleware
- [ ] 5. Password reset
- [ ] 6. Security basics
- [ ] 7. Audit logging
- [ ] 8. Generic record engine
- [ ] 9. File management
- [ ] 10. Dashboard
- [ ] 11. Users and invitations
- [ ] 12. CSV export
- [ ] 13. Profile and settings

---

## 7. How to Run Frontend

From the repository root:
```bash
npm run dev:client
```
Or directly from the `client` directory:
```bash
cd client
npm run dev
```

The Vite dev server will start at `http://localhost:5173`. Open this URL in your web browser.

---

## 8. How to Run Tests

The project includes 175 automated regression checks covering:
- **Phase 2**: Authentication, JWT token verification, password hashing, and RBAC endpoint guards (17 tests)
- **Phase 3A**: Admin User Management, creation of staff/volunteers/students, email deduplication, and deactivation (23 tests)
- **Phase 3B**: Student Management, registration numbering, profiles, role-scoped access (24 tests)
- **Phase 3C**: Dynamic Program Management, custom activities, scheduling, and role assignments (32 tests)
- **Part 3**: Organization signup, password reset and student setup invitations, program enrollment/attendance, participation exports, dashboard reminders, and rotating sessions (50 checks)
- **Part 4**: NGO-scoped student/program cleaning and review, aggregate-only insights, and AI success/failure handling (29 checks)

Run all 175 checks from the root or server directory:
```bash
# From root:
npm test

# Or from server:
cd server
npm test
```

Individual test suites can also be run separately:
```bash
npm run test:auth       # Phase 2 (17 tests)
npm run test:users      # Phase 3A (23 tests)
npm run test:students   # Phase 3B (24 tests)
npm run test:programs   # Phase 3C (32 tests)
npm run test:ngo-isolation # Cross-organization read/update/delete isolation
npm run test:ngo-approval  # Pending/approved/rejected/suspended login checks
npm run test:signup        # OTP and onboarding end-to-end checks (uses an injected test mail transport)
npm run test:assistant     # Data cleaning and aggregate insights checks (uses a stub AI client; no external API call)
```

---

## 9. Deployment Architecture

### 9.1 Containerized Docker Deployment (Recommended)

NGOcore includes production-ready Docker and Docker Compose orchestration across three decoupled, security-hardened services:
1. **`frontend`**: React 19 / Vite SPA compiled in a multi-stage build and served via Nginx Alpine with SPA fallback routing and API reverse-proxying.
2. **`backend`**: Node.js 20 LTS Express REST API running under a non-root user (`node`), managed with `dumb-init` for signal handling, and verified with built-in health checks.
3. **`mongodb`**: MongoDB 7.0 database running on an isolated bridge network (`ngocore_network`) with persistent named volumes and `mongosh` health checking.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                    Host Browser                        │
                  └───────────────────────────┬────────────────────────────┘
                                              │ HTTP :3000 (or :80)
                                              ▼
                        ┌──────────────────────────────────────────┐
                        │        ngocore-frontend (Nginx)          │
                        │   ├── Static SPA (Vite / React 19)       │
                        │   ├── SPA Route Fallback (/index.html)   │
                        │   └── Reverse Proxy (/api/ -> backend)   │
                        └─────────────────────┬────────────────────┘
                                              │ Internal Docker Network (ngocore_network)
                                              ▼
                        ┌──────────────────────────────────────────┐
                        │         ngocore-backend (Node 20)        │
                        │   ├── REST API Listener (0.0.0.0:5000)   │
                        │   ├── Non-root User ('node')             │
                        │   ├── Signal Handler (dumb-init)         │
                        │   └── Custom DNS Resolvers (8.8.8.8)     │
                        └─────────────────────┬────────────────────┘
                                              │ External Cloud Connection (mongodb+srv://)
                                              ▼
                        ┌──────────────────────────────────────────┐
                        │      MongoDB Atlas Cloud Database        │
                        │   (cluster0.xxxxx.mongodb.net/ngocore_db)│
                        └──────────────────────────────────────────┘
```

#### Prerequisites
- **Docker Desktop** (Engine 20.10+ / Compose v2.0+) installed and running.
- (Windows users: Ensure WSL 2 backend or Hyper-V is enabled).
- **MongoDB Atlas Cluster**: An active Atlas M0/M10 cluster with:
  1. A Database User with `readWrite` permissions.
  2. Network Access configured to whitelist your public IP (or `0.0.0.0/0` for initial testing).

#### Step 1: Configure Environment Variables
Copy the provided Docker environment template:
```bash
cp .env.docker.example .env
```

1. **Configure MongoDB Atlas Connection String (`MONGODB_URI`)**:
   In `.env`, set `MONGODB_URI` to your actual Atlas connection URI:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ngocore_db?retryWrites=true&w=majority
   ```
   > [!IMPORTANT]
   > `MONGODB_URI` is strictly mandatory. Docker Compose will fail fast and refuse to start if this variable is missing or empty.

2. **Generate a Secure `JWT_SECRET`**:
   Generate a cryptographically secure 32+ character signing key:
   ```bash
   # Using OpenSSL:
   openssl rand -base64 32

   # Or using Node.js:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Paste the generated value into `.env` for `JWT_SECRET`.

> [!NOTE]
> Optional integrations (SMTP email, Google OAuth, Gemini AI, Anthropic Claude) can remain empty in `.env`. When left empty, NGOcore automatically falls back to deterministic rule-based algorithms and local authentication without error.

#### Step 2: Build and Start Services in MongoDB Atlas Mode
In Atlas mode (the default), Docker Compose launches **only the backend and frontend services**. The local MongoDB container is bypassed:
```bash
docker compose up -d --build
```

*(Optional)* If you ever wish to test against a local containerized MongoDB database instead of Atlas:
```bash
docker compose --profile local-db up -d --build
```

#### Step 3: Verify Service Status & Health
Check container state and healthcheck readiness:
```bash
docker compose ps
```
Expected output in Atlas mode:
- `ngocore-backend` — `Up (healthy)` (Express REST API connected to Atlas, verified via `http://127.0.0.1:5000/api/v1/health`)
- `ngocore-frontend` — `Up (healthy)` (Nginx web server serving SPA on `http://127.0.0.1:80/`)

#### Application URLs & Endpoints
| Component | URL | Description |
|---|---|---|
| **Frontend Web App** | `http://localhost:3000` | Complete NGOcore web interface |
| **Backend REST API** | `http://localhost:5000` | Direct backend API access |
| **API Health Check** | `http://localhost:5000/api/v1/health` | Backend status & system metrics |
| **Nginx Proxied API** | `http://localhost:3000/api/v1/health` | Same-origin API route via reverse proxy |
| **Document Uploads** | `http://localhost:3000/uploads/...` | Static public asset route via reverse proxy |

#### Inspect Container Logs
Follow live logs across all services or individually:
```bash
# All services
docker compose logs -f

# Backend API logs only
docker compose logs -f backend

# Frontend Nginx logs only
docker compose logs -f frontend

# MongoDB database logs only
docker compose logs -f mongodb
```

#### Stop Services
Gracefully stop containers and networks while strictly preserving all database records:
```bash
docker compose down
```
> [!IMPORTANT]
> Running `docker compose down` stops the containers without removing named volumes. All MongoDB data, uploads, and configuration files remain completely safe.

#### Rebuild Images After Code Changes
When modifying source code or updating dependencies:
```bash
# Rebuild and restart all containers
docker compose up -d --build

# Rebuild only the frontend
docker compose up -d --build frontend

# Rebuild only the backend API
docker compose up -d --build backend
```

#### Data Persistence
NGOcore persists all stateful data using named Docker volumes managed independently of container lifecycles:
- `ngocore_mongodb_data`: Stores MongoDB database collections, indexes, and write-ahead logs (`/data/db`).
- `ngocore_uploads`: Stores public beneficiary profile pictures and event images (`/app/uploads`).
- `ngocore_private_uploads`: Stores encrypted compliance filings, NGO registration documents, and verification records (`/app/private-uploads`).

To inspect volume storage:
```bash
docker volume ls | grep ngocore
```

#### Troubleshooting Common Issues

1. **Missing or Short `JWT_SECRET`**:
   - Error: `JWT_SECRET environment variable is required and must be at least 32 characters` or backend exits with code 1 (`FATAL: Set JWT_SECRET to a random value of at least 32 characters.`).
   - Fix: Open `.env` and assign a secure string $\ge 32$ characters.

2. **Port Conflicts (`address already in use`)**:
   - If port `3000` or `5000` is already in use by local processes, open `.env` and assign alternate host ports:
     ```env
     FRONTEND_PORT=8080
     PORT=5001
     ```
   - Restart with `docker compose up -d`.

3. **MongoDB Atlas Connection Failures**:
   - Inspect backend logs: `docker compose logs backend`.
   - Ensure `MONGODB_URI` in `.env` is a valid Atlas connection string (`mongodb+srv://...`).
   - Check **Network Access** in the MongoDB Atlas Console: verify your current public IP is whitelisted (or `0.0.0.0/0` is permitted for testing).
   - Check **Database Access**: verify username and password are correct and the user has permissions on the target database.
   - Note: The backend container uses public DNS (`8.8.8.8`, `1.1.1.1`) to guarantee SRV and TXT lookup resolution for Atlas.

4. **Frontend API Connection / CORS / Cookie Errors**:
   - The frontend Nginx reverse proxy routes `/api` traffic to `http://backend:5000` as a same-origin request, preventing browser third-party cookie blocking.
   - If accessing from a custom domain, ensure the domain is added to `CLIENT_URL` in `.env`.

5. **Uploads Failing (`413 Request Entity Too Large`)**:
   - The Nginx reverse proxy is configured with `client_max_body_size 25M;` to support document and beneficiary photo uploads up to `MAX_FILE_SIZE_MB` (default 10MB).

6. **Container Startup Sequence**:
   - In Atlas mode, the backend connects directly to your Atlas cluster and starts listening on port 5000.
   - The frontend container utilizes `depends_on: backend: condition: service_healthy` to guarantee API availability before serving web traffic.

> [!CAUTION]
> Never run `docker compose down -v` or `docker volume rm ngocore_mongodb_data` as a routine troubleshooting step, as this will permanently delete all persisted database records.

---

### 9.2 Cloud PaaS Architecture (Render & Vercel)

```
GitHub (Source Repository)
   │
   ├──▶ Render (Web Service: Node.js / Express Backend)
   │       ├── Listens on 0.0.0.0:$PORT
   │       ├── Connects to MongoDB Atlas via MONGODB_URI
   │       └── Enforces CORS via CLIENT_URL
   │               │
   │               ▼
   │       MongoDB Atlas (Cloud Database Cluster)
   │
   └──▶ Vercel (Static / SPA: React + Vite Frontend)
           ├── Connects to Render Backend via VITE_API_URL
           └── Handles SPA Client-Side Routing via vercel.json
```

### Production Deployment Instructions

#### 1. Database (MongoDB Atlas)
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a Database User with read/write privileges.
3. In Network Access, allow access from anywhere (`0.0.0.0/0`) or configure Render's egress IP addresses.
4. Copy the connection string: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ngocore_db?retryWrites=true&w=majority`.

#### 2. Backend (Render)
1. Create a new **Web Service** on [Render](https://render.com) linked to your GitHub repository.
2. Configure settings:
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<your-mongodb-atlas-connection-string>`
   - `JWT_SECRET`: `<generated-random-32+-character-string>`
   - `CLIENT_URL`: `https://<your-vercel-app-name>.vercel.app` (update once Vercel domain is created)
   - `MAX_FILE_SIZE_MB`: `10`
4. Deploy the service and note your Render URL (e.g. `https://ngo-backend.onrender.com`).

#### 3. Frontend (Vercel)
1. Create a new **Project** on [Vercel](https://vercel.com) imported from your GitHub repository.
2. Configure settings:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://<your-render-backend-name>.onrender.com/api/v1`
4. Deploy the project. The provided [`client/vercel.json`](client/vercel.json) ensures all client-side routes (`/admin/dashboard`, `/students`, etc.) resolve properly without 404 errors.
5. Copy your live Vercel URL and update `CLIENT_URL` in the Render dashboard.

---

## 10. Security & Verification Checklist

- [x] No secrets, passwords, or connection strings committed to Git
- [x] `.env` and local cache directories excluded via comprehensive `.gitignore`
- [x] `server/src/server.js` binds to `0.0.0.0` for cloud container hosting
- [x] Health check route active at `GET /api/v1/health`
- [x] CORS dynamically accepts production frontend domain from `CLIENT_URL`
- [x] Production check blocks `localhost`/`127.0.0.1` MongoDB connection strings in production
- [x] Frontend dynamically routes API traffic via `VITE_API_URL`
- [x] Vercel SPA routing configured via `vercel.json`
- [x] Full 657-check master regression suite passing (21/21 suites, 100%)
- [x] 14-workflow Playwright browser end-to-end suite passing (100%)
- [x] Persistent cloud object storage service abstraction (`storageService.js`) verified
- [x] Frontend production bundle built with 0 errors (Vite v6)

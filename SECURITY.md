# 🛡️ CrisisForge AI — Security Architecture & Guidelines

> **Security, Authorization, and Healthcare Data Governance Specification**  
> *Version: 2.2.0 | Environment: Healthcare Decision-Support Prototype*

---

## 1. Authentication Architecture & Boundary Model

CrisisForge AI implements a multi-tier identity model distinguishing client-side presentation state from server-side resource protection:

```
┌────────────────────────────────────────────────────────┐
│               Client-Side Presentation Layer           │
│  React 19 + Firebase Auth (Google OAuth & Email/Pass)  │
│  - Guarded routes (<ProtectedRoute>)                  │
│  - User session state (onAuthStateChanged)             │
│  - Automatic Bearer token extraction (getIdToken())   │
└───────────────────────────┬────────────────────────────┘
                            │ Authorization: Bearer <ID_TOKEN>
┌───────────────────────────▼────────────────────────────┐
│               Server-Side API Boundary Layer           │
│  FastAPI Security Dependency: get_current_user         │
│  - Production Mode (AUTH_ENABLED=true):                │
│    Mandatory token validation; 401 Unauthorized reject │
│  - Development Mode (AUTH_ENABLED=false):              │
│    Safe developer context fallback; token parsing      │
└────────────────────────────────────────────────────────┘
```

### 1.1 Frontend Authentication
- Handled via **Firebase Authentication** (`frontend/src/firebase.ts`, `frontend/src/contexts/AuthContext.tsx`).
- Supports Google OAuth 2.0 and Email/Password credentials.
- When Firebase environment keys are not configured, the frontend gracefully enables a **local development fallback** so technical evaluators can inspect dashboard views without third-party cloud setup.
- **Critical Architectural Clarification**: Client-side UI login route guarding alone does **not** secure backend endpoints. Attackers can bypass React routing and invoke REST endpoints directly. Therefore, server-side authentication enforcement is handled independently via the backend security layer.

### 1.2 Backend Authorization & Token Verification
- Handled via `backend/security.py` using FastAPI's `get_current_user` dependency.
- In `frontend/src/api.ts`, outgoing API calls automatically attach the active Firebase ID token as an `Authorization: Bearer <token>` header whenever a user is signed in.
- **Dual-Mode Security Configuration**:
  - `AUTH_ENABLED=false` (Default for local development and offline interview demonstration): Endpoints allow local developer calls, providing a non-authenticated `UserContext` (`dev-local-operator`) while still parsing tokens if provided.
  - `AUTH_ENABLED=true` (Production deployment mode): Endpoints strictly enforce verified Bearer tokens. Requests without valid tokens are immediately rejected with `401 Unauthorized` and `WWW-Authenticate: Bearer` challenge headers.
  - Optional `API_AUTH_TOKEN` secret allows secure service-to-service communication.

---

## 2. Role-Based Access Control (RBAC)

The system defines four administrative and clinical operational roles:

| Role | Description | Permitted Actions |
|---|---|---|
| **Admin** | System and network administrator | All operations: simulation, transfer execution, alerts, audit queries, system configuration |
| **Clinician** | Attending physician or triage officer | Run simulations, submit patient prediction queries, view facility capacity |
| **Dispatcher** | Emergency medical services coordinator | View transfer recommendations, dispatch inter-hospital reallocations |
| **Operator** | Read-only regional healthcare observer | View dashboard aggregations, facility GPS map, historical trends |

RBAC is enforced via the `require_role(allowed_roles)` dependency decorator in `backend/security.py`.

---

## 3. Network Security & CORS Policy

- **CORS Configuration**: Wildcard origins with credentials (`allow_origins=["*"]`, `allow_credentials=True`) are strictly forbidden, as they violate the Fetch Standard and expose credentials to cross-origin abuse.
- In `backend/config.py`, allowed origins are loaded from `ALLOWED_ORIGINS` environment variable, defaulting strictly to:
  - `http://localhost:5173` (Vite dev server)
  - `http://localhost:3000` (Alternative local dev port)
  - `http://127.0.0.1:5173` / `http://127.0.0.1:3000`
  - `https://crisisforge-ai.vercel.app` (Verified production frontend)
- Production deployments must terminate TLS 1.3 via reverse proxy or cloud gateway (e.g., Render/Cloudflare).

---

## 4. Secrets & Credentials Governance

1. **No Committed Secrets**: No live Firebase service account keys, private tokens, or Telegram bot credentials exist in version control.
2. **Environment Templates**: Clean reference templates are provided in `backend/.env.example` and `frontend/.env.example`.
3. **Log Sanitization**: The backend includes `sanitize_log_data()` in `backend/security.py`. All sensitive keys (`bot_token`, `chat_id`, `password`, `secret`, `api_key`, `token`) are automatically masked (e.g., `123***90`) before outputting to console logs or storing in the database audit log.

---

## 5. Healthcare Data Protection & HIPAA Compliance Roadmap

> [!IMPORTANT]
> **HIPAA Compliance Notice**: CrisisForge AI is currently an academic prototype and operational decision-support tool. It **does not claim HIPAA compliance** in its current prototype form. All data processed by the simulation and ML models is **100% synthetic**.

Before deploying CrisisForge AI in a covered entity (hospital, health system, or EMS agency) handling real Protected Health Information (PHI), the following controls must be implemented:

### 5.1 PHI Protection & Data Minimization
- **Minimum Necessary Standard** (45 CFR § 164.502(b)): Restrict API triage parameters strictly to non-identifiable clinical vitals (e.g., age, heart rate, SpO2). Strip all 18 HIPAA Safe Harbor identifiers (patient name, MRN, phone number, exact admission timestamp).
- **Business Associate Agreements (BAAs)**: Execute BAAs with all infrastructure providers (Render, Vercel, Google Firebase, Telegram). Note: Public Telegram bots must never transmit identifiable PHI.

### 5.2 Cryptographic Controls
- **In Transit**: Mandatory HTTPS / TLS 1.3 with HSTS (HTTP Strict Transport Security) enabled.
- **At Rest**: AES-256 encryption on all relational databases and serialized ML model artifacts.

### 5.3 Audit Trails & Accountability
- § 164.312(b) Audit Controls: The prototype introduces the `AuditLog` table (`backend/database.py`), recording timestamp, user ID, operational action, resource type, and non-PHI parameter summaries for all simulations, transfers, triage queries, and alert dispatches.
- Production requires shipping immutable audit streams to a write-once, tamper-evident log store (e.g., AWS CloudTrail / GCP Cloud Audit Logs).

---

## 6. Vulnerability Reporting

If you identify a security vulnerability or credential leak within CrisisForge AI, please submit an issue or contact the engineering maintainer directly. Do not publicly disclose vulnerabilities before a remediation release is deployed.

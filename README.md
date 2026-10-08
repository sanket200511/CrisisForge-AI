# CrisisForge AI

> **Healthcare Resource Allocation & Crisis Simulation Decision-Support Prototype**  
> *An operational simulation, load-balancing, and predictive triage prototype evaluated on an 8-hospital network in Nagpur, India.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11%2B-brightgreen.svg)](https://www.python.org/)
[![FastAPI: 0.115+](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 19.2](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://react.dev/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-Gradient%20Boosting-F7931E.svg)](https://scikit-learn.org/)
[![Tests: 38 Passing](https://img.shields.io/badge/Tests-38%20Passing-success.svg)](backend/tests/)

---

## 1. Problem

During acute public health crises (such as infectious disease surges, natural disasters, or mass-casualty trauma events), healthcare systems face immediate failure modes:

1. **Uncoordinated Patient Queuing**: Emergency departments operate in silos. High-demand facilities quickly breach 100% ICU and ventilator capacity while nearby facilities retain available beds.
2. **First-Come, First-Served Degradation**: Standard uncoordinated queues admit lower-acuity patients sequentially, causing critical patients arriving later to face delayed admission or resource starvation.
3. **Information Asymmetry**: Healthcare administrators lack regional visibility into forward-looking patient arrivals, multi-resource strain (beds, ICU, ventilators, clinical staff), and actionable transfer channels.

---

## 2. Solution

CrisisForge AI is an interactive **decision-support prototype** engineered to model, simulate, and balance acute healthcare resources across a regional network. The platform provides:

- **Inflow Forecasting**: Parameterized trend-seasonality curves combined with Monte Carlo uncertainty estimation ($P_{10}$–$P_{90}$ confidence intervals).
- **Comparative Triage Simulation**: Discrete-event modeling evaluating four resource allocation strategies (FCFS, Clinical Severity, Demographic Equity, and a Greedy Acuity-to-Cost Heuristic).
- **Inter-Hospital Redistribution Engine**: Multi-resource composite strain scoring that calculates patient transfer recommendations and protects a 25% emergency surge headroom.
- **Patient-Level Predictive Triage**: Dual `scikit-learn` Gradient Boosting models trained on synthetic clinical data to predict 4-class triage outcomes and length of stay, accompanied by baseline feature perturbation attribution.
- **Emergency Notifications**: Asynchronous webhook dispatch to Telegram channels when hospital capacity breaches critical thresholds.

> **Operational Scope**: CrisisForge AI is a **clinical decision-support prototype** intended for academic demonstration, capacity planning, and triage analysis. It is evaluated against **100% synthetic data** and does not make unassisted, autonomous medical determinations.

---

## 3. Architecture

CrisisForge AI utilizes a clean decoupled architecture separating client-side presentation, RESTful business logic, predictive modeling, and persistent storage:

```
                 React 19 / TypeScript / Vite Frontend
                   (Leaflet, Recharts, Framer Motion)
                                  │
         Firebase Auth            │ REST APIs (JSON / Bearer Token)
     [Client OAuth / Session]     │
                                  ▼
                        FastAPI Backend Server
                (CORS, Lifespan, Pydantic Invariants)
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
     Security & Auth Layer                 Business Logic Services
     - UserContext Dependency             ┌───────┬──────────┬────────────┬──────────┐
     - Audit Logger (Sanitized)           │       │          │            │          │
                                      Prediction Simulation Allocation Transfer Telegram
                                       Engine     Engine     Strategies  Engine   Service
                                          │                                          │
                                          ▼                                          ▼
                                    scikit-learn ML                         External Telegram API
                                   (GradientBoosting)                       (Async httpx Client)
                                          │
                                          ▼
                                 SQLAlchemy ORM Layer
                             (Dialect-Agnostic Engine)
                                          │
                                          ▼
                               Database Storage Layer
                              (SQLite / PostgreSQL)
```

For the complete technical specification, mathematical formulas, and component boundaries, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 4. Core Features

| Feature | Technical Implementation | Purpose |
|---|---|---|
| **Executive Dashboard** | Real-time aggregate telemetry across 8 Nagpur hospitals | Visualizes network bed, ICU, and ventilator occupancy percentages |
| **Scenario Builder** | Discrete simulation parameterization across 5 disaster archetypes | Configures surge multipliers, onset times, duration, and baseline inflow |
| **Strategy Comparator** | Side-by-side evaluation of 4 triage strategies | Compares survival rates, wait times, and bed/ICU utilization trade-offs |
| **Transfer Hub** | Composite strain calculation with transit-distance penalty | Computes inter-facility transfer volumes while preserving a 25% surge buffer |
| **AI Predictor** | Dual Gradient Boosting models + feature perturbation | Predicts triage class (Discharged, Admitted, Critical, Deceased) & stay hours |
| **Interactive GIS Map** | Leaflet.js with verified Nagpur hospital GPS coordinates | Visualizes regional facility locations, capacity stress, and transfer vectors |
| **Emergency Watchdog** | Asynchronous non-blocking Telegram notification dispatcher | Sends emergency alerts when hospital capacity breaches $\ge 95\%$ |
| **Audit Logging** | SQLite/PostgreSQL append-only audit trail with data sanitization | Records administrative actions and triage parameters for governance |

---

## 5. Technology Stack

- **Frontend**:
  - React 19.2 (Functional Components & Hooks)
  - TypeScript 5.6 (Strict Type Safety)
  - Vite 7.3 (ESBuild Module Bundler)
  - Recharts 3.7 (Interactive Area, Bar, and Radar Visualizations)
  - Leaflet 1.9 & React-Leaflet 5.0 (GIS Hospital Network Mapping)
  - Framer Motion 12.4 (Micro-animations and Page Transitions)
  - Lucide React (Accessible Iconography)
- **Backend**:
  - Python 3.11+ / FastAPI 0.115+ (Asynchronous ASGI Framework)
  - Pydantic v2 (Input Validation & Domain Invariants)
  - Uvicorn (High-performance ASGI Web Server)
  - HTTPX (Non-blocking Asynchronous HTTP Client)
- **Machine Learning & Simulation**:
  - scikit-learn 1.5+ (`GradientBoostingClassifier`, `GradientBoostingRegressor`)
  - NumPy 2.0+ / SciPy (Numerical Arrays, Percentile Calculation, Distributions)
  - Joblib (Model Serialization and Artifact Caching)
- **Database & Storage**:
  - SQLAlchemy 2.0+ (Dialect-agnostic ORM supporting SQLite and PostgreSQL)
- **Authentication**:
  - Firebase Auth (Client-side Google OAuth and Email/Password session tokens)
  - FastAPI Security Dependency (Bearer Token verification with dev bypass mode)

---

## 6. API / Backend

The backend exposes a documented, typed REST API adhering to OpenAPI 3.1 specifications (`/docs`).

### Core Endpoints Specification

| Method | Endpoint | Purpose | Request Body | Response Payload | Validation & Error Handling |
|---|---|---|---|---|---|
| `GET` | `/health` | Liveness & system readiness probe | None | `{"status": "ok", "version": "...", "timestamp": "..."}` | 200 OK |
| `GET` | `/api/hospitals` | Retrieves 8 Nagpur facility profiles | None | Array of `Hospital` objects with bed, ICU, and coordinate metadata | 200 OK |
| `POST` | `/api/predict` | Computes daily inflow forecast & Monte Carlo bounds | `PredictionRequest`: `scenario_type`, `days`, `base_daily_inflow`, `surge_multiplier`, `onset_day` | `PredictionResponse`: timeline with deterministic inflow and $P_{10}, P_{25}, P_{75}, P_{90}$ intervals | Validates `days \in [1, 90]`, `surge_multiplier \in [1.0, 10.0]`. Returns 422 on invalid ranges |
| `POST` | `/api/simulate` | Executes discrete crisis simulation across allocation strategies | `SimulationRequest`: `scenario`, `hospital_capacity`, `strategy`, `days` | `SimulationResponse`: comparative metrics (survival rate, treated, wait times, timeline) | Pydantic model validator enforces bed complement invariant (`icu_beds + regular_beds \le total_beds`). Returns 422 if violated |
| `GET` | `/api/transfers` | Evaluates regional load redistribution recommendations | None | `TransferResponse`: overloaded senders, receiver headroom, transfer matrices | 200 OK; returns empty transfer list if network composite strain $< 75\%$ |
| `POST` | `/api/ml/predict` | Predicts single-patient triage outcome & stay duration | `PatientPredictRequest`: 15 clinical vitals (age, SpO2, heart rate, systolic BP, etc.) | `PatientPredictResponse`: outcome class probabilities, predicted stay hours, risk tier | Enforces physiological bounds ($SpO2 \in [50, 100]$, $HR \in [30, 250]$). Returns 422 on impossible vitals |
| `POST` | `/api/ml/explain` | Computes baseline feature perturbation sensitivity attribution | `PatientExplainRequest`: 15 clinical vitals, target outcome class | `PatientExplainResponse`: positive/negative attribution deltas per feature | Returns 422 if target class is invalid |
| `POST` | `/api/telegram/send` | Dispatches emergency alert notification | `TelegramAlertRequest`: `message`, `hospital_name`, `alert_type` | `{"success": bool, "status": "..."}` | 5-minute anti-spam throttle per facility; gracefully handles unconfigured credentials |
| `GET` | `/api/audit-logs` | Retrieves append-only clinical decision audit records | Query params: `limit \in [1, 100]` | Array of `AuditLog` objects | Sanitizes sensitive parameters; requires authorization token in production mode |

---

## 7. Database

The database layer utilizes SQLAlchemy ORM with a dialect-agnostic configuration:
- **Local Development**: Embedded SQLite database (`crisisforge.db`) using `check_same_thread=False`.
- **Production Deployment**: PostgreSQL connection pooling configured via `DATABASE_URL`.

### Schema Models

1. **`hospitals`**: Stores facility identifier, name, region, geographic latitude/longitude, total beds, ICU beds, ventilators, and baseline staffing.
2. **`scenarios`**: Preset disaster templates (Pandemic Wave, Earthquake, Monsoon Flooding, Industrial Chemical Fire, Severe Heatwave) with parameter defaults.
3. **`simulation_results`**: Persists completed simulation runs, strategy configurations, survival rates, and daily timeline logs.
4. **`audit_logs`**: Immutable governance ledger recording timestamp (UTC), user ID, action name, resource type, sanitized parameters, and execution status.

---

## 8. Forecasting (Inflow Prediction)

The inflow prediction engine (`prediction_engine.py`) models prospective patient arrivals without external statistical black-box dependencies.

### Mathematical Formulation

1. **Secular Trend & Harmonic Weekly Seasonality**:
   $$\text{base}(t) = \text{base\_daily} + 0.05 \cdot t + 5 \sin\left(\frac{2\pi t}{7}\right) + \epsilon(t)$$
   where $\epsilon(t) \sim \mathcal{N}(0, 0.1 \cdot \text{base\_daily})$ represents stochastic baseline variance.
2. **Surge Response Dynamics**:
   - **Pandemic Wave**: S-curve progression ramping to peak multiplier $M$, sustaining a plateau, and following exponential decline.
   - **Mass Trauma (Earthquake)**: Immediate impulse peak ($1.5 \times M$) decaying rapidly over 10 days.
   - **Monsoon Outbreak**: Gradual quadratic rise and sustained crest.
3. **Queue-Based Capacity Consumption**:
   Models average length of stay ($\bar{L} = 5.0$ days) to track active inpatient censuses rather than raw daily arrivals:
   $$\text{Beds}(t) = \text{active}(t) \times 0.85, \quad \text{ICU}(t) = \text{active}(t) \times 0.15, \quad \text{Vents}(t) = \text{active}(t) \times 0.08$$

> *Engineering Note*: Inflow modeling uses parameterized trend-seasonality curves rather than statistical ARIMA $(p, d, q)$ parameter fitting.

---

## 9. Monte Carlo Simulation

To account for stochastic crisis volatility, the engine executes $N = 200$ independent Monte Carlo simulation trajectories:

$$S_k(t) = \max\left(\text{surged}(t) + \mathcal{N}(0, 0.15 \cdot \text{surged}(t)), 0\right), \quad k \in \{1, \dots, 200\}$$

From these runs, empirical quantile bands are computed at each time step $t$:
- $P_{10}(t)$: Optimistic lower bound (10th percentile)
- $P_{25}(t)$: Lower interquartile bound
- $P_{75}(t)$: Upper interquartile bound
- $P_{90}(t)$: Severe surge upper bound (90th percentile)

**Monotonicity Invariant**:
$$P_{10}(t) \le P_{25}(t) \le P_{75}(t) \le P_{90}(t) \quad \forall t$$

---

## 10. Resource Allocation

When daily patient inflow exceeds available bed, ICU, or ventilator capacity, the system evaluates four triage policies (`allocation_strategies.py`):

1. **First-Come, First-Served (FCFS)**: Sequential arrival assignment without acuity prioritization. Represents uncoordinated emergency department queuing.
2. **Clinical Severity**: High-acuity sorting based on patient triage score ($s_i \in [1, 10]$). Critical patients are prioritized for ICU and ventilator allocation.
3. **Demographic Equity**: Proportional capacity reservations across pediatric ($<18$), adult ($18-60$), and senior ($\ge 60$) age brackets to balance demographic acceptance rates:
   $$C_{\text{quota}}(g) = \left\lfloor C_{\text{total}} \times \frac{|g|}{N_{\text{total}}} \right\rfloor$$
4. **Greedy Acuity-to-Cost Heuristic**: Ranks patients by marginal survival benefit per unit of resource consumed:
   $$\text{Score}_i = \frac{\Delta \text{Survival}_i}{\text{Cost}_i} = \frac{s_i \times 0.12}{\text{cost}(p_i)}$$
   where $\text{cost} = 1.0 \text{ (ICU)} + 0.5 \text{ (Ventilator)} + 0.3 \text{ (Bed)}$. Greedily allocates assets to maximize total patient throughput.

**Core Conservation Invariant**:
$$\text{Treated} + \text{Denied} = N_{\text{cohort}}$$

---

## 11. Transfer Engine

The regional transfer engine (`transfer_engine.py`) models patient redistribution across the 8-hospital Nagpur network:

1. **Composite Strain Scoring ($S_h \in [0, 100]$)**:
   $$S_h = 0.25 \left(\frac{\text{occ\_beds}}{\text{tot\_beds}}\right) + 0.35 \left(\frac{\text{occ\_icu}}{\text{tot\_icu}}\right) + 0.25 \left(\frac{\text{vents\_used}}{\text{tot\_vents}}\right) + 0.15 \left(\frac{\text{active\_staff}}{\text{tot\_staff}}\right) \times 100$$
2. **Overload Threshold**: Facilities with $S_h > 75\%$ trigger transfer recommendations.
3. **Surge Headroom Protection**: Senders calculate excess patient transfer volume relative to a **75% target capacity line**, preserving a **25% emergency buffer** for emergent local walk-ins.
4. **Transit-Penalized Matching**: Matches sender facilities with receivers based on available bed/ICU headroom penalized by geographic distance:
   $$\text{MatchScore}(s, r) = 2 \times \text{avail\_beds}_r + 5 \times \text{avail\_icu}_r + 1 \times \text{staff\_slack}_r - 0.5 \times \text{dist}(s, r)$$
5. **Receiver Invariant**: Transferred patient volume never exceeds the receiver's available physical bed headroom ($T_{s \to r} \le \text{AvailableBeds}_r$).

---

## 12. Patient-Level ML

The patient outcome prediction module (`ml_model.py`) models individual triage risk using dual scikit-learn models:

- **Classification Model**: `GradientBoostingClassifier` (100 estimators, max depth 5, learning rate 0.1) predicting 4 clinical classes: **Discharged**, **Admitted**, **Critical**, and **Deceased**.
- **Regression Model**: `GradientBoostingRegressor` (80 estimators, max depth 4) estimating hospital stay duration (hours).
- **15 Clinical Vitals Evaluated**:
  `age`, `gender`, `severity_score`, `respiratory_rate`, `heart_rate`, `spo2`, `temperature`, `systolic_bp`, `has_comorbidity`, `comorbidity_count`, `days_since_symptom_onset`, `is_icu_candidate`, `crisis_day`, `hospital_bed_occupancy`, `hospital_icu_occupancy`.
- **Baseline Feature Perturbation Attribution**:
  Evaluates empirical prediction sensitivity by substituting a population baseline mean $\mu_j$ for each feature $j$ while keeping other features constant:
  $$\Delta_j = P(\text{class} \mid \mathbf{x}) - P(\text{class} \mid \mathbf{x}^{(j)})$$
  Identifies top positive and negative risk contributors for clinical interpretability.
- **Model Artifacts**: Serialized model is persisted in `backend/crisisforge_model.joblib` (1.7 MB), validated against `backend/crisisforge_patient_data.csv` (5,000 synthetic patient records).

---

## 13. Authentication & Security

- **Dual-Mode Authentication**:
  - **Development Mode** (`AUTH_ENABLED=false`): Grants local test bypass with default `UserContext(user_id="dev-analyst", role="admin")` for seamless local testing.
  - **Production Mode** (`AUTH_ENABLED=true`): Enforces HTTP Bearer ID token validation on protected endpoints (`/api/audit-logs`, `/api/telegram/send`).
- **Frontend Token Propagation**: The React HTTP client (`api.ts`) automatically extracts Firebase user credentials and attaches `Authorization: Bearer <token>` headers to outgoing requests.
- **Log Sanitization**: The security utility (`sanitize_log_data()`) strips sensitive patient vitals and personally identifiable fields from terminal output and audit tables.
- **Pydantic Validation Guardrails**: Domain invariants prevent impossible clinical entries ($SpO2 > 100\%$, heart rate $< 0$, or bed configuration mismatches).

For the complete security model and HIPAA considerations, refer to [SECURITY.md](SECURITY.md).

---

## 14. Testing & Quality Assurance

CrisisForge AI includes a comprehensive automated test suite verifying business logic, invariants, API endpoints, and model serialization:

```bash
# Run backend test suite
cd backend
pytest -v
```

### Test Coverage (38 Automated Tests Passing)

| Test Module | Coverage Scope | Status |
|---|---|---|
| `test_invariants.py` | Bed complement sums, negative bounds, probability normalization | Passed (6 tests) |
| `test_prediction.py` | Trend/seasonality, surge multipliers, Monte Carlo bounds ($P_{10} \le P_{90}$) | Passed (4 tests) |
| `test_allocation.py` | Conservation invariant ($\text{Treated} + \text{Denied} = N$), FCFS, Severity, Equity, Greedy | Passed (5 tests) |
| `test_transfer.py` | Composite strain scoring, 75% threshold, receiver headroom limits | Passed (4 tests) |
| `test_ml_model.py` | Shape verification, probability sums, perturbation attribution, persistence | Passed (5 tests) |
| `test_security.py` | Bearer auth bypass, production token requirement, RBAC role guard, sanitization | Passed (4 tests) |
| `test_audit.py` | SQLite/PostgreSQL audit event creation, parameter masking, query retrieval | Passed (3 tests) |
| `test_api.py` | FastAPI route endpoints, 422 validation, scenario list, transfer responses | Passed (7 tests) |

```bash
# Run frontend type check and lint
cd frontend
npm run lint
npm run build
```

---

## 15. Limitations

For full transparent disclosure, see [LIMITATIONS.md](LIMITATIONS.md). Summary:

1. **Synthetic Data**: All models, historical timelines, and patient vitals are synthetically generated.
2. **Simplified Regional Modeling**: Transfer matching calculates geometric Euclidean distance; it does not query live Google Maps / OpenStreetMap traffic APIs.
3. **No Direct EHR Integration**: Triage relies on manual input sliders or synthetic cohorts; it does not connect to HL7 FHIR or clinical EHR systems.
4. **Heuristic vs. Exact MIP**: The resource allocation engine uses a greedy acuity-to-cost heuristic rather than a Mixed-Integer Linear Programming (MILP) solver like Gurobi.
5. **No Medical Device Certification**: CrisisForge AI is an academic decision-support prototype and must not be used for direct patient management.

---

## 16. Future Improvements

1. **HL7 FHIR R4 Integration**: Standardized clinical resource ingestion to ingest real-time admission and vitals data directly from EHR systems.
2. **Live Routing & Ambulance Telemetry**: Real-time traffic routing integration (e.g., OSRM) accounting for road blockages during flooding or earthquakes.
3. **Formal Game-Theoretic TreeSHAP**: Implement exact SHAP values calculated directly against tree structures for certified interpretability.
4. **Full Production HIPAA Infrastructure**: Dedicated audit vault, column-level KMS encryption, and BAA-compliant cloud hosting.

---

## 17. Local Setup & Verification

### Prerequisites
- Node.js v18+ & npm v9+
- Python 3.11+

### 1. Backend Setup

```bash
cd backend

# Create and activate Python virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run automated tests
pytest -v

# Start FastAPI server
uvicorn main:app --reload --port 8000
```

Backend will be running at: **`http://localhost:8000`**  
Interactive Swagger API documentation: **`http://localhost:8000/docs`**

### 2. Frontend Setup

```bash
cd frontend

# Install Node modules
npm install

# Run linter and production build verification
npm run lint
npm run build

# Start Vite development server
npm run dev
```

Frontend will be running at: **`http://localhost:5173`**

---

## 🗺️ Nagpur Facilities Represented

| Hospital | Region | Coordinates | Baseline Beds | ICU Beds |
|---|---|---|---|---|
| AIIMS Nagpur | Mihan | 21.1280°N, 79.0505°E | 450 | 75 |
| Kingsway Hospitals | Nagpur Central | 21.1560°N, 79.0740°E | 300 | 50 |
| Wockhardt Hospital | Sadar | 21.1394°N, 79.0812°E | 250 | 45 |
| Ojas Hospital | Dharampeth | 21.1640°N, 79.0870°E | 180 | 30 |
| Orange City Hospital | Ambazari | 21.1490°N, 79.0950°E | 200 | 35 |
| Aureus Hospital | Wardhaman Nagar | 21.1350°N, 79.1100°E | 150 | 25 |
| Alexis Hospital | Manish Nagar | 21.1720°N, 79.0480°E | 220 | 40 |
| Care Hospital | South Nagpur | 21.1200°N, 79.0650°E | 190 | 30 |

---

## 📄 License

CrisisForge AI is released under the [MIT License](LICENSE).

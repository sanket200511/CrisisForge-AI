# 🏗️ CrisisForge AI — Architecture Deep Dive

> **Technical System Specification & Mathematical Foundations**  
> *Version: 2.2.0 | Framework: FastAPI + React 19 + scikit-learn*

---

## 1. System Topology Overview

CrisisForge AI is an interactive healthcare decision-support platform designed to model, simulate, and balance acute hospital network resources during municipal crises.

### 1.1 Clean Architectural Flow Diagram

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

### 1.2 Component Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Frontend: React 19 + TypeScript + Vite                │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│  │ Dashboard    │ │ Scenario     │ │ Strategy     │ │ Transfer Hub       │ │
│  │ (Capacity)   │ │ Builder      │ │ Comparator   │ │ (Load Balancing)   │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│  │ AI Predictor │ │ Hospital Map │ │ Reports      │ │ Telegram Panel     │ │
│  │ (ML Triage)  │ │ (Leaflet.js) │ │ (Analytics)  │ │ (Notifications)    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────────────┘ │
│                                                                             │
│  State: ThemeContext (Light/Dark) | AuthContext (Firebase Client Routing)   │
│  HTTP Client: Typed api.ts with Bearer token injection                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / JSON (TLS 1.3)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       Backend: FastAPI (Python 3.11+)                       │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Middleware: CORS (Configured Origins) | Lifespan Manager               │ │
│  │ Security: Bearer Token Auth | UserContext | Audit Logger               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────────────────────────┐ │
│  │ Inflow Prediction       │  │ Discrete-Event Simulation                 │ │
│  │ - Trend + Seasonality   │  │ - Daily Patient Queues (Length of Stay)   │ │
│  │ - Monte Carlo P10-P90   │  │ - Dynamic Resource Consumption            │ │
│  └─────────────────────────┘  └───────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────────────────────────┐ │
│  │ Allocation Engine       │  │ Inter-Hospital Transfer Engine            │ │
│  │ - FCFS Arrival Order    │  │ - Multi-Resource Strain Scoring           │ │
│  │ - Clinical Severity     │  │ - 75% Threshold Rule (25% Surge Buffer)   │ │
│  │ - Demographic Equity    │  │ - Geographic Distance Penalty Matching    │ │
│  │ - Greedy Acuity-to-Cost │  │ - 95% Bed Occupancy Emergency Watchdog    │ │
│  └─────────────────────────┘  └───────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────────────────────────┐ │
│  │ Machine Learning        │  │ Async Notification System                 │ │
│  │ - GradientBoosting (GBM)│  │ - Telegram Bot API Integration (httpx)    │ │
│  │ - 15 Clinical Vitals    │  │ - Background Emergency Monitor Task       │ │
│  │ - Baseline Perturbation │  │ - 5-Minute Anti-Spam Rate Limiter         │ │
│  └─────────────────────────┘  └───────────────────────────────────────────┘ │
│                                                                             │
│  Database Layer: SQLAlchemy (SQLite / PostgreSQL Dialects)                  │
│  - Hospitals | Scenarios | SimulationResults | AuditLogs                    │
│  Artifacts: crisisforge_model.joblib (1.7 MB) | crisisforge_patient_data.csv│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inflow Prediction Engine (`prediction_engine.py`)

The inflow prediction engine models time-series patient arrivals during crisis scenarios without external statistical package dependencies.

### 2.1 Mathematical Formulation
1. **Secular Trend & Harmonic Seasonality**:
   $$\text{base}(t) = \text{base\_daily} + 0.05 \cdot t + 5 \sin\left(\frac{2\pi t}{7}\right) + \epsilon(t)$$
   where $\epsilon(t) \sim \mathcal{N}(0, 0.1 \cdot \text{base\_daily})$ represents stochastic daily variance.

2. **Crisis Surge Response Functions**:
   - **Pandemic Wave**: S-curve exponential surge to peak multiplier, plateau, and gradual decline:
     $$\text{factor}(t) = \begin{cases} 1 + (M - 1) \cdot \frac{\phi}{0.4} & \phi < 0.4 \\ M & 0.4 \le \phi < 0.7 \\ M \cdot \left(1 - 0.6 \cdot \frac{\phi - 0.7}{0.3}\right) & \phi \ge 0.7 \end{cases}$$
     where $\phi = \frac{t - t_{\text{onset}}}{T - t_{\text{onset}}}$ and $M$ is the surge multiplier.
   - **Earthquake / Trauma**: Sharp initial pulse followed by rapid decay:
     $$\text{factor}(t) = \begin{cases} 1.5 M & t_{\text{onset}} \le t < t_{\text{onset}} + 3 \\ M \cdot \max\left(1.5 \left(1 - \frac{t - t_{\text{onset}} - 3}{7}\right), 0.3\right) & t_{\text{onset}} + 3 \le t < t_{\text{onset}} + 10 \\ 1.2 & t \ge t_{\text{onset}} + 10 \end{cases}$$
   - **Monsoon Flooding**: Gradual waterborne disease rise, sustained crest, slow recede.

3. **Monte Carlo Confidence Intervals**:
   - Executes $N = 200$ independent stochastic trajectories:
     $$S_k(t) = \max\left(\text{surged}(t) + \mathcal{N}(0, 0.15 \cdot \text{surged}(t)), 0\right)$$
   - Computes empirical percentiles: $P_{10}(t)$, $P_{25}(t)$, $P_{75}(t)$, $P_{90}(t)$.
   - **Invariant**: Strict monotonicity $P_{10}(t) \le P_{25}(t) \le P_{75}(t) \le P_{90}(t)$ is enforced for all $t$.

4. **Queue-Based Resource Consumption Model**:
   - Tracks dynamic discharge queues based on average length-of-stay ($\bar{L} = 5.0$ days).
   - Concurrent active patient census determines daily resource demand:
     $$\text{Beds}(t) = \text{active}(t) \times 0.85, \quad \text{ICU}(t) = \text{active}(t) \times 0.15, \quad \text{Vents}(t) = \text{active}(t) \times 0.08$$

---

## 3. Resource Allocation Strategies (`allocation_strategies.py`)

When incoming demand exceeds instantaneous bed, ICU, or ventilator capacity, the system evaluates four distinct triage policies:

### 3.1 First-Come, First-Served (FCFS)
- Sequentially processes patients in chronological arrival order.
- Consumes ICU/ventilator capacity on first request until exhausted, then assigns regular beds, then denies admission.
- Baseline policy reflecting uncoordinated emergency department queuing.

### 3.2 Clinical Severity Acuity
- Sorts cohort descending by clinical acuity score ($s_i \in [1, 10]$).
- Prioritizes critical patients ($s_i \ge 8$) into available ICU and ventilator slots before admitting lower-severity cases.
- Minimizes immediate critical mortality at the cost of longer wait times for non-urgent patients.

### 3.3 Demographic Equity
- Partitions the incoming cohort into demographic age brackets: Pediatric ($<18$), Adult ($18-60$), and Senior ($\ge 60$).
- Reserves proportional capacity quotas matching the demographic representation of each cohort:
  $$C_{\text{quota}}(g) = \left\lfloor C_{\text{total}} \times \frac{|g|}{N_{\text{total}}} \right\rfloor$$
- Sorts within each cohort by clinical severity, preventing systemic exclusion of vulnerable or elderly cohorts.
- Evaluates equity parity based on the variance of acceptance rates across age groups.

### 3.4 Greedy Acuity-to-Cost Efficiency Heuristic
- Ranks each patient by estimated survival benefit per unit of clinical resource consumed:
  $$\text{Score}_i = \frac{\Delta \text{Survival}_i}{\text{ResourceCost}_i} = \frac{s_i \times 0.12}{\text{cost}(p_i)}$$
  where $\text{cost} = 1.0$ (ICU) $+ 0.5$ (Ventilator) $+ 0.3$ (Regular Bed).
- Greedily allocates available assets to maximize total patient throughput and saved lives under severe capacity constraints.

**Core Allocation Invariant**:
$$\text{Treated} + \text{Denied} = N_{\text{cohort}}$$
$$\text{Treated} \le \text{Beds}_{\text{available}} + \text{ICU}_{\text{available}}$$

---

## 4. Inter-Hospital Transfer Engine (`transfer_engine.py`)

Redistributes patients across an 8-hospital regional network in Nagpur to prevent individual facility failure.

### 4.1 Composite Strain Scoring
Composite strain $S_h \in [0, 100]$ weighs multi-resource utilization, prioritizing critical care assets:
$$S_h = 0.25 \left(\frac{\text{occ\_beds}}{\text{tot\_beds}}\right) + 0.35 \left(\frac{\text{occ\_icu}}{\text{tot\_icu}}\right) + 0.25 \left(\frac{\text{vents\_used}}{\text{tot\_vents}}\right) + 0.15 \left(\frac{\text{active\_staff}}{\text{tot\_staff}}\right) \times 100$$

### 4.2 Redistribution Policy & Threshold Rules
- **Sender Identification**: Facilities with composite strain $S_h > 75.0\%$ are marked as overloaded senders.
- **Headroom Target**: Senders calculate excess patient transfer volume relative to a **75% target capacity line**, preserving a **25% buffer** for emergent local admissions.
- **Receiver Identification**: Facilities with $S_h < 75.0\%$ and at least 5 available general beds.
- **Matching Function**:
  $$\text{MatchScore}(s, r) = 2 \times \text{avail\_beds}_r + 5 \times \text{avail\_icu}_r + 1 \times \text{staff\_slack}_r - 0.5 \times \text{dist}(s, r)$$
- **Receiver Capacity Invariant**:
  $$\text{TransferableBeds} \le \text{AvailableBeds}_r, \quad \text{TransferableICU} \le \text{AvailableICU}_r, \quad s \neq r$$
- **Emergency Capacity Watchdog**: Background loop continuously checks network facilities. If any hospital breaches **$\ge 95\%$ bed capacity**, an emergency alert is dispatched via Telegram.

---

## 5. Machine Learning Pipeline (`ml_model.py`)

Predicts individual patient clinical triage outcomes and hospital stay duration.

### 5.1 Model Specifications
- **Classification Model**: `sklearn.ensemble.GradientBoostingClassifier` (100 estimators, max depth 5, learning rate 0.1, random state 42).
  - Classes: Discharged, Admitted, Critical, Deceased.
- **Regression Model**: `sklearn.ensemble.GradientBoostingRegressor` (80 estimators, max depth 4, learning rate 0.1, random state 42).
  - Output: Estimated resource consumption hours ($h \in [4, 500]$).
- **Features (15 Clinical Vitals)**:
  `age`, `gender`, `severity_score`, `respiratory_rate`, `heart_rate`, `spo2`, `temperature`, `systolic_bp`, `has_comorbidity`, `comorbidity_count`, `days_since_symptom_onset`, `is_icu_candidate`, `crisis_day`, `hospital_bed_occupancy`, `hospital_icu_occupancy`.

### 5.2 Baseline Feature Perturbation Sensitivity Attribution
- Unlike cooperative game-theoretic TreeSHAP, CrisisForge AI implements empirical baseline perturbation:
  1. Computes baseline patient risk $P(\text{class} \mid \mathbf{x})$.
  2. For each feature $j \in \{1, \dots, 15\}$, substitutes reference population mean $\mu_j$ while keeping other features constant:
     $$\mathbf{x}^{(j)} = (x_1, \dots, \mu_j, \dots, x_{15})$$
  3. Feature contribution is the marginal risk shift:
     $$\Delta_j = P(\text{class} \mid \mathbf{x}) - P(\text{class} \mid \mathbf{x}^{(j)})$$
  4. Identifies top risk-increasing and protective factors based on $|\Delta_j|$.

### 5.3 Artifact Management
- Pre-trained model weights are stored in `backend/crisisforge_model.joblib`.
- Reference synthetic dataset is stored in `backend/crisisforge_patient_data.csv` (5,000 samples).
- If the artifact file is present on disk, `CrisisForgeMLModel` loads it in $<100\text{ms}$; otherwise, it falls back to training on synthetic generation.

---

## 6. Database Layer & Audit Logging (`database.py`)

- **Dialect Independence**: Supports both SQLite (local development) and PostgreSQL (production) without application code changes. Detects `DATABASE_URL` prefix:
  - SQLite: Appends `connect_args={"check_same_thread": False}`.
  - PostgreSQL / MySQL: Connects with native connection pooling.
- **Tables**:
  - `hospitals`: Hospital capacity profile and real GPS coordinates.
  - `scenarios`: Crisis parameters and preset configurations.
  - `simulation_results`: Day-by-day timeline outputs and aggregate metrics.
  - `audit_logs`: Immutable clinical decision log recording timestamp, user ID, operational action, resource type, sanitized parameters, and execution status.

---

## 7. Frontend Architecture (`React 19 + TypeScript`)

- **Component Tree**:
  - `App.tsx`: App layout, React Router v7 routes, `ErrorBoundary` wrapper.
  - `Sidebar.tsx`: Navigation menu with active route indicator and mobile hamburger toggle.
  - `AuthContext.tsx`: Firebase authentication state provider, Google OAuth, and session token caching.
  - `ThemeContext.tsx`: Dual light/dark theme provider persisted to `localStorage`.
  - `api.ts`: Centralized typed API client with automatic `Authorization: Bearer <token>` injection.
- **Pages**:
  - `Dashboard.tsx`: Executive command center with real-time capacity progress bars.
  - `ScenarioBuilder.tsx`: Crisis simulation configuration and comparative timeline curves.
  - `StrategyComparator.tsx`: Radar and bar charts comparing survival rate, wait times, and utilization.
  - `TransferHub.tsx`: Inter-hospital transfer recommendation tables and pressure reduction cards.
  - `AIPredictor.tsx`: Patient vital sliders, triage probability bar charts, and feature contribution watermarks.
  - `HospitalMap.tsx`: Theme-aware Leaflet.js map with real Nagpur hospital markers and status tooltips.
  - `TelegramPanel.tsx`: Notification management with message preview and dispatch controls.
  - `Reports.tsx`: Regional capacity breakdown with PDF / CSV export capabilities.

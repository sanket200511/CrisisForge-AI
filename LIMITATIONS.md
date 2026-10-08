# ⚠️ CrisisForge AI — Technical & Clinical Limitations

> **Engineering Honesty, Scope Boundaries, and Production Roadmap**  
> *Version: 2.2.0 | Context: Healthcare Decision-Support Prototype*

---

## 1. Clinical & Healthcare Governance Limitations

### 1.1 Synthetic Training Data & Lack of Clinical Validation
- **Synthetic Data**: The ML triage model (`ml_model.py`) is trained on a synthetic dataset generated via statistical distributions with programmed clinical correlations (`generate_training_data()`).
- **No Real PHI**: The model has **not** been trained or evaluated on real-world clinical datasets (e.g., MIMIC-IV, eICU-CRD, or local Nagpur hospital electronic health records).
- **Metric Context**: Reported classification accuracy (~68–70%) and regression MAE (~8.3 hours) reflect performance on synthetic test partitions, **not clinical efficacy or diagnostic accuracy**.
- **Clinical Validation Requirement**: Prior to any real-world pilot, the models require retrospective cohort validation on multi-center clinical registries, prospective observational trials, calibration curve assessments (Brier score), and approval from an Institutional Review Board (IRB) / Ethics Committee.

### 1.2 Regulatory Classification & Decision-Support Scope
- **Not a Medical Device**: CrisisForge AI is a decision-support prototype and operational planning tool. It is **not** classified as Software as a Medical Device (SaMD) under FDA regulations (21 CFR Part 820) or equivalent CDSCO/MDR guidelines.
- **Human-in-the-Loop Required**: The software must never be used to automate clinical decisions, deny patient admission, or ration mechanical ventilation without direct clinical examination by a licensed medical practitioner.

### 1.3 Epidemiological & Surge Curve Modeling
- **Stylized Surge Curves**: Crisis surge trajectories in `prediction_engine.py` (pandemic waves, trauma pulses, flooding profiles) are stylized mathematical piecewise curves ($S$-curves and exponential decay), not mechanistic epidemiological compartmental models (SEIR, SEIRD, or agent-based transmission simulations).
- **Static Resource Ratios**: Fixed clinical conversion rates (e.g., bed usage rate 85%, ICU rate 15%, ventilator rate 8%, stay duration 5 days) are approximations that do not account for pathogen variants, treatment advancements, or age-stratified acuity profiles.

### 1.4 Ethical & Bioethical Considerations
- Triage algorithms that score patients by acuity, age, or survival-to-cost ratios carry significant ethical risks of demographic discrimination, ageism, and health inequity.
- While the platform includes an `Equity-Weighted` allocation strategy to examine demographic fairness, operational Crisis Standards of Care (CSC) require oversight by multidisciplinary clinical ethics committees rather than purely automated ranking.

---

## 2. Technical & Architectural Limitations

### 2.1 In-Memory Simulation vs. Transactional EHR Persistence
- **Generative Prototype State**: The interactive dashboard endpoints (`/api/hospitals`, `/api/simulate`, `/api/historical`) generate deterministic synthetic hospital profiles on demand to facilitate instantaneous scenario exploration.
- **Database Schema as a Scaffold**: While SQLAlchemy ORM models (`Hospital`, `Scenario`, `SimulationResult`, `AuditLog`) and database-agnostic engines (SQLite/PostgreSQL) are implemented, runtime endpoints do not continuously mutate or query live EHR beds. Production deployment requires connecting these models to live HL7 ADT (Admission, Discharge, Transfer) feeds.

### 2.2 Healthcare Interoperability
- The system currently provides a custom REST / JSON API.
- It does **not** natively implement healthcare interoperability standards:
  - **HL7 v2.x / v3**: No MLLP socket listeners for clinical message feeds.
  - **HL7 FHIR (Fast Healthcare Interoperability Resources) R4**: No FHIR resource endpoints (e.g., `Patient`, `Encounter`, `Location`, `Observation`).
  - Mapping CrisisForge schemas to FHIR resources is planned for the v3 production milestone.

### 2.3 Heuristic Allocation vs. Provable Optimization
- The `Optimized` allocation strategy (`allocation_strategies.py`) is an operational **greedy heuristic** based on marginal acuity-to-resource-cost ranking ($\frac{\text{acuity gain}}{\text{resource cost}}$).
- It is **not** an exact Mixed-Integer Linear Programming (MILP) solver (such as PuLP, Gurobi, or SciPy `linprog`). While computationally fast ($O(N \log N)$), it does not guarantee a mathematically provable global optimum under complex multi-period multi-knapsack constraints.

### 2.4 Authentication & Token Validation Boundaries
- **Dual Mode**: By default, `AUTH_ENABLED=false` runs in development mode with local developer context fallback to ensure reviewers can test the application without cloud configuration.
- In strict production mode (`AUTH_ENABLED=true`), server-side token validation requires deploying Firebase Admin SDK service account credentials.

### 2.5 Scalability & Process Concurrency
- The simulation engine runs synchronously within the FastAPI worker thread.
- For regional simulations covering hundreds of facilities or millions of patient records, the compute engine must be decoupled into background worker queues (e.g., Celery / Redis / Temporal).

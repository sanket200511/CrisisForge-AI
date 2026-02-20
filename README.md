# 🔥 CrisisForge AI v2.0

> **Forging Smarter Decisions — Before the Crisis Hits.**

A comprehensive, free & open-source healthcare resource allocation simulator that **predicts**, **simulates**, **recommends**, and **alerts** — powered by ML and decision intelligence.

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 📊 **Real-Time Dashboard** | Hospital capacity monitoring across multiple facilities |
| 🧪 **Scenario Builder** | Configure crisis simulations with 5 preset scenarios |
| ⚖️ **Strategy Comparator** | Compare 4 allocation strategies (FCFS, Severity, Equity, Optimized) |
| 🚑 **Transfer Hub** | Autonomous inter-hospital patient transfer optimization |
| 🧠 **AI Predictor** | ML-powered patient outcome prediction with SHAP explainability |
| 📱 **Telegram Alerts** | Autonomous crisis notifications via Telegram Bot |
| 📋 **Reports & Analytics** | Capacity breakdown, regional analysis, auto-generated insights |
| 📲 **PWA Support** | Installable on mobile/desktop with offline support |

---

## 🏗️ Architecture

```
┌─────────────── Frontend (React + Vite + TypeScript) ───────────────┐
│  Dashboard │ Scenarios │ Strategies │ Transfers │ AI │ Telegram │ Reports │
└────────────────────────────┬───────────────────────────────────────┘
                             │ REST API
┌────────────────────────────┴───────────────────────────────────────┐
│                    FastAPI Backend (Python)                        │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────────────┐ │
│  │  Prediction   │ │  Simulation    │ │  Allocation Strategies   │ │
│  │  Engine       │ │  Engine        │ │  (4 algorithms)          │ │
│  │  (ARIMA+MC)   │ │  (Discrete)    │ │                          │ │
│  └──────────────┘ └────────────────┘ └──────────────────────────┘ │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────────────┐ │
│  │  Transfer     │ │  ML Model      │ │  Telegram Bot            │ │
│  │  Engine       │ │  (GBM + SHAP)  │ │  (Autonomous Alerts)     │ │
│  └──────────────┘ └────────────────┘ └──────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🧠 AI/ML Components

### Prediction Engine
- ARIMA-inspired patient inflow forecasting
- Monte Carlo simulation for confidence intervals (P10–P90)
- Crisis-specific surge pattern modeling (pandemic, earthquake, flood)

### ML Outcome Predictor
- GradientBoosting (XGBoost-equivalent) classifier + regressor
- **15 patient features**: age, severity, SpO2, heart rate, comorbidities, etc.
- **4 outcome classes**: Discharged, Admitted, Critical, Deceased
- **SHAP-like explanations**: Perturbation-based feature contribution analysis
- Resource hours prediction for capacity planning

### Transfer Optimization Algorithm
- Composite pressure scoring (bed, ICU, ventilator, staff weighted)
- Distance-aware hospital matching with capacity constraints
- Priority-based scheduling (critical → high → medium)
- Network-level load balancing with impact estimation

---

## 🔌 API Endpoints (15+)

### Core
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hospitals` | Hospital profiles |
| POST | `/api/predict` | Patient inflow forecast |
| POST | `/api/simulate` | Full crisis simulation |
| GET | `/api/scenarios` | Preset crisis scenarios |
| GET | `/api/strategies` | Allocation strategy list |
| GET | `/api/historical` | Historical admission data |
| GET | `/api/dashboard-summary` | Dashboard aggregation |

### Transfer Engine
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transfers` | Transfer recommendations |

### ML Model
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ml/status` | Model training metrics |
| POST | `/api/ml/predict` | Patient outcome prediction |
| POST | `/api/ml/explain` | SHAP-like explanation |
| GET | `/api/ml/importance` | Feature importance |
| POST | `/api/ml/predict-batch` | Batch predictions |

### Telegram
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/telegram/status` | Bot config status |
| POST | `/api/telegram/send` | Send alert message |
| GET | `/api/telegram/preview` | Preview message |

---

## 🚀 Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Telegram Setup (Optional)
1. Message `@BotFather` on Telegram → `/newbot`
2. Copy the bot token
3. Message `@userinfobot` → get your Chat ID
4. Set environment variables or enter in the Telegram panel

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Recharts, Framer Motion, Lucide Icons |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2 |
| **AI/ML** | scikit-learn (GradientBoosting), NumPy, SciPy |
| **Simulation** | Custom discrete-event engine + Monte Carlo |
| **PWA** | Service Worker + Web App Manifest |
| **Database** | SQLAlchemy + SQLite |

---

## 📁 Project Structure

```
HackWhack/
├── backend/
│   ├── main.py                 # FastAPI app (15+ endpoints)
│   ├── prediction_engine.py    # ARIMA + Monte Carlo forecasting
│   ├── simulation_engine.py    # Discrete-event crisis simulation
│   ├── allocation_strategies.py # 4 resource allocation algorithms
│   ├── transfer_engine.py      # Inter-hospital transfer optimizer
│   ├── ml_model.py             # GBM model + SHAP explanations
│   ├── telegram_bot.py         # Autonomous alert system
│   ├── data_generator.py       # Synthetic data generation
│   ├── database.py             # SQLAlchemy ORM models
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # 7-page routing + ErrorBoundary
│   │   ├── api.ts              # Typed API client (v2.0)
│   │   ├── index.css           # Design system
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       ├── ScenarioBuilder.tsx
│   │       ├── StrategyComparator.tsx
│   │       ├── TransferHub.tsx
│   │       ├── AIPredictor.tsx
│   │       ├── TelegramPanel.tsx
│   │       └── Reports.tsx
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   └── sw.js               # Service worker
│   └── index.html              # SEO + PWA + Google Fonts
└── README.md
```

---

## 👨‍💻 Team

**The Code Alchemist** — HackWhack 3.0

---

## 📄 License

Free & Open Source — MIT License

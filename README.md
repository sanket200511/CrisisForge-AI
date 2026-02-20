# 🔥 CrisisForge AI v3.0

> **Forging Smarter Decisions — Before the Crisis Hits.**

A comprehensive, free & open-source healthcare resource allocation platform for **Nagpur** that **predicts**, **simulates**, **redistributes**, and **alerts** — powered by ML, decision intelligence, and real-time visualization.

**Built by The Code Alchemist • HackWhack 3.0 • Nagpur**

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Dual Authentication** | Firebase Google OAuth + Email/Password login with registration |
| 📊 **Real-Time Dashboard** | Hospital capacity monitoring across 8 Nagpur facilities |
| 🧪 **Scenario Builder** | Configure crisis simulations with 5 preset disaster scenarios |
| ⚖️ **Strategy Comparator** | Compare 4 allocation strategies with radar charts |
| 🚑 **Transfer Hub** | Autonomous inter-hospital patient redistribution (95% threshold rule) |
| 🧠 **AI Predictor** | ML-powered patient outcome prediction with SHAP explainability |
| 📱 **Telegram Alerts** | Autonomous crisis notifications via Telegram Bot |
| 🗺️ **Interactive Map** | Nagpur hospital network map with real GPS coordinates (Leaflet.js) |
| 📈 **Reports & Analytics** | Capacity breakdown, regional analysis, CSV + PDF export |
| 📲 **PWA Support** | Installable on mobile/desktop with offline caching |
| 🌓 **Light/Dark Theme** | Full dual-theme system with persisted preference |
| 📱 **Mobile Responsive** | Hamburger menu, responsive grids, touch-friendly UI |

---

## 🏗️ Architecture

```
┌──────────────── Frontend (React 19 + Vite 7 + TypeScript) ─────────────────┐
│  Login │ Dashboard │ Scenarios │ Strategies │ Transfers │ AI │ Map │ Reports │
│                    Firebase Auth (Google + Email/Password)                   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ REST API (15+ endpoints)
┌────────────────────────────────┴────────────────────────────────────────────┐
│                       FastAPI Backend (Python 3.11+)                         │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────────────────────┐  │
│  │ Prediction   │ │ Simulation     │ │ Allocation Strategies            │  │
│  │ (ARIMA+MC)   │ │ (Discrete)     │ │ (FCFS, Severity, Equity, Optim) │  │
│  └──────────────┘ └────────────────┘ └──────────────────────────────────┘  │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────────────────────┐  │
│  │ Transfer     │ │ ML Model       │ │ Telegram Bot                     │  │
│  │ Engine       │ │ (GBM + SHAP)   │ │ (Autonomous Alerts)              │  │
│  └──────────────┘ └────────────────┘ └──────────────────────────────────┘  │
│  SQLite + SQLAlchemy ORM │ Exported: crisisforge_model.joblib              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 AI/ML Components

### Prediction Engine
- ARIMA-inspired patient inflow forecasting
- Monte Carlo simulation for confidence intervals (P10–P90)
- Crisis-specific surge pattern modeling (pandemic, earthquake, flood, staff shortage, multi-hazard)

### ML Outcome Predictor
- GradientBoosting (XGBoost-equivalent) classifier + regressor
- **15 patient features**: age, severity, SpO2, heart rate, temperature, BP, comorbidities, etc.
- **4 outcome classes**: Discharged, Admitted, Critical, Deceased
- **SHAP-like explanations**: Perturbation-based feature contribution analysis
- Resource hours prediction for capacity planning
- **Exported as `crisisforge_model.joblib`** with training dataset (5,000 rows × 17 columns)

### Transfer Optimization Algorithm (95% Rule)
- When any hospital reaches **95% bed occupancy**, patient redistribution triggers automatically
- **5% buffer always reserved** for incoming critical/emergency patients
- Composite pressure scoring (bed, ICU, ventilator, staff weighted)
- Distance-aware hospital matching with capacity constraints
- Network-level load balancing with impact estimation

---

## 🔌 API Endpoints (15+)

### Core
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hospitals` | Hospital profiles with GPS coordinates |
| POST | `/api/predict` | Patient inflow forecast (ARIMA + Monte Carlo) |
| POST | `/api/simulate` | Full crisis simulation |
| GET | `/api/scenarios` | 5 preset crisis scenarios |
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

### Telegram Bot
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/telegram/status` | Bot config status |
| POST | `/api/telegram/send` | Send alert message |
| GET | `/api/telegram/preview` | Preview message |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Python 3.9+
- Firebase project (free tier)

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
cp .env.local.example .env.local   # Add your Firebase keys
npm run dev
```

### Export ML Model (Optional)
```bash
cd backend
python export_model.py
# Creates: crisisforge_model.joblib + crisisforge_patient_data.csv
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔐 Authentication

CrisisForge AI supports **dual authentication**:

1. **Google OAuth** — One-click login via Firebase
2. **Email/Password** — Standard registration & sign-in

Both methods are handled by Firebase Authentication. The app shows a login screen with both options. Only authenticated users can access the dashboard.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------:|
| **Frontend** | React 19, TypeScript, Vite 7, Recharts, Framer Motion, Lucide Icons, Leaflet.js |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2, Uvicorn |
| **AI/ML** | scikit-learn (GradientBoosting), NumPy, SciPy, joblib |
| **Authentication** | Firebase Auth (Google OAuth + Email/Password) |
| **Simulation** | Custom discrete-event engine + Monte Carlo |
| **Map** | Leaflet.js + CARTO light/dark tiles (theme-aware, real GPS) |
| **Theming** | CSS Variables + ThemeContext (Light/Dark with localStorage) |
| **PWA** | Service Worker + Web App Manifest |
| **Database** | SQLAlchemy + SQLite |
| **Alerts** | Telegram Bot API |

---

## 📁 Project Structure

```
HackWhack/
├── backend/
│   ├── main.py                       # FastAPI app (15+ endpoints)
│   ├── prediction_engine.py          # ARIMA + Monte Carlo forecasting
│   ├── simulation_engine.py          # Discrete-event crisis simulation
│   ├── allocation_strategies.py      # 4 resource allocation algorithms
│   ├── transfer_engine.py            # Inter-hospital transfer optimizer
│   ├── ml_model.py                   # GBM model + SHAP explanations
│   ├── telegram_bot.py               # Autonomous alert system
│   ├── data_generator.py             # Synthetic data (8 Nagpur hospitals + GPS)
│   ├── export_model.py               # Export model to .joblib
│   ├── database.py                   # SQLAlchemy ORM models
│   ├── crisisforge_model.joblib      # Pre-trained ML model artifact
│   ├── crisisforge_patient_data.csv  # 5,000-row training dataset
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                   # 9-page routing + ErrorBoundary
│   │   ├── api.ts                    # Typed API client (v2.0)
│   │   ├── firebase.ts              # Firebase config
│   │   ├── index.css                # Design system (glassmorphism + responsive)
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx       # Firebase Auth (Google + Email)
│   │   │   └── ThemeContext.tsx      # Light/Dark theme with localStorage
│   │   ├── components/
│   │   │   └── Sidebar.tsx          # Responsive sidebar + hamburger menu
│   │   └── pages/
│   │       ├── Login.tsx            # Dual auth login screen
│   │       ├── Dashboard.tsx        # Command Center
│   │       ├── ScenarioBuilder.tsx  # Crisis simulation
│   │       ├── StrategyComparator.tsx # Strategy radar charts
│   │       ├── TransferHub.tsx      # Patient redistribution
│   │       ├── AIPredictor.tsx      # ML + SHAP predictions
│   │       ├── TelegramPanel.tsx    # Alert management
│   │       ├── HospitalMap.tsx      # Theme-aware Nagpur map (Leaflet.js)
│   │       └── Reports.tsx          # Analytics + CSV/PDF export
│   ├── public/
│   │   ├── manifest.json           # PWA manifest
│   │   └── sw.js                   # Service worker
│   └── index.html                  # SEO + PWA + Google Fonts
├── CrisisForge_Documentation/
│   ├── For_Hackathon/              # 10 documents for judges
│   └── For_Interview/              # 11 documents for interviews
└── README.md
```

---

## 🗺️ Nagpur Hospitals Covered

| Hospital | Region | GPS |
|----------|--------|-----|
| GMCH Nagpur | Central Nagpur | 21.1458°N, 79.0882°E |
| Wockhardt Hospital | Sadar | 21.1540°N, 79.0759°E |
| AIIMS Nagpur | Mihan | 21.0866°N, 79.0549°E |
| Orange City Hospital | Nagpur West | 21.1431°N, 79.0630°E |
| Care Hospital | Ramdaspeth | 21.1374°N, 79.0806°E |
| Lata Mangeshkar Hospital | Hingna | 21.1201°N, 79.0311°E |
| Alexis Hospital | Manish Nagar | 21.1120°N, 79.0671°E |
| Kingsway Hospital | Kingsway | 21.1562°N, 79.0878°E |

---

## 🚢 Deployment

See [DEPLOYMENT_GUIDE.md](CrisisForge_Documentation/For_Hackathon/DEPLOYMENT_GUIDE.md) for full step-by-step instructions.

### Frontend (Vercel)
```bash
# Push to GitHub, then import in Vercel
# Set environment variable:
VITE_API_URL=https://your-backend-url.onrender.com
```

### Backend (Render)
```bash
# Build: pip install -r requirements.txt
# Start: uvicorn main:app --host 0.0.0.0 --port $PORT
# Env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
```

| Component | Platform | URL |
|-----------|----------|-----|
| Backend | Render.com | `https://crisisforge-api.onrender.com` |
| Frontend | Vercel | `https://crisisforge-ai.vercel.app` |
| Auth | Firebase | Console |
| Alerts | Telegram | `@CrisisForgeBot` |

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [QA_DOCUMENT.md](CrisisForge_Documentation/For_Hackathon/QA_DOCUMENT.md) | 63 Q&A for hackathon judges |
| [DEMO_SCENARIO.md](CrisisForge_Documentation/For_Hackathon/DEMO_SCENARIO.md) | Full 10-minute demo script |
| [DEPLOYMENT_GUIDE.md](CrisisForge_Documentation/For_Hackathon/DEPLOYMENT_GUIDE.md) | Complete deployment guide |
| [CODE_EXPLANATION.md](CrisisForge_Documentation/For_Hackathon/CODE_EXPLANATION.md) | Architecture deep dive |
| [FIREBASE_SETUP_GUIDE.md](CrisisForge_Documentation/For_Hackathon/FIREBASE_SETUP_GUIDE.md) | Firebase configuration |

---

## 👨‍💻 Team

**The Code Alchemist** — HackWhack 3.0 • Nagpur

---

## 📄 License

Free & Open Source — MIT License

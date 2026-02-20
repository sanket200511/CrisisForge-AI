import { Component } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FlaskConical, GitCompare, FileBarChart, Heart,
  ArrowRightLeft, Brain, Send,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ScenarioBuilder from './pages/ScenarioBuilder';
import StrategyComparator from './pages/StrategyComparator';
import Reports from './pages/Reports';
import TransferHub from './pages/TransferHub';
import AIPredictor from './pages/AIPredictor';
import TelegramPanel from './pages/TelegramPanel';
import './index.css';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/scenarios', label: 'Scenario Builder', icon: FlaskConical },
  { path: '/compare', label: 'Strategy Comparator', icon: GitCompare },
  { path: '/transfers', label: 'Transfer Hub', icon: ArrowRightLeft },
  { path: '/ai', label: 'AI Predictor', icon: Brain },
  { path: '/telegram', label: 'Telegram Alerts', icon: Send },
  { path: '/reports', label: 'Reports & Analytics', icon: FileBarChart },
];

/* ─── Error Boundary ─── */
interface EBState { hasError: boolean; error?: Error }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#f1f5f9' }}>
          <h2 style={{ color: '#ef4444', marginBottom: 12 }}>Something went wrong</h2>
          <pre style={{ background: '#0a1628', padding: 16, borderRadius: 8, color: '#94a3b8', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import Sidebar from './components/Sidebar';

/* ─── App Layout ─── */
function AppContent() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scenarios" element={<ScenarioBuilder />} />
            <Route path="/compare" element={<StrategyComparator />} />
            <Route path="/transfers" element={<TransferHub />} />
            <Route path="/ai" element={<AIPredictor />} />
            <Route path="/telegram" element={<TelegramPanel />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

import { Component } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ScenarioBuilder from './pages/ScenarioBuilder';
import StrategyComparator from './pages/StrategyComparator';
import Reports from './pages/Reports';
import TransferHub from './pages/TransferHub';
import AIPredictor from './pages/AIPredictor';
import TelegramPanel from './pages/TelegramPanel';
import HospitalMap from './pages/HospitalMap';
import './index.css';

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
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';

/* ─── App Layout ─── */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, isAuthEnabled } = useAuth();

  // If Firebase is not configured, skip auth and let everyone in
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="app-layout">
      {!isLoginPage && <Sidebar />}
      <main className={`main-content ${isLoginPage ? 'no-sidebar' : ''}`}>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/scenarios" element={<ProtectedRoute><ScenarioBuilder /></ProtectedRoute>} />
            <Route path="/compare" element={<ProtectedRoute><StrategyComparator /></ProtectedRoute>} />
            <Route path="/transfers" element={<ProtectedRoute><TransferHub /></ProtectedRoute>} />
            <Route path="/ai" element={<ProtectedRoute><AIPredictor /></ProtectedRoute>} />
            <Route path="/telegram" element={<ProtectedRoute><TelegramPanel /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><HospitalMap /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

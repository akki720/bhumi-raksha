import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import WarningToast from './components/WarningToast';
import Dashboard from './pages/Dashboard';
import RiskMap from './pages/RiskMap';
import RealTimeMonitoring from './pages/RealTimeMonitoring';
import FieldReports from './pages/FieldReports';
import Alerts from './pages/Alerts';
import AIExplainability from './pages/AIExplainability';
import Settings from './pages/Settings';
import EmergencyCenter from './pages/EmergencyCenter';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import * as api from './api/endpoints';

function ProtectedApp() {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      const token = localStorage.getItem('bhumi_token');
      if (!token) {
        if (active) {
          setIsAuthenticated(false);
          setIsChecking(false);
        }
        return;
      }

      try {
        await api.getMe();
        if (active) {
          setIsAuthenticated(true);
          setIsChecking(false);
        }
      } catch (err) {
        localStorage.removeItem('bhumi_token');
        localStorage.removeItem('bhumi_user');
        if (active) {
          setIsAuthenticated(false);
          setIsChecking(false);
        }
      }
    };

    validateSession();
    return () => {
      active = false;
    };
  }, []);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-sm text-slate-300">Validating session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/risk-map" element={<RiskMap />} />
          <Route path="/monitoring" element={<RealTimeMonitoring />} />
          <Route path="/field-reports" element={<FieldReports />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/explainability" element={<AIExplainability />} />
          <Route path="/emergency" element={<EmergencyCenter />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <WarningToast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </AppProvider>
  );
}

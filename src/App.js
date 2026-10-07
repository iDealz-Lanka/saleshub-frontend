import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SalesEntry from './pages/SalesEntry';
import AdminUsers from './pages/AdminUsers';
import SupplierReport from './pages/SupplierReport';
import PurchaseInvoice from './pages/PurchaseInvoice';
import Layout from './components/Layout';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001';

function WakeUp({ children }) {
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let tries = 0;
    const ping = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) { setReady(true); return; }
      } catch {}
      tries++;
      setAttempt(tries);
      setTimeout(ping, 3000);
    };
    ping();
  }, []);

  if (!ready) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F9FAFB'
    }}>
      <div style={{
        width: 48, height: 48, border: '4px solid #E0E7FF',
        borderTop: '4px solid #4F46E5', borderRadius: '50%',
        animation: 'spin 1s linear infinite', marginBottom: 24
      }} />
      <div style={{ color: '#6B7280', fontSize: 14 }}>
        {attempt === 0 ? 'Loading...' : attempt < 3 ? 'Please wait...' : 'Almost ready...'}
      </div>
      {attempt > 2 && (
        <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>
          This may take up to 30 seconds on first load
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  return children;
}

const Private = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/" />;
};

export default function App() {
  return (
    <AuthProvider>
      <WakeUp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Private><Layout /></Private>}>
              <Route index element={<Dashboard />} />
              <Route path="sales" element={<SalesEntry />} />
              <Route path="supplier-report" element={<AdminRoute><SupplierReport /></AdminRoute>} />
              <Route path="purchase-invoice" element={<AdminRoute><PurchaseInvoice /></AdminRoute>} />
              <Route path="users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WakeUp>
    </AuthProvider>
  );
}

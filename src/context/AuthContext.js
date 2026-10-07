import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

const SESSION_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    setShowWarning(false);
  }, []);

  const resetTimer = useCallback(() => {
    if (!user) return;

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    setShowWarning(false);

    // Show warning at 2 minutes 30 seconds (30 seconds before logout)
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
    }, SESSION_TIMEOUT - 30000);

    // Auto logout at 3 minutes
    timeoutRef.current = setTimeout(() => {
      setShowWarning(false);
      logout();
    }, SESSION_TIMEOUT);
  }, [user, logout]);

  // Reset timer on any user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => resetTimer();

    events.forEach(e => window.addEventListener(e, handleActivity));
    resetTimer(); // Start timer on mount

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, resetTimer]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}

      {/* Session Warning Popup */}
      {showWarning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)'
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '32px 28px',
            maxWidth: 360, width: '90%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⏰</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1E1B4B', marginBottom: 8 }}>
              Session Expiring
            </div>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
              You will be automatically logged out in <strong>30 seconds</strong> due to inactivity.
            </div>
            <button
              onClick={() => { resetTimer(); setShowWarning(false); }}
              style={{
                width: '100%', padding: '12px', background: '#4F46E5',
                color: 'white', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: 'pointer'
              }}>
              Stay Logged In
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

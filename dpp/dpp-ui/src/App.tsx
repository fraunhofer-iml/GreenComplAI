import React, { useEffect, useState } from 'react';
import './css/App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route, Navigate,
} from 'react-router-dom';
import ProfileView from './view/ProfileView';
import SettingsView from './view/SettingsView';
import DashboardLayout from './view/DashboardLayout';
import Dashboard from './view/Dashboard';
import ManagementView from './view/ManagementView';
import DPPDetailsView from './view/DPPDetailsView';
import LoginView from './view/LoginView';

function App() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const apiBaseUrl = process.env.REACT_APP_API_BACKEND_URL || '';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('App.tsx - Status check incoming');
        const res = await fetch(`${apiBaseUrl}/api/auth/status`, {
          credentials: 'include',
        });
        console.log('App.tsx - Status check done');
        const data = await res.json();
        console.log('App.tsx - Status check data: ', data);

        if (data.authenticated) {
          console.log('App.tsx - is authenticated :)');
          setAuthenticated(true);
        } else {
          // Login URL vom Backend holen
          console.log('App.tsx - is not authenticated :(');
          const loginRes = await fetch(`${apiBaseUrl}/api/auth/login-url`, {
            credentials: 'include',
          });
          const loginUrl = await loginRes.text();
          console.log('App.tsx - Redirecting to Keycloak', loginUrl);
          window.location.href = loginUrl;
        }
      } catch (err) {
        console.error('App.tsx - Auth check failed', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [apiBaseUrl]);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Public Login */}
        <Route
          path="/"
          element={
            authenticated ? <Navigate to="/dashboard" replace /> : <LoginView />
          }
        />

        {/* Protected Layout unter /dashboard */}
        <Route
          path="/dashboard/*"
          element={
            authenticated ? <DashboardLayout /> : <Navigate to="/" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dpp-detail-view/:dppId" element={<DPPDetailsView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="profile" element={<ProfileView />} />
          <Route path="management" element={<ManagementView />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

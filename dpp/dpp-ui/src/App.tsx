import React from 'react';
import './css/App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginView from './view/LoginView';
import ProfileView from "./view/ProfileView";
import DashboardLayout from "./view/DashboardLayout";
import Dashboard from "./view/Dashboard";
import ManagementView from './view/ManagementView';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LoginView />} />

                {/* Protected layout */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="profile" element={<ProfileView />} />
                    <Route path="management" element={<ManagementView />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;

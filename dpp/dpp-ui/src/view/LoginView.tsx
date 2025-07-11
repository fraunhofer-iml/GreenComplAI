import React from 'react';
import '../css/App.css';
import { useNavigate } from 'react-router-dom';

export default function LoginView() {
    const navigate = useNavigate(); // Hook für die Navigation

    const handleLogin = () => {
        // Hier kannst du z. B. Login-Logik hinzufügen
        // Nach erfolgreichem Login zum Dashboard navigieren
        navigate('/dashboard');
    };

    return (
        <div className="login-view">
            <h2>Login Page</h2>
            <button onClick={handleLogin}>Login</button>
        </div>
    );
}
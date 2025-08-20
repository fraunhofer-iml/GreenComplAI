import React, { useEffect } from 'react';
import '../css/App.css';
import { useNavigate } from 'react-router-dom';

export default function LoginView(props: {}) {

  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/auth/status", { credentials: "include" })
      .then(res => res.json()) // direkt JSON
      .then(data => {
        console.log("Antwort von /status:", data);
        if (data.authenticated) {
          navigate("/dashboard");
        }
      })
      .catch(err => console.error("Fehler bei /status:", err));
  }, [navigate]);

  return <div>Redirecting to login...</div>;
}

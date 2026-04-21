import { useState } from "react";
import { signIn } from "../services/auth.js";

export default function LoginPage({ onSignIn }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      onSignIn();
    } catch (e) {
      setError(e.message || "Innlogging feilet. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">LARK</div>
        <p className="login-tagline">Landskapsplanlegger</p>
        <p className="login-desc">
          Logg inn med din ArcGIS Online-konto for å opprette og redigere
          landskapsplaner.
        </p>
        {error && <p className="error-msg">{error}</p>}
        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Logger inn…" : "Logg inn med ArcGIS Online"}
        </button>
        <p className="login-note">
          Kartlag lagres automatisk som Hosted Feature Layers i din konto.
        </p>
      </div>
    </div>
  );
}

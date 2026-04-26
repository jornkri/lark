import { useState, useEffect, useRef } from "react";
import { signIn } from "../services/auth.js";

const LeafIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="login-leaf" aria-hidden="true" focusable="false">
    <circle cx="20" cy="20" r="19" stroke="rgba(200,240,174,0.12)" strokeWidth="1"/>
    <path
      d="M20 8 C14 8 9 13 9 19 C9 25 14 30 20 30 C20 30 20 22 20 19 C20 22 20 30 20 30 C26 30 31 25 31 19 C31 13 26 8 20 8Z"
      fill="rgba(200,240,174,0.08)" stroke="rgba(200,240,174,0.25)" strokeWidth="0.8"
    />
    <line x1="20" y1="8" x2="20" y2="32" stroke="rgba(200,240,174,0.15)" strokeWidth="0.7"/>
    <path d="M20 14 Q15 16 13 20" stroke="rgba(200,240,174,0.12)" strokeWidth="0.5" fill="none"/>
    <path d="M20 14 Q25 16 27 20" stroke="rgba(200,240,174,0.12)" strokeWidth="0.5" fill="none"/>
    <path d="M20 20 Q15 21 13 24" stroke="rgba(200,240,174,0.10)" strokeWidth="0.5" fill="none"/>
    <path d="M20 20 Q25 21 27 24" stroke="rgba(200,240,174,0.10)" strokeWidth="0.5" fill="none"/>
  </svg>
);

export default function LoginPage({ onSignIn }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Target = raw mouse position, current = smoothly interpolated
    const target  = { x: -9999, y: -9999 };
    const current = { x: -9999, y: -9999 };
    let rafId;

    const GRID     = 32;
    const STEP     = 4;   // subdivide each cell into 8 segments for smooth curves
    const R        = 200; // sphere radius in px
    const STRENGTH = 64;  // max outward displacement in px
    const LERP     = 0.12; // smoothing factor per frame

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function displace(x, y, mx, my) {
      const dx = x - mx;
      const dy = y - my;
      const d2 = dx * dx + dy * dy;
      if (d2 >= R * R || d2 < 0.25) return { x, y };
      const d  = Math.sqrt(d2);
      const t  = d / R;
      const z  = Math.sqrt(1 - t * t); // sphere-height profile
      const push = z * STRENGTH;
      return { x: x + (dx / d) * push, y: y + (dy / d) * push };
    }

    function draw() {
      // Smooth current toward target
      current.x += (target.x - current.x) * LERP;
      current.y += (target.y - current.y) * LERP;

      const W  = canvas.width;
      const H  = canvas.height;
      const mx = current.x;
      const my = current.y;

      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(200,240,174,0.055)";
      ctx.lineWidth   = 0.7;

      // Horizontal lines
      for (let y = 0; y <= H + GRID; y += GRID) {
        ctx.beginPath();
        let first = true;
        for (let x = -STEP; x <= W + STEP; x += STEP) {
          const p = displace(x, y, mx, my);
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else        ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Vertical lines
      for (let x = 0; x <= W + GRID; x += GRID) {
        ctx.beginPath();
        let first = true;
        for (let y = -STEP; y <= H + STEP; y += STEP) {
          const p = displace(x, y, mx, my);
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else        ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      rafId = requestAnimationFrame(draw);
    }

    function onMouseMove(e) {
      target.x = e.clientX;
      target.y = e.clientY;
    }
    function onMouseLeave() {
      target.x = -9999;
      target.y = -9999;
    }

    resize();
    window.addEventListener("resize",     resize);
    window.addEventListener("mousemove",  onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    rafId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize",     resize);
      window.removeEventListener("mousemove",  onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

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
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <canvas ref={canvasRef} className="login-grid" />
      <div className="login-vignette" />
      <div className="login-card">
        <LeafIcon />
        <div className="login-logo">LARK</div>
        <p className="login-tagline">Landskapsplanlegger</p>
        {error && <p className="error-msg">{error}</p>}
        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Logger inn…" : "Logg inn med ArcGIS Online"}
        </button>
      </div>
    </div>
  );
}

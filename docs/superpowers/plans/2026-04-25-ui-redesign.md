# LARK Forest Floor UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all existing LARK UI with the approved "Forest Floor" design — dark nature aesthetic, glassmorphism panels, collapsible edit-panel icon strip, and scalable config page with left navigation sidebar.

**Architecture:** Pure CSS/JSX visual redesign — no changes to data flow, ArcGIS logic, or services. `src/App.css` is fully rewritten section by section across tasks. Each component gets targeted JSX structural changes (new elements, new state). No new routes or API calls.

**Tech Stack:** React 18, Vite, CSS custom properties, Inter font (Google Fonts, already loaded in App.css)

---

## File map

| File | Change |
|---|---|
| `src/App.css` | Full rewrite — done in sections across Tasks 1–7 |
| `src/components/LoginPage.jsx` | Add blobs, grid, vignette, leaf SVG; remove two text nodes |
| `src/components/MapView.jsx` | Slim topbar with leaf SVG + separator; loading pill; glass attribution |
| `src/components/EditPanel.jsx` | Add `collapsed` state + icon-strip render path |
| `src/components/ConfigPage.jsx` | Add left nav sidebar + `activeSection` state; split content into sections |

---

## Task 1: Design tokens + base CSS

**Files:**
- Modify: `src/App.css` (replace entire file content — start fresh)

- [ ] **Step 1: Overwrite App.css with tokens, reset, body, map-container and shared topbar styles**

Replace the entire contents of `src/App.css` with:

```css
/* ── Fonts ───────────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

/* ── Design tokens ───────────────────────────────────────────────────────── */
:root {
  --bg-base:        #030904;
  --bg-app:         #060e05;
  --bg-surface:     rgba(5,12,4,0.90);
  --bg-topbar:      rgba(4,10,4,0.92);
  --border-subtle:  rgba(200,240,174,0.07);
  --border-active:  rgba(200,240,174,0.14);
  --accent:         #c8f0ae;
  --accent-dim:     #8ab870;
  --accent-muted:   #4a7040;
  --accent-ghost:   #2e4a26;
  --accent-deep:    #1e3418;
  --action-bg:      #1a4a10;
  --action-bg-hover:#22601a;
  --glass-blur:     blur(16px);
  --glass-shadow:   0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(200,240,174,0.04) inset;
}

/* ── Reset & Base ────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; width: 100%; overflow: hidden; }
body {
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg-app);
  color: var(--accent-dim);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Map container ───────────────────────────────────────────────────────── */
.map-container {
  position: absolute;
  inset: 0;
  top: 48px; /* topbar height */
}

/* ── Topbar (shared: MapView + ConfigPage) ───────────────────────────────── */
.top-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 50;
  height: 48px;
  background: var(--bg-topbar);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.2rem;
  border-bottom: 1px solid rgba(200,240,174,0.06);
}
.top-bar-left  { display: flex; align-items: center; gap: 0.75rem; }
.top-bar-right { display: flex; align-items: center; gap: 0.65rem; }

.top-bar-sep {
  width: 1px;
  height: 14px;
  background: rgba(200,240,174,0.10);
  flex-shrink: 0;
}

.app-logo {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 0.20em;
  text-transform: uppercase;
}
.app-subtitle {
  font-size: 0.68rem;
  font-weight: 400;
  color: var(--accent-ghost);
  letter-spacing: 0.04em;
}
.username {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--accent-ghost);
}
.top-bar-btn {
  background: transparent;
  border: 1px solid rgba(200,240,174,0.12);
  color: var(--accent-muted);
  padding: 0.28rem 0.7rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.68rem;
  font-weight: 500;
  font-family: inherit;
  letter-spacing: 0.03em;
  transition: background 0.15s, border-color 0.15s;
}
.top-bar-btn:hover {
  background: rgba(200,240,174,0.06);
  border-color: rgba(200,240,174,0.22);
}

/* ── Generic loading (initial app load before map) ───────────────────────── */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--accent-muted);
  letter-spacing: 0.06em;
  background: var(--bg-app);
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(200,240,174,0.12);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin: 0 auto;
}
.spinner-sm {
  width: 14px; height: 14px;
  border: 2px solid rgba(200,240,174,0.15);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Error overlay ───────────────────────────────────────────────────────── */
.error-overlay {
  position: absolute;
  inset: 0;
  top: 48px;
  background: rgba(3,9,4,0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
  backdrop-filter: blur(4px);
}
.error-box {
  background: rgba(5,12,4,0.95);
  border: 1px solid rgba(200,40,40,0.2);
  border-radius: 14px;
  padding: 2.5rem 3rem;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.error-box h3 { color: #f09090; margin-bottom: 0.7rem; font-size: 1rem; font-weight: 700; }
.error-box p  { color: var(--accent-ghost); margin-bottom: 1.4rem; font-size: 0.88rem; line-height: 1.6; }
.error-box button {
  background: var(--action-bg);
  color: var(--accent);
  border: none;
  padding: 0.65rem 1.4rem;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
  font-family: inherit;
  transition: background 0.15s;
}
.error-box button:hover { background: var(--action-bg-hover); }
```

- [ ] **Step 2: Verify app still starts without errors**

```bash
npm run dev
```

Open http://localhost:5174 (or whichever port). The login page will look broken — that's expected. No console errors about CSS should appear. The topbar on the map view may be unstyled but the app should not crash.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "feat: establish Forest Floor design tokens and base CSS"
```

---

## Task 2: LoginPage redesign

**Files:**
- Modify: `src/components/LoginPage.jsx`
- Modify: `src/App.css` (append login section)

- [ ] **Step 1: Rewrite LoginPage.jsx**

Replace the entire file:

```jsx
import { useState } from "react";
import { signIn } from "../services/auth.js";

const LeafIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="login-leaf">
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
      <div className="login-grid" />
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
```

- [ ] **Step 2: Append login CSS to App.css**

Add at the end of `src/App.css`:

```css
/* ── Innloggingsside ─────────────────────────────────────────────────────── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  position: relative;
  overflow: hidden;
}

.login-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.login-blob-1 {
  width: 500px; height: 400px;
  top: -80px; right: -100px;
  background: radial-gradient(ellipse, rgba(34,90,22,0.22) 0%, transparent 65%);
  animation: loginBlob1 12s ease-in-out infinite alternate;
}
.login-blob-2 {
  width: 400px; height: 350px;
  bottom: -60px; left: -80px;
  background: radial-gradient(ellipse, rgba(16,44,10,0.38) 0%, transparent 60%);
  animation: loginBlob2 15s ease-in-out infinite alternate;
}
@keyframes loginBlob1 {
  from { transform: translate(0,0) scale(1); }
  to   { transform: translate(-40px,30px) scale(1.15); }
}
@keyframes loginBlob2 {
  from { transform: translate(0,0) scale(1); }
  to   { transform: translate(30px,-25px) scale(1.1); }
}

.login-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(200,240,174,0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,240,174,0.028) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}

.login-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(3,9,4,0.70) 100%);
  pointer-events: none;
}

.login-card {
  position: relative;
  z-index: 2;
  max-width: 360px;
  width: 90%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-leaf { margin-bottom: 1.2rem; }

.login-logo {
  font-size: 3.6rem;
  font-weight: 900;
  color: var(--accent);
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  line-height: 1;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 60px rgba(200,240,174,0.15);
}

.login-tagline {
  font-size: 0.62rem;
  font-weight: 500;
  color: #2e5226;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  margin-bottom: 3.2rem;
}

.error-msg {
  background: rgba(180,40,40,0.14);
  border: 1px solid rgba(180,40,40,0.30);
  border-radius: 7px;
  color: #f09090;
  font-size: 0.82rem;
  padding: 0.55rem 0.85rem;
  margin-bottom: 1.2rem;
  width: 100%;
}

.login-btn {
  background: var(--accent);
  color: var(--bg-base);
  border: none;
  padding: 0.95rem 2rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.02em;
  width: 100%;
  max-width: 280px;
  box-shadow: 0 4px 24px rgba(200,240,174,0.12), 0 1px 4px rgba(0,0,0,0.3);
  transition: background 0.15s, transform 0.12s;
}
.login-btn:hover:not(:disabled) {
  background: #b4e898;
  transform: translateY(-1px);
}
.login-btn:disabled {
  background: rgba(200,240,174,0.30);
  color: rgba(6,14,5,0.45);
  cursor: not-allowed;
}
```

- [ ] **Step 3: Verify login page visually**

Open http://localhost:5174. You should see:
- Deep dark background (`#030904`)
- Two slow-moving green glows (blobs animated)
- Subtle 32px grid lines
- Dark vignette around edges
- Leaf circle SVG icon
- "LARK" in large green letters with glow
- "Landskapsplanlegger" tagline in very dark green
- Green "Logg inn med ArcGIS Online" button

- [ ] **Step 4: Commit**

```bash
git add src/components/LoginPage.jsx src/App.css
git commit -m "feat: Forest Floor login page with blobs, grid and leaf icon"
```

---

## Task 3: MapView topbar

**Files:**
- Modify: `src/components/MapView.jsx`
- Modify: `src/App.css` (append)

- [ ] **Step 1: Add leaf SVG constant to MapView.jsx**

After the imports at the top of `src/components/MapView.jsx`, add:

```jsx
const LeafSVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.85 }}>
    <path
      d="M12 3 C7 3 3 7 3 12 C3 17 7 21 12 21 C12 21 12 14 12 12 C12 14 12 21 12 21 C17 21 21 17 21 12 C21 7 17 3 12 3Z"
      fill="rgba(200,240,174,0.15)" stroke="#c8f0ae" strokeWidth="1.2"
    />
    <line x1="12" y1="3" x2="12" y2="21.5" stroke="rgba(200,240,174,0.3)" strokeWidth="0.8"/>
    <path d="M12 8 Q8 10 7 13"  stroke="rgba(200,240,174,0.2)" strokeWidth="0.7" fill="none"/>
    <path d="M12 8 Q16 10 17 13" stroke="rgba(200,240,174,0.2)" strokeWidth="0.7" fill="none"/>
  </svg>
);
```

- [ ] **Step 2: Replace the topbar JSX in MapView.jsx**

Find the comment `{/* Topplinje */}` and replace the entire `<div className="top-bar">` block with:

```jsx
{/* Topplinje */}
<div className="top-bar">
  <div className="top-bar-left">
    {LeafSVG}
    <span className="app-logo">{config?.appName || "LARK"}</span>
    <div className="top-bar-sep" />
    <span className="app-subtitle">{config?.projectName || "Landskapsplanlegger"}</span>
  </div>
  <div className="top-bar-right">
    {user && <span className="username">{user.fullName}</span>}
    <button className="top-bar-btn" title="Innstillinger" onClick={onOpenConfig}>
      ⚙ Innstillinger
    </button>
    <button className="top-bar-btn" onClick={handleSignOut}>Logg ut</button>
  </div>
</div>
```

- [ ] **Step 3: Verify topbar in browser**

After signing in (or refreshing a signed-in session), you should see:
- 48px tall topbar with glass/blur effect
- Leaf SVG icon → "LARK" → thin separator line → project name (left)
- Username → "⚙ Innstillinger" → "Logg ut" (right)

- [ ] **Step 4: Commit**

```bash
git add src/components/MapView.jsx
git commit -m "feat: Forest Floor topbar with leaf icon and separator"
```

---

## Task 4: EditPanel — glass styling

**Files:**
- Modify: `src/App.css` (append full edit-panel section)

- [ ] **Step 1: Append EditPanel CSS to App.css**

Add at the end of `src/App.css`:

```css
/* ── Redigeringspanel wrapper ────────────────────────────────────────────── */
.edit-panel-wrapper {
  position: absolute;
  top: 62px;
  right: 14px;
  z-index: 30;
  max-height: calc(100vh - 78px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(200,240,174,0.12) transparent;
}

/* ── Panel (glass) ───────────────────────────────────────────────────────── */
.ep {
  width: 264px;
  background: var(--bg-surface);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border-subtle);
  border-radius: 13px;
  box-shadow: var(--glass-shadow);
  padding: 0.9rem 0.9rem 1rem;
}

.ep-section-label {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--accent-ghost);
  margin-bottom: 0.5rem;
}

/* ── Layers ──────────────────────────────────────────────────────────────── */
.ep-layers {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  margin-bottom: 0.65rem;
}

.ep-layer-icon {
  width: 15px; height: 15px;
  object-fit: contain;
  vertical-align: middle;
  flex-shrink: 0;
  line-height: 1;
}

.ep-layer-row { display: flex; align-items: center; gap: 0.2rem; }
.ep-layer-row .ep-layer-btn { flex: 1; }
.ep-layer-btn.hidden-layer { opacity: 0.38; }

.ep-layer-btn {
  display: flex;
  align-items: center;
  gap: 0.42rem;
  width: 100%;
  padding: 0.38rem 0.55rem;
  border: 1px solid rgba(200,240,174,0.06);
  border-radius: 7px;
  background: rgba(200,240,174,0.03);
  cursor: pointer;
  font-size: 0.73rem;
  font-weight: 400;
  color: var(--accent-muted);
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s;
  text-align: left;
}
.ep-layer-btn:hover { background: rgba(200,240,174,0.06); border-color: rgba(200,240,174,0.12); }
.ep-layer-btn.active {
  background: rgba(200,240,174,0.08);
  border-color: var(--border-active);
  font-weight: 600;
  color: var(--accent-dim);
}

.ep-swatch {
  display: inline-block;
  width: 9px; height: 9px;
  border-radius: 2px;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.15);
}

.ep-eye-btn {
  flex-shrink: 0;
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.72rem;
  line-height: 1;
  padding: 0.24rem 0.28rem;
  border-radius: 5px;
  transition: background 0.12s, border-color 0.12s;
}
.ep-eye-btn:hover { background: rgba(200,240,174,0.06); border-color: rgba(200,240,174,0.12); }
.ep-eye-off { opacity: 0.35; }

.ep-divider {
  height: 1px;
  background: rgba(200,240,174,0.05);
  margin: 0.72rem 0 0.6rem;
}

.ep-body { margin-top: 0.15rem; }

/* ── Tool grid ───────────────────────────────────────────────────────────── */
.ep-tool-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.28rem;
}

.ep-tool-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.22rem;
  padding: 0.65rem 0.35rem 0.55rem;
  background: rgba(200,240,174,0.04);
  border: 1px solid rgba(200,240,174,0.08);
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
  min-height: 58px;
}
.ep-tool-tile:hover {
  background: rgba(200,240,174,0.08);
  border-color: rgba(200,240,174,0.16);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.ep-tool-tile:active { transform: scale(0.97); }
.ep-tool-tile-icon  { font-size: 1.25rem; line-height: 1; display: block; }
.ep-tool-tile-label { font-size: 0.67rem; font-weight: 600; color: var(--accent-ghost); letter-spacing: 0.02em; line-height: 1; }

/* ── Drawing state ───────────────────────────────────────────────────────── */
.ep-drawing-state { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.1rem 0; }

.ep-active-tool-badge {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: rgba(26,74,16,0.6);
  border: 1px solid rgba(200,240,174,0.12);
  color: var(--accent);
  border-radius: 7px;
  padding: 0.38rem 0.7rem;
  font-size: 0.79rem;
  font-weight: 600;
}
.ep-active-tool-icon { font-size: 1rem; line-height: 1; }

.ep-drawing-hint {
  font-size: 0.76rem;
  color: var(--accent-ghost);
  line-height: 1.55;
  text-align: center;
  padding: 0 0.1rem;
}

.ep-drawing-actions { display: flex; gap: 0.3rem; }

.ep-drawing-action-btn {
  flex: 1;
  padding: 0.4rem 0.35rem;
  background: rgba(200,240,174,0.04);
  border: 1px solid rgba(200,240,174,0.09);
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: inherit;
  color: var(--accent-ghost);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.ep-drawing-action-btn:hover { background: rgba(200,240,174,0.08); border-color: rgba(200,240,174,0.16); }

.ep-drawing-action-confirm {
  background: rgba(26,74,16,0.7);
  color: var(--accent);
  border-color: rgba(200,240,174,0.15);
  font-weight: 600;
}
.ep-drawing-action-confirm:hover { background: rgba(34,96,26,0.8); }

.ep-drawing-action-cancel { color: #c07070; border-color: rgba(180,80,80,0.2); }
.ep-drawing-action-cancel:hover { background: rgba(180,60,60,0.1); border-color: rgba(180,80,80,0.35); }

/* ── Attribute form ──────────────────────────────────────────────────────── */
.ep-form { display: flex; flex-direction: column; gap: 0.55rem; }

.ep-field {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  font-size: 0.71rem;
  color: var(--accent-ghost);
  font-weight: 600;
  letter-spacing: 0.01em;
}
.ep-field input,
.ep-field select,
.ep-field textarea {
  padding: 0.36rem 0.5rem;
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 6px;
  font-size: 0.79rem;
  font-family: inherit;
  font-weight: 400;
  color: var(--accent-dim);
  background: rgba(200,240,174,0.04);
  width: 100%;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.ep-field input:focus,
.ep-field select:focus,
.ep-field textarea:focus {
  outline: none;
  border-color: rgba(200,240,174,0.25);
  box-shadow: 0 0 0 3px rgba(200,240,174,0.06);
}
.ep-field textarea { resize: vertical; min-height: 50px; }

.ep-error {
  font-size: 0.74rem;
  color: #f09090;
  background: rgba(180,40,40,0.12);
  border: 1px solid rgba(180,40,40,0.25);
  border-radius: 6px;
  padding: 0.35rem 0.55rem;
}

.ep-form-actions { display: flex; gap: 0.45rem; margin-top: 0.25rem; }

.ep-btn-save {
  flex: 1;
  padding: 0.5rem;
  background: var(--action-bg);
  color: var(--accent);
  border: none;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  transition: background 0.15s;
}
.ep-btn-save:hover:not(:disabled) { background: var(--action-bg-hover); }
.ep-btn-save:disabled { background: rgba(26,74,16,0.4); cursor: not-allowed; }

.ep-btn-ghost {
  background: transparent;
  border: 1px solid rgba(200,240,174,0.1);
  color: var(--accent-ghost);
  border-radius: 6px;
  padding: 0.36rem 0.75rem;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 500;
  transition: background 0.12s, border-color 0.12s;
}
.ep-btn-ghost:hover { background: rgba(200,240,174,0.06); border-color: rgba(200,240,174,0.16); }

.ep-saved {
  font-size: 0.77rem;
  color: var(--accent-dim);
  font-weight: 600;
  text-align: center;
  margin-top: 0.5rem;
  letter-spacing: 0.02em;
}

.ep-edit-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.73rem;
  color: var(--accent-ghost);
  background: rgba(200,240,174,0.04);
  border: 1px solid rgba(200,240,174,0.08);
  border-radius: 6px;
  padding: 0.33rem 0.55rem;
  margin-bottom: 0.5rem;
}

.ep-geom-btn {
  width: 100%;
  padding: 0.45rem 0.5rem;
  background: rgba(200,240,174,0.04);
  color: var(--accent-dim);
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: inherit;
  margin-bottom: 0.55rem;
  transition: background 0.12s, border-color 0.12s;
}
.ep-geom-btn:hover { background: rgba(200,240,174,0.08); border-color: rgba(200,240,174,0.18); }

.ep-live-measure {
  font-size: 0.79rem;
  font-weight: 700;
  color: var(--accent);
  background: rgba(200,240,174,0.07);
  border: 1px solid rgba(200,240,174,0.14);
  border-radius: 6px;
  padding: 0.32rem 0.55rem;
  margin: 0.3rem 0;
  text-align: center;
}

.ep-areal {
  font-size: 0.75rem;
  color: var(--accent-ghost);
  background: rgba(200,240,174,0.04);
  border: 1px solid rgba(200,240,174,0.08);
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
}

.ep-hint-sub { font-size: 0.7rem; color: var(--accent-ghost); opacity: 0.7; margin-bottom: 0.45rem; }

/* ── Basemap switcher ────────────────────────────────────────────────────── */
.ep-basemaps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.28rem;
}
.ep-basemap-btn {
  padding: 0.34rem 0.4rem;
  border: 1px solid rgba(200,240,174,0.08);
  border-radius: 6px;
  background: rgba(200,240,174,0.03);
  cursor: pointer;
  font-size: 0.68rem;
  font-family: inherit;
  color: var(--accent-ghost);
  transition: background 0.12s, border-color 0.12s;
}
.ep-basemap-btn:hover { background: rgba(200,240,174,0.07); border-color: rgba(200,240,174,0.14); }
.ep-basemap-btn.active {
  background: var(--action-bg);
  color: var(--accent);
  border-color: var(--action-bg);
  font-weight: 600;
}
```

- [ ] **Step 2: Verify panel glass styling in browser**

Sign in and open the map view. The right-side panel should now:
- Have a dark glass appearance (semi-transparent, blurred)
- Show dark layer buttons with subtle green borders
- Tool tiles with dark glass look
- All text in muted green tones

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "feat: Forest Floor glass styling for EditPanel"
```

---

## Task 5: EditPanel — collapse to icon strip

**Files:**
- Modify: `src/components/EditPanel.jsx`
- Modify: `src/App.css` (append)

- [ ] **Step 1: Add `collapsed` state and icon strip render to EditPanel.jsx**

In `EditPanel`, add `collapsed` state after the existing `useState` declarations:

```jsx
const [collapsed, setCollapsed] = useState(false);
```

Then, just before the main `return (` statement (the one returning `<div className="ep">`), insert the collapsed render path:

```jsx
if (collapsed) {
  return (
    <div className="ep ep-strip">
      <button className="ep-strip-toggle" title="Åpne panel" onClick={() => setCollapsed(false)}>›</button>
      <div className="ep-strip-sep" />
      {visibleLayerIds.map((id) => {
        const info = getLayerInfo(id, config);
        return (
          <div
            key={String(id)}
            className={"ep-strip-dot" + (activeId === id ? " active" : "")}
            style={{ background: info.color }}
            title={info.label}
            onClick={() => { setCollapsed(false); pickLayer(id); }}
          />
        );
      })}
      {activeId !== null && (
        <>
          <div className="ep-strip-sep" />
          {getTools(getGeomType(activeId, config)).map((t) => (
            <span key={t.key} className="ep-strip-tool" title={t.label}>{t.icon}</span>
          ))}
        </>
      )}
    </div>
  );
}
```

Then in the existing main return, add a collapse button as the very first child of `<div className="ep">`:

```jsx
<button className="ep-strip-toggle ep-strip-toggle-close" title="Minimer panel" onClick={() => setCollapsed(true)}>‹</button>
```

- [ ] **Step 2: Append collapse CSS to App.css**

```css
/* ── Panel collapse / icon strip ─────────────────────────────────────────── */
.ep-strip {
  width: 38px;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.48rem;
}

.ep-strip-toggle {
  background: none;
  border: none;
  color: var(--accent-muted);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.1rem;
  transition: color 0.15s;
}
.ep-strip-toggle:hover { color: var(--accent); }
.ep-strip-toggle-close {
  align-self: flex-end;
  margin-right: 0.35rem;
  margin-bottom: 0.1rem;
  font-size: 0.85rem;
  color: var(--accent-ghost);
}

.ep-strip-sep {
  width: 18px;
  height: 1px;
  background: rgba(200,240,174,0.07);
}

.ep-strip-dot {
  width: 10px; height: 10px;
  border-radius: 2px;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.75;
  transition: opacity 0.12s, transform 0.12s;
}
.ep-strip-dot:hover { opacity: 1; transform: scale(1.15); }
.ep-strip-dot.active { opacity: 1; box-shadow: 0 0 6px currentColor; }

.ep-strip-tool {
  font-size: 0.85rem;
  line-height: 1;
  color: var(--accent-ghost);
  cursor: default;
  opacity: 0.6;
}
```

- [ ] **Step 3: Verify collapse behavior**

In the browser, click the "‹" button at the top-right of the edit panel. The panel should shrink to a narrow 38px strip showing:
- "›" chevron at top
- Separator
- Colored dots for each visible layer (click a dot to expand and select that layer)
- Separator + tool icons if a layer is active

Click "›" to expand back to full panel.

- [ ] **Step 4: Commit**

```bash
git add src/components/EditPanel.jsx src/App.css
git commit -m "feat: EditPanel collapsible icon strip"
```

---

## Task 6: MapView overlays — loading pill, zoom buttons, attribution

**Files:**
- Modify: `src/components/MapView.jsx`
- Modify: `src/App.css` (append)

- [ ] **Step 1: Replace loading overlay with loading pill in MapView.jsx**

Find `{/* Laste-overlay */}` and replace the entire block:

```jsx
{/* Innlastingspill */}
{loading && (
  <div className="loading-pill">
    <div className="spinner-sm" />
    <span>{status}</span>
  </div>
)}
```

- [ ] **Step 2: Update zoom controls class in MapView.jsx**

The zoom controls JSX already uses `.zoom-controls` and `.zoom-btn` — keep those class names, the CSS below replaces their styles.

- [ ] **Step 3: Update Esri attribution in MapView.jsx**

Find `{/* Esri-attribut */}` and replace with:

```jsx
{/* Esri-attribut */}
<div className="esri-attribution">
  Powered by <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a>
</div>
```

(Markup is unchanged — only CSS changes.)

- [ ] **Step 4: Append overlay CSS to App.css**

```css
/* ── Zoom-knapper ────────────────────────────────────────────────────────── */
.zoom-controls {
  position: absolute;
  top: 62px;
  left: 14px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.zoom-btn {
  width: 32px; height: 32px;
  background: var(--bg-surface);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,0.35);
  color: var(--accent-dim);
  font-family: inherit;
  transition: background 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.zoom-btn:hover { background: rgba(5,12,4,0.96); }

/* ── Innlastingspill ─────────────────────────────────────────────────────── */
.loading-pill {
  position: absolute;
  bottom: 14px;
  left: 54px;
  z-index: 30;
  background: var(--bg-surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 0.45rem 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  font-size: 0.72rem;
  color: var(--accent-ghost);
}

/* ── Esri-attribut ───────────────────────────────────────────────────────── */
.esri-attribution {
  position: absolute;
  bottom: 8px;
  right: 10px;
  z-index: 30;
  font-size: 0.62rem;
  color: var(--accent-ghost);
  background: rgba(5,12,4,0.70);
  backdrop-filter: blur(6px);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(200,240,174,0.05);
  opacity: 0.7;
}
.esri-attribution a { color: #5a9ab8; text-decoration: none; }
```

- [ ] **Step 5: Remove old loading-overlay and loading-box CSS**

The old `.loading-overlay` and `.loading-box` styles are replaced by `.loading-pill`. They are no longer used. If they remain in App.css from the original file, delete those blocks. (Since App.css was rewritten from scratch in Task 1, they should not be present.)

- [ ] **Step 6: Verify overlays in browser**

During app startup, you should see a small pill at the bottom-left (not a full-screen overlay) showing the spinner and status text. Zoom buttons should have the glass look. Attribution should be a small dim pill bottom-right.

- [ ] **Step 7: Commit**

```bash
git add src/components/MapView.jsx src/App.css
git commit -m "feat: loading pill, glass zoom buttons and attribution"
```

---

## Task 7: ConfigPage — dark full-screen with left nav

**Files:**
- Modify: `src/components/ConfigPage.jsx`
- Modify: `src/App.css` (append)

- [ ] **Step 1: Add nav items constant and activeSection state to ConfigPage.jsx**

At the top of the `ConfigPage` component function, add:

```jsx
const NAV_ITEMS = [
  { id: "general",   label: "Generelt",   icon: "⚙" },
  { id: "datamodel", label: "Datamodell", icon: "◫" },
  { id: "symbology", label: "Symbolikk",  icon: "◎", future: true },
  { id: "export",    label: "Eksport",    icon: "⤓", future: true },
  { id: "sharing",   label: "Deling",     icon: "↗", future: true },
];

const [activeSection, setActiveSection] = useState("general");
```

- [ ] **Step 2: Add leaf SVG constant to ConfigPage.jsx**

After imports, before the component, add the same `LeafSVG` constant as in MapView.jsx:

```jsx
const LeafSVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.85 }}>
    <path
      d="M12 3 C7 3 3 7 3 12 C3 17 7 21 12 21 C12 21 12 14 12 12 C12 14 12 21 12 21 C17 21 21 17 21 12 C21 7 17 3 12 3Z"
      fill="rgba(200,240,174,0.15)" stroke="#c8f0ae" strokeWidth="1.2"
    />
    <line x1="12" y1="3" x2="12" y2="21.5" stroke="rgba(200,240,174,0.3)" strokeWidth="0.8"/>
    <path d="M12 8 Q8 10 7 13"  stroke="rgba(200,240,174,0.2)" strokeWidth="0.7" fill="none"/>
    <path d="M12 8 Q16 10 17 13" stroke="rgba(200,240,174,0.2)" strokeWidth="0.7" fill="none"/>
  </svg>
);
```

- [ ] **Step 3: Rewrite the ConfigPage return statement**

Replace the entire `return (...)` block in `ConfigPage`:

```jsx
return (
  <div className="cfg-page">
    {/* Topbar */}
    <div className="top-bar">
      <div className="top-bar-left">
        {LeafSVG}
        <span className="app-logo">{appName || "LARK"}</span>
        <div className="top-bar-sep" />
        <span className="app-subtitle">Innstillinger</span>
      </div>
      <div className="top-bar-right">
        <button className="top-bar-btn" onClick={onBack}>← Tilbake til kart</button>
      </div>
    </div>

    {/* Layout */}
    <div className="cfg-layout">

      {/* Left nav */}
      <nav className="cfg-sidebar">
        <div className="cfg-sidebar-label">Innstillinger</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={"cfg-nav-item" + (activeSection === item.id ? " active" : "") + (item.future ? " future" : "")}
            onClick={() => !item.future && setActiveSection(item.id)}
          >
            <span className="cfg-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Content area */}
      <div className="cfg-content-area">

        {/* ── Generelt ── */}
        {activeSection === "general" && (
          <>
            <div className="cfg-section-header">
              <h1>Generelle innstillinger</h1>
              <p>Grunnleggende konfigurasjon for applikasjon og prosjekt.</p>
            </div>

            <div className="cfg-card">
              <h3 className="cfg-card-title">Applikasjon</h3>
              <div className="cfg-grid-2">
                <div className="cfg-field">
                  <label className="cfg-field-label">Applikasjonsnavn</label>
                  <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} />
                </div>
                <div className="cfg-field">
                  <label className="cfg-field-label">Prosjektnavn</label>
                  <input type="text" value={projectName} placeholder="F.eks. Bjørneparken 2026" onChange={(e) => setProjectName(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="cfg-card">
              <h3 className="cfg-card-title">Koordinatsystem</h3>
              <div className="cfg-field">
                <select value={coordSystem} onChange={(e) => setCoordSystem(e.target.value)}>
                  {COORD_SYSTEMS.map((cs) => (
                    <option key={cs.id} value={cs.id}>{cs.label}</option>
                  ))}
                </select>
                <span className="cfg-field-note">Brukes til visning av koordinater og målinger</span>
              </div>
            </div>

            <div className="cfg-save-area">
              <button className="cfg-save-btn" onClick={handleSaveGeneral}>Lagre</button>
              {savedGeneral && <span className="cfg-saved">✓ Lagret</span>}
            </div>
          </>
        )}

        {/* ── Datamodell ── */}
        {activeSection === "datamodel" && (
          <>
            <div className="cfg-section-header">
              <h1>Datamodell</h1>
              <p>Aktiver/deaktiver lag, endre navn og ikon, og rediger domeneverdier. Dra i håndtaket (⠿) for å endre rekkefølgen.</p>
            </div>

            <div className="cfg-card cfg-card-wide">
              <DataModelGraph layers={layers} />
              <div className="cfg-layers">
                {layerOrder.map((id, idx) => {
                  const isCustom = isCustomLayerId(id);
                  const layerCfg = layers[id];
                  if (!layerCfg) return null;
                  return (
                    <LayerRow
                      key={String(id)}
                      layerId={id}
                      layerCfg={layerCfg}
                      isCustom={isCustom}
                      onUpdate={(cfg) => updateLayer(id, cfg)}
                      onDelete={() => deleteCustomLayer(id)}
                      dragging={dragIdx === idx}
                      dragOver={dragOverIdx === idx && dragIdx !== idx}
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={(e) => handleDragEnter(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={handleDragEnd}
                    />
                  );
                })}
              </div>
              <AddCustomLayerForm onAdd={addCustomLayer} />
              {layerOrder.some((id) => isCustomLayerId(id) && layers[id]?.agolLayerId == null) && (
                <p className="cfg-provision-note">
                  ⚠ Nye tilpassede lag klargjøres automatisk neste gang du åpner kartet.
                </p>
              )}
            </div>

            <div className="cfg-save-area">
              <button className="cfg-save-btn" onClick={handleSaveModel}>Lagre datamodell</button>
              {savedModel && <span className="cfg-saved">✓ Lagret</span>}
            </div>
          </>
        )}

      </div>
    </div>
  </div>
);
```

- [ ] **Step 4: Append ConfigPage CSS to App.css**

```css
/* ── Konfigurasjonsside ──────────────────────────────────────────────────── */
.cfg-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-app);
  overflow: hidden;
  position: relative;
}

.cfg-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ── Venstre nav ─────────────────────────────────────────────────────────── */
.cfg-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: rgba(3,8,3,0.6);
  border-right: 1px solid rgba(200,240,174,0.05);
  padding: 1.4rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  overflow-y: auto;
}

.cfg-sidebar-label {
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-deep);
  padding: 0 1rem;
  margin-bottom: 0.5rem;
}

.cfg-nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.75rem;
  color: var(--accent-ghost);
  text-align: left;
  width: 100%;
  transition: background 0.12s, color 0.12s;
}
.cfg-nav-item:hover:not(.future) {
  background: rgba(200,240,174,0.04);
  color: var(--accent-muted);
}
.cfg-nav-item.active {
  background: rgba(200,240,174,0.06);
  border-left-color: #4a9030;
  color: var(--accent-dim);
  font-weight: 600;
}
.cfg-nav-item.future {
  opacity: 0.35;
  cursor: default;
}
.cfg-nav-icon { font-size: 0.82rem; flex-shrink: 0; }

/* ── Content area ────────────────────────────────────────────────────────── */
.cfg-content-area {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(200,240,174,0.1) transparent;
}

.cfg-section-header { margin-bottom: 0.8rem; }
.cfg-section-header h1 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--accent-dim);
  margin-bottom: 0.3rem;
  letter-spacing: -0.01em;
}
.cfg-section-header p {
  font-size: 0.75rem;
  color: var(--accent-ghost);
  line-height: 1.6;
}

/* ── Cards ───────────────────────────────────────────────────────────────── */
.cfg-card {
  background: rgba(200,240,174,0.03);
  border: 1px solid rgba(200,240,174,0.07);
  border-radius: 11px;
  padding: 1.3rem 1.5rem;
  max-width: 560px;
}
.cfg-card-wide { max-width: 100%; }

.cfg-card-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent-muted);
  margin-bottom: 1rem;
  letter-spacing: 0.02em;
}

.cfg-card-desc {
  font-size: 0.78rem;
  color: var(--accent-ghost);
  margin-bottom: 1rem;
  line-height: 1.6;
}

.cfg-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* ── Fields ──────────────────────────────────────────────────────────────── */
.cfg-field {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  margin-bottom: 0.8rem;
}
.cfg-field:last-child { margin-bottom: 0; }

.cfg-field-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--accent-ghost);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.cfg-field input,
.cfg-field select {
  padding: 0.52rem 0.7rem;
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 7px;
  font-size: 0.84rem;
  font-family: inherit;
  color: var(--accent-dim);
  background: rgba(200,240,174,0.04);
  width: 100%;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.cfg-field input:focus,
.cfg-field select:focus {
  outline: none;
  border-color: rgba(200,240,174,0.25);
  box-shadow: 0 0 0 3px rgba(200,240,174,0.06);
}

.cfg-field-note {
  font-size: 0.66rem;
  color: var(--accent-deep);
  line-height: 1.45;
}

/* ── Save area ───────────────────────────────────────────────────────────── */
.cfg-save-area {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding-top: 0.5rem;
}

.cfg-save-btn {
  background: var(--action-bg);
  color: var(--accent);
  border: none;
  padding: 0.62rem 1.6rem;
  border-radius: 7px;
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 0.02em;
  transition: background 0.15s;
}
.cfg-save-btn:hover { background: var(--action-bg-hover); }

.cfg-saved {
  font-size: 0.78rem;
  color: var(--accent-dim);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* ── Layer rows (datamodel section) ──────────────────────────────────────── */
.cfg-layers {
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
  margin-bottom: 0.6rem;
}

.cfg-layer {
  border: 1px solid rgba(200,240,174,0.07);
  border-radius: 9px;
  background: rgba(200,240,174,0.02);
  overflow: hidden;
  transition: opacity 0.15s;
}
.cfg-layer-off { opacity: 0.38; }

.cfg-layer-hd {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
}

.cfg-layer-name {
  flex: 1;
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 5px;
  padding: 0.3rem 0.45rem;
  font-size: 0.82rem;
  font-family: inherit;
  color: var(--accent-dim);
  background: rgba(200,240,174,0.04);
  min-width: 0;
  transition: border-color 0.12s;
}
.cfg-layer-name:focus { outline: none; border-color: rgba(200,240,174,0.25); }

.cfg-badge {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.18rem 0.4rem;
  border-radius: 4px;
}
.cfg-badge-polygon  { background: rgba(74,222,128,0.12);  color: #4ade80; }
.cfg-badge-polyline { background: rgba(251,146,60,0.12);  color: #fb923c; }
.cfg-badge-point    { background: rgba(56,189,248,0.12);  color: #38bdf8; }

.cfg-drag-handle {
  flex-shrink: 0;
  color: rgba(200,240,174,0.2);
  font-size: 1rem;
  line-height: 1;
  cursor: grab;
  padding: 0 0.1rem;
  user-select: none;
  transition: color 0.12s;
}
.cfg-drag-handle:hover { color: var(--accent-muted); }
.cfg-drag-handle:active { cursor: grabbing; }

.cfg-layer-dragging  { opacity: 0.28; border-style: dashed !important; }
.cfg-layer-drag-over { border-color: rgba(200,240,174,0.3) !important; box-shadow: 0 -3px 0 0 var(--accent-muted); }

.cfg-expand-btn {
  flex-shrink: 0;
  background: rgba(200,240,174,0.06);
  border: 1px solid rgba(200,240,174,0.14);
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.67rem;
  font-weight: 700;
  font-family: inherit;
  padding: 0.19rem 0.55rem;
  color: var(--accent-ghost);
  white-space: nowrap;
  transition: background 0.12s;
}
.cfg-expand-btn:hover { background: rgba(200,240,174,0.1); }
.cfg-expand-btn-open { background: var(--action-bg); color: var(--accent); border-color: var(--action-bg); }
.cfg-expand-btn-open:hover { background: var(--action-bg-hover); }

/* CSS toggle switch */
.cfg-toggle {
  position: relative;
  display: inline-block;
  width: 36px; height: 20px;
  flex-shrink: 0;
}
.cfg-toggle-input { opacity: 0; width: 0; height: 0; position: absolute; }
.cfg-toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(200,240,174,0.12);
  border-radius: 20px;
  transition: background 0.2s;
}
.cfg-toggle-input:checked + .cfg-toggle-slider { background: var(--action-bg); }
.cfg-toggle-slider::before {
  content: "";
  position: absolute;
  width: 14px; height: 14px;
  left: 3px; top: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.cfg-toggle-input:checked + .cfg-toggle-slider::before { transform: translateX(16px); }

.cfg-toggle-sm { width: 28px; height: 16px; }
.cfg-toggle-sm .cfg-toggle-slider::before { width: 11px; height: 11px; left: 2px; top: 2px; }
.cfg-toggle-sm .cfg-toggle-input:checked + .cfg-toggle-slider::before { transform: translateX(12px); }

/* Domain editor */
.cfg-domain-editor {
  padding: 0.55rem 0.7rem 0.65rem;
  border-top: 1px solid rgba(200,240,174,0.05);
  background: rgba(200,240,174,0.02);
}
.cfg-domain-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.42rem;
}
.cfg-domain-header {
  font-size: 0.67rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--accent-ghost);
}
.cfg-domain-toggle-all {
  background: none;
  border: 1px solid rgba(200,240,174,0.14);
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  font-size: 0.69rem;
  font-family: inherit;
  color: var(--accent-ghost);
  cursor: pointer;
  transition: background 0.12s;
}
.cfg-domain-toggle-all:hover { background: rgba(200,240,174,0.06); }

.cfg-domain-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0;
}
.cfg-domain-row-off { opacity: 0.35; }
.cfg-domain-row-custom { background: rgba(200,240,174,0.04); border-radius: 4px; padding-left: 0.25rem; }

.cfg-domain-name {
  flex: 1;
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 4px;
  padding: 0.22rem 0.38rem;
  font-size: 0.78rem;
  font-family: inherit;
  background: rgba(200,240,174,0.03);
  color: var(--accent-dim);
  min-width: 0;
  transition: border-color 0.12s;
}
.cfg-domain-name:focus { outline: none; border-color: rgba(200,240,174,0.25); }

.cfg-domain-code {
  font-size: 0.64rem;
  font-weight: 700;
  color: var(--accent-ghost);
  background: rgba(200,240,174,0.06);
  border-radius: 3px;
  padding: 0.12rem 0.3rem;
  flex-shrink: 0;
  font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
}

.cfg-domain-del {
  background: none;
  border: 1px solid rgba(180,80,80,0.25);
  border-radius: 3px;
  color: #c07070;
  cursor: pointer;
  font-size: 0.68rem;
  width: 20px; height: 20px;
  flex-shrink: 0;
  font-family: inherit;
  transition: background 0.1s;
}
.cfg-domain-del:hover { background: rgba(180,60,60,0.15); }

.cfg-domain-add {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.5rem;
  align-items: center;
}
.cfg-domain-add-code {
  width: 74px;
  flex-shrink: 0;
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 4px;
  padding: 0.28rem 0.38rem;
  font-size: 0.73rem;
  font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
  text-transform: uppercase;
  background: rgba(200,240,174,0.03);
  color: var(--accent-dim);
  transition: border-color 0.12s;
}
.cfg-domain-add-code:focus { outline: none; border-color: rgba(200,240,174,0.25); }

.cfg-domain-add-name {
  flex: 1;
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 4px;
  padding: 0.28rem 0.38rem;
  font-size: 0.78rem;
  font-family: inherit;
  background: rgba(200,240,174,0.03);
  color: var(--accent-dim);
  min-width: 0;
  transition: border-color 0.12s;
}
.cfg-domain-add-name:focus { outline: none; border-color: rgba(200,240,174,0.25); }

.cfg-domain-add-btn {
  flex-shrink: 0;
  background: var(--action-bg);
  color: var(--accent);
  border: none;
  border-radius: 5px;
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.cfg-domain-add-btn:hover:not(:disabled) { background: var(--action-bg-hover); }
.cfg-domain-add-btn:disabled { background: rgba(26,74,16,0.4); cursor: not-allowed; }

/* Icon editing */
.cfg-layer-icon {
  width: 22px; height: 22px;
  object-fit: contain;
  flex-shrink: 0;
  display: block;
}
.cfg-icon-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.12s, background 0.12s;
}
.cfg-icon-btn:hover { background: rgba(200,240,174,0.06); border-color: rgba(200,240,174,0.14); }
.cfg-icon-btn-open  { background: rgba(200,240,174,0.08); border-color: rgba(200,240,174,0.2); }

.cfg-icon-edit-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem 0.5rem 2rem;
  background: rgba(200,240,174,0.02);
  border-top: 1px solid rgba(200,240,174,0.05);
}
.cfg-icon-preview-lg { width: 30px; height: 30px; object-fit: contain; flex-shrink: 0; }
.cfg-icon-url-input {
  flex: 1;
  font-size: 0.74rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 5px;
  font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
  background: rgba(200,240,174,0.03);
  color: var(--accent-dim);
  min-width: 0;
  transition: border-color 0.12s;
}
.cfg-icon-url-input:focus { outline: none; border-color: rgba(200,240,174,0.25); }
.cfg-icon-close {
  flex-shrink: 0;
  padding: 0.22rem 0.5rem;
  font-size: 0.72rem;
}
.cfg-add-icon-url { max-width: 116px; flex: none; }

.cfg-btn-ghost {
  background: transparent;
  border: 1px solid rgba(200,240,174,0.1);
  color: var(--accent-ghost);
  border-radius: 6px;
  padding: 0.52rem 0.9rem;
  cursor: pointer;
  font-size: 0.82rem;
  font-family: inherit;
  font-weight: 500;
  transition: background 0.12s, border-color 0.12s;
}
.cfg-btn-ghost:hover { background: rgba(200,240,174,0.06); border-color: rgba(200,240,174,0.16); }

.cfg-del-btn {
  flex-shrink: 0;
  background: none;
  border: 1px solid rgba(180,80,80,0.25);
  border-radius: 4px;
  color: #c07070;
  cursor: pointer;
  font-size: 0.68rem;
  width: 22px; height: 22px;
  font-family: inherit;
  transition: background 0.1s;
}
.cfg-del-btn:hover { background: rgba(180,60,60,0.15); }

/* Add custom layer form */
.cfg-add-layer-btn {
  width: 100%;
  margin-top: 0.6rem;
  padding: 0.58rem;
  background: rgba(200,240,174,0.03);
  border: 1.5px dashed rgba(200,240,174,0.14);
  border-radius: 9px;
  color: var(--accent-ghost);
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.cfg-add-layer-btn:hover { background: rgba(200,240,174,0.06); border-color: rgba(200,240,174,0.22); }

.cfg-add-layer-form {
  margin-top: 0.68rem;
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 11px;
  padding: 0.9rem 1.05rem;
  background: rgba(200,240,174,0.02);
}
.cfg-add-layer-title {
  font-size: 0.81rem;
  font-weight: 700;
  color: var(--accent-dim);
  margin-bottom: 0.65rem;
}
.cfg-add-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.65rem;
}
.cfg-add-name {
  flex: 1;
  border: 1px solid rgba(200,240,174,0.1);
  border-radius: 6px;
  padding: 0.38rem 0.55rem;
  font-size: 0.85rem;
  font-family: inherit;
  background: rgba(200,240,174,0.03);
  color: var(--accent-dim);
  transition: border-color 0.12s;
}
.cfg-add-name:focus { outline: none; border-color: rgba(200,240,174,0.25); }

.cfg-add-layer-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
  align-items: center;
}

.cfg-provision-note {
  margin-top: 0.75rem;
  font-size: 0.74rem;
  color: #c0a030;
  background: rgba(180,150,0,0.08);
  border: 1px solid rgba(180,150,0,0.2);
  border-radius: 6px;
  padding: 0.4rem 0.62rem;
}

/* Data model graph */
.cfg-graph {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(200,240,174,0.08);
  margin-bottom: 1.25rem;
}
.cfg-graph-legend {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  padding: 0.55rem 1rem 0.7rem;
  background: rgba(3,8,3,0.8);
  border-top: 1px solid rgba(200,240,174,0.05);
}
.cfg-graph-legend-item {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  opacity: 0.9;
}
.cfg-graph-legend-hint {
  font-size: 0.68rem;
  color: var(--accent-deep);
  letter-spacing: 0.03em;
  margin-left: auto;
  opacity: 0.8;
}
@keyframes cfg-dash { to { stroke-dashoffset: -120; } }
```

- [ ] **Step 5: Verify config page in browser**

Click "⚙ Innstillinger" on the map view. You should see:
- Full-screen dark page
- Left sidebar (200px) with "Generelt" active (green left border, brighter text)
- "Symbolikk", "Eksport", "Deling" visibly dimmed (not clickable)
- Right area shows two dark cards: "Applikasjon" (two-column grid) and "Koordinatsystem"
- Click "Datamodell" in the sidebar → shows the orbital graph + layer list

- [ ] **Step 6: Commit**

```bash
git add src/components/ConfigPage.jsx src/App.css
git commit -m "feat: Forest Floor config page with left nav sidebar"
```

---

## Self-Review Checklist

- [x] **Login page:** blobs, grid, vignette, leaf icon, removed texts — Task 2 ✓
- [x] **Topbar 48px:** map-container top updated in Task 1, topbar JSX in Task 3 ✓
- [x] **Leaf SVG:** defined inline in LoginPage, MapView, ConfigPage ✓
- [x] **Glass panel:** backdrop-filter, border, shadow — Task 4 ✓
- [x] **Panel collapse:** icon strip with dots and tool symbols — Task 5 ✓
- [x] **Loading pill:** bottom-left, non-blocking — Task 6 ✓
- [x] **Glass zoom buttons:** Task 6 ✓
- [x] **Config left nav:** activeSection state, NAV_ITEMS, active styling — Task 7 ✓
- [x] **Datamodel section:** DataModelGraph + LayerRow + AddCustomLayerForm preserved — Task 7 ✓
- [x] **Future nav items:** present but disabled/dimmed — Task 7 ✓
- [x] **Design tokens:** CSS custom properties used consistently throughout ✓
- [x] **No old CSS leakage:** App.css fully rewritten in Task 1, no old class names referenced ✓

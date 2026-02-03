import React, { useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import AlertsPage from "./pages/AlertsPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import SettingsPage from "./pages/SettingsPage";
import InstancesPage from "./pages/InstancesPage";
import "./App.css";

function SidebarLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "pm-nav-link is-active" : "pm-nav-link")}
      end
    >
      <span className="pm-nav-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="pm-nav-label">{label}</span>
    </NavLink>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** Root app shell: sidebar + header + routed main content. */
  const [selectedInstanceId, setSelectedInstanceId] = useState("local-1");

  const instanceOptions = useMemo(
    () => [
      { id: "local-1", name: "Local MongoDB (placeholder)" },
      { id: "atlas-1", name: "Atlas Cluster (placeholder)" },
    ],
    []
  );

  return (
    <div className="App">
      <div className="pm-shell">
        <aside className="pm-sidebar" aria-label="Primary navigation">
          <div className="pm-brand">
            <div className="pm-brand-badge" aria-hidden="true">
              PM
            </div>
            <div className="pm-brand-title">
              <strong>MongoDB Performance Monitor</strong>
              <span>retro/light theme</span>
            </div>
          </div>

          <nav className="pm-nav">
            <SidebarLink to="/dashboard" icon="📈" label="Dashboard" />
            <SidebarLink to="/alerts" icon="🚨" label="Alerts" />
            <SidebarLink to="/recommendations" icon="🧠" label="Recommendations" />
            <SidebarLink to="/instances" icon="🗄️" label="Instances" />
            <SidebarLink to="/settings" icon="⚙️" label="Settings" />
          </nav>
        </aside>

        <main className="pm-main">
          <header className="pm-header">
            <div className="pm-header-left">
              <div className="pm-header-title">
                <strong>Overview</strong>
                <span>Live metrics wiring comes in later steps</span>
              </div>
            </div>

            <div className="pm-header-right">
              <div className="pm-pill" aria-label="Instance selector">
                <span aria-hidden="true">🧩</span>
                <label htmlFor="instanceSelect" className="sr-only">
                  Select instance
                </label>
                <select
                  id="instanceSelect"
                  value={selectedInstanceId}
                  onChange={(e) => setSelectedInstanceId(e.target.value)}
                >
                  {instanceOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="pm-icon-btn"
                aria-label="Notifications (placeholder)"
                onClick={() => {
                  // Placeholder only; real notifications come in later steps.
                  // Intentionally no-op.
                }}
              >
                🔔
              </button>
            </div>
          </header>

          <section className="pm-content" aria-label="Main content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/instances" element={<InstancesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="*"
                element={
                  <div className="pm-card">
                    <div className="pm-kicker">404</div>
                    <h1>Page not found</h1>
                    <p>This route does not exist yet.</p>
                  </div>
                }
              />
            </Routes>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;

/* Simple visually-hidden utility. Kept here to avoid adding extra CSS files. */
const styleTag = document?.getElementById?.("pm-sr-only-style");
if (!styleTag) {
  const tag = document.createElement("style");
  tag.id = "pm-sr-only-style";
  tag.textContent = `
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
  `;
  document.head.appendChild(tag);
}

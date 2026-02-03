import React, { useEffect, useState } from "react";
import { get } from "../lib/api";
import { config } from "../lib/config";

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Dashboard page with a basic backend connectivity/health indicator. */
  const [health, setHealth] = useState({ status: "idle", details: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setHealth({ status: "loading", details: null, error: null });

      try {
        // Backend OpenAPI currently exposes GET / as "Health Check".
        // We keep this minimal and can later swap to a dedicated /health endpoint.
        const data = await get("/");
        if (!cancelled) setHealth({ status: "ok", details: data ?? null, error: null });
      } catch (err) {
        if (cancelled) return;
        setHealth({
          status: "error",
          details: null,
          error: err?.message || "Unknown error",
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pm-card">
      <div className="pm-kicker">Dashboard</div>
      <h1>Real-time MongoDB Session Metrics</h1>
      <p>
        This is a placeholder page. In later steps, this will show live connections, session queries,
        slow operations, and historical trend charts.
      </p>

      <div style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0, fontSize: 14, letterSpacing: 0.2 }}>Backend connectivity</h2>
        <p style={{ margin: "8px 0 0 0" }}>
          <strong>API Base URL:</strong> <code>{config.apiBaseUrl}</code>
          <br />
          <strong>WS URL:</strong> <code>{config.wsUrl}</code>
        </p>

        <p style={{ margin: "10px 0 0 0" }}>
          <strong>Status:</strong>{" "}
          {health.status === "idle" && "Idle"}
          {health.status === "loading" && "Checking..."}
          {health.status === "ok" && "OK"}
          {health.status === "error" && "Error"}
        </p>

        {health.status === "error" ? (
          <p style={{ margin: "8px 0 0 0", color: "var(--pm-error)" }}>
            <strong>Health check failed:</strong> {health.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { config } from "../lib/config";
import { getMetricsSnapshot, getMetricsTimeseries, tryHealthCheck } from "../lib/metricsService";
import { useWebSocketConnection } from "../lib/wsHooks";

function formatCompact(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "—";
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${Math.round(num)}`;
}

function formatTimeLabel(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function MetricWidget({ label, value, unit, hint, tone = "default" }) {
  const border =
    tone === "success"
      ? "rgba(6,182,212,0.35)"
      : tone === "danger"
        ? "rgba(239,68,68,0.35)"
        : "rgba(17,24,39,0.12)";

  const bg =
    tone === "success"
      ? "linear-gradient(135deg, rgba(6,182,212,0.14), rgba(59,130,246,0.10))"
      : tone === "danger"
        ? "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(239,68,68,0.06))"
        : "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(6,182,212,0.06))";

  return (
    <div
      className="pm-card"
      style={{
        padding: 14,
        borderColor: border,
        background: bg,
        boxShadow: "0 10px 30px rgba(17,24,39,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontFamily: "var(--pm-mono)", fontSize: 12, color: "rgba(17,24,39,0.70)" }}>{label}</div>
        {unit ? (
          <div style={{ fontFamily: "var(--pm-mono)", fontSize: 12, color: "rgba(17,24,39,0.55)" }}>{unit}</div>
        ) : null}
      </div>

      <div style={{ marginTop: 8, fontSize: 26, fontWeight: 900, letterSpacing: 0.3 }}>
        {value ?? "—"}
      </div>

      {hint ? <div style={{ marginTop: 6, fontSize: 12, color: "rgba(17,24,39,0.65)" }}>{hint}</div> : null}
    </div>
  );
}

function ChartCard({ title, subtitle, children, status, error }) {
  return (
    <div className="pm-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 4, fontSize: 12, color: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {status === "loading" ? (
          <span className="pm-badge" aria-label="Loading">
            Loading
          </span>
        ) : status === "error" ? (
          <span className="pm-badge" style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.10)" }}>
            Error
          </span>
        ) : null}
      </div>

      <div style={{ height: 220, marginTop: 12 }}>
        {status === "loading" ? (
          <div className="pm-muted" style={{ padding: 10 }}>
            Loading chart...
          </div>
        ) : status === "error" ? (
          <div className="pm-alert pm-alert-error" style={{ marginTop: 0 }}>
            {error || "Failed to load chart."}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Dashboard page: metric widgets + lightweight charts. Uses REST for initial data and scaffolds WS for future live updates. */
  const [health, setHealth] = useState({ status: "idle", details: null, error: null });
  const [metrics, setMetrics] = useState({
    status: "idle", // idle|loading|ready|error
    snapshot: null,
    series: [],
    error: null,
  });

  // Feature flags for metrics mock/real live in metricsService (metricsApi=mock|real).
  // For now we keep instance selection out of scope of this step; default instance is null/empty.
  const instanceId = null;

  // WS scaffold: disabled by default unless experiments are enabled.
  const wsEnabled = String(process.env.REACT_APP_EXPERIMENTS_ENABLED || "").toLowerCase() === "true";
  const ws = useWebSocketConnection({ enabled: wsEnabled, url: config.wsUrl });

  const sampledAtLabel = useMemo(() => {
    const iso = metrics.snapshot?.sampledAt;
    if (!iso) return "n/a";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return "n/a";
    }
  }, [metrics.snapshot]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setHealth({ status: "loading", details: null, error: null });
      const result = await tryHealthCheck();
      if (cancelled) return;

      if (result.ok) setHealth({ status: "ok", details: result.details, error: null });
      else setHealth({ status: "error", details: null, error: result.error });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setMetrics({ status: "loading", snapshot: null, series: [], error: null });

      try {
        const [snapshot, series] = await Promise.all([
          getMetricsSnapshot({ instanceId }),
          getMetricsTimeseries({ instanceId, windowSec: 300, stepSec: 10 }),
        ]);
        if (cancelled) return;
        setMetrics({ status: "ready", snapshot, series, error: null });
      } catch (err) {
        if (cancelled) return;
        setMetrics({
          status: "error",
          snapshot: null,
          series: [],
          error: err?.message || "Failed to load metrics.",
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  return (
    <div className="pm-card">
      <div className="pm-page-header">
        <div>
          <div className="pm-kicker">Dashboard</div>
          <h1 style={{ marginTop: 0 }}>MongoDB Performance Overview</h1>
          <p style={{ marginTop: 10 }}>
            Live metric widgets + trend charts. Uses REST for initial data now; WebSocket hooks are scaffolded for
            realtime updates in later steps.
          </p>
        </div>

        <div className="pm-row pm-row-right">
          <div className="pm-stat" aria-label="Sample stats">
            <div className="pm-stat-label">Sampled</div>
            <div className="pm-stat-value" style={{ fontFamily: "var(--pm-mono)", fontSize: 12 }}>
              {metrics.status === "ready" ? sampledAtLabel : "—"}
            </div>
          </div>
        </div>
      </div>

      {health.status === "error" ? (
        <div className="pm-alert pm-alert-error" style={{ marginTop: 12 }}>
          Backend health check failed: {health.error}
        </div>
      ) : null}

      {metrics.status === "error" ? (
        <div className="pm-alert pm-alert-error" style={{ marginTop: 12 }}>
          Metrics load failed: {metrics.error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 12,
          marginTop: 14,
        }}
      >
        <div style={{ gridColumn: "span 4" }}>
          <MetricWidget
            label="Active connections"
            value={
              metrics.status === "loading"
                ? "Loading..."
                : metrics.snapshot
                  ? formatCompact(metrics.snapshot.connections)
                  : "—"
            }
            unit="count"
            hint="Current client connections (approx)."
            tone="default"
          />
        </div>

        <div style={{ gridColumn: "span 4" }}>
          <MetricWidget
            label="Operations / sec"
            value={
              metrics.status === "loading"
                ? "Loading..."
                : metrics.snapshot
                  ? formatCompact(metrics.snapshot.opsPerSec)
                  : "—"
            }
            unit="ops/s"
            hint="Throughput trend; spikes often correlate with load."
            tone="success"
          />
        </div>

        <div style={{ gridColumn: "span 4" }}>
          <MetricWidget
            label="Slow operations"
            value={
              metrics.status === "loading"
                ? "Loading..."
                : metrics.snapshot
                  ? formatCompact(metrics.snapshot.slowOpsPerMin)
                  : "—"
            }
            unit="per min"
            hint="High values suggest indexing or query shape issues."
            tone={metrics.snapshot?.slowOpsPerMin > 8 ? "danger" : "default"}
          />
        </div>

        <div style={{ gridColumn: "span 6" }}>
          <ChartCard
            title="Connections (last 5m)"
            subtitle="REST snapshot (WS live updates later)"
            status={metrics.status}
            error={metrics.error}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.series || []} margin={{ top: 10, right: 12, left: -4, bottom: 0 }}>
                <CartesianGrid stroke="rgba(17,24,39,0.10)" strokeDasharray="4 6" />
                <XAxis
                  dataKey="t"
                  tickFormatter={formatTimeLabel}
                  minTickGap={16}
                  tick={{ fontSize: 12, fill: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}
                  width={40}
                />
                <Tooltip
                  labelFormatter={(v) => `Time: ${formatTimeLabel(v)}`}
                  formatter={(v) => [`${v}`, "connections"]}
                />
                <Line
                  type="monotone"
                  dataKey="connections"
                  stroke="var(--pm-primary)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div style={{ gridColumn: "span 6" }}>
          <ChartCard title="Ops/sec (last 5m)" subtitle="Throughput trend" status={metrics.status} error={metrics.error}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.series || []} margin={{ top: 10, right: 12, left: -4, bottom: 0 }}>
                <CartesianGrid stroke="rgba(17,24,39,0.10)" strokeDasharray="4 6" />
                <XAxis
                  dataKey="t"
                  tickFormatter={formatTimeLabel}
                  minTickGap={16}
                  tick={{ fontSize: 12, fill: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}
                  width={48}
                />
                <Tooltip labelFormatter={(v) => `Time: ${formatTimeLabel(v)}`} formatter={(v) => [`${v}`, "ops/s"]} />
                <Line
                  type="monotone"
                  dataKey="opsPerSec"
                  stroke="var(--pm-success)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <div className="pm-card" style={{ padding: 16, marginTop: 2 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Connectivity & live updates</div>
            <div style={{ marginTop: 8, fontSize: 13, color: "rgba(17,24,39,0.75)" }}>
              <div>
                <strong>API Base URL:</strong> <code className="pm-code">{config.apiBaseUrl}</code>
              </div>
              <div style={{ marginTop: 6 }}>
                <strong>WS URL:</strong> <code className="pm-code">{config.wsUrl}</code>
              </div>

              <div style={{ marginTop: 10 }}>
                <strong>REST health:</strong>{" "}
                {health.status === "idle" && "Idle"}
                {health.status === "loading" && "Checking..."}
                {health.status === "ok" && "OK"}
                {health.status === "error" && "Error"}
              </div>

              <div style={{ marginTop: 6 }}>
                <strong>WS status (scaffold):</strong>{" "}
                {wsEnabled ? ws.status : "Disabled (enable via REACT_APP_EXPERIMENTS_ENABLED=true)"}
                {wsEnabled && ws.lastError ? <span style={{ color: "var(--pm-error)" }}> — {ws.lastError}</span> : null}
              </div>

              <div style={{ marginTop: 10, fontFamily: "var(--pm-mono)", fontSize: 12, color: "rgba(17,24,39,0.6)" }}>
                Feature flags: set <code className="pm-code">REACT_APP_FEATURE_FLAGS=metricsApi=mock</code> (default) or{" "}
                <code className="pm-code">metricsApi=real</code> once backend endpoints exist.
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          /* Simple responsive grid adjustments without changing the global shell */
          .pm-card > div[style*="grid-template-columns"] > div {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </div>
  );
}

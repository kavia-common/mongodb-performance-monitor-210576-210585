import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmptyState from "../components/EmptyState";
import { config } from "../lib/config";
import { getMetricsSnapshot, getMetricsTimeseries, tryHealthCheck } from "../lib/metricsService";
import { useWebSocketConnection } from "../lib/wsHooks";

function formatCompact(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (Math.abs(num) >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${Math.round(num)}`;
}

function formatNumber(n, { maxFrac = 0 } = {}) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: maxFrac }).format(num);
  } catch {
    return String(num);
  }
}

function formatRangeLabel(from, to, rangeKey) {
  const map = {
    "15m": "Last 15 minutes",
    "1h": "Last hour",
    "6h": "Last 6 hours",
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
  };
  const pretty = map[rangeKey] || "Custom";
  if (!from || !to) return pretty;
  try {
    const f = new Date(from);
    const t = new Date(to);
    const sameDay = f.toDateString() === t.toDateString();
    const fStr = sameDay ? f.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : f.toLocaleString();
    const tStr = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${pretty} • ${fStr} → ${tStr}`;
  } catch {
    return pretty;
  }
}

function computeRangeFromKey(rangeKey) {
  const now = Date.now();
  const ms = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  }[rangeKey];

  if (!ms) {
    const to = new Date(now).toISOString();
    const from = new Date(now - 60 * 60 * 1000).toISOString();
    return { from, to };
  }

  const to = new Date(now).toISOString();
  const from = new Date(now - ms).toISOString();
  return { from, to };
}

function formatTimeTick(iso, rangeKey) {
  try {
    const d = new Date(iso);
    if (rangeKey === "7d") return d.toLocaleDateString([], { month: "short", day: "numeric" });
    if (rangeKey === "24h") return d.toLocaleTimeString([], { hour: "2-digit" });
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function MetricWidget({ label, value, unit, hint, tone = "default", loading = false }) {
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
        minHeight: 102,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontFamily: "var(--pm-mono)", fontSize: 12, color: "rgba(17,24,39,0.70)" }}>{label}</div>
        {unit ? (
          <div style={{ fontFamily: "var(--pm-mono)", fontSize: 12, color: "rgba(17,24,39,0.55)" }}>{unit}</div>
        ) : null}
      </div>

      <div style={{ marginTop: 8, fontSize: 26, fontWeight: 900, letterSpacing: 0.3 }}>
        {loading ? <span style={{ color: "rgba(17,24,39,0.55)" }}>Loading…</span> : value ?? "—"}
      </div>

      {hint ? <div style={{ marginTop: 6, fontSize: 12, color: "rgba(17,24,39,0.65)" }}>{hint}</div> : null}
    </div>
  );
}

function ChartCard({ title, subtitle, children, status, error, emptyTitle, emptyDescription, rightSlot }) {
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

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {rightSlot}
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
      </div>

      <div style={{ height: 240, marginTop: 12 }}>
        {status === "loading" ? (
          <div className="pm-muted" style={{ padding: 10 }}>
            Loading chart…
          </div>
        ) : status === "error" ? (
          <div className="pm-alert pm-alert-error" style={{ marginTop: 0 }}>
            {error || "Failed to load chart."}
          </div>
        ) : children === null ? (
          <EmptyState title={emptyTitle || "No data"} description={emptyDescription || "No datapoints in this time range."} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function tooltipLabel(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function normalizeSeries(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((p) => {
      const t = p.t || p.ts || p.time || p.timestamp;
      if (!t) return null;
      return {
        t,
        connections: p.connections ?? p.conn,
        opsPerSec: p.opsPerSec ?? p.ops ?? p.ops_per_sec,
        slowOpsPerSec: p.slowOpsPerSec ?? p.slow_ops_per_sec ?? p.slowOps,
      };
    })
    .filter(Boolean);
}

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Dashboard page: metric widgets + timeseries charts with rollup-aware range passing (from/to). */
  const [health, setHealth] = useState({ status: "idle", details: null, error: null });

  const [rangeKey, setRangeKey] = useState("1h");
  const range = useMemo(() => computeRangeFromKey(rangeKey), [rangeKey]);

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

  const series = useMemo(() => normalizeSeries(metrics.series), [metrics.series]);
  const hasSeries = series.length > 1;

  const rangeLabel = useMemo(() => formatRangeLabel(range.from, range.to, rangeKey), [range.from, range.to, rangeKey]);

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
        // IMPORTANT: pass from/to so backend can auto-select rollups for long ranges.
        const [snapshot, ts] = await Promise.all([
          getMetricsSnapshot({ instanceId, from: range.from, to: range.to }),
          getMetricsTimeseries({ instanceId, from: range.from, to: range.to }),
        ]);
        if (cancelled) return;

        setMetrics({ status: "ready", snapshot, series: ts || [], error: null });
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
  }, [instanceId, range.from, range.to]);

  const connectionsValue =
    metrics.snapshot && (metrics.snapshot.connections ?? metrics.snapshot.conn) !== undefined
      ? formatCompact(metrics.snapshot.connections ?? metrics.snapshot.conn)
      : "—";
  const opsValue =
    metrics.snapshot && (metrics.snapshot.opsPerSec ?? metrics.snapshot.ops) !== undefined
      ? formatCompact(metrics.snapshot.opsPerSec ?? metrics.snapshot.ops)
      : "—";
  const slowPerMinValue =
    metrics.snapshot && (metrics.snapshot.slowOpsPerMin ?? metrics.snapshot.slowOps) !== undefined
      ? formatCompact(metrics.snapshot.slowOpsPerMin ?? metrics.snapshot.slowOps)
      : "—";

  const slowNum = Number(metrics.snapshot?.slowOpsPerMin ?? metrics.snapshot?.slowOps);
  const slowTone = Number.isFinite(slowNum) && slowNum > 8 ? "danger" : "default";

  return (
    <div className="pm-card">
      <div className="pm-page-header">
        <div>
          <div className="pm-kicker">Dashboard</div>
          <h1 style={{ marginTop: 0 }}>MongoDB Performance Overview</h1>
          <p style={{ marginTop: 10 }}>
            Select a time range to view trends. For large ranges, the backend will automatically serve rollups (same endpoint),
            and the UI just passes <code className="pm-code">from</code>/<code className="pm-code">to</code>.
          </p>
        </div>

        <div className="pm-row pm-row-right" style={{ flexWrap: "wrap" }}>
          <div className="pm-pill" aria-label="Time range selector">
            <span aria-hidden="true">🕒</span>
            <label htmlFor="pmRange" className="sr-only">
              Select time range
            </label>
            <select id="pmRange" value={rangeKey} onChange={(e) => setRangeKey(e.target.value)}>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="6h">6h</option>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
            </select>
          </div>

          <div className="pm-stat" aria-label="Sample stats">
            <div className="pm-stat-label">Sampled</div>
            <div className="pm-stat-value" style={{ fontFamily: "var(--pm-mono)", fontSize: 12 }}>
              {metrics.status === "ready" ? sampledAtLabel : "—"}
            </div>
          </div>

          <button
            type="button"
            className="pm-btn pm-btn-secondary"
            onClick={() => {
              // Trigger reload by resetting rangeKey to itself (cheap and clear).
              setRangeKey((k) => `${k}`);
            }}
            disabled={metrics.status === "loading"}
            title="Refresh data"
          >
            Refresh
          </button>
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
            value={connectionsValue}
            unit="count"
            hint="Current client connections (approx)."
            tone="default"
            loading={metrics.status === "loading"}
          />
        </div>

        <div style={{ gridColumn: "span 4" }}>
          <MetricWidget
            label="Operations / sec"
            value={opsValue}
            unit="ops/s"
            hint="Throughput trend; spikes often correlate with load."
            tone="success"
            loading={metrics.status === "loading"}
          />
        </div>

        <div style={{ gridColumn: "span 4" }}>
          <MetricWidget
            label="Slow operations"
            value={slowPerMinValue}
            unit="per min"
            hint="High values suggest indexing or query shape issues."
            tone={slowTone}
            loading={metrics.status === "loading"}
          />
        </div>

        <div style={{ gridColumn: "span 6" }}>
          <ChartCard
            title="Connections"
            subtitle={rangeLabel}
            status={metrics.status}
            error={metrics.error}
            emptyTitle="No connection data"
            emptyDescription="No datapoints returned for this time range."
          >
            {!hasSeries ? null : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 10, right: 12, left: -6, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(17,24,39,0.10)" strokeDasharray="4 6" />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(v) => formatTimeTick(v, rangeKey)}
                    minTickGap={18}
                    tick={{ fontSize: 12, fill: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}
                    width={46}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    labelFormatter={(v) => tooltipLabel(v)}
                    formatter={(v) => [formatNumber(v), "connections"]}
                    contentStyle={{
                      borderRadius: 12,
                      borderColor: "rgba(17,24,39,0.12)",
                      boxShadow: "0 18px 40px rgba(17,24,39,0.12)",
                    }}
                    labelStyle={{ fontFamily: "var(--pm-mono)", fontSize: 12 }}
                    itemStyle={{ fontFamily: "var(--pm-mono)", fontSize: 12 }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={24}
                    wrapperStyle={{ fontFamily: "var(--pm-mono)", fontSize: 12, color: "rgba(17,24,39,0.75)" }}
                  />
                  <Line
                    name="Connections"
                    type="monotone"
                    dataKey="connections"
                    stroke="var(--pm-primary)"
                    strokeWidth={2.25}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div style={{ gridColumn: "span 6" }}>
          <ChartCard
            title="Throughput"
            subtitle={rangeLabel}
            status={metrics.status}
            error={metrics.error}
            emptyTitle="No throughput data"
            emptyDescription="No datapoints returned for this time range."
          >
            {!hasSeries ? null : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 10, right: 12, left: -6, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(17,24,39,0.10)" strokeDasharray="4 6" />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(v) => formatTimeTick(v, rangeKey)}
                    minTickGap={18}
                    tick={{ fontSize: 12, fill: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}
                    width={56}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    labelFormatter={(v) => tooltipLabel(v)}
                    formatter={(v) => [formatNumber(v), "ops/s"]}
                    contentStyle={{
                      borderRadius: 12,
                      borderColor: "rgba(17,24,39,0.12)",
                      boxShadow: "0 18px 40px rgba(17,24,39,0.12)",
                    }}
                    labelStyle={{ fontFamily: "var(--pm-mono)", fontSize: 12 }}
                    itemStyle={{ fontFamily: "var(--pm-mono)", fontSize: 12 }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={24}
                    wrapperStyle={{ fontFamily: "var(--pm-mono)", fontSize: 12, color: "rgba(17,24,39,0.75)" }}
                  />
                  <Line
                    name="Ops/sec"
                    type="monotone"
                    dataKey="opsPerSec"
                    stroke="var(--pm-success)"
                    strokeWidth={2.25}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <div className="pm-card" style={{ padding: 16, marginTop: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Connectivity & live updates</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)" }}>
                  Troubleshooting panel (kept minimal; visuals match retro theme)
                </div>
              </div>
              <span className="pm-badge" style={{ background: "rgba(17,24,39,0.02)" }}>
                REST: {health.status === "ok" ? "OK" : health.status === "loading" ? "checking" : health.status === "error" ? "error" : "idle"}
              </span>
            </div>

            <div style={{ marginTop: 10, fontSize: 13, color: "rgba(17,24,39,0.75)" }}>
              <div>
                <strong>API Base URL:</strong> <code className="pm-code">{config.apiBaseUrl}</code>
              </div>
              <div style={{ marginTop: 6 }}>
                <strong>WS URL:</strong> <code className="pm-code">{config.wsUrl}</code>
              </div>

              <div style={{ marginTop: 10 }}>
                <strong>WS status (scaffold):</strong>{" "}
                {wsEnabled ? ws.status : "Disabled (enable via REACT_APP_EXPERIMENTS_ENABLED=true)"}
                {wsEnabled && ws.lastError ? <span style={{ color: "var(--pm-error)" }}> — {ws.lastError}</span> : null}
              </div>

              <div style={{ marginTop: 10, fontFamily: "var(--pm-mono)", fontSize: 12, color: "rgba(17,24,39,0.6)" }}>
                Feature flags: set <code className="pm-code">REACT_APP_FEATURE_FLAGS=metricsApi=mock</code> (default) or{" "}
                <code className="pm-code">metricsApi=real</code> to try backend endpoints.
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          /* Responsive: stack widgets/charts */
          .pm-card > div[style*="grid-template-columns: repeat(12"] > div {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </div>
  );
}

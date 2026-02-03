import React, { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import FilterBar from "../components/FilterBar";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { toast } from "../components/ToastHost";
import {
  applyRecommendation,
  dismissRecommendation,
  listRecommendations,
  restoreRecommendation,
  updateRecommendationStatus,
} from "../lib/recommendationsService";

function toneForStatus(st) {
  const s = String(st || "").toLowerCase();
  if (s === "open") return "info";
  if (s === "applied") return "success";
  if (s === "dismissed") return "muted";
  return "default";
}

function toneForSeverity(sev) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL" || s === "HIGH") return "danger";
  if (s === "MEDIUM") return "info";
  if (s === "LOW") return "muted";
  return "default";
}

function normalizeRec(x) {
  return {
    id: x.id || x.recId || x._id,
    title: x.title || x.summary || x.name || "Recommendation",
    description: x.description || x.details || x.message || "",
    instanceId: x.instanceId || x.instance || "",
    type: x.type || x.category || "general",
    status: (x.status || "open").toLowerCase(),
    severity: x.severity || x.impactSeverity || x.level,
    impact: x.impact || x.estimatedImpact,
    createdAt: x.createdAt || x.timestamp,
    raw: x,
  };
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

// PUBLIC_INTERFACE
export default function RecommendationsPage() {
  /** Recommendations page: list persisted tuning recommendations; update status with optimistic UI. */
  const [state, setState] = useState({ status: "idle", items: [], error: null });
  const [filters, setFilters] = useState({
    instanceId: "",
    type: "",
    status: "open",
    severity: "",
    impact: "",
  });
  const [selectedId, setSelectedId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setState((s) => ({ ...s, status: "loading", error: null }));
    try {
      const data = await listRecommendations({
        instanceId: filters.instanceId || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
        severity: filters.severity || undefined,
        impact: filters.impact || undefined,
      });
      setState({ status: "ready", items: data.items || [], error: null });
    } catch (err) {
      if (err?.status === 404) {
        setState({ status: "ready", items: [], error: null });
        return;
      }
      setState({ status: "error", items: [], error: err?.message || "Failed to load recommendations." });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.instanceId, filters.type, filters.status, filters.severity, filters.impact]);

  const normalized = useMemo(() => state.items.map(normalizeRec).filter((x) => x.id), [state.items]);
  const selected = useMemo(() => normalized.find((x) => x.id === selectedId) || null, [normalized, selectedId]);

  useEffect(() => {
    if (!selectedId && normalized.length) setSelectedId(normalized[0].id);
  }, [selectedId, normalized]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function setStatus(rec, nextStatus) {
    if (!rec?.id) return;
    setBusyId(rec.id);

    // optimistic update
    setState((s) => ({
      ...s,
      items: s.items.map((x) => {
        const nx = normalizeRec(x);
        if (nx.id !== rec.id) return x;
        return { ...(x || {}), status: nextStatus };
      }),
    }));

    try {
      // Use the friendly wrappers, but fallback to raw update in case backend expects different verb
      if (nextStatus === "applied") await applyRecommendation(rec.id);
      else if (nextStatus === "dismissed") await dismissRecommendation(rec.id);
      else if (nextStatus === "open") await restoreRecommendation(rec.id);
      else await updateRecommendationStatus(rec.id, nextStatus);

      toast({ title: "Updated", message: `${rec.title} → ${nextStatus}`, tone: "success" });
    } catch (err) {
      // revert by reloading (simpler + robust)
      toast({ title: "Update failed", message: err?.message || "Could not update recommendation.", tone: "error" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="pm-card">
      <div className="pm-page-header">
        <div>
          <div className="pm-kicker">Recommendations</div>
          <h1 style={{ marginTop: 0 }}>Tuning & Best Practices</h1>
          <p style={{ marginTop: 10 }}>
            Actionable performance guidance (indexing/pooling/TTL). Update statuses with optimistic UI; if backend endpoints
            are missing, the page shows graceful empty states.
          </p>
        </div>

        <div className="pm-row pm-row-right">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={load} disabled={state.status === "loading"}>
            Refresh
          </button>
        </div>
      </div>

      <FilterBar
        left={
          <>
            <div className="pm-field" style={{ minWidth: 220 }}>
              <label className="pm-label" htmlFor="rInst">
                Instance
              </label>
              <input
                id="rInst"
                className="pm-input pm-input-mono"
                value={filters.instanceId}
                onChange={(e) => setFilter("instanceId", e.target.value)}
                placeholder="e.g., local-1"
              />
            </div>

            <div className="pm-field" style={{ minWidth: 180 }}>
              <label className="pm-label" htmlFor="rType">
                Type
              </label>
              <select id="rType" className="pm-input" value={filters.type} onChange={(e) => setFilter("type", e.target.value)}>
                <option value="">All</option>
                <option value="indexing">indexing</option>
                <option value="pooling">pooling</option>
                <option value="ttl">ttl</option>
              </select>
            </div>

            <div className="pm-field" style={{ minWidth: 180 }}>
              <label className="pm-label" htmlFor="rStatus">
                Status
              </label>
              <select id="rStatus" className="pm-input" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
                <option value="">All</option>
                <option value="open">open</option>
                <option value="dismissed">dismissed</option>
                <option value="applied">applied</option>
              </select>
            </div>
          </>
        }
        right={
          <>
            <div className="pm-field" style={{ minWidth: 160 }}>
              <label className="pm-label" htmlFor="rSev">
                Severity
              </label>
              <input id="rSev" className="pm-input" value={filters.severity} onChange={(e) => setFilter("severity", e.target.value)} placeholder="optional" />
            </div>
            <div className="pm-field" style={{ minWidth: 160 }}>
              <label className="pm-label" htmlFor="rImpact">
                Impact
              </label>
              <input id="rImpact" className="pm-input" value={filters.impact} onChange={(e) => setFilter("impact", e.target.value)} placeholder="optional" />
            </div>
            <button
              type="button"
              className="pm-btn pm-btn-secondary"
              onClick={() => setFilters({ instanceId: "", type: "", status: "open", severity: "", impact: "" })}
            >
              Reset
            </button>
          </>
        }
      />

      {state.status === "loading" ? <LoadingSkeleton rows={8} /> : null}
      {state.status === "error" ? (
        <div className="pm-alert pm-alert-error" style={{ marginTop: 12 }}>
          {state.error}
        </div>
      ) : null}

      {state.status === "ready" && normalized.length === 0 ? (
        <EmptyState
          title="No recommendations"
          description="No persisted recommendations match your filters. If your backend supports refresh, it may generate items after collecting metrics."
          action={
            <button type="button" className="pm-btn pm-btn-secondary" onClick={load}>
              Refresh
            </button>
          }
        />
      ) : null}

      {state.status === "ready" && normalized.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 12, marginTop: 14 }}>
          <div className="pm-table-wrap" style={{ alignSelf: "start" }}>
            <table className="pm-table" aria-label="Recommendations table">
              <thead>
                <tr>
                  <th>Recommendation</th>
                  <th style={{ width: "14%" }}>Type</th>
                  <th style={{ width: "14%" }}>Status</th>
                  <th style={{ width: "18%" }}>Instance</th>
                </tr>
              </thead>
              <tbody>
                {normalized.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      cursor: "pointer",
                      background: r.id === selectedId ? "rgba(59,130,246,0.06)" : undefined,
                    }}
                  >
                    <td>
                      <div className="pm-cell-title">{r.title}</div>
                      <div className="pm-cell-subtitle">
                        {r.description ? r.description : <span className="pm-muted">No description provided.</span>}
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge tone={toneForSeverity(r.severity)}>{r.severity ? String(r.severity) : "impact: n/a"}</Badge>
                        {r.impact ? <Badge tone="muted">impact: {String(r.impact)}</Badge> : null}
                      </div>
                    </td>
                    <td>
                      <Badge tone="muted">{String(r.type)}</Badge>
                    </td>
                    <td>
                      <Badge tone={toneForStatus(r.status)}>{String(r.status)}</Badge>
                    </td>
                    <td>{r.instanceId ? <code className="pm-code">{r.instanceId}</code> : <span className="pm-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="pm-card" style={{ padding: 14, position: "sticky", top: 80, height: "fit-content" }}>
            {selected ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Details</div>
                    <div style={{ marginTop: 4, color: "rgba(17,24,39,0.65)", fontFamily: "var(--pm-mono)", fontSize: 12 }}>
                      {selected.createdAt ? `Created: ${formatWhen(selected.createdAt)}` : "—"}
                    </div>
                  </div>
                  <Badge tone={toneForStatus(selected.status)}>{selected.status}</Badge>
                </div>

                <div style={{ marginTop: 12, fontWeight: 900, fontSize: 16 }}>{selected.title}</div>
                {selected.instanceId ? (
                  <div style={{ marginTop: 8 }}>
                    <span className="pm-label">Instance</span>
                    <div style={{ marginTop: 6 }}>
                      <code className="pm-code">{selected.instanceId}</code>
                      <div style={{ marginTop: 6 }}>
                        <a href={`/instances`} style={{ color: "var(--pm-primary)", textDecoration: "none", fontWeight: 800 }}>
                          → Manage instances
                        </a>
                      </div>
                    </div>
                  </div>
                ) : null}

                {selected.description ? (
                  <div style={{ marginTop: 12, color: "rgba(17,24,39,0.75)", lineHeight: 1.6 }}>{selected.description}</div>
                ) : null}

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="pm-btn pm-btn-primary"
                    onClick={() => setStatus(selected, "applied")}
                    disabled={busyId === selected.id}
                  >
                    {busyId === selected.id ? "Working..." : "Apply"}
                  </button>
                  <button
                    type="button"
                    className="pm-btn pm-btn-secondary"
                    onClick={() => setStatus(selected, "dismissed")}
                    disabled={busyId === selected.id}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="pm-btn pm-btn-ghost"
                    onClick={() => setStatus(selected, "open")}
                    disabled={busyId === selected.id}
                  >
                    Restore
                  </button>
                </div>

                <details style={{ marginTop: 14 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 900 }}>Raw payload</summary>
                  <pre
                    style={{
                      marginTop: 10,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(17,24,39,0.10)",
                      background: "rgba(17,24,39,0.02)",
                      overflow: "auto",
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(selected.raw, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <div className="pm-muted">Select an item to view details.</div>
            )}
          </aside>

          <style>{`
            @media (max-width: 980px) {
              .pm-card > div[style*="grid-template-columns: 1fr 420px"] {
                grid-template-columns: 1fr !important;
              }
              aside[style*="position: sticky"] {
                position: relative !important;
                top: auto !important;
              }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}


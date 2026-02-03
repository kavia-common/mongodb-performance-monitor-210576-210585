import React, { useEffect, useMemo, useRef, useState } from "react";
import AlertRuleFormModal from "../components/AlertRuleFormModal";
import Badge from "../components/Badge";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import FilterBar from "../components/FilterBar";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { toast } from "../components/ToastHost";
import {
  createAlertRule,
  deleteAlertRule,
  listAlertEvents,
  listAlertRules,
  setAlertRuleEnabled,
  updateAlertRule,
} from "../lib/alertsService";

function toneForSeverity(sev) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL" || s === "HIGH") return "danger";
  if (s === "MEDIUM") return "info";
  if (s === "LOW") return "muted";
  return "default";
}

function toneForStatus(st) {
  const s = String(st || "").toUpperCase();
  if (s === "TRIGGERED" || s === "OPEN" || s === "FIRING") return "danger";
  if (s === "RESOLVED" || s === "CLOSED") return "success";
  return "default";
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function timeframeToSince(timeframe) {
  const now = Date.now();
  const m = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  }[timeframe];
  if (!m) return undefined;
  return new Date(now - m).toISOString();
}

function normalizeRule(x) {
  return {
    id: x.id || x.ruleId || x._id || x.name, // fallback for older APIs
    name: x.name || x.ruleName || "Untitled rule",
    enabled: x.enabled ?? x.isEnabled ?? true,
    severity: x.severity || "MEDIUM",
    instanceId: x.instanceId || x.instance || "",
    metric: x.metric || x.metricName || "",
    comparator: x.comparator || x.op || "",
    threshold: x.threshold ?? x.value ?? "",
    description: x.description || "",
    raw: x,
  };
}

function normalizeEvent(x) {
  return {
    id: x.id || x.eventId || x._id || `${x.ruleId || x.ruleName || "ev"}_${x.timestamp || x.createdAt || ""}`,
    ruleName: x.ruleName || x.rule?.name || x.rule || "Unknown rule",
    ruleId: x.ruleId || x.rule?.id || "",
    status: x.status || x.state || "TRIGGERED",
    severity: x.severity || x.rule?.severity || "MEDIUM",
    instanceId: x.instanceId || x.instance || x.sourceInstanceId || "",
    message: x.message || x.details || "",
    triggeredAt: x.triggeredAt || x.timestamp || x.createdAt || x.time,
    resolvedAt: x.resolvedAt || x.closedAt || x.updatedAt,
    raw: x,
  };
}

// PUBLIC_INTERFACE
export default function AlertsPage() {
  /** Alerts page: manage alert rules and browse alert events feed. */
  const [rulesState, setRulesState] = useState({ status: "idle", items: [], error: null });
  const [eventsState, setEventsState] = useState({
    status: "idle",
    items: [],
    error: null,
    nextCursor: null,
    hasMore: true,
  });

  const [filters, setFilters] = useState({
    instanceId: "",
    status: "",
    severity: "",
    timeframe: "24h",
    q: "",
  });

  const [ui, setUi] = useState({
    selectedEvent: null,
    ruleModal: { open: false, mode: "create", item: null },
    confirmDelete: { open: false, item: null },
    busy: false,
  });

  const loadMoreRef = useRef(null);

  const normalizedRules = useMemo(() => rulesState.items.map(normalizeRule), [rulesState.items]);
  const ruleNames = useMemo(
    () => normalizedRules.map((r) => r.name).filter(Boolean),
    [normalizedRules]
  );

  async function loadRules() {
    setRulesState((s) => ({ ...s, status: "loading", error: null }));
    try {
      const data = await listAlertRules({ instanceId: filters.instanceId || undefined });
      setRulesState({ status: "ready", items: data.items || [], error: null });
    } catch (err) {
      // If endpoint missing, show empty (acceptance: fallback gracefully)
      if (err?.status === 404) {
        setRulesState({ status: "ready", items: [], error: null });
        return;
      }
      setRulesState({ status: "error", items: [], error: err?.message || "Failed to load alert rules." });
    }
  }

  async function loadEvents({ reset }) {
    if (reset) {
      setEventsState({ status: "loading", items: [], error: null, nextCursor: null, hasMore: true });
    } else {
      setEventsState((s) => ({ ...s, status: s.status === "ready" ? "loadingMore" : "loading", error: null }));
    }

    try {
      const since = timeframeToSince(filters.timeframe);
      const cursor = reset ? undefined : eventsState.nextCursor;
      const data = await listAlertEvents({
        instanceId: filters.instanceId || undefined,
        status: filters.status || undefined,
        severity: filters.severity || undefined,
        since,
        q: filters.q || undefined,
        cursor,
        limit: 20,
      });

      const incoming = (data.items || []).map(normalizeEvent);
      const nextCursor = data.nextCursor || data.cursor || null;

      setEventsState((prev) => {
        const merged = reset ? incoming : [...prev.items, ...incoming];
        const hasMore = Boolean(nextCursor) || incoming.length === 20; // heuristic if backend doesn't return cursor
        return {
          status: "ready",
          items: merged,
          error: null,
          nextCursor,
          hasMore,
        };
      });
    } catch (err) {
      if (err?.status === 404) {
        setEventsState({ status: "ready", items: [], error: null, nextCursor: null, hasMore: false });
        return;
      }
      setEventsState((prev) => ({
        ...prev,
        status: "error",
        error: err?.message || "Failed to load alert events.",
      }));
    }
  }

  useEffect(() => {
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEvents({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.instanceId, filters.status, filters.severity, filters.timeframe, filters.q]);

  // infinite load for events
  useEffect(() => {
    if (!loadMoreRef.current) return undefined;
    if (!eventsState.hasMore) return undefined;
    if (eventsState.status !== "ready") return undefined;

    const el = loadMoreRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && eventsState.hasMore && eventsState.status === "ready") {
          loadEvents({ reset: false });
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsState.status, eventsState.hasMore, eventsState.nextCursor]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function openCreateRule() {
    setUi((prev) => ({ ...prev, ruleModal: { open: true, mode: "create", item: null } }));
  }

  function openEditRule(rule) {
    setUi((prev) => ({ ...prev, ruleModal: { open: true, mode: "edit", item: rule } }));
  }

  function openDeleteRule(rule) {
    setUi((prev) => ({ ...prev, confirmDelete: { open: true, item: rule } }));
  }

  async function handleRuleSubmit(payload) {
    setUi((p) => ({ ...p, busy: true }));
    try {
      if (ui.ruleModal.mode === "edit") {
        const id = normalizeRule(ui.ruleModal.item).id;
        await updateAlertRule(id, payload);
        toast({ title: "Rule updated", message: payload.name, tone: "success" });
      } else {
        await createAlertRule(payload);
        toast({ title: "Rule created", message: payload.name, tone: "success" });
      }
      setUi((p) => ({ ...p, ruleModal: { open: false, mode: "create", item: null } }));
      await loadRules();
    } catch (err) {
      toast({ title: "Action failed", message: err?.message || "Could not save rule.", tone: "error" });
      throw err;
    } finally {
      setUi((p) => ({ ...p, busy: false }));
    }
  }

  async function handleDeleteConfirmed() {
    const id = ui.confirmDelete.item ? normalizeRule(ui.confirmDelete.item).id : null;
    if (!id) return;
    setUi((p) => ({ ...p, busy: true }));
    try {
      await deleteAlertRule(id);
      toast({ title: "Rule deleted", message: "Alert rule removed.", tone: "success" });
      setUi((p) => ({ ...p, confirmDelete: { open: false, item: null } }));
      await loadRules();
    } catch (err) {
      toast({ title: "Delete failed", message: err?.message || "Could not delete rule.", tone: "error" });
    } finally {
      setUi((p) => ({ ...p, busy: false }));
    }
  }

  async function toggleRule(rule) {
    const r = normalizeRule(rule);
    const next = !r.enabled;

    // optimistic
    setRulesState((s) => ({
      ...s,
      items: s.items.map((x) => {
        const nx = normalizeRule(x);
        if (nx.id !== r.id) return x;
        return { ...(x || {}), enabled: next };
      }),
    }));

    try {
      await setAlertRuleEnabled(r.id, next);
      toast({ title: next ? "Rule enabled" : "Rule disabled", message: r.name, tone: "success" });
    } catch (err) {
      // revert
      setRulesState((s) => ({
        ...s,
        items: s.items.map((x) => {
          const nx = normalizeRule(x);
          if (nx.id !== r.id) return x;
          return { ...(x || {}), enabled: r.enabled };
        }),
      }));
      toast({ title: "Update failed", message: err?.message || "Could not update rule.", tone: "error" });
    }
  }

  const selected = ui.selectedEvent;

  return (
    <div className="pm-card">
      <div className="pm-page-header">
        <div>
          <div className="pm-kicker">Alerts</div>
          <h1 style={{ marginTop: 0 }}>Performance Alerts</h1>
          <p style={{ marginTop: 10 }}>
            Configure alert rules and review the events feed. If the backend endpoints aren’t available yet, the page will
            gracefully show empty states.
          </p>
        </div>

        <div className="pm-row pm-row-right">
          <button type="button" className="pm-btn pm-btn-primary" onClick={openCreateRule}>
            + New rule
          </button>
        </div>
      </div>

      <FilterBar
        left={
          <>
            <div className="pm-field" style={{ minWidth: 220 }}>
              <label className="pm-label" htmlFor="aInst">
                Instance
              </label>
              <input
                id="aInst"
                className="pm-input pm-input-mono"
                value={filters.instanceId}
                onChange={(e) => setFilter("instanceId", e.target.value)}
                placeholder="e.g., local-1"
              />
            </div>

            <div className="pm-field" style={{ minWidth: 180 }}>
              <label className="pm-label" htmlFor="aStatus">
                Status
              </label>
              <select id="aStatus" className="pm-input" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
                <option value="">All</option>
                <option value="TRIGGERED">TRIGGERED</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            <div className="pm-field" style={{ minWidth: 180 }}>
              <label className="pm-label" htmlFor="aSev">
                Severity
              </label>
              <select id="aSev" className="pm-input" value={filters.severity} onChange={(e) => setFilter("severity", e.target.value)}>
                <option value="">All</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div className="pm-field" style={{ minWidth: 160 }}>
              <label className="pm-label" htmlFor="aTime">
                Timeframe
              </label>
              <select id="aTime" className="pm-input" value={filters.timeframe} onChange={(e) => setFilter("timeframe", e.target.value)}>
                <option value="15m">Last 15m</option>
                <option value="1h">Last 1h</option>
                <option value="6h">Last 6h</option>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7d</option>
              </select>
            </div>
          </>
        }
        right={
          <>
            <div className="pm-field" style={{ minWidth: 280 }}>
              <label className="pm-label" htmlFor="aQ">
                Search (rule name)
              </label>
              <input
                id="aQ"
                className="pm-input"
                value={filters.q}
                onChange={(e) => setFilter("q", e.target.value)}
                placeholder={ruleNames.length ? "e.g., Slow ops spike" : "Type to search"}
              />
            </div>

            <button
              type="button"
              className="pm-btn pm-btn-secondary"
              onClick={() => {
                setFilters({ instanceId: "", status: "", severity: "", timeframe: "24h", q: "" });
              }}
            >
              Reset
            </button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 12, marginTop: 14 }}>
        <div>
          <div className="pm-card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Alert rules</div>
              <div className="pm-muted" style={{ fontFamily: "var(--pm-mono)", fontSize: 12 }}>
                {rulesState.status === "ready" ? `${normalizedRules.length} rules` : "—"}
              </div>
            </div>

            {rulesState.status === "loading" ? (
              <div style={{ marginTop: 12 }}>
                <LoadingSkeleton rows={4} />
              </div>
            ) : rulesState.status === "error" ? (
              <div className="pm-alert pm-alert-error" style={{ marginTop: 12 }}>
                {rulesState.error}
              </div>
            ) : normalizedRules.length === 0 ? (
              <EmptyState
                title="No alert rules"
                description="Create a rule to start generating alert events for your MongoDB instances."
                action={
                  <button type="button" className="pm-btn pm-btn-primary" onClick={openCreateRule}>
                    + New rule
                  </button>
                }
              />
            ) : (
              <div className="pm-table-wrap" style={{ marginTop: 12 }}>
                <table className="pm-table" aria-label="Alert rules table">
                  <thead>
                    <tr>
                      <th style={{ width: "34%" }}>Rule</th>
                      <th style={{ width: "16%" }}>Severity</th>
                      <th>Scope</th>
                      <th style={{ width: "18%" }}>Enabled</th>
                      <th style={{ width: 220, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedRules.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="pm-cell-title">{r.name}</div>
                          <div className="pm-cell-subtitle" style={{ marginTop: 6 }}>
                            <span className="pm-code">
                              {r.metric || "metric"} {r.comparator || ">"} {String(r.threshold ?? "—")}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Badge tone={toneForSeverity(r.severity)}>{String(r.severity || "—")}</Badge>
                        </td>
                        <td>{r.instanceId ? <code className="pm-code">{r.instanceId}</code> : <span className="pm-muted">All instances</span>}</td>
                        <td>{r.enabled ? <Badge tone="success">ON</Badge> : <Badge tone="muted">OFF</Badge>}</td>
                        <td style={{ textAlign: "right" }}>
                          <div className="pm-row pm-row-right" style={{ flexWrap: "wrap" }}>
                            <button type="button" className="pm-btn pm-btn-ghost" onClick={() => toggleRule(r)} disabled={ui.busy}>
                              {r.enabled ? "Disable" : "Enable"}
                            </button>
                            <button type="button" className="pm-btn pm-btn-ghost" onClick={() => openEditRule(r)} disabled={ui.busy}>
                              Edit
                            </button>
                            <button type="button" className="pm-btn pm-btn-danger" onClick={() => openDeleteRule(r)} disabled={ui.busy}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pm-card" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Events feed</div>
              <div className="pm-muted" style={{ fontFamily: "var(--pm-mono)", fontSize: 12 }}>
                {eventsState.status === "ready" ? `${eventsState.items.length} events` : "—"}
              </div>
            </div>

            {eventsState.status === "loading" ? (
              <LoadingSkeleton rows={7} />
            ) : eventsState.status === "error" ? (
              <div className="pm-alert pm-alert-error" style={{ marginTop: 12 }}>
                {eventsState.error}
              </div>
            ) : eventsState.items.length === 0 ? (
              <EmptyState
                title="No events"
                description="No alert events match the current filters/timeframe. If you just created rules, wait for the next poll cycle."
              />
            ) : (
              <>
                <div className="pm-table-wrap" style={{ marginTop: 12 }}>
                  <table className="pm-table" aria-label="Alert events table">
                    <thead>
                      <tr>
                        <th style={{ width: "22%" }}>When</th>
                        <th>Rule</th>
                        <th style={{ width: "14%" }}>Status</th>
                        <th style={{ width: "14%" }}>Severity</th>
                        <th style={{ width: "18%" }}>Instance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsState.items.map((ev) => (
                        <tr
                          key={ev.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => setUi((p) => ({ ...p, selectedEvent: ev }))}
                        >
                          <td>
                            <div className="pm-cell-title">{formatWhen(ev.triggeredAt)}</div>
                            {ev.resolvedAt ? (
                              <div className="pm-cell-subtitle">Resolved: {formatWhen(ev.resolvedAt)}</div>
                            ) : (
                              <div className="pm-cell-subtitle">—</div>
                            )}
                          </td>
                          <td>
                            <div className="pm-cell-title">{ev.ruleName}</div>
                            {ev.message ? <div className="pm-cell-subtitle">{ev.message}</div> : null}
                          </td>
                          <td>
                            <Badge tone={toneForStatus(ev.status)}>{String(ev.status || "—")}</Badge>
                          </td>
                          <td>
                            <Badge tone={toneForSeverity(ev.severity)}>{String(ev.severity || "—")}</Badge>
                          </td>
                          <td>{ev.instanceId ? <code className="pm-code">{ev.instanceId}</code> : <span className="pm-muted">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div className="pm-muted" style={{ fontFamily: "var(--pm-mono)", fontSize: 12 }}>
                    {eventsState.hasMore ? "Scroll to load more…" : "End of feed"}
                  </div>
                  <button
                    type="button"
                    className="pm-btn pm-btn-secondary"
                    onClick={() => loadEvents({ reset: true })}
                    disabled={eventsState.status === "loading" || eventsState.status === "loadingMore"}
                  >
                    Refresh
                  </button>
                </div>

                <div ref={loadMoreRef} style={{ height: 1 }} />
              </>
            )}

            {eventsState.status === "loadingMore" ? (
              <div className="pm-muted" style={{ marginTop: 12 }}>
                Loading more…
              </div>
            ) : null}
          </div>
        </div>

        {selected ? (
          <aside className="pm-card" style={{ padding: 14, position: "sticky", top: 80, height: "fit-content" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Event details</div>
              <button type="button" className="pm-btn pm-btn-ghost" onClick={() => setUi((p) => ({ ...p, selectedEvent: null }))}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div className="pm-label">Rule</div>
                <div style={{ marginTop: 6, fontWeight: 900 }}>{selected.ruleName}</div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Badge tone={toneForStatus(selected.status)}>{selected.status}</Badge>
                <Badge tone={toneForSeverity(selected.severity)}>{selected.severity}</Badge>
                {selected.instanceId ? <Badge tone="muted">{selected.instanceId}</Badge> : null}
              </div>

              <div>
                <div className="pm-label">Triggered</div>
                <div style={{ marginTop: 6, fontFamily: "var(--pm-mono)", fontSize: 12 }}>{formatWhen(selected.triggeredAt)}</div>
              </div>

              <div>
                <div className="pm-label">Resolved</div>
                <div style={{ marginTop: 6, fontFamily: "var(--pm-mono)", fontSize: 12 }}>
                  {selected.resolvedAt ? formatWhen(selected.resolvedAt) : "—"}
                </div>
              </div>

              {selected.message ? (
                <div>
                  <div className="pm-label">Message</div>
                  <div style={{ marginTop: 6, color: "rgba(17,24,39,0.75)", lineHeight: 1.5 }}>{selected.message}</div>
                </div>
              ) : null}

              <details style={{ marginTop: 8 }}>
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
            </div>
          </aside>
        ) : null}
      </div>

      <AlertRuleFormModal
        isOpen={ui.ruleModal.open}
        mode={ui.ruleModal.mode}
        initialValue={ui.ruleModal.item}
        onSubmit={handleRuleSubmit}
        onClose={() => (ui.busy ? null : setUi((p) => ({ ...p, ruleModal: { open: false, mode: "create", item: null } })))}
        busy={ui.busy}
      />

      <ConfirmDialog
        isOpen={ui.confirmDelete.open}
        title="Delete alert rule?"
        message={
          ui.confirmDelete.item ? (
            <>
              This will delete <strong>{normalizeRule(ui.confirmDelete.item).name}</strong>. This action cannot be undone.
            </>
          ) : (
            "This action cannot be undone."
          )
        }
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => (ui.busy ? null : setUi((p) => ({ ...p, confirmDelete: { open: false, item: null } })))}
        busy={ui.busy}
      />

      <style>{`
        @media (max-width: 980px) {
          /* collapse detail panel */
          .pm-card > div[style*="grid-template-columns: 1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
          aside[style*="position: sticky"] {
            position: relative !important;
            top: auto !important;
          }
        }
      `}</style>
    </div>
  );
}


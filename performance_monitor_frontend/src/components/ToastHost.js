import React, { useEffect, useMemo, useState } from "react";

/**
 * Tiny toast host. It listens for "pm:toast" CustomEvent.
 * This avoids adding new dependencies and keeps UX consistent across pages.
 */

function toneStyles(tone) {
  if (tone === "success") return { border: "rgba(6,182,212,0.35)", bg: "rgba(6,182,212,0.10)" };
  if (tone === "error") return { border: "rgba(239,68,68,0.35)", bg: "rgba(239,68,68,0.10)" };
  return { border: "rgba(59,130,246,0.30)", bg: "rgba(59,130,246,0.08)" };
}

// PUBLIC_INTERFACE
export function toast({ title, message, tone = "default", timeoutMs = 3200 }) {
  /** Global toast utility. */
  window.dispatchEvent(
    new CustomEvent("pm:toast", {
      detail: { title, message, tone, timeoutMs },
    })
  );
}

// PUBLIC_INTERFACE
export default function ToastHost() {
  /** Renders toasts at app level. */
  const [items, setItems] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const d = e.detail || {};
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const next = { id, ...d };
      setItems((prev) => [next, ...prev].slice(0, 4));

      const timeout = Number(d.timeoutMs || 3200);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, Math.max(1200, timeout));
    }

    window.addEventListener("pm:toast", onToast);
    return () => window.removeEventListener("pm:toast", onToast);
  }, []);

  const containerStyle = useMemo(
    () => ({
      position: "fixed",
      right: 16,
      bottom: 16,
      zIndex: 60,
      display: "grid",
      gap: 10,
      width: "min(420px, calc(100vw - 32px))",
    }),
    []
  );

  if (!items.length) return null;

  return (
    <div style={containerStyle} aria-label="Notifications">
      {items.map((t) => {
        const s = toneStyles(t.tone);
        return (
          <div
            key={t.id}
            className="pm-card"
            style={{
              padding: 12,
              borderColor: s.border,
              background: s.bg,
              boxShadow: "0 18px 40px rgba(17,24,39,0.12)",
            }}
            role="status"
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{t.title || "Notice"}</div>
              <button
                type="button"
                className="pm-btn pm-btn-ghost"
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Dismiss"
                style={{ height: 28, padding: "0 10px" }}
              >
                ✕
              </button>
            </div>
            {t.message ? <div style={{ marginTop: 6, color: "rgba(17,24,39,0.75)" }}>{t.message}</div> : null}
          </div>
        );
      })}
    </div>
  );
}


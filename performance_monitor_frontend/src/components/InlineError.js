import React from "react";
import EmptyState from "./EmptyState";

/**
 * Standard inline error presentation used across pages.
 * - role=alert for accessibility
 * - includes Retry CTA (debounced by caller)
 * - can show distinct offline copy
 */

// PUBLIC_INTERFACE
export default function InlineError({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Retry",
  disabled = false,
  offline = false,
  variant = "alert", // "alert" | "empty"
}) {
  /** Unified error UI for cards/lists/charts. */
  const body = offline
    ? "You appear to be offline. Check your connection, then retry."
    : message || "We couldn’t load this section. Please try again.";

  if (variant === "empty") {
    return (
      <div role="alert" aria-live="assertive">
        <EmptyState
          title={offline ? "Offline" : title}
          description={body}
          action={
            onRetry ? (
              <button type="button" className="pm-btn pm-btn-secondary" onClick={onRetry} disabled={disabled}>
                {retryLabel}
              </button>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <div className="pm-alert pm-alert-error" role="alert" aria-live="assertive" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{offline ? "Offline" : title}</div>
          <div style={{ marginTop: 6, color: "rgba(17,24,39,0.80)", lineHeight: 1.45 }}>{body}</div>
        </div>

        {onRetry ? (
          <button type="button" className="pm-btn pm-btn-secondary" onClick={onRetry} disabled={disabled}>
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

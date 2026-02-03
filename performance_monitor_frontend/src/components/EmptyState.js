import React from "react";

// PUBLIC_INTERFACE
export default function EmptyState({ title = "Nothing here yet", description, action }) {
  /** Empty-state panel used across list pages. */
  return (
    <div
      className="pm-card"
      style={{
        padding: 18,
        marginTop: 14,
        borderStyle: "dashed",
        background: "rgba(17,24,39,0.01)",
      }}
    >
      <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{title}</div>
      {description ? <div style={{ marginTop: 6, color: "rgba(17,24,39,0.65)", lineHeight: 1.5 }}>{description}</div> : null}
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}


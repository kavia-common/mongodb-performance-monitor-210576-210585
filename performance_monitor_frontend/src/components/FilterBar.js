import React from "react";

// PUBLIC_INTERFACE
export default function FilterBar({ left, right }) {
  /** A simple responsive filter/action bar matching the retro theme. */
  return (
    <div
      className="pm-card"
      style={{
        padding: 12,
        marginTop: 12,
        background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(6,182,212,0.04))",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <div className="pm-row" style={{ flexWrap: "wrap" }}>
          {left}
        </div>
        <div className="pm-row pm-row-right" style={{ flexWrap: "wrap" }}>
          {right}
        </div>
      </div>
    </div>
  );
}


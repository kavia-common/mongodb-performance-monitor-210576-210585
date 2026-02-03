import React from "react";

function toneStyle(tone) {
  if (tone === "success") return { className: "pm-badge pm-badge-success" };
  if (tone === "danger")
    return {
      className: "pm-badge",
      style: { borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.10)" },
    };
  if (tone === "info")
    return {
      className: "pm-badge",
      style: { borderColor: "rgba(59,130,246,0.35)", background: "rgba(59,130,246,0.10)" },
    };
  if (tone === "muted")
    return {
      className: "pm-badge",
      style: { borderColor: "rgba(17,24,39,0.12)", background: "rgba(17,24,39,0.02)", color: "rgba(17,24,39,0.75)" },
    };
  return { className: "pm-badge" };
}

// PUBLIC_INTERFACE
export default function Badge({ children, tone = "default", title }) {
  /** Small retro-styled badge for status/severity/type chips. */
  const s = toneStyle(tone);
  return (
    <span className={s.className} style={s.style} title={title}>
      {children}
    </span>
  );
}


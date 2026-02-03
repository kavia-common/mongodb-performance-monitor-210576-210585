import React from "react";

function SkeletonLine({ w = "100%", h = 12 }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 999,
        background: "linear-gradient(90deg, rgba(17,24,39,0.06), rgba(17,24,39,0.02), rgba(17,24,39,0.06))",
        backgroundSize: "200% 100%",
        animation: "pm-skeleton 1.2s ease-in-out infinite",
      }}
    />
  );
}

// PUBLIC_INTERFACE
export default function LoadingSkeleton({ rows = 6 }) {
  /** A minimal retro skeleton used during list loading. */
  return (
    <div className="pm-card" style={{ padding: 14, marginTop: 14 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <SkeletonLine w="42%" h={14} />
        {Array.from({ length: rows }).map((_, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <SkeletonLine key={idx} w={`${85 - (idx % 3) * 12}%`} h={12} />
        ))}
      </div>

      <style>{`
        @keyframes pm-skeleton {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  );
}


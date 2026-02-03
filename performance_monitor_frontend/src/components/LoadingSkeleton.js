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

function SkeletonTable({ rows = 6, cols = 4 }) {
  const widths = ["26%", "38%", "18%", "18%"];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <SkeletonLine w="42%" h={14} />
      <div style={{ display: "grid", gap: 8 }}>
        {Array.from({ length: rows }).map((_, rIdx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={rIdx} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
            {Array.from({ length: cols }).map((__, cIdx) => (
              // eslint-disable-next-line react/no-array-index-key
              <SkeletonLine key={`${rIdx}_${cIdx}`} w={widths[cIdx] || `${80 - (cIdx % 3) * 10}%`} h={12} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCards({ cards = 3 }) {
  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(12, 1fr)" }}>
      {Array.from({ length: cards }).map((_, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={idx} className="pm-card" style={{ padding: 14, gridColumn: "span 4", minHeight: 102 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <SkeletonLine w="52%" h={12} />
            <SkeletonLine w="68%" h={22} />
            <SkeletonLine w="44%" h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

// PUBLIC_INTERFACE
export default function LoadingSkeleton({ rows = 6, variant = "list", label = "Loading" }) {
  /**
   * A minimal retro skeleton used during loading.
   *
   * Backward compatible:
   * - existing callers using <LoadingSkeleton rows={n} /> still work.
   *
   * Variants:
   * - list (default): stacked lines
   * - table: grid-like rows/cols to match tables and reduce layout shift
   * - cards: widget/card placeholders
   */
  const content =
    variant === "table" ? (
      <SkeletonTable rows={rows} cols={4} />
    ) : variant === "cards" ? (
      <SkeletonCards cards={Math.max(1, Math.min(6, Math.round(rows / 2)))} />
    ) : (
      <div style={{ display: "grid", gap: 10 }}>
        <SkeletonLine w="42%" h={14} />
        {Array.from({ length: rows }).map((_, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <SkeletonLine key={idx} w={`${85 - (idx % 3) * 12}%`} h={12} />
        ))}
      </div>
    );

  return (
    <div className="pm-card" style={{ padding: 14, marginTop: 14 }} aria-live="polite" aria-busy="true">
      <div className="sr-only">{label}</div>
      {content}

      <style>{`
        @keyframes pm-skeleton {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  );
}

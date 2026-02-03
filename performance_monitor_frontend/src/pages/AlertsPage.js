import React from "react";

// PUBLIC_INTERFACE
export default function AlertsPage() {
  /** Placeholder alerts page. */
  return (
    <div className="pm-card">
      <div className="pm-kicker">Alerts</div>
      <h1>Performance Alerts</h1>
      <p>
        This is a placeholder page. In later steps, this will list triggered alerts (slow queries,
        connection spikes) and allow configuring alert thresholds.
      </p>
    </div>
  );
}

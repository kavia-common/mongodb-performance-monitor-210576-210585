import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";

/**
 * Alert rule create/edit modal.
 * Kept generic because backend rule schema may vary. We include common fields:
 * - name, enabled, severity, instanceId, metric, threshold, comparator
 */

// PUBLIC_INTERFACE
export default function AlertRuleFormModal({ isOpen, mode, initialValue, onSubmit, onClose, busy = false }) {
  /** Modal form to create/update alert rules. */
  const isEdit = mode === "edit";

  const initial = useMemo(
    () => ({
      name: initialValue?.name || "",
      enabled: initialValue?.enabled ?? true,
      instanceId: initialValue?.instanceId || "",
      severity: initialValue?.severity || "MEDIUM",
      metric: initialValue?.metric || "slowOpsPerMin",
      comparator: initialValue?.comparator || ">",
      threshold: initialValue?.threshold ?? 10,
      description: initialValue?.description || "",
    }),
    [initialValue]
  );

  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm(initial);
      setErrors({});
    }
  }, [isOpen, initial]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, _form: undefined }));
  }

  function validate(draft) {
    const e = {};
    const name = String(draft.name || "").trim();
    if (!name) e.name = "Rule name is required.";
    if (name.length > 80) e.name = "Rule name must be 80 characters or less.";
    const threshold = Number(draft.threshold);
    if (!Number.isFinite(threshold)) e.threshold = "Threshold must be a number.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const localErrors = validate(form);
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    try {
      await onSubmit?.({
        name: String(form.name).trim(),
        enabled: Boolean(form.enabled),
        instanceId: String(form.instanceId || "").trim() || undefined,
        severity: form.severity,
        metric: form.metric,
        comparator: form.comparator,
        threshold: Number(form.threshold),
        description: String(form.description || ""),
      });
    } catch (err) {
      setErrors({ _form: err?.message || "Something went wrong." });
    }
  }

  return (
    <Modal
      title={isEdit ? "Edit alert rule" : "Create alert rule"}
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      footer={
        <div className="pm-row pm-row-right">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="pm-alert-rule-form" className="pm-btn pm-btn-primary" disabled={busy}>
            {busy ? "Saving..." : isEdit ? "Save changes" : "Create rule"}
          </button>
        </div>
      }
    >
      <form id="pm-alert-rule-form" onSubmit={handleSubmit}>
        {errors._form ? <div className="pm-alert pm-alert-error">{errors._form}</div> : null}

        <div className="pm-form-grid">
          <div className="pm-field">
            <label className="pm-label" htmlFor="ruleName">
              Name
            </label>
            <input
              id="ruleName"
              className={`pm-input ${errors.name ? "is-error" : ""}`}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g., Slow ops spike"
              autoFocus
              disabled={busy}
            />
            {errors.name ? <div className="pm-help pm-help-error">{errors.name}</div> : null}
          </div>

          <div className="pm-field">
            <label className="pm-checkbox">
              <input
                type="checkbox"
                checked={Boolean(form.enabled)}
                onChange={(e) => setField("enabled", e.target.checked)}
                disabled={busy}
              />
              <span>Enabled</span>
            </label>
            <div className="pm-help">Disabled rules won’t trigger events.</div>
          </div>

          <div className="pm-field">
            <label className="pm-label" htmlFor="ruleInstance">
              Instance ID (optional)
            </label>
            <input
              id="ruleInstance"
              className="pm-input pm-input-mono"
              value={form.instanceId}
              onChange={(e) => setField("instanceId", e.target.value)}
              placeholder="e.g., local-1"
              disabled={busy}
            />
          </div>

          <div className="pm-field">
            <label className="pm-label" htmlFor="ruleSeverity">
              Severity
            </label>
            <select
              id="ruleSeverity"
              className="pm-input"
              value={form.severity}
              onChange={(e) => setField("severity", e.target.value)}
              disabled={busy}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div className="pm-field">
            <label className="pm-label" htmlFor="ruleMetric">
              Metric
            </label>
            <select
              id="ruleMetric"
              className="pm-input"
              value={form.metric}
              onChange={(e) => setField("metric", e.target.value)}
              disabled={busy}
            >
              <option value="slowOpsPerMin">slowOpsPerMin</option>
              <option value="connections">connections</option>
              <option value="opsPerSec">opsPerSec</option>
            </select>
          </div>

          <div className="pm-field" style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, alignItems: "end" }}>
            <div>
              <label className="pm-label" htmlFor="ruleComparator">
                When
              </label>
              <select
                id="ruleComparator"
                className="pm-input"
                value={form.comparator}
                onChange={(e) => setField("comparator", e.target.value)}
                disabled={busy}
              >
                <option value=">">&gt;</option>
                <option value=">=">&gt;=</option>
                <option value="<">&lt;</option>
                <option value="<=">&lt;=</option>
              </select>
            </div>
            <div>
              <label className="pm-label" htmlFor="ruleThreshold">
                Threshold
              </label>
              <input
                id="ruleThreshold"
                className={`pm-input ${errors.threshold ? "is-error" : ""}`}
                value={String(form.threshold)}
                onChange={(e) => setField("threshold", e.target.value)}
                placeholder="e.g., 10"
                disabled={busy}
              />
              {errors.threshold ? <div className="pm-help pm-help-error">{errors.threshold}</div> : null}
            </div>
          </div>

          <div className="pm-field">
            <label className="pm-label" htmlFor="ruleDesc">
              Description (optional)
            </label>
            <textarea
              id="ruleDesc"
              className="pm-textarea"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              placeholder="What does this rule protect against?"
              disabled={busy}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}


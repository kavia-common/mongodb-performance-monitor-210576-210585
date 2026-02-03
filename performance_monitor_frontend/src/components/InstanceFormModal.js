import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";

/**
 * Instance create/edit form in a modal.
 */

// PUBLIC_INTERFACE
export default function InstanceFormModal({ isOpen, mode, initialValue, onSubmit, onClose, busy = false }) {
  /** Form modal for creating/updating a MongoDB instance. */
  const isEdit = mode === "edit";

  const initial = useMemo(
    () => ({
      name: initialValue?.name || "",
      uri: initialValue?.uri || "",
      notes: initialValue?.notes || "",
      enabled: Boolean(initialValue?.enabled),
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

  function validateLocal(draft) {
    const e = {};
    const name = String(draft.name || "").trim();
    if (!name) e.name = "Name is required.";
    if (name.length > 60) e.name = "Name must be 60 characters or less.";

    const uri = String(draft.uri || "").trim();
    if (!uri) e.uri = "MongoDB URI is required.";
    if (uri && !/^mongodb(\+srv)?:\/\//i.test(uri)) e.uri = "URI must start with mongodb:// or mongodb+srv://";

    const notes = String(draft.notes || "");
    if (notes.length > 240) e.notes = "Notes must be 240 characters or less.";

    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const localErrors = validateLocal(form);
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    try {
      await onSubmit?.({
        name: String(form.name).trim(),
        uri: String(form.uri).trim(),
        notes: String(form.notes || ""),
        enabled: Boolean(form.enabled),
      });
    } catch (err) {
      if (err?.name === "ValidationError" && err?.errors) {
        setErrors(err.errors);
        return;
      }
      setErrors({ _form: err?.message || "Something went wrong." });
    }
  }

  return (
    <Modal
      title={isEdit ? "Edit instance" : "Add instance"}
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      footer={
        <div className="pm-row pm-row-right">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="pm-instance-form" className="pm-btn pm-btn-primary" disabled={busy}>
            {busy ? "Saving..." : isEdit ? "Save changes" : "Create instance"}
          </button>
        </div>
      }
    >
      <form id="pm-instance-form" onSubmit={handleSubmit}>
        {errors._form ? <div className="pm-alert pm-alert-error">{errors._form}</div> : null}

        <div className="pm-form-grid">
          <div className="pm-field">
            <label className="pm-label" htmlFor="instName">
              Name
            </label>
            <input
              id="instName"
              className={`pm-input ${errors.name ? "is-error" : ""}`}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g., Prod Atlas Cluster"
              autoFocus
              disabled={busy}
            />
            {errors.name ? <div className="pm-help pm-help-error">{errors.name}</div> : null}
          </div>

          <div className="pm-field">
            <label className="pm-label" htmlFor="instUri">
              MongoDB URI
            </label>
            <input
              id="instUri"
              className={`pm-input pm-input-mono ${errors.uri ? "is-error" : ""}`}
              value={form.uri}
              onChange={(e) => setField("uri", e.target.value)}
              placeholder="mongodb://host:27017"
              disabled={busy}
            />
            {errors.uri ? <div className="pm-help pm-help-error">{errors.uri}</div> : null}
          </div>

          <div className="pm-field">
            <label className="pm-label" htmlFor="instNotes">
              Notes (optional)
            </label>
            <textarea
              id="instNotes"
              className={`pm-textarea ${errors.notes ? "is-error" : ""}`}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Anything helpful for your team..."
              rows={3}
              disabled={busy}
            />
            {errors.notes ? <div className="pm-help pm-help-error">{errors.notes}</div> : null}
          </div>

          <div className="pm-field">
            <label className="pm-checkbox">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setField("enabled", e.target.checked)}
                disabled={busy}
              />
              <span>Enabled for monitoring</span>
            </label>
            <div className="pm-help">Disabled instances stay configured but won’t be polled/streamed.</div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

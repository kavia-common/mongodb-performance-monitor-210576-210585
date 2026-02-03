import React, { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import InstanceFormModal from "../components/InstanceFormModal";
import { createInstance, deleteInstance, listInstances, updateInstance } from "../lib/instancesService";

/**
 * Instances CRUD UI.
 * Uses a mock in-memory store by default until backend endpoints exist.
 */

// PUBLIC_INTERFACE
export default function InstancesPage() {
  /** List/add/edit/delete MongoDB instances with basic validation and retro theme UI. */
  const [state, setState] = useState({
    status: "idle", // idle|loading|ready|error
    items: [],
    error: null,
  });

  const [formModal, setFormModal] = useState({ open: false, mode: "create", item: null });
  const [confirm, setConfirm] = useState({ open: false, item: null });
  const [busy, setBusy] = useState(false);

  async function reload() {
    setState((s) => ({ ...s, status: "loading", error: null }));
    try {
      const data = await listInstances();
      setState({ status: "ready", items: data.items || [], error: null });
    } catch (err) {
      setState({ status: "error", items: [], error: err?.message || "Failed to load instances." });
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const enabledCount = useMemo(() => state.items.filter((x) => x.enabled).length, [state.items]);

  function openCreate() {
    setFormModal({ open: true, mode: "create", item: null });
  }

  function openEdit(item) {
    setFormModal({ open: true, mode: "edit", item });
  }

  function openDelete(item) {
    setConfirm({ open: true, item });
  }

  async function handleSubmit(draft) {
    setBusy(true);
    try {
      if (formModal.mode === "edit" && formModal.item?.id) {
        await updateInstance(formModal.item.id, draft);
      } else {
        await createInstance(draft);
      }
      setFormModal({ open: false, mode: "create", item: null });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!confirm.item?.id) return;
    setBusy(true);
    try {
      await deleteInstance(confirm.item.id);
      setConfirm({ open: false, item: null });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pm-card">
      <div className="pm-page-header">
        <div>
          <div className="pm-kicker">Instances</div>
          <h1 style={{ marginTop: 0 }}>MongoDB Instances</h1>
          <p style={{ marginTop: 10 }}>
            Add and manage MongoDB connection targets. This UI currently uses a{" "}
            <strong>mock data store</strong> by default until backend endpoints are added.
          </p>
        </div>

        <div className="pm-row pm-row-right">
          <div className="pm-stat" aria-label="Instance stats">
            <div className="pm-stat-label">Enabled</div>
            <div className="pm-stat-value">
              {enabledCount}/{state.items.length}
            </div>
          </div>
          <button type="button" className="pm-btn pm-btn-primary" onClick={openCreate}>
            + Add instance
          </button>
        </div>
      </div>

      {state.status === "error" ? <div className="pm-alert pm-alert-error">{state.error}</div> : null}

      <div className="pm-table-wrap" style={{ marginTop: 14 }}>
        <table className="pm-table" aria-label="Instances table">
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Name</th>
              <th>URI</th>
              <th style={{ width: "18%" }}>Status</th>
              <th style={{ width: 160, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.status === "loading" ? (
              <tr>
                <td colSpan={4} className="pm-muted">
                  Loading instances...
                </td>
              </tr>
            ) : null}

            {state.status !== "loading" && state.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="pm-muted">
                  No instances yet. Click <strong>Add instance</strong> to create one.
                </td>
              </tr>
            ) : null}

            {state.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="pm-cell-title">{item.name}</div>
                  {item.notes ? <div className="pm-cell-subtitle">{item.notes}</div> : null}
                </td>
                <td>
                  <code className="pm-code">{item.uri}</code>
                </td>
                <td>
                  {item.enabled ? (
                    <span className="pm-badge pm-badge-success">Enabled</span>
                  ) : (
                    <span className="pm-badge">Disabled</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="pm-row pm-row-right">
                    <button type="button" className="pm-btn pm-btn-ghost" onClick={() => openEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="pm-btn pm-btn-danger" onClick={() => openDelete(item)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InstanceFormModal
        isOpen={formModal.open}
        mode={formModal.mode}
        initialValue={formModal.item}
        onSubmit={handleSubmit}
        onClose={() => (busy ? null : setFormModal({ open: false, mode: "create", item: null }))}
        busy={busy}
      />

      <ConfirmDialog
        isOpen={confirm.open}
        title="Delete instance?"
        message={
          confirm.item ? (
            <>
              This will remove <strong>{confirm.item.name}</strong> from your configured instances. This action cannot
              be undone.
            </>
          ) : (
            "This action cannot be undone."
          )
        }
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => (busy ? null : setConfirm({ open: false, item: null }))}
        busy={busy}
      />
    </div>
  );
}

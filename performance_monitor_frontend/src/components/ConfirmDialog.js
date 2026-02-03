import React from "react";
import Modal from "./Modal";

// PUBLIC_INTERFACE
export default function ConfirmDialog({
  isOpen,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger", // "danger" | "default"
  onConfirm,
  onCancel,
  busy = false,
}) {
  /** Generic confirm dialog used for destructive actions. */
  const confirmClass = tone === "danger" ? "pm-btn pm-btn-danger" : "pm-btn pm-btn-primary";

  return (
    <Modal
      title={title}
      isOpen={isOpen}
      onClose={busy ? undefined : onCancel}
      footer={
        <div className="pm-row pm-row-right">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm} disabled={busy}>
            {busy ? "Working..." : confirmText}
          </button>
        </div>
      }
    >
      <p style={{ marginTop: 0, color: "rgba(17,24,39,0.72)", lineHeight: 1.5 }}>{message}</p>
    </Modal>
  );
}

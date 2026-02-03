import React, { useEffect } from "react";

/**
 * Lightweight modal (no portal) that matches the app's retro styling.
 * Handles ESC-to-close and basic focus semantics.
 */

// PUBLIC_INTERFACE
export default function Modal({ title, children, isOpen, onClose, footer }) {
  /** Generic modal wrapper. */
  useEffect(() => {
    if (!isOpen) return undefined;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="pm-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="pm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="pm-modal-header">
          <div className="pm-modal-title">{title}</div>
          <button type="button" className="pm-btn pm-btn-ghost" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className="pm-modal-body">{children}</div>

        {footer ? <div className="pm-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

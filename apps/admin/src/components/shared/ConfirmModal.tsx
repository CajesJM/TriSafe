import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { createPortal } from "react-dom";

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  tone = "danger",
  onConfirm,
  onCancel,
  onError,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "warning";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  onError?: (message: string) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const confirmButton = useRef<HTMLButtonElement>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    confirmButton.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !working) onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel, working]);

  async function confirm() {
    setWorking(true);
    setError("");
    try {
      await onConfirm();
      onCancel();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The requested action could not be completed.";
      setError(message);
      onError?.(message);
      setWorking(false);
    }
  }

  const Icon = tone === "danger" ? AlertTriangle : HelpCircle;
  return createPortal(
    <div
      className="confirm-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !working) onCancel();
      }}
    >
      <section
        className={`confirm-modal ${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <button className="confirm-modal-close" type="button" onClick={onCancel} disabled={working} aria-label="Close confirmation">
          <X size={17} />
        </button>
        <span className="confirm-modal-icon"><Icon size={22} /></span>
        <div className="confirm-modal-copy">
          <p className="eyebrow">PLEASE CONFIRM</p>
          <h3 id={titleId}>{title}</h3>
          <p id={descriptionId}>{message}</p>
        </div>
        {error && <div className="confirm-modal-error" role="alert">{error}</div>}
        <div className="confirm-modal-actions">
          <button className="secondary" type="button" onClick={onCancel} disabled={working}>Cancel</button>
          <button ref={confirmButton} className={`confirm-action ${tone}`} type="button" onClick={() => void confirm()} disabled={working}>
            {working ? "Processing…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

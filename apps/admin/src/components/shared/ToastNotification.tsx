import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

export type ToastMessage = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

export function ToastNotification({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const manualDismissTimer = useRef<number | null>(null);

  useEffect(() => {
    const closeAnimation = window.setTimeout(() => setClosing(true), 3_550);
    const dismiss = window.setTimeout(onDismiss, 4_000);
    return () => {
      window.clearTimeout(closeAnimation);
      window.clearTimeout(dismiss);
      if (manualDismissTimer.current !== null)
        window.clearTimeout(manualDismissTimer.current);
    };
  }, [onDismiss]);

  const dismissNow = useCallback(() => {
    if (closing) return;
    setClosing(true);
    manualDismissTimer.current = window.setTimeout(onDismiss, 420);
  }, [closing, onDismiss]);

  const Icon = toast.type === "success"
    ? CheckCircle2
    : toast.type === "error"
      ? CircleAlert
      : Info;

  return createPortal(
    <div
      className={`app-toast ${toast.type} ${closing ? "closing" : ""}`}
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <span className="app-toast-icon"><Icon size={18} /></span>
      <div>
        <strong>{toast.type === "success" ? "Success" : toast.type === "error" ? "Action unsuccessful" : "Information"}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" onClick={dismissNow} aria-label="Dismiss notification">
        <X size={15} />
      </button>
      <i aria-hidden="true" />
    </div>,
    document.body,
  );
}

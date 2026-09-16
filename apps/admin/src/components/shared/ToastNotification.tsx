import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  variant = "default",
}: {
  toast: ToastMessage;
  onDismiss: () => void;
  variant?: "default" | "dashboard";
}) {
  const [closing, setClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStart = useRef<number | null>(null);
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

  const Icon =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
        ? CircleAlert
        : Info;

  function beginSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continueSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStart.current !== null)
      setDragOffset(event.clientX - dragStart.current);
  }

  function finishSwipe() {
    if (Math.abs(dragOffset) >= 80) onDismiss();
    else setDragOffset(0);
    dragStart.current = null;
  }

  if (variant === "dashboard") {
    const tone = toast.type === "info" ? "warning" : toast.type;
    return createPortal(
      <div className="analytics-toast-region" aria-live="polite">
        <div className="analytics-toast-entry">
          <div
            className={`analytics-toast analytics-toast-${tone}`}
            onPointerCancel={finishSwipe}
            onPointerDown={beginSwipe}
            onPointerMove={continueSwipe}
            onPointerUp={finishSwipe}
            role={toast.type === "error" ? "alert" : "status"}
            style={{ transform: `translateX(${dragOffset}px)` }}
          >
            <span className="analytics-toast-icon">
              <Icon aria-hidden="true" />
            </span>
            <div>
              <strong>
                {toast.type === "success"
                  ? "Success"
                  : toast.type === "error"
                    ? "Unable to continue"
                    : "Information"}
              </strong>
              <p>{toast.message}</p>
            </div>
            <button
              aria-label="Dismiss notification"
              onClick={onDismiss}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      className={`app-toast ${toast.type} ${closing ? "closing" : ""}`}
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <span className="app-toast-icon">
        <Icon size={18} />
      </span>
      <div>
        <strong>
          {toast.type === "success"
            ? "Success"
            : toast.type === "error"
              ? "Action unsuccessful"
              : "Information"}
        </strong>
        <p>{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={dismissNow}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
      <i aria-hidden="true" />
    </div>,
    document.body,
  );
}

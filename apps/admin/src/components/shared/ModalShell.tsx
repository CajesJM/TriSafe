import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export function ModalShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  onClose,
  busy = false,
  size = "medium",
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  busy?: boolean;
  size?: "small" | "medium" | "large";
  className?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [busy, onClose]);

  return createPortal(
    <div
      className="dashboard-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={`dashboard-modal dashboard-modal-${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="dashboard-modal-header">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={`Close ${title}`}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="dashboard-modal-body">{children}</div>
        {footer && <footer className="dashboard-modal-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

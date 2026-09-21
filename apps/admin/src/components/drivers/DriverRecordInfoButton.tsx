import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

export function DriverRecordInfoButton({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const control = useRef<HTMLDivElement>(null);
  const informationId = useId();

  useEffect(() => {
    if (!open || closing) return;
    const timer = window.setTimeout(() => setClosing(true), 5_000);
    function closeOutside(event: PointerEvent) {
      if (!control.current?.contains(event.target as Node)) setClosing(true);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open, closing]);

  return (
    <div className="driver-record-info-control" ref={control}>
      <button
        type="button"
        aria-label="Show registration record information"
        aria-expanded={open && !closing}
        aria-controls={informationId}
        onClick={() => {
          if (open) {
            setClosing(true);
            return;
          }
          setClosing(false);
          setOpen(true);
        }}
      >
        <Info aria-hidden="true" />
      </button>
      {open && (
        <div
          id={informationId}
          className={`driver-record-info-popover${closing ? " closing" : ""}`}
          role="status"
          onAnimationEnd={() => {
            if (!closing) return;
            setOpen(false);
            setClosing(false);
          }}
        >
          <strong>{title}</strong>
          <p>{children}</p>
        </div>
      )}
    </div>
  );
}

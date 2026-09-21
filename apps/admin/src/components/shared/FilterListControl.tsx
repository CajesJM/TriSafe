import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, ListFilter } from "lucide-react";

export function FilterListControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!controlRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`rating-sort-control directory-filter-control ${className}`} ref={controlRef}>
      <button
        ref={buttonRef}
        className="rating-list-control"
        type="button"
        aria-label={`${label}: ${options.find((option) => option.value === value)?.label ?? value}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <ListFilter aria-hidden="true" />
        {options.find((option) => option.value === value)?.label ?? value}
        <ChevronDown className="rating-sort-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="rating-sort-menu" id={menuId} aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={value === option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                buttonRef.current?.focus();
              }}
            >
              {option.label}
              {value === option.value && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

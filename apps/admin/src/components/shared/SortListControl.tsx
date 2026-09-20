import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownUp, Check, ChevronDown } from "lucide-react";

type SortOption<T extends string> = { value: T; label: string };

export const directorySortOptions = [
  { value: "NEWEST", label: "Newest first" },
  { value: "OLDEST", label: "Oldest first" },
  { value: "NAME_ASC", label: "Name: A–Z" },
  { value: "NAME_DESC", label: "Name: Z–A" },
] as const;

export type DirectorySort = (typeof directorySortOptions)[number]["value"];

export function SortListControl<T extends string>({
  label,
  value,
  defaultValue,
  options,
  onChange,
}: {
  label: string;
  value: T;
  defaultValue: T;
  options: readonly SortOption<T>[];
  onChange: (value: T) => void;
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
    <div
      className="rating-sort-control directory-sort-control"
      ref={controlRef}
    >
      <button
        ref={buttonRef}
        className="rating-list-control"
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <ArrowDownUp aria-hidden="true" />
        {value === defaultValue
          ? "Sort list"
          : options.find((option) => option.value === value)?.label}
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

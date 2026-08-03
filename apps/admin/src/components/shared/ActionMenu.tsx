import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";

export type ActionMenuItem = {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
};

export type ActionMenuGroup = {
  label: string;
  items: ActionMenuItem[];
};

export function ActionMenu({
  label,
  groups,
}: {
  label: string;
  groups: ActionMenuGroup[];
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  }>({ right: 0 });

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const opensUpward =
      window.innerHeight - rect.bottom < 310 && rect.top > 310;
    setPosition({
      ...(opensUpward
        ? { bottom: window.innerHeight - rect.top + 7 }
        : { top: rect.bottom + 7 }),
      right: Math.max(10, window.innerWidth - rect.right),
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
    function closeOnOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      )
        setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function closeOnViewportChange() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        className="row-action action-menu-trigger"
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
      >
        <MoreHorizontal aria-hidden="true" /> More
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="action-menu-popover"
            style={position}
            role="menu"
            aria-label={label}
          >
            {groups
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <section className="action-menu-group" key={group.label}>
                  <span>{group.label}</span>
                  {group.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      className={item.tone === "danger" ? "danger" : ""}
                      disabled={item.disabled}
                      onClick={() => {
                        setOpen(false);
                        item.onSelect();
                      }}
                    >
                      <i aria-hidden="true">{item.icon}</i>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </section>
              ))}
          </div>,
          document.body,
        )}
    </>
  );
}

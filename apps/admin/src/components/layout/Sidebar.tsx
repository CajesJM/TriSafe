import { Tab } from "../../types/admin";

export function Sidebar({
  tab,
  onChange,
  onLogout,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">✓</span>
        <div>
          <strong>TriSafe</strong>
          <small>Trinidad, Bohol</small>
        </div>
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        {(
          [
            "overview",
            "drivers",
            "fares",
            "announcements",
            "incidents",
            "audit",
          ] as Tab[]
        ).map((item) => (
          <button
            className={tab === item ? "active" : ""}
            onClick={() => onChange(item)}
            key={item}
            type="button"
          >
            <span className="nav-icon">
              {item === "overview"
                ? "⌂"
                : item === "drivers"
                  ? "♙"
                  : item === "fares"
                    ? "₱"
                    : item === "announcements"
                      ? "✉"
                      : item === "incidents"
                        ? "!"
                        : "◷"}
            </span>
            {item === "overview"
              ? "Dashboard"
              : item === "drivers"
                ? "Drivers & QR"
                : item === "fares"
                  ? "Fare matrix"
                  : item === "announcements"
                    ? "Announcements"
                  : item === "incidents"
                    ? "Incident review"
                    : "Audit trail"}
          </button>
        ))}
      </nav>
      <div className="aside-note">
        <b>LGU workspace</b>
        <span>Verified transport operations</span>
        <button className="logout-button" onClick={onLogout} type="button">
          Sign out
        </button>
      </div>
    </aside>
  );
}

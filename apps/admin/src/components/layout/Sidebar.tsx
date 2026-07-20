import type { Tab } from "../../types/admin";

type SidebarProps = {
  tab: Tab;
  open: boolean;
  incidentCount: number;
  onChange: (tab: Tab) => void;
  onClose: () => void;
  onLogout: () => void;
};
type NavItem = { tab: Tab; icon: string; label: string };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "OVERVIEW",
    items: [
      { tab: "overview", icon: "▦", label: "Dashboard" },
      { tab: "users", icon: "♙", label: "Users & roles" },
    ],
  },
  {
    label: "TRANSPORT REGISTRY",
    items: [
      { tab: "drivers", icon: "◫", label: "Drivers & QR" },
      { tab: "fares", icon: "₱", label: "Fare matrix" },
    ],
  },
  {
    label: "SAFETY & COMPLIANCE",
    items: [
      { tab: "incidents", icon: "!", label: "Incident review" },
      { tab: "announcements", icon: "✉", label: "Announcements" },
      { tab: "audit", icon: "◷", label: "Audit trail" },
    ],
  },
];

export function Sidebar({
  tab,
  open,
  incidentCount,
  onChange,
  onClose,
  onLogout,
}: SidebarProps) {
  function select(nextTab: Tab) {
    onChange(nextTab);
    onClose();
  }
  return (
    <>
      <button
        className={`sidebar-backdrop ${open ? "visible" : ""}`}
        onClick={onClose}
        type="button"
        aria-label="Close navigation"
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <strong>TriSafe</strong>
            <small>LGU Admin Portal</small>
          </div>
          <button
            className="sidebar-close"
            onClick={onClose}
            type="button"
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>
        <nav className="main-nav" aria-label="Admin navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <button
                  className={tab === item.tab ? "active" : ""}
                  aria-current={tab === item.tab ? "page" : undefined}
                  key={item.tab}
                  onClick={() => select(item.tab)}
                  type="button"
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.tab === "incidents" && incidentCount > 0 && (
                    <em>{incidentCount}</em>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="aside-note">
          <div className="system-indicator">
            <span />
            <div>
              <strong>System connected</strong>
              <small>Live PostgreSQL data</small>
            </div>
          </div>
          <button className="logout-button" onClick={onLogout} type="button">
            <span aria-hidden="true">↪</span> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

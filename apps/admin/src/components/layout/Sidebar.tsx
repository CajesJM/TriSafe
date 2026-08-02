import type { Tab } from "../../types/admin";
import {
  Activity,
  Banknote,
  CarFront,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

type SidebarProps = {
  tab: Tab;
  open: boolean;
  incidentCount: number;
  onChange: (tab: Tab) => void;
  onClose: () => void;
  onLogout: () => void;
};
type NavItem = { tab: Tab; icon: LucideIcon; label: string };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "OVERVIEW",
    items: [
      { tab: "overview", icon: LayoutDashboard, label: "Dashboard" },
      { tab: "users", icon: UsersRound, label: "Accounts & access" },
    ],
  },
  {
    label: "TRANSPORT REGISTRY",
    items: [
      { tab: "drivers", icon: CarFront, label: "Drivers & QR" },
      { tab: "fares", icon: Banknote, label: "Fare matrix" },
    ],
  },
  {
    label: "SAFETY & COMPLIANCE",
    items: [
      { tab: "incidents", icon: ShieldAlert, label: "Incident review" },
      { tab: "announcements", icon: Megaphone, label: "Announcements" },
      { tab: "audit", icon: ClipboardList, label: "Audit trail" },
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
          <div className="brand-mark" aria-hidden="true"><ShieldCheck size={22} strokeWidth={2.4} /></div>
          <div>
            <strong>TriSafe</strong>
            <small>Administrator Portal</small>
          </div>
          <button
            className="sidebar-close"
            onClick={onClose}
            type="button"
            aria-label="Close navigation"
          >
            <X size={20} />
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
                  <span className="nav-icon" aria-hidden="true"><item.icon size={18} strokeWidth={2} /></span>
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
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

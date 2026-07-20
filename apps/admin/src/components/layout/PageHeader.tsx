import type { SessionUser } from "../../api";
import type { Tab } from "../../types/admin";

const titleByTab: Record<Tab, string> = {
  overview: "Operations dashboard",
  users: "Users and access",
  drivers: "Drivers and vehicles",
  fares: "Official fare matrix",
  announcements: "Driver announcements",
  incidents: "Incident review",
  audit: "Activity audit trail",
};

const hintByTab: Record<Tab, string> = {
  overview:
    "Monitor registered transport activity and items needing LGU action.",
  users:
    "View passenger, driver, and administrator accounts and their current roles.",
  drivers:
    "Manage approved drivers, franchises, vehicles, and LGU-issued QR identities.",
  fares: "Maintain the official route rules used for passenger fare estimates.",
  announcements:
    "Send renewal reminders and safety advisories to verified drivers.",
  incidents: "Review passenger reports and record the final LGU decision.",
  audit: "Trace recent administrative and safety actions recorded by the API.",
};

type Props = {
  tab: Tab;
  user: SessionUser | null;
  openIncidents: number;
  refreshing: boolean;
  onMenu: () => void;
  onRefresh: () => void;
};

export function PageHeader({
  tab,
  user,
  openIncidents,
  refreshing,
  onMenu,
  onRefresh,
}: Props) {
  return (
    <header className="page-header">
      <div className="topbar">
        <button
          className="menu-button"
          onClick={onMenu}
          type="button"
          aria-label="Open navigation"
        >
          ☰
        </button>
        <div className="breadcrumb">
          <span>TriSafe</span>
          <b>/</b>
          <strong>{titleByTab[tab]}</strong>
        </div>
        <div className="header-actions">
          <time className="current-date" dateTime={new Date().toISOString()}>
            {new Date().toLocaleDateString("en-PH", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </time>
          <button
            className="refresh-button"
            disabled={refreshing}
            onClick={onRefresh}
            type="button"
          >
            <span aria-hidden="true">↻</span>
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
          <div className="profile">
            <span>{initials(user?.fullName ?? "LGU Administrator")}</span>
            <div>
              <strong>{user?.fullName ?? "LGU Administrator"}</strong>
              <small>{user?.email ?? "Authorized account"}</small>
            </div>
          </div>
        </div>
      </div>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">TRINIDAD LGU · TRANSPORT SAFETY</p>
          <h1>{titleByTab[tab]}</h1>
          <p>{hintByTab[tab]}</p>
        </div>
        {tab === "incidents" && openIncidents > 0 && (
          <span className="attention-chip">
            {openIncidents} awaiting action
          </span>
        )}
      </div>
    </header>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

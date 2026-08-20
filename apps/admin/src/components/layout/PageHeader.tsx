import type { SessionUser } from "../../api";
import type { Tab } from "../../types/admin";
import { Menu, UserRound } from "lucide-react";

const titleByTab: Record<Tab, string> = {
  overview: "Dashboard",
  passengers: "Passenger Management",
  administrators: "Administrator Management",
  drivers: "Registered Driver Management",
  fares: "Fare Matrix Management",
  announcements: "Announcement Management",
  incidents: "Incident Report Management",
  violations: "Violation & Penalty Management",
  ratings: "Rating Management",
  terms: "Terms & Conditions Management",
  settings: "Administrator Account Settings",
  audit: "Audit Trail",
};

const hintByTab: Record<Tab, string> = {
  overview:
    "Monitor registered transport activity and items needing LGU action.",
  passengers:
    "Register, review, update, search, filter, activate, deactivate, and manage Passenger accounts.",
  administrators:
    "Manage authorized BPLO Administrator accounts responsible for operating and maintaining TriSafe.",
  drivers:
    "Manage verified drivers, owner records, vehicles, franchises, credentials, and BPLO-issued QR identities.",
  fares:
    "Configure vehicle rates, inspect live locations, and monitor fare transparency.",
  announcements:
    "Create and manage official announcements delivered to registered Drivers.",
  incidents: "Review transportation-related incident reports, evidence, and administrative responses.",
  violations: "Record and manage driver violations and corresponding penalties.",
  ratings: "Review driver rating statistics and rating records generated through TriSafe.",
  terms: "Manage the official terms and conditions presented to TriSafe users.",
  settings: "Manage your BPLO Administrator profile and account-related settings.",
  audit: "Trace recent administrative and safety actions recorded by the API.",
};

type Props = {
  tab: Tab;
  user: SessionUser | null;
  openIncidents: number;
  onMenu: () => void;
  onProfile: () => void;
};

export function PageHeader({
  tab,
  user,
  openIncidents,
  onMenu,
  onProfile,
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
          <Menu size={19} />
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
            className="profile profile-button"
            type="button"
            onClick={onProfile}
            aria-label="Open administrator profile"
          >
            {user?.avatarData ? (
              <img src={user.avatarData} alt="" />
            ) : (
              <span>{initials(user?.fullName ?? "Administrator")}</span>
            )}
            <div>
              <strong>{user?.fullName ?? "Administrator"}</strong>
              <small>
                {user?.username
                  ? `@${user.username}`
                  : (user?.email ?? "Authorized account")}
              </small>
            </div>
          </button>
        </div>
      </div>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">TRINIDAD BPLO · TRANSPORT SAFETY</p>
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

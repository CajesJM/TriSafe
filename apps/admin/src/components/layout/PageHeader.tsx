import { useEffect, useRef, useState } from "react";
import { api, type GlobalSearchResult, type SessionUser } from "../../api";
import type { Tab } from "../../types/admin";
import {
  ArrowUpRight,
  Banknote,
  Bell,
  CarFront,
  ClipboardCheck,
  FileText,
  History,
  LoaderCircle,
  Megaphone,
  Menu,
  Search,
  ShieldAlert,
  Star,
  UserRound,
} from "lucide-react";

function SearchResultIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "Passenger":
    case "Administrator":
      return <UserRound aria-hidden="true" />;
    case "Driver":
      return <CarFront aria-hidden="true" />;
    case "Incident report":
    case "Violation":
      return <ShieldAlert aria-hidden="true" />;
    case "Driver rating":
      return <Star aria-hidden="true" />;
    case "Announcement":
      return <Megaphone aria-hidden="true" />;
    case "Terms document":
      return <FileText aria-hidden="true" />;
    case "Fare policy":
      return <Banknote aria-hidden="true" />;
    case "Audit record":
      return <History aria-hidden="true" />;
    default:
      return <ClipboardCheck aria-hidden="true" />;
  }
}

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
  onNavigate: (tab: Tab) => void;
};

export function PageHeader({
  tab,
  user,
  openIncidents,
  onMenu,
  onProfile,
  onNavigate,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }
    let active = true;
    setSearching(true);
    setSearchError("");
    const timer = window.setTimeout(() => {
      api
        .globalSearch(normalized)
        .then((response) => {
          if (active) setResults(response.items);
        })
        .catch((error: Error) => {
          if (active) {
            setResults([]);
            setSearchError(error.message);
          }
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setAlertsOpen(false);
        setSearchOpen(true);
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setAlertsOpen(false);
      }
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!searchRef.current?.contains(target)) setSearchOpen(false);
      if (!alertsRef.current?.contains(target)) setAlertsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setAlertsOpen(false);
  }, [tab]);

  function openResult(result: GlobalSearchResult) {
    onNavigate(result.tab);
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <header
      className={`page-header${tab === "overview" || tab === "passengers" ? " page-header-dashboard" : ""}`}
    >
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
          <div className="global-search" ref={searchRef}>
            <Search aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                setAlertsOpen(false);
                setSearchOpen(true);
              }}
              type="search"
              placeholder="Search TriSafe records"
              aria-label="Search the TriSafe admin system"
              aria-expanded={searchOpen}
              aria-controls="global-search-results"
            />
            <kbd>Ctrl K</kbd>
            {searchOpen && (
              <div
                className="global-search-panel"
                id="global-search-results"
                aria-live="polite"
              >
                {query.trim().length < 2 ? (
                  <div className="global-search-message search-idle-message">
                    <span className="search-state-icon" aria-hidden="true">
                      <Search />
                    </span>
                    <div>
                      <strong>Search all TriSafe records</strong>
                      <span>Enter at least two characters to begin.</span>
                    </div>
                  </div>
                ) : searching ? (
                  <div className="global-search-message">
                    <span className="search-state-loader" aria-hidden="true">
                      <LoaderCircle />
                    </span>
                    <div><strong>Searching TriSafe…</strong><span>Checking all administrator workspaces.</span></div>
                  </div>
                ) : searchError ? (
                  <div className="global-search-message search-error">
                    <ShieldAlert aria-hidden="true" />
                    <div><strong>Search is unavailable</strong><span>{searchError}</span></div>
                  </div>
                ) : results.length ? (
                  <div className="global-search-list">
                    <div className="global-search-list-heading">
                      <div>
                        <strong>Search results</strong>
                        <span>Across all TriSafe records</span>
                      </div>
                      <small>{results.length} found</small>
                    </div>
                    {results.map((result) => (
                      <button
                        key={`${result.tab}-${result.id}`}
                        type="button"
                        onClick={() => openResult(result)}
                      >
                        <span
                          className={`search-result-icon search-result-icon-${result.tab}`}
                        >
                          <SearchResultIcon kind={result.kind} />
                        </span>
                        <span className="search-result-copy">
                          <span className="search-result-kind">{result.kind}</span>
                          <strong>{result.title}</strong>
                          <small>{result.subtitle}</small>
                        </span>
                        <ArrowUpRight aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="global-search-message">
                    <Search aria-hidden="true" />
                    <div>
                      <strong>No matching records</strong>
                      <span>Try a name, username, plate number, report, or policy version.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="admin-alerts" ref={alertsRef}>
            <button
              className="admin-alert-button"
              type="button"
              aria-label={`Open notifications${openIncidents ? `, ${openIncidents} unread` : ""}`}
              aria-expanded={alertsOpen}
              onClick={() => {
                setSearchOpen(false);
                setAlertsOpen((open) => !open);
              }}
            >
              <Bell aria-hidden="true" />
              {openIncidents > 0 && <span>{openIncidents > 99 ? "99+" : openIncidents}</span>}
            </button>
            {alertsOpen && (
              <div className="admin-alert-panel">
                <div className="admin-alert-heading">
                  <div><strong>Notifications</strong><span>Operational alerts</span></div>
                  {openIncidents > 0 && <small>{openIncidents} unread</small>}
                </div>
                {openIncidents > 0 ? (
                  <button
                    className="admin-alert-item"
                    type="button"
                    onClick={() => {
                      onNavigate("incidents");
                      setAlertsOpen(false);
                    }}
                  >
                    <span><ShieldAlert aria-hidden="true" /></span>
                    <div>
                      <strong>Incident reports need review</strong>
                      <small>{openIncidents} {openIncidents === 1 ? "report is" : "reports are"} awaiting LGU action.</small>
                    </div>
                    <ArrowUpRight aria-hidden="true" />
                  </button>
                ) : (
                  <div className="admin-alert-empty">
                    <Bell aria-hidden="true" />
                    <strong>You’re all caught up</strong>
                    <span>No operational alerts require attention.</span>
                  </div>
                )}
              </div>
            )}
          </div>

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
      {tab !== "overview" && tab !== "passengers" && (
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
      )}
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

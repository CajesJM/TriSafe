import { useEffect, useId, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CarFront,
  FileText,
  FileWarning,
  Gauge,
  Route,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { api, type Driver, type DriverOperationalProfile } from "../../api";
import { displayPersonName } from "../../utils/personName";

export function DriverProfileModal({
  driver,
  onClose,
  onEditFranchise,
  onViewRegistrationFile,
}: {
  driver: Driver;
  onClose: () => void;
  onEditFranchise: () => void;
  onViewRegistrationFile: () => void;
}) {
  const titleId = useId();
  const [profile, setProfile] = useState<DriverOperationalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const vehicle = driver.vehicles[0];
  const accountStatus = driver.accountStatus ?? "ACTIVE";
  const operationalStatus = driver.franchise?.status ?? driver.verification;
  const renewal = franchiseRenewalInfo(driver.franchise?.expiresAt);
  const restricted =
    accountStatus !== "ACTIVE" || operationalStatus !== "VERIFIED";
  const qrState = vehicle?.qrCode?.token
    ? !restricted
      ? "Issued · eligible"
      : "Issued · ride blocked"
    : "Not issued";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .driverOperationalProfile(driver.id)
      .then((result) => active && setProfile(result))
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load driver activity.",
          );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [driver.id]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const metrics = profile?.metrics;
  const completionRate = metrics?.totalRides
    ? Math.round((metrics.completedRides / metrics.totalRides) * 100)
    : 0;

  return createPortal(
    <div
      className="driver-profile-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="driver-profile-modal driver-operations-profile driver-op-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="driver-op-hero">
          <div className="driver-op-brandline">
            TRISAFE <i /> DRIVER OPERATIONS
          </div>
          <button
            className="driver-op-close"
            type="button"
            onClick={onClose}
            aria-label="Close driver profile"
          >
            <X />
          </button>
          <div className="driver-op-identity">
            <span className="driver-op-avatar">
              {driver.avatarData ? (
                <img
                  src={driver.avatarData}
                  alt={`${displayPersonName(driver.fullName)} profile`}
                />
              ) : (
                initials(driver.fullName)
              )}
            </span>
            <div>
              <span className="driver-op-kicker">
                DRIVER OPERATIONAL PROFILE
              </span>
              <h2 id={titleId}>{displayPersonName(driver.fullName)}</h2>
              <p>
                @{driver.username ?? "not-assigned"} <i />{" "}
                {vehicleTypeLabel(vehicle?.vehicleType)} driver
              </p>
              <strong>
                {driver.id} <i />{" "}
                {vehicle?.plateNumber ?? "Vehicle not assigned"}
              </strong>
            </div>
          </div>
          <div className="driver-op-hero-state">
            <div>
              <StatusPill value={operationalStatus} icon={<AlertTriangle />} />
              <StatusPill value={accountStatus} icon={<ShieldCheck />} />
            </div>
            <p>
              {renewal.detail}
              <br />
              {restricted
                ? "Rides currently blocked"
                : "Eligible for verified rides"}
            </p>
          </div>
          <div
            className="driver-op-community"
            aria-label="TriSafe safe transport"
          >
            <span>
              Safer rides
              <br />
              Stronger communities
            </span>
            <ShieldCheck />
            <strong>TriSafe</strong>
          </div>
        </header>

        {restricted && (
          <div className="driver-op-alert" role="status">
            <AlertTriangle />
            <strong>Operational restrictions applied.</strong>
            <span>{restrictionMessage(accountStatus, operationalStatus)}</span>
            <button type="button" onClick={onEditFranchise}>
              Review franchise <span aria-hidden="true">→</span>
            </button>
          </div>
        )}

        <section
          className="driver-op-summary"
          aria-label="Current driver status"
        >
          <SummaryCard
            icon={<UserRound />}
            label="Account access"
            value={titleCase(accountStatus)}
            note={
              accountStatus === "ACTIVE"
                ? "Driver can sign in."
                : "Driver cannot log in."
            }
            tone={accountStatus === "ACTIVE" ? "positive" : "danger"}
            status
          />
          <SummaryCard
            icon={<FileWarning />}
            label="Transport eligibility"
            value={titleCase(operationalStatus)}
            note={
              operationalStatus === "VERIFIED"
                ? "Franchise is active."
                : "Franchise is not active."
            }
            tone={operationalStatus === "VERIFIED" ? "positive" : "danger"}
            status
          />
          <SummaryCard
            icon={<CarFront />}
            label="Registered vehicle"
            value={
              vehicle?.bodyNumber ??
              vehicle?.permitNumber ??
              vehicle?.plateNumber ??
              "Not assigned"
            }
            note={vehicleTypeLabel(vehicle?.vehicleType)}
            tone="positive"
          />
          <SummaryCard
            icon={<CalendarDays />}
            label="Franchise renewal"
            value={renewal.label}
            note={renewal.shortDetail}
            tone={renewal.tone}
            status
          />
        </section>

        {error && (
          <div className="driver-profile-load-error" role="alert">
            {error}
          </div>
        )}

        <main className="driver-op-content">
          <section className="driver-op-panel driver-op-trip-panel">
            <PanelHeading
              icon={<Activity />}
              title="Trip Activity & Reputation"
              subtitle="Lifetime performance on TriSafe"
            />
            <div className="driver-op-metric-grid">
              <MetricCard
                icon={<Route />}
                label="Total rides"
                value={metricValue(metrics?.totalRides, loading)}
                note="Lifetime registered trips"
              />
              <MetricCard
                icon={<BadgeCheck />}
                label="Completion rate"
                value={loading ? "—" : `${completionRate}%`}
                note={`${metrics?.completedRides ?? 0} completed rides`}
                tone="green"
              />
              <MetricCard
                icon={<Star />}
                label="Average rating"
                value={
                  loading
                    ? "—"
                    : (metrics?.averageRating?.toFixed(1) ?? "No rating")
                }
                note={`${metrics?.ratingCount ?? 0} passenger reviews`}
                tone="blue"
              />
            </div>
            <div className="driver-op-outcomes">
              <strong>Trip outcomes</strong>
              <PerformanceRow
                label="Total rides"
                value={metrics?.totalRides ?? 0}
                total={metrics?.totalRides ?? 0}
                tone="total"
              />
              <PerformanceRow
                label="Completed"
                value={metrics?.completedRides ?? 0}
                total={metrics?.totalRides ?? 0}
                tone="completed"
              />
              <PerformanceRow
                label="Cancelled"
                value={metrics?.cancelledRides ?? 0}
                total={metrics?.totalRides ?? 0}
                tone="cancelled"
              />
              <PerformanceRow
                label="Violations"
                value={metrics?.violationCount ?? 0}
                total={metrics?.totalRides ?? 0}
                tone="violation"
              />
            </div>
            <div
              className={`driver-op-safety ${(metrics?.violationCount ?? 0) > 0 ? "attention" : "clear"}`}
            >
              <span>
                <AlertTriangle />
              </span>
              <div>
                <strong>Safety & Compliance</strong>
                <small>Driver safety record and regulatory compliance</small>
              </div>
              <p>
                Recorded violations <b>{metrics?.violationCount ?? 0}</b>
              </p>
              <em>
                {(metrics?.violationCount ?? 0) > 0
                  ? "Needs attention"
                  : "Clear record"}
              </em>
            </div>
          </section>

          <section className="driver-op-panel driver-op-readiness-panel">
            <PanelHeading
              icon={<Gauge />}
              title="Operational Readiness"
              subtitle="Current status and eligibility details"
            />
            <div className="driver-op-readiness-list">
              <ReadinessRow
                label="Account access"
                value={accountStatus}
                status
              />
              <ReadinessRow
                label="Transport status"
                value={operationalStatus}
                status
              />
              <ReadinessRow
                label="Franchise renewal"
                value={renewal.detail}
                danger={renewal.tone === "danger"}
              />
              <ReadinessRow label="BPLO QR" value={qrState} />
              <ReadinessRow
                label="Registry created"
                value={formatDate(driver.createdAt)}
              />
            </div>
            <div
              className={`driver-op-next ${restricted ? "warning" : "ready"}`}
            >
              <span>{restricted ? <AlertTriangle /> : <BadgeCheck />}</span>
              <div>
                <strong>
                  {restricted
                    ? "Recommended next actions"
                    : "Ready for verified rides"}
                </strong>
                <small>
                  {restricted
                    ? "Resolve the items below to restore ride access."
                    : "Account, franchise, and transport access are in good standing."}
                </small>
              </div>
              <div className="driver-op-next-actions">
                <button type="button" onClick={onEditFranchise}>
                  <FileText /> Review franchise
                </button>
                <button type="button" onClick={onViewRegistrationFile}>
                  <ShieldCheck /> Registration record
                </button>
              </div>
            </div>
          </section>
        </main>
      </section>
    </div>,
    document.body,
  );
}

function StatusPill({ value, icon }: { value: string; icon: ReactNode }) {
  const negative = value !== "ACTIVE" && value !== "VERIFIED";
  return (
    <span
      className={`driver-op-status-pill ${negative ? "negative" : "positive"}`}
    >
      {icon}
      {titleCase(value)}
    </span>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  note,
  tone,
  status = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  tone: string;
  status?: boolean;
}) {
  return (
    <article className={`driver-op-summary-card ${tone}`}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        {status ? <b>{value}</b> : <strong>{value}</strong>}
        <p>{note}</p>
      </div>
    </article>
  );
}

function PanelHeading({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="driver-op-panel-heading">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <article className={`driver-profile-metric ${tone}`}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </article>
  );
}

function PerformanceRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const percent = total
    ? Math.min(100, Math.round((value / total) * 100))
    : value
      ? 100
      : 0;
  return (
    <div className="driver-performance-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <i>
        <b className={tone} style={{ width: `${percent}%` }} />
      </i>
      <small>{percent}%</small>
    </div>
  );
}

function ReadinessRow({
  label,
  value,
  status = false,
  danger = false,
}: {
  label: string;
  value: string;
  status?: boolean;
  danger?: boolean;
}) {
  return (
    <div>
      <span>{label}</span>
      {status ? (
        <b className={`status ${value.toLowerCase()}`}>{titleCase(value)}</b>
      ) : (
        <strong className={danger ? "danger" : ""}>{value}</strong>
      )}
    </div>
  );
}

function metricValue(value: number | undefined, loading: boolean) {
  return loading ? "—" : String(value ?? 0);
}

function vehicleTypeLabel(value?: string) {
  return value === "HABAL_HABAL"
    ? "Habal-habal"
    : value === "TRICYCLE"
      ? "Tricycle"
      : "Registered vehicle";
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

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Not recorded";
}

function franchiseRenewalInfo(value?: string) {
  if (!value)
    return {
      label: "Not recorded",
      detail: "Expiry date not recorded",
      shortDetail: "No renewal date",
      tone: "neutral",
    };
  const target = new Date(value);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0)
    return {
      label: "Overdue",
      detail: `Franchise renewal overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`,
      shortDetail: `${Math.abs(days)} days late`,
      tone: "danger",
    };
  if (days === 0)
    return {
      label: "Due today",
      detail: "Franchise expires today",
      shortDetail: "Renew today",
      tone: "danger",
    };
  if (days <= 90)
    return {
      label: "Due soon",
      detail: `Franchise expires in ${days} day${days === 1 ? "" : "s"}`,
      shortDetail: `${days} days remaining`,
      tone: "warning",
    };
  return {
    label: "Current",
    detail: `Valid until ${formatDate(value)}`,
    shortDetail: formatDate(value),
    tone: "positive",
  };
}

function restrictionMessage(accountStatus: string, operationalStatus: string) {
  if (accountStatus !== "ACTIVE" && operationalStatus !== "VERIFIED")
    return "This driver cannot sign in or accept rides until account and franchise restrictions are resolved.";
  if (accountStatus !== "ACTIVE")
    return "This driver cannot sign in until account access is restored.";
  return "This driver cannot accept rides until franchise eligibility is restored.";
}

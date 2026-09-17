import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CarFront,
  Edit3,
  FileText,
  QrCode,
  Route,
  Star,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { api, type Driver, type DriverOperationalProfile } from "../../api";
import { displayPersonName } from "../../utils/personName";

export function DriverProfileModal({
  driver,
  onClose,
  onEditFranchise,
  onViewQr,
  onEditAccount,
  onViewRegistrationFile,
}: {
  driver: Driver;
  onClose: () => void;
  onEditFranchise: () => void;
  onViewQr: () => void;
  onEditAccount: () => void;
  onViewRegistrationFile: () => void;
}) {
  const titleId = useId();
  const [profile, setProfile] = useState<DriverOperationalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const vehicle = driver.vehicles[0];
  const operationalStatus = driver.franchise?.status ?? driver.verification;
  const franchiseRenewal = franchiseRenewalLabel(driver.franchise?.expiresAt);
  const qrState = vehicle?.qrCode?.token
    ? operationalStatus === "VERIFIED" &&
      (driver.accountStatus ?? "ACTIVE") === "ACTIVE"
      ? "Active and eligible"
      : "Issued · ride blocked"
    : "Not issued";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .driverOperationalProfile(driver.id)
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load driver activity.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
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
        className="driver-profile-modal driver-operations-profile"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="driver-profile-cover" aria-hidden="true">
          <span>TRISAFE · DRIVER OPERATIONS</span>
        </div>
        <header className="driver-profile-header">
          <div className="driver-profile-identity">
            <span className="driver-profile-avatar">
              {driver.avatarData ? (
                <img src={driver.avatarData} alt="Driver profile" />
              ) : (
                initials(driver.fullName)
              )}
            </span>
            <div className="driver-profile-intro">
              <p className="eyebrow">DRIVER OPERATIONAL PROFILE</p>
              <h3 id={titleId}>{displayPersonName(driver.fullName)}</h3>
              <small>
                @{driver.username ?? "not-assigned"} · {vehicleTypeLabel(vehicle?.vehicleType)} driver
              </small>
              <span className="driver-profile-record-id">
                {driver.id} · {vehicle?.plateNumber ?? "Vehicle not assigned"}
              </span>
            </div>
          </div>
          <div className="driver-profile-header-actions">
            <span className={`status ${operationalStatus.toLowerCase()}`}>
              {operationalStatus}
            </span>
            <button type="button" onClick={onClose} aria-label="Close driver profile">
              <X size={18} />
            </button>
          </div>
        </header>

        <section className="driver-profile-summary driver-profile-metrics" aria-label="Driver performance summary">
          <MetricCard icon={<Route />} label="Total rides" value={metricValue(metrics?.totalRides, loading)} note="Lifetime registered trips" />
          <MetricCard icon={<BadgeCheck />} label="Completion rate" value={loading ? "—" : `${completionRate}%`} note={`${metrics?.completedRides ?? 0} completed rides`} tone="green" />
          <MetricCard icon={<Star />} label="Average rating" value={loading ? "—" : metrics?.averageRating?.toFixed(1) ?? "No rating"} note={`${metrics?.ratingCount ?? 0} passenger reviews`} tone="blue" />
          <MetricCard icon={<AlertTriangle />} label="Safety records" value={metricValue(metrics?.incidentCount, loading)} note={`${metrics?.violationCount ?? 0} recorded violations`} tone={(metrics?.incidentCount ?? 0) > 0 ? "amber" : "green"} />
        </section>

        {error && <div className="driver-profile-load-error" role="alert">{error}</div>}

        <div className="driver-profile-grid driver-operational-grid">
          <ProfilePanel icon={<Activity />} title="Ride performance" subtitle="Lifetime trip outcome">
            <div className="driver-performance-overview">
              <div className="driver-performance-ring" style={{ "--progress": `${completionRate}%` } as CSSProperties}>
                <strong>{loading ? "—" : `${completionRate}%`}</strong>
                <span>completed</span>
              </div>
              <div className="driver-performance-breakdown">
                <PerformanceRow label="Total rides" value={metrics?.totalRides ?? 0} total={metrics?.totalRides ?? 0} tone="total" />
                <PerformanceRow label="Completed" value={metrics?.completedRides ?? 0} total={metrics?.totalRides ?? 0} tone="completed" />
                <PerformanceRow label="Cancelled" value={metrics?.cancelledRides ?? 0} total={metrics?.totalRides ?? 0} tone="cancelled" />
                <PerformanceRow label="Violations" value={metrics?.violationCount ?? 0} total={metrics?.totalRides ?? 0} tone="violation" />
              </div>
            </div>
          </ProfilePanel>

          <ProfilePanel icon={<CarFront />} title="Transport readiness" subtitle="Current operating credentials">
            <div className="driver-readiness-list">
              <CompactField label="Account access" value={driver.accountStatus ?? "ACTIVE"} status />
              <CompactField label="Transport status" value={operationalStatus} status />
              <CompactField label="Franchise renewal" value={franchiseRenewal} />
              <CompactField label="BPLO QR" value={qrState} />
            </div>
          </ProfilePanel>

        </div>

        <footer className="driver-profile-footer">
          <p><QrCode size={15} /> Operational data is loaded from the live TriSafe registry.</p>
          <div>
            <button className="secondary" type="button" onClick={onEditAccount}><Edit3 size={15} /> Edit account</button>
            <button className="secondary" type="button" onClick={onEditFranchise}>Manage franchise</button>
            <button className="secondary" type="button" onClick={onViewRegistrationFile}><FileText size={15} /> Registration file</button>
            <button className="primary" type="button" onClick={onViewQr} disabled={!vehicle?.qrCode?.token}>View QR code</button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function MetricCard({ icon, label, value, note, tone = "neutral" }: { icon: ReactNode; label: string; value: string; note: string; tone?: string }) {
  return <div className={`driver-profile-metric ${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></div>;
}

function ProfilePanel({ icon, title, subtitle, className = "", children }: { icon: ReactNode; title: string; subtitle: string; className?: string; children: ReactNode }) {
  return <section className={`driver-profile-section driver-operational-panel ${className}`}><header><span>{icon}</span><div><h4>{title}</h4><small>{subtitle}</small></div></header><div>{children}</div></section>;
}

function PerformanceRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const percent = total ? Math.min(100, Math.round((value / total) * 100)) : value ? 100 : 0;
  return <div className="driver-performance-row"><div><span>{label}</span><strong>{value}</strong></div><i><b className={tone} style={{ width: `${percent}%` }} /></i><small>{percent}%</small></div>;
}

function CompactField({ label, value, status = false }: { label: string; value: string; status?: boolean }) {
  return <div><span>{label}</span>{status ? <b className={`status ${value.toLowerCase()}`}>{titleCase(value)}</b> : <strong>{value}</strong>}</div>;
}

function metricValue(value: number | undefined, loading: boolean) {
  return loading ? "—" : String(value ?? 0);
}

function vehicleTypeLabel(value?: string) {
  return value === "HABAL_HABAL" ? "Habal-habal" : value === "TRICYCLE" ? "Tricycle" : "Registered";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "Not recorded";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function franchiseRenewalLabel(value?: string) {
  if (!value) return "Expiry date not recorded";
  const target = new Date(value);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  if (days <= 90) return `Expires in ${days} days`;
  return `Valid until ${formatDate(value)}`;
}

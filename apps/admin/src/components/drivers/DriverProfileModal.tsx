import { useEffect, useId, type ReactNode } from "react";
import {
  BadgeCheck,
  CarFront,
  ClipboardList,
  Edit3,
  MapPin,
  QrCode,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { Driver } from "../../api";
import { displayPersonName } from "../../utils/personName";

export function DriverProfileModal({
  driver,
  onClose,
  onEditFranchise,
  onViewQr,
  onEditAccount,
}: {
  driver: Driver;
  onClose: () => void;
  onEditFranchise: () => void;
  onViewQr: () => void;
  onEditAccount: () => void;
}) {
  const titleId = useId();
  const vehicle = driver.vehicles[0];
  const operationalStatus = driver.franchise?.status ?? driver.verification;
  const franchiseRenewal = franchiseRenewalLabel(driver.franchise?.expiresAt);
  const qrState = vehicle?.qrCode?.token
    ? operationalStatus === "VERIFIED" &&
      (driver.accountStatus ?? "ACTIVE") === "ACTIVE"
      ? "LGU-issued QR active"
      : "LGU-issued QR · ride blocked"
    : "QR not issued";

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      className="driver-profile-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="driver-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="driver-profile-cover" aria-hidden="true">
          <span>TRISAFE · REGISTERED DRIVER MANAGEMENT</span>
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
              <p className="eyebrow">REGISTERED DRIVER RECORD</p>
              <h3 id={titleId}>{displayPersonName(driver.fullName)}</h3>
              <small>@{driver.username ?? "account-pending"} · {vehicle?.vehicleType === "HABAL_HABAL" ? "Habal-habal" : "Tricycle"} driver</small>
              <span className="driver-profile-record-id">LGU registry record · {vehicle?.bodyNumber ?? vehicle?.permitNumber ?? "Unit pending"}</span>
            </div>
          </div>
          <div className="driver-profile-header-actions">
            <span className={`status ${operationalStatus.toLowerCase()}`}>
              {operationalStatus}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close driver profile"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <section className="driver-profile-summary" aria-label="Driver profile summary">
          <div><span>Account access</span><strong className={`status ${(driver.accountStatus ?? "ACTIVE").toLowerCase()}`}>{driver.accountStatus ?? "ACTIVE"}</strong><small>Controls driver sign-in</small></div>
          <div><span>Transport status</span><strong className={`status ${operationalStatus.toLowerCase()}`}>{operationalStatus}</strong><small>Controls passenger eligibility</small></div>
          <div><span>Registered vehicle</span><strong>{vehicle?.plateNumber ?? "Not assigned"}</strong><small>{vehicle?.vehicleType?.replaceAll("_", " ") ?? "Vehicle pending"}</small></div>
        </section>

        <div className="driver-profile-grid">
          <ProfileSection icon={<UserRound />} title="Personal account">
            <ProfileField
              label="Login identifier"
              value={driver.username ?? "Not assigned"}
            />
            <ProfileField
              label="Phone"
              value={driver.phone ?? "No phone number"}
            />
            <ProfileField
              label="Login access"
              value={driver.accountStatus ?? "ACTIVE"}
              badge
            />
          </ProfileSection>

          <ProfileSection icon={<ClipboardList />} title="Owner and transport eligibility">
            <ProfileField
              label="Owner / operator"
              value={
                driver.owner
                  ? `${driver.owner.lastName}, ${driver.owner.firstName}${driver.owner.middleName ? ` ${driver.owner.middleName}` : ""}`
                  : "Not recorded"
              }
            />
            <ProfileField
              label="Driver status"
              value={driver.verification}
              badge
            />
          </ProfileSection>

          <ProfileSection icon={<MapPin />} title="Registered address">
            <ProfileField
              label="Purok"
              value={driver.address?.purok ?? "Not recorded"}
            />
            <ProfileField
              label="Barangay"
              value={driver.address?.barangayName ?? "Not recorded"}
            />
            <ProfileField
              label="Municipality / City"
              value={driver.address?.municipalityName ?? "Not recorded"}
            />
            <ProfileField
              label="Province"
              value={driver.address?.provinceName ?? "Not recorded"}
            />
          </ProfileSection>

          <ProfileSection icon={<BadgeCheck />} title="Franchise">
            <ProfileField
              label="Franchise number"
              value={driver.franchise?.franchiseNumber ?? "Not assigned"}
            />
            <ProfileField
              label="Issued"
              value={formatDate(driver.franchise?.issuedAt)}
            />
            <ProfileField
              label="Expires"
              value={formatDate(driver.franchise?.expiresAt)}
            />
            <ProfileField label="Renewal" value={franchiseRenewal} />
            <ProfileField
              label="Franchise status"
              value={driver.franchise?.status ?? "Not assigned"}
              badge={Boolean(driver.franchise)}
            />
          </ProfileSection>

          <ProfileSection icon={<CarFront />} title="Vehicle identity">
            <ProfileField
              label="Plate number"
              value={vehicle?.plateNumber ?? "Not assigned"}
            />
            <ProfileField
              label="Vehicle type"
              value={
                vehicle?.vehicleType?.replaceAll("_", " ") ?? "Not assigned"
              }
            />
            <ProfileField
              label={
                vehicle?.vehicleType === "HABAL_HABAL"
                  ? "Permit number"
                  : "Body number"
              }
              value={
                vehicle?.permitNumber ?? vehicle?.bodyNumber ?? "Not assigned"
              }
            />
            <ProfileField
              label="Engine number"
              value={vehicle?.engineNumber ?? "Not assigned"}
            />
            <ProfileField
              label="Chassis number"
              value={vehicle?.chassisNumber ?? "Not assigned"}
            />
            <ProfileField
              label="LGU QR code"
              value={qrState}
            />
          </ProfileSection>
        </div>

        <footer className="driver-profile-footer">
          <p>
            <QrCode size={15} /> Passenger verification uses these live registry
            records.
          </p>
          <div>
            <button className="secondary" type="button" onClick={onEditAccount}>
              <Edit3 size={15} /> Edit profile
            </button>
            <button
              className="secondary"
              type="button"
              onClick={onEditFranchise}
            >
              Manage franchise
            </button>
            <button
              className="primary"
              type="button"
              onClick={onViewQr}
              disabled={!vehicle?.qrCode?.token}
            >
              View QR code
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function ProfileSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="driver-profile-section">
      <header>
        <span>{icon}</span>
        <h4>{title}</h4>
      </header>
      <div>{children}</div>
    </section>
  );
}

function ProfileField({
  label,
  value,
  badge = false,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="driver-profile-field">
      <span>{label}</span>
      {badge ? (
        <b className={`status ${value.toLowerCase()}`}>{value}</b>
      ) : (
        <strong>{value}</strong>
      )}
    </div>
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

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Not recorded";
}

function franchiseRenewalLabel(value?: string) {
  if (!value) return "Expiry date not recorded";
  const target = new Date(value);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today — renew now";
  if (days === 1) return "Expires tomorrow — renewal due";
  if (days <= 30) return `Expires in ${days} days — renewal due`;
  return "Current renewal period";
}

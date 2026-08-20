import { useEffect, useId, type ReactNode } from "react";
import {
  BadgeCheck,
  CarFront,
  FileText,
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
}: {
  driver: Driver;
  onClose: () => void;
  onEditFranchise: () => void;
  onViewQr: () => void;
}) {
  const titleId = useId();
  const vehicle = driver.vehicles[0];
  const operationalStatus = driver.franchise?.status ?? driver.verification;

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
        <header className="driver-profile-header">
          <div className="driver-profile-identity">
            <span>{initials(driver.fullName)}</span>
            <div>
              <p className="eyebrow">REGISTERED DRIVER PROFILE</p>
              <h3 id={titleId}>{displayPersonName(driver.fullName)}</h3>
              <small>{driver.username ?? "LGU record incomplete"}</small>
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

        <div className="driver-profile-notice">
          <BadgeCheck size={17} />
          <div>
            <strong>Operational record</strong>
            <span>
              Owner, driver, vehicle, franchise, eligibility, and QR details
              are maintained here—not in Accounts &amp; Access.
            </span>
          </div>
        </div>

        <div className="driver-profile-grid">
          <ProfileSection icon={<UserRound />} title="Account and contact">
            <ProfileField
              label="Full name"
              value={displayPersonName(driver.fullName)}
            />
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

          <ProfileSection icon={<FileText />} title="Owner and eligibility">
            <ProfileField label="Owner / organization leader" value={driver.owner ? `${driver.owner.lastName}, ${driver.owner.firstName}${driver.owner.middleName ? ` ${driver.owner.middleName}` : ""}` : "Not recorded"} />
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
            <ProfileField
              label="Franchise status"
              value={driver.franchise?.status ?? "Not assigned"}
              badge={Boolean(driver.franchise)}
            />
          </ProfileSection>

          <ProfileSection icon={<CarFront />} title="Vehicle and QR identity">
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
            <ProfileField label={vehicle?.vehicleType === "HABAL_HABAL" ? "Permit number" : "Body number"} value={vehicle?.permitNumber ?? vehicle?.bodyNumber ?? "Not assigned"} />
            <ProfileField label="Engine number" value={vehicle?.engineNumber ?? "Not assigned"} />
            <ProfileField label="Chassis number" value={vehicle?.chassisNumber ?? "Not assigned"} />
            <ProfileField
              label="LGU QR code"
              value={
                vehicle?.qrCode?.token
                  ? "Generated and active"
                  : "Not generated"
              }
            />
          </ProfileSection>
        </div>

        <footer className="driver-profile-footer">
          <p>
            <QrCode size={15} /> Passenger verification uses these live registry
            records.
          </p>
          <div>
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

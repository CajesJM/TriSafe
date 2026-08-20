import {
  BadgeCheck,
  CarFront,
  Check,
  CircleAlert,
  KeyRound,
  MapPin,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { DriverPresentAddressValue } from "./DriverPresentAddressFields";

export type DriverRegistrationDraft = DriverPresentAddressValue & {
  ownerLastName: string;
  ownerFirstName: string;
  ownerMiddleName?: string;
  driverLastName: string;
  driverFirstName: string;
  driverMiddleName?: string;
  phone: string;
  vehicleType: string;
  bodyNumber?: string;
  permitNumber?: string;
  engineNumber: string;
  chassisNumber: string;
  plateNumber: string;
  franchiseNumber: string;
  franchiseIssuedAt: string;
  franchiseExpiresAt: string;
  accountStatus: string;
  avatarData?: string;
};

export function generatedDriverUsername(lastName: string, firstName: string) {
  const clean = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const last = clean(lastName);
  const first = clean(firstName);
  return last && first
    ? `${last}.${first}`.slice(0, 30)
    : "Waiting for driver name";
}

export function DriverRegistrationOverview({
  draft,
}: {
  draft: DriverRegistrationDraft;
}) {
  const driverName = formatName(
    draft.driverLastName,
    draft.driverFirstName,
    draft.driverMiddleName,
    "Waiting for driver name",
  );
  const ownerName = formatName(
    draft.ownerLastName,
    draft.ownerFirstName,
    draft.ownerMiddleName,
    "Waiting for owner name",
  );
  const unitLabel =
    draft.vehicleType === "HABAL_HABAL" ? "Permit number" : "Body number";
  const unit =
    draft.vehicleType === "HABAL_HABAL" ? draft.permitNumber : draft.bodyNumber;
  const username = generatedDriverUsername(
    draft.driverLastName,
    draft.driverFirstName,
  );
  const sections = [
    Boolean(draft.ownerLastName && draft.ownerFirstName),
    Boolean(
      draft.driverLastName &&
      draft.driverFirstName &&
      /^9\d{9}$/.test(draft.phone),
    ),
    Boolean(draft.municipalityCode && draft.barangayCode && draft.purok),
    Boolean(
      unit && draft.engineNumber && draft.chassisNumber && draft.plateNumber,
    ),
    Boolean(
      draft.franchiseNumber &&
      draft.franchiseIssuedAt &&
      draft.franchiseExpiresAt,
    ),
  ];
  const complete = sections.filter(Boolean).length;
  const address = [
    draft.purok,
    draft.barangayName,
    draft.municipalityName,
    draft.provinceName,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <aside
      className="driver-registration-overview"
      aria-label="Live registration overview"
    >
      <header>
        <div>
          <span className="eyebrow">LIVE OVERVIEW</span>
          <h3>Registration review</h3>
          <p>Updates as the LGU record is completed.</p>
        </div>
        <span className="driver-overview-progress">{complete}/5</span>
      </header>
      <div className="driver-overview-profile">
        <div className="driver-overview-avatar">
          {draft.avatarData ? (
            <img src={draft.avatarData} alt="Driver profile preview" />
          ) : (
            <span>{initials(driverName)}</span>
          )}
        </div>
        <div>
          <strong>{driverName}</strong>
          <span>
            {draft.vehicleType === "HABAL_HABAL"
              ? "Habal-habal driver"
              : "Tricycle driver"}
          </span>
        </div>
      </div>
      <div className="driver-overview-credentials">
        <span>
          <KeyRound /> Auto-created driver login
        </span>
        <strong>{username}</strong>
        <small>Initial password: {unit || `${unitLabel} required`}</small>
      </div>
      <div className="driver-overview-list">
        <OverviewRow
          icon={<UsersRound />}
          label="Owner / leader"
          value={ownerName}
          complete={sections[0]}
        />
        <OverviewRow
          icon={<UserRound />}
          label="Driver contact"
          value={
            draft.phone ? `+63 ${draft.phone}` : "Waiting for contact number"
          }
          complete={sections[1]}
        />
        <OverviewRow
          icon={<MapPin />}
          label="Present address"
          value={address || "Waiting for Bohol address"}
          complete={sections[2]}
        />
        <OverviewRow
          icon={<CarFront />}
          label={`${unitLabel} · Plate`}
          value={
            unit
              ? `${unit} · ${draft.plateNumber || "Plate pending"}`
              : "Waiting for vehicle identity"
          }
          complete={sections[3]}
        />
        <OverviewRow
          icon={<BadgeCheck />}
          label="Franchise control"
          value={draft.franchiseNumber || "Waiting for franchise number"}
          complete={sections[4]}
        />
      </div>
      <footer>
        <span className={`status ${draft.accountStatus.toLowerCase()}`}>
          {draft.accountStatus}
        </span>
        <small>
          {complete === 5
            ? "Ready for LGU registration"
            : `${5 - complete} section${5 - complete === 1 ? "" : "s"} still needed`}
        </small>
      </footer>
    </aside>
  );
}

function OverviewRow({
  icon,
  label,
  value,
  complete,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <div className="driver-overview-row">
      <span className={complete ? "complete" : ""}>
        {complete ? <Check /> : <CircleAlert />}
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
      {icon}
    </div>
  );
}
function formatName(
  last: string,
  first: string,
  middle: string | undefined,
  fallback: string,
) {
  return last && first
    ? `${last}, ${first}${middle ? ` ${middle}` : ""}`
    : fallback;
}
function initials(value: string) {
  return value === "Waiting for driver name"
    ? "DR"
    : value
        .replace(",", " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

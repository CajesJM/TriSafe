import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Driver, DriverStatus, UserStatus } from "../../api";
import { DataToolbar, Pagination } from "../shared/DataControls";
import { EmptyState } from "../shared/Feedback";
import { ModalShell } from "../shared/ModalShell";
import { DriverProfileModal } from "./DriverProfileModal";
import { displayPersonName } from "../../utils/personName";
import { SuspendDriverModal } from "./SuspendDriverModal";
import { ActionMenu, type ActionMenuGroup } from "../shared/ActionMenu";
import { ConfirmModal } from "../shared/ConfirmModal";
import { DriverRegistrationFileModal } from "./DriverRegistrationFileModal";
import type { DriverFileFormat } from "../../utils/driverRegistrationFile";
import { downloadVehicleQrPoster } from "../../utils/vehicleQrPoster";
import {
  BadgeCheck,
  Download,
  FilePenLine,
  FileText,
  QrCode,
  ShieldAlert,
  UserCheck,
  UserRound,
  UserX,
  Trash2,
} from "lucide-react";

const pageSize = 8;
const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "VERIFIED", label: "Verified" },
  { value: "PENDING", label: "Pending" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "EXPIRED", label: "Expired" },
];
const vehicleTypeOptions = [
  { value: "", label: "All vehicles" },
  { value: "TRICYCLE", label: "Tricycle" },
  { value: "HABAL_HABAL", label: "Habal-habal" },
];
type Props = {
  drivers: Driver[];
  onRegister: () => void;
  onViewQr: (driver: Driver) => void;
  onUpdateFranchise: (driver: Driver) => void;
  onUpdateStatus: (
    driver: Driver,
    status: DriverStatus,
    reason?: string,
  ) => Promise<void>;
  onUpdateAccountStatus: (driver: Driver, status: UserStatus) => Promise<void>;
  onDeleteDriver: (driver: Driver) => Promise<void>;
  selectedDriverId: string | null;
  onViewProfile: (driverId: string) => void;
  onCloseProfile: () => void;
  onEditAccount: (driver: Driver) => void;
  onError: (message: string) => void;
  onFileDownloaded: (driver: Driver, format: DriverFileFormat) => void;
};

export function DriverList({
  drivers,
  onRegister,
  onViewQr,
  onUpdateFranchise,
  onUpdateStatus,
  onUpdateAccountStatus,
  onDeleteDriver,
  selectedDriverId,
  onViewProfile,
  onCloseProfile,
  onEditAccount,
  onError,
  onFileDownloaded,
}: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [page, setPage] = useState(1);
  const [changing, setChanging] = useState("");
  const [error, setError] = useState("");
  const [suspendingDriver, setSuspendingDriver] = useState<Driver | null>(null);
  const [accountStatusDriver, setAccountStatusDriver] = useState<Driver | null>(
    null,
  );
  const [fileDriver, setFileDriver] = useState<Driver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const filtered = useMemo(
    () =>
      drivers.filter((driver) => {
        const text =
          `${driver.fullName} ${driver.username ?? ""} ${driver.phone ?? ""} ${driver.owner ? `${driver.owner.lastName} ${driver.owner.firstName} ${driver.owner.middleName ?? ""}` : ""} ${driver.franchise?.franchiseNumber ?? ""} ${driver.vehicles.map((vehicle) => `${vehicle.plateNumber} ${vehicle.bodyNumber ?? ""} ${vehicle.permitNumber ?? ""} ${vehicle.engineNumber ?? ""} ${vehicle.chassisNumber ?? ""}`).join(" ")}`.toLowerCase();
        const currentStatus = driver.franchise?.status ?? driver.verification;
        const matchesVehicleType = driver.vehicles.some(
          (vehicle) =>
            normalizeVehicleType(vehicle.vehicleType) === vehicleType,
        );
        return (
          (!search || text.includes(search.toLowerCase())) &&
          (!vehicleType || matchesVehicleType) &&
          (!status || currentStatus === status)
        );
      }),
    [drivers, search, status, vehicleType],
  );
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selectedDriver = drivers.find(
    (driver) => driver.id === selectedDriverId,
  );

  async function changeStatus(
    driver: Driver,
    nextStatus: DriverStatus,
    reason?: string,
  ) {
    setChanging(driver.id);
    setError("");
    try {
      await onUpdateStatus(driver, nextStatus, reason);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to change driver status.";
      setError(message);
      onError(message);
      throw requestError;
    } finally {
      setChanging("");
    }
  }

  return (
    <section className="card data-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LGU TRANSPORT REGISTRY</span>
          <h3>Approved drivers and vehicles</h3>
          <p className="section-description">
            Accounts, franchise validity, vehicles, and LGU-issued QR identities
            from the live registry.
          </p>
        </div>
        <button className="primary" onClick={onRegister} type="button">
          ＋ Register driver
        </button>
      </div>
      <DriverStatusGuide />
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <DataToolbar
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchLabel="Search driver, owner, unit, plate, engine, or franchise"
        filter={status}
        onFilter={(value) => {
          setStatus(value);
          setPage(1);
        }}
        filterLabel="Transport status"
        options={statusOptions}
        additionalFilter={
          <label className="data-filter">
            <span>Vehicle type</span>
            <select
              value={vehicleType}
              onChange={(event) => {
                setVehicleType(event.target.value);
                setPage(1);
              }}
            >
              {vehicleTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        }
        resultCount={filtered.length}
      />
      {visible.length === 0 ? (
        <EmptyState
          title="No matching drivers"
          text={
            drivers.length
              ? "Try changing your search or status filter."
              : "Register an LGU-approved driver to begin the transport registry."
          }
        />
      ) : (
        <div className="responsive-table">
          <div className="data-row driver-table-head data-head">
            <span className="table-number">No.</span>
            <span>Driver</span>
            <span>Vehicle</span>
            <span>Franchise</span>
            <span>Owner / unit</span>
            <span>Account</span>
            <span>Transport</span>
            <span>Actions</span>
          </div>
          {visible.map((driver, index) => (
            <DriverRow
              driver={driver}
              number={(page - 1) * pageSize + index + 1}
              changing={changing === driver.id}
              onViewQr={onViewQr}
              onUpdateFranchise={onUpdateFranchise}
              onViewProfile={() => onViewProfile(driver.id)}
              onEditAccount={() => onEditAccount(driver)}
              onViewFile={() => setFileDriver(driver)}
              onChangeAccountStatus={() => setAccountStatusDriver(driver)}
              onDelete={() => setDeletingDriver(driver)}
              onSuspend={() => setSuspendingDriver(driver)}
              onUpdateStatus={(nextStatus) =>
                changeStatus(driver, nextStatus).catch(() => undefined)
              }
              key={driver.id}
            />
          ))}
        </div>
      )}
      {filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
        />
      )}
      {selectedDriver && (
        <DriverProfileModal
          driver={selectedDriver}
          onClose={onCloseProfile}
          onEditFranchise={() => {
            onCloseProfile();
            onUpdateFranchise(selectedDriver);
          }}
          onViewQr={() => {
            onCloseProfile();
            onViewQr(selectedDriver);
          }}
          onEditAccount={() => {
            onCloseProfile();
            onEditAccount(selectedDriver);
          }}
        />
      )}
      {suspendingDriver && (
        <SuspendDriverModal
          driver={suspendingDriver}
          onClose={() => setSuspendingDriver(null)}
          onError={onError}
          onConfirm={async (reason) => {
            await changeStatus(suspendingDriver, "SUSPENDED", reason);
            setSuspendingDriver(null);
          }}
        />
      )}
      {accountStatusDriver && (
        <ConfirmModal
          title={`${(accountStatusDriver.accountStatus ?? "ACTIVE") === "ACTIVE" ? "Deactivate" : "Activate"} ${displayPersonName(accountStatusDriver.fullName)}'s account?`}
          message={
            (accountStatusDriver.accountStatus ?? "ACTIVE") === "ACTIVE"
              ? "The driver will be signed out and unable to log in. Their franchise and transport status will remain unchanged."
              : "The driver will be allowed to sign in again. Their transport eligibility will still follow the separate franchise status."
          }
          confirmLabel={
            (accountStatusDriver.accountStatus ?? "ACTIVE") === "ACTIVE"
              ? "Deactivate account"
              : "Activate account"
          }
          tone={
            (accountStatusDriver.accountStatus ?? "ACTIVE") === "ACTIVE"
              ? "danger"
              : "warning"
          }
          onCancel={() => setAccountStatusDriver(null)}
          onError={onError}
          onConfirm={() =>
            onUpdateAccountStatus(
              accountStatusDriver,
              (accountStatusDriver.accountStatus ?? "ACTIVE") === "ACTIVE"
                ? "INACTIVE"
                : "ACTIVE",
            )
          }
        />
      )}
      {deletingDriver && (
        <ConfirmModal
          title={`Delete ${displayPersonName(deletingDriver.fullName)}'s driver account?`}
          message="This permanently removes the driver account, private photo, QR code, vehicle, franchise, address, and unused owner record. Drivers with ride history cannot be deleted; deactivate their account instead."
          confirmLabel="Delete driver account"
          tone="danger"
          onCancel={() => setDeletingDriver(null)}
          onError={onError}
          onConfirm={async () => {
            await onDeleteDriver(deletingDriver);
            setDeletingDriver(null);
          }}
        />
      )}
      {fileDriver && (
        <DriverRegistrationFileModal
          driver={fileDriver}
          onClose={() => setFileDriver(null)}
          onError={onError}
          onDownloaded={(format) => onFileDownloaded(fileDriver, format)}
        />
      )}
    </section>
  );
}

function DriverRow({
  driver,
  number,
  changing,
  onViewQr,
  onUpdateFranchise,
  onViewProfile,
  onEditAccount,
  onViewFile,
  onChangeAccountStatus,
  onDelete,
  onSuspend,
  onUpdateStatus,
}: {
  driver: Driver;
  number: number;
  changing: boolean;
  onViewQr: (driver: Driver) => void;
  onUpdateFranchise: (driver: Driver) => void;
  onViewProfile: () => void;
  onEditAccount: () => void;
  onViewFile: () => void;
  onChangeAccountStatus: () => void;
  onDelete: () => void;
  onSuspend: () => void;
  onUpdateStatus: (status: DriverStatus) => Promise<void>;
}) {
  const vehicle = driver.vehicles[0];
  const status = (driver.franchise?.status ??
    driver.verification) as DriverStatus;
  const actionGroups: ActionMenuGroup[] = [
    {
      label: "Account",
      items: [
        {
          label: "Edit account",
          icon: <FilePenLine />,
          onSelect: onEditAccount,
        },
        {
          label:
            (driver.accountStatus ?? "ACTIVE") === "ACTIVE"
              ? "Deactivate account"
              : "Activate account",
          icon:
            (driver.accountStatus ?? "ACTIVE") === "ACTIVE" ? (
              <UserX />
            ) : (
              <UserCheck />
            ),
          onSelect: onChangeAccountStatus,
          tone:
            (driver.accountStatus ?? "ACTIVE") === "ACTIVE"
              ? "danger"
              : "default",
        },
      ],
    },
    {
      label: "Records & identity",
      items: [
        {
          label: "Manage franchise",
          icon: <FileText />,
          onSelect: () => onUpdateFranchise(driver),
        },
        {
          label: "View QR code",
          icon: <QrCode />,
          onSelect: () => onViewQr(driver),
          disabled: !vehicle?.qrCode?.token,
        },
        {
          label: "View registration file",
          icon: <Download />,
          onSelect: onViewFile,
        },
      ],
    },
    {
      label: "Transport status",
      items: [
        ...(status === "VERIFIED"
          ? [
              {
                label: changing ? "Updating…" : "Suspend transport",
                icon: <ShieldAlert />,
                onSelect: onSuspend,
                disabled: changing,
                tone: "danger" as const,
              },
            ]
          : []),
        ...(status === "PENDING" || status === "SUSPENDED"
          ? [
              {
                label: changing ? "Updating…" : "Verify transport",
                icon: <BadgeCheck />,
                onSelect: () => void onUpdateStatus("VERIFIED"),
                disabled: changing,
              },
            ]
          : []),
      ],
    },
    {
      label: "Danger zone",
      items: [
        {
          label: "Delete driver account",
          icon: <Trash2 />,
          onSelect: onDelete,
          tone: "danger",
        },
      ],
    },
  ];
  return (
    <div className="data-row driver-table-row">
      <span className="table-number" aria-label={`Record number ${number}`}>
        {number}
      </span>
      <div className="identity-cell">
        <span className="avatar driver-list-avatar">
          {driver.avatarData ? (
            <img src={driver.avatarData} alt="" />
          ) : (
            initials(driver.fullName)
          )}
        </span>
        <span>
          <b>{displayPersonName(driver.fullName)}</b>
          <small>
            {driver.username ?? "Login not assigned"} ·{" "}
            {driver.phone ?? "No phone"}
          </small>
        </span>
      </div>
      <span>
        <b>{vehicle?.plateNumber ?? "Not assigned"}</b>
        <small>{vehicle?.vehicleType ?? "No vehicle"}</small>
      </span>
      <span>
        <b>{driver.franchise?.franchiseNumber ?? "Not assigned"}</b>
        <small>
          {driver.franchise?.expiresAt
            ? `Expires ${formatDate(driver.franchise.expiresAt)}`
            : "No expiry date"}
        </small>
      </span>
      <span>
        <b>
          {driver.owner
            ? displayPersonName(
                `${driver.owner.lastName}, ${driver.owner.firstName}${driver.owner.middleName ? ` ${driver.owner.middleName}` : ""}`,
              )
            : "Record incomplete"}
        </b>
        <small>
          {vehicle?.bodyNumber
            ? `Body ${vehicle.bodyNumber}`
            : vehicle?.permitNumber
              ? `Permit ${vehicle.permitNumber}`
              : "No unit number"}
        </small>
      </span>
      <span
        className={`status ${(driver.accountStatus ?? "ACTIVE").toLowerCase()}`}
        title={
          driver.accountStatus === "INACTIVE"
            ? "This driver cannot sign in to TriSafe."
            : "This driver can sign in to TriSafe."
        }
      >
        {driver.accountStatus ?? "ACTIVE"}
      </span>
      <span
        className={`status ${status.toLowerCase()}`}
        title={driverStatusHelp(status)}
      >
        {status}
      </span>
      <span className="row-menu driver-row-actions">
        <button
          className="row-action driver-profile-action"
          onClick={onViewProfile}
          type="button"
        >
          <UserRound aria-hidden="true" /> Profile
        </button>
        <ActionMenu
          label={`Actions for ${displayPersonName(driver.fullName)}`}
          groups={actionGroups}
        />
      </span>
    </div>
  );
}

function DriverStatusGuide() {
  return (
    <aside className="driver-status-guide" aria-label="Driver status guide">
      <strong>
        <span aria-hidden="true">i</span> Two separate controls
      </strong>
      <div className="driver-guide-group" aria-label="Account access statuses">
        <small>Account</small>
        <StatusHelpBadge
          status="active"
          label="Active"
          help="The driver can sign in to their TriSafe account."
        />
        <StatusHelpBadge
          status="inactive"
          label="Inactive"
          help="The driver cannot sign in until an administrator reactivates the account."
        />
      </div>
      <div
        className="driver-guide-group"
        aria-label="Transport eligibility statuses"
      >
        <small>Transport</small>
        <StatusHelpBadge
          status="verified"
          label="Verified"
          help="The franchise is valid and the driver is eligible for QR verification and rides."
        />
        <StatusHelpBadge
          status="pending"
          label="Pending"
          help="The driver is waiting for LGU transport verification."
        />
        <StatusHelpBadge
          status="suspended"
          label="Suspended"
          help="The LGU has temporarily blocked this driver from transport activity."
        />
        <StatusHelpBadge
          status="expired"
          label="Expired"
          help="The franchise expiration date has passed, so the driver is not eligible for rides."
        />
      </div>
      <p>
        Hover over or focus a status for an explanation. Account controls
        sign-in; transport controls QR and ride eligibility.
      </p>
    </aside>
  );
}

function StatusHelpBadge({
  status,
  label,
  help,
}: {
  status: string;
  label: string;
  help: string;
}) {
  return (
    <span
      className={`status ${status} status-help-badge`}
      data-tooltip={help}
      tabIndex={0}
      aria-label={`${label}: ${help}`}
    >
      {label}
    </span>
  );
}

export function QrCodePanel({
  driver,
  onClose,
  onDownloaded,
}: {
  driver: Driver;
  onClose: () => void;
  onDownloaded: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehicle = driver.vehicles[0];
  const token = vehicle?.qrCode?.token;
  if (!vehicle || !token) return null;
  const verifiedToken = token;
  const qrValue = `trisafe://verify/${verifiedToken}`;
  function downloadQr() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `trisafe-${vehicle.plateNumber}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    onDownloaded();
  }
  function downloadOfficialLayout() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadVehicleQrPoster(canvas, {
      driverName: displayPersonName(driver.fullName),
      plateNumber: vehicle.plateNumber,
      vehicleType: vehicle.vehicleType,
      franchiseNumber: driver.franchise?.franchiseNumber ?? "Not assigned",
      qrReference: verifiedToken.slice(0, 12).toUpperCase(),
    });
    onDownloaded();
  }
  return (
    <ModalShell
      eyebrow="LGU-ISSUED VEHICLE IDENTITY"
      title="Vehicle QR code"
      description="Passenger verification reads this identity against the live TriSafe registry."
      onClose={onClose}
      size="large"
      className="qr-code-modal"
      footer={
        <>
          <button className="secondary" onClick={onClose} type="button">
            Close
          </button>
          <button
            className="secondary qr-download-button"
            onClick={downloadQr}
            type="button"
          >
            <Download aria-hidden="true" /> Download QR only
          </button>
          <button
            className="primary qr-download-button"
            onClick={downloadOfficialLayout}
            type="button"
          >
            <Download aria-hidden="true" /> Download official layout
          </button>
        </>
      }
    >
      <div className="qr-modal-layout">
        <div className="qr-copy">
          <span className="eyebrow">LGU-ISSUED VEHICLE IDENTITY</span>
          <h3>Ready for vehicle display</h3>
          <p>
            Print and place this code inside the vehicle where passengers can
            scan it safely. Scanning verifies this driver and franchise against
            the live registry.
          </p>
          <div className="qr-details">
            <div>
              <span>Driver</span>
              <b>{displayPersonName(driver.fullName)}</b>
            </div>
            <div>
              <span>Vehicle</span>
              <b>
                {vehicle.plateNumber} · {vehicle.vehicleType}
              </b>
            </div>
            <div>
              <span>Franchise</span>
              <b>{driver.franchise?.franchiseNumber ?? "—"}</b>
            </div>
          </div>
          <code className="qr-token">{qrValue}</code>
        </div>
        <div className="qr-preview qr-official-preview">
          <div
            className="qr-preview-branding"
            aria-label="Official LGU QR layout preview"
          >
            <span role="img" aria-label="TriSafe logo placeholder">
              TriSafe
              <br />
              <small>LOGO</small>
            </span>
            <b>
              OFFICIAL
              <br />
              VEHICLE QR
            </b>
            <span role="img" aria-label="LGU Trinidad logo placeholder">
              LGU
              <br />
              <small>LOGO</small>
            </span>
          </div>
          <QRCodeCanvas
            ref={canvasRef}
            value={qrValue}
            size={512}
            bgColor="#ffffff"
            fgColor="#123f39"
            level="H"
            includeMargin
          />
          <strong>SCAN TO VERIFY</strong>
          <small>{vehicle.plateNumber} · LGU Trinidad, Bohol</small>
        </div>
      </div>
    </ModalShell>
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
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function driverStatusHelp(status: DriverStatus) {
  return status === "VERIFIED"
    ? "Valid franchise; eligible for QR verification and rides."
    : status === "PENDING"
      ? "Awaiting LGU verification."
      : status === "SUSPENDED"
        ? "Manually suspended by the LGU."
        : "Franchise expiration date has passed.";
}

function normalizeVehicleType(value: string) {
  return value.trim().toUpperCase().replace(/[ -]+/g, "_");
}

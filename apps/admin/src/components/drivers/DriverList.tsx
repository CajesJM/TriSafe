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
import { FilterListControl } from "../shared/FilterListControl";
import {
  SortListControl,
  directorySortOptions,
  type DirectorySort,
} from "../shared/SortListControl";
import { DriverRegistrationFileModal } from "./DriverRegistrationFileModal";
import type { DriverFileFormat } from "../../utils/driverRegistrationFile";
import { downloadVehicleQrPoster } from "../../utils/vehicleQrPoster";
import {
  CarFront,
  Check,
  BadgeCheck,
  Download,
  FilePenLine,
  FileText,
  Info,
  QrCode,
  ShieldAlert,
  SlidersHorizontal,
  UserCheck,
  UserRound,
  UsersRound,
  UserX,
  Trash2,
} from "lucide-react";

const pageSize = 8;
const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "VERIFIED", label: "Verified" },
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
  onCheckDeleteDriver: (driver: Driver) => Promise<number>;
  onDeleteDriver: (driver: Driver, confirmation?: string) => Promise<void>;
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
  onCheckDeleteDriver,
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
  const [sort, setSort] = useState<DirectorySort>("NEWEST");
  const [page, setPage] = useState(1);
  const [changing, setChanging] = useState("");
  const [error, setError] = useState("");
  const [suspendingDriver, setSuspendingDriver] = useState<Driver | null>(null);
  const [verifyingDriver, setVerifyingDriver] = useState<Driver | null>(null);
  const [accountStatusDriver, setAccountStatusDriver] = useState<Driver | null>(
    null,
  );
  const [fileDriver, setFileDriver] = useState<Driver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const [rideDeletionVerification, setRideDeletionVerification] = useState<{
    driver: Driver;
    rideCount: number;
  } | null>(null);
  const filtered = useMemo(() => {
    const matches = drivers.filter((driver) => {
      const text =
        `${driver.fullName} ${driver.username ?? ""} ${driver.phone ?? ""} ${driver.owner ? `${driver.owner.lastName} ${driver.owner.firstName} ${driver.owner.middleName ?? ""}` : ""} ${driver.franchise?.franchiseNumber ?? ""} ${driver.vehicles.map((vehicle) => `${vehicle.plateNumber} ${vehicle.bodyNumber ?? ""} ${vehicle.permitNumber ?? ""} ${vehicle.engineNumber ?? ""} ${vehicle.chassisNumber ?? ""}`).join(" ")}`.toLowerCase();
      const currentStatus = driver.franchise?.status ?? driver.verification;
      const matchesVehicleType = driver.vehicles.some(
        (vehicle) => normalizeVehicleType(vehicle.vehicleType) === vehicleType,
      );
      return (
        (!search || text.includes(search.toLowerCase())) &&
        (!vehicleType || matchesVehicleType) &&
        (!status || currentStatus === status)
      );
    });
    return matches.sort((left, right) => {
      if (sort === "OLDEST")
        return Date.parse(left.createdAt) - Date.parse(right.createdAt);
      if (sort === "NAME_ASC")
        return left.fullName.localeCompare(right.fullName, "en-PH", {
          sensitivity: "base",
        });
      if (sort === "NAME_DESC")
        return right.fullName.localeCompare(left.fullName, "en-PH", {
          sensitivity: "base",
        });
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
  }, [drivers, search, sort, status, vehicleType]);
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
    <section className="card data-card driver-directory-workspace">
      <div className="driver-directory-top-grid">
        <div className="section-heading driver-directory-hero">
          <div>
            <span className="eyebrow">DRIVER MANAGEMENT</span>
            <h3>Registered Driver Directory</h3>
            <p className="section-description">
              Review driver identities, transport credentials, vehicle records,
              and account access from one workspace.
            </p>
          </div>
        </div>
        <DriverTransportOverview drivers={drivers} />
      </div>
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
        additionalFilter={
          <div className="driver-table-controls">
            <FilterListControl
              label="Vehicle type"
              value={vehicleType}
              options={vehicleTypeOptions}
              onChange={(value) => {
                setVehicleType(value);
                setPage(1);
              }}
            />
            <FilterListControl
              label="Transport status"
              value={status}
              options={statusOptions}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />
            <SortListControl
              label="Sort drivers"
              value={sort}
              defaultValue="NEWEST"
              options={directorySortOptions}
              onChange={(value) => {
                setSort(value);
                setPage(1);
              }}
            />
            <button
              className="driver-view-reset"
              type="button"
              title="Reset search, vehicle, status, and sorting"
              aria-label="Reset driver table view"
              onClick={() => {
                setSearch("");
                setVehicleType("");
                setStatus("");
                setSort("NEWEST");
                setPage(1);
              }}
            >
              <SlidersHorizontal aria-hidden="true" />
            </button>
            <button
              className="primary driver-toolbar-register"
              onClick={onRegister}
              type="button"
            >
              ＋ Register driver
            </button>
          </div>
        }
      />
      {visible.length === 0 ? (
        <EmptyState
          title="No matching drivers"
          text={
            drivers.length
              ? "Try changing your search or status filter."
              : "Register an BPLO-approved driver to begin the transport registry."
          }
        />
      ) : (
        <div className="responsive-table">
          <div className="data-row driver-table-head data-head">
            <span className="table-number">No.</span>
            <span>Driver</span>
            <span>Vehicle</span>
            <span>Franchise & renewal</span>
            <span>Owner / unit</span>
            <span>Account</span>
            <span>Transport & QR</span>
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
              onVerify={() => setVerifyingDriver(driver)}
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
          onViewRegistrationFile={() => {
            onCloseProfile();
            setFileDriver(selectedDriver);
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
      {verifyingDriver && (
        <ConfirmModal
          title={`Verify ${displayPersonName(verifyingDriver.fullName)} for transport again?`}
          message="This removes the driver's suspension and marks the franchise and transport status as verified. Ride eligibility will also require an active account and a valid franchise expiration date."
          confirmLabel="Verify transport"
          tone="success"
          showIcon={false}
          onCancel={() => setVerifyingDriver(null)}
          onError={onError}
          onConfirm={() => changeStatus(verifyingDriver, "VERIFIED")}
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
              ? "warning"
              : "success"
          }
          showIcon={false}
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
          message="This permanently removes the driver account, private photo, QR code, vehicle, franchise, address, and unused owner record. TriSafe will check for linked ride records before continuing."
          confirmLabel="Delete driver account"
          tone="danger"
          showIcon={false}
          onCancel={() => setDeletingDriver(null)}
          onError={onError}
          onConfirm={async () => {
            const rideCount = await onCheckDeleteDriver(deletingDriver);
            if (rideCount > 0) {
              setRideDeletionVerification({
                driver: deletingDriver,
                rideCount,
              });
              setDeletingDriver(null);
              return;
            }
            await onDeleteDriver(deletingDriver);
            setDeletingDriver(null);
          }}
        />
      )}
      {rideDeletionVerification && (
        <ConfirmModal
          title={`Delete ${displayPersonName(rideDeletionVerification.driver.fullName)} and all ride history?`}
          message={`This driver has ${rideDeletionVerification.rideCount} ride ${rideDeletionVerification.rideCount === 1 ? "record" : "records"}. Continuing permanently deletes the account, ride history, ratings, violations, vehicle, QR code, and registry details. Passenger accounts and submitted incident reports will remain.`}
          confirmLabel="Delete account and rides"
          confirmationText="DELETE"
          tone="danger"
          showIcon={false}
          onCancel={() => setRideDeletionVerification(null)}
          onError={onError}
          onConfirm={async () => {
            await onDeleteDriver(rideDeletionVerification.driver, "DELETE");
            setRideDeletionVerification(null);
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
  onVerify,
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
  onVerify: () => void;
}) {
  const vehicle = driver.vehicles[0];
  const status = (driver.franchise?.status ??
    driver.verification) as DriverStatus;
  const franchiseTimeline = describeFranchiseTimeline(
    driver.franchise?.expiresAt,
  );
  const qrIdentity = describeQrIdentity(driver, status);
  const actionGroups: ActionMenuGroup[] = [
    {
      label: "Account",
      items: [
        {
          label: "Edit account",
          icon: <FilePenLine />,
          onSelect: onEditAccount,
        },
        ...((driver.accountStatus ?? "ACTIVE") !== "ACTIVE"
          ? [
              {
                label: "Activate account",
                icon: <UserCheck />,
                onSelect: onChangeAccountStatus,
                tone: "success" as const,
              },
            ]
          : []),
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
        ...(status === "SUSPENDED"
          ? [
              {
                label: changing ? "Updating…" : "Verify transport",
                icon: <BadgeCheck />,
                onSelect: onVerify,
                disabled: changing,
              },
            ]
          : []),
      ],
    },
    {
      label: "Danger zone",
      items: [
        ...((driver.accountStatus ?? "ACTIVE") === "ACTIVE"
          ? [
              {
                label: "Deactivate account",
                icon: <UserX />,
                onSelect: onChangeAccountStatus,
                tone: "warning" as const,
              },
            ]
          : []),
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
        <small>{franchiseTimeline}</small>
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
        className="transport-qr-cell"
        title={`${driverStatusHelp(status)} ${qrIdentity.help}`}
      >
        <b className={`status ${status.toLowerCase()}`}>{status}</b>
        <small className={qrIdentity.className}>{qrIdentity.label}</small>
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

function DriverTransportOverview({ drivers }: { drivers: Driver[] }) {
  const total = drivers.length;
  const percentage = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;
  const rows = [
    {
      label: "Registered",
      value: total,
      percent: total > 0 ? 100 : 0,
      tone: "registered",
    },
    {
      label: "Tricycle",
      value: drivers.filter((driver) =>
        driver.vehicles.some(
          (vehicle) => normalizeVehicleType(vehicle.vehicleType) === "TRICYCLE",
        ),
      ).length,
      tone: "tricycle",
    },
    {
      label: "Habal-habal",
      value: drivers.filter((driver) =>
        driver.vehicles.some(
          (vehicle) =>
            normalizeVehicleType(vehicle.vehicleType) === "HABAL_HABAL",
        ),
      ).length,
      tone: "habal-habal",
    },
    {
      label: "Verified",
      value: drivers.filter(
        (driver) =>
          (driver.franchise?.status ?? driver.verification) === "VERIFIED",
      ).length,
      tone: "verified",
    },
    {
      label: "Suspended",
      value: drivers.filter(
        (driver) =>
          (driver.franchise?.status ?? driver.verification) === "SUSPENDED",
      ).length,
      tone: "suspended",
    },
    {
      label: "Expired",
      value: drivers.filter(
        (driver) =>
          (driver.franchise?.status ?? driver.verification) === "EXPIRED",
      ).length,
      tone: "expired",
    },
  ].map((row) => ({
    ...row,
    percent: "percent" in row ? row.percent : percentage(row.value),
  }));

  return (
    <section
      className="driver-transport-overview"
      aria-labelledby="driver-transport-overview-title"
    >
      <div className="driver-transport-heading">
        <div>
          <span className="eyebrow">TRANSPORT DISTRIBUTION</span>
          <h4 id="driver-transport-overview-title">Driver overview</h4>
        </div>
        <strong>{total}</strong>
      </div>
      <div className="driver-transport-bars">
        {rows.map((row) => (
          <div className={`driver-transport-row ${row.tone}`} key={row.label}>
            <div>
              <span>{row.label}</span>
              <b>{row.value}</b>
            </div>
            <span
              className="driver-transport-track"
              role="img"
              aria-label={`${row.label}: ${row.value}, ${row.percent}% of registered drivers`}
            >
              <span style={{ width: `${row.percent}%` }} />
            </span>
            <small>{row.percent}%</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export function QrCodePanel({
  driver,
  onClose,
  onDownloaded,
  onError,
}: {
  driver: Driver;
  onClose: () => void;
  onDownloaded: () => void;
  onError: (message: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posterBusy, setPosterBusy] = useState(false);
  const vehicle = driver.vehicles[0];
  const token = vehicle?.qrCode?.token;
  if (!vehicle || !token) return null;
  const verifiedToken = token;
  const qrValue = `trisafe://verify/${verifiedToken}`;
  const transportStatus = driver.franchise?.status ?? driver.verification;
  const isVerified = transportStatus === "VERIFIED";
  const vehicleType = vehicle.vehicleType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  function downloadQr() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `trisafe-${vehicle.plateNumber}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    onDownloaded();
  }
  async function downloadOfficialLayout() {
    const canvas = canvasRef.current;
    if (!canvas || posterBusy) return;
    setPosterBusy(true);
    try {
      await downloadVehicleQrPoster(canvas, {
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.vehicleType,
      });
      onDownloaded();
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "The printable QR layout could not be downloaded.",
      );
    } finally {
      setPosterBusy(false);
    }
  }
  return (
    <ModalShell
      eyebrow="BPLO-ISSUED VEHICLE IDENTITY"
      title="Vehicle QR Code"
      description="Passengers scan this QR to verify the registered vehicle, driver, and franchise record."
      onClose={onClose}
      size="large"
      className="qr-code-modal"
      footer={
        <>
          <p className="qr-footer-note">
            <Info aria-hidden="true" /> This QR code is unique to this vehicle
            and should only be used for official purposes.
          </p>
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
            disabled={posterBusy}
            type="button"
          >
            <Download aria-hidden="true" />{" "}
            {posterBusy ? "Preparing layout…" : "Download printable layout"}
          </button>
        </>
      }
    >
      <div className="qr-modal-layout">
        <div className="qr-copy">
          <div
            className={`qr-status-banner ${isVerified ? "is-verified" : "is-restricted"}`}
          >
            <span className="qr-status-symbol">
              {isVerified ? (
                <Check aria-hidden="true" />
              ) : (
                <ShieldAlert aria-hidden="true" />
              )}
            </span>
            <div>
              <h3>
                {isVerified
                  ? "Ready for vehicle display"
                  : "Transport access restricted"}
              </h3>
              <p>
                {isVerified
                  ? "This vehicle is registered and verified in the live TriSafe registry."
                  : "This QR remains linked to the registry, but the vehicle is not currently eligible for rides."}
              </p>
            </div>
            <span className="qr-status-badge">
              {isVerified ? "Verified record" : transportStatus.toLowerCase()}
            </span>
          </div>
          <div className="qr-information-heading">
            <span className="qr-section-icon">
              <CarFront aria-hidden="true" />
            </span>
            <div>
              <h3>Vehicle information</h3>
              <p>Details passengers see when they scan this QR code.</p>
            </div>
          </div>
          <div className="qr-details">
            <div className="qr-detail-card">
              <span className="qr-detail-icon">
                {driver.avatarData ? (
                  <img src={driver.avatarData} alt="" />
                ) : (
                  <UserRound aria-hidden="true" />
                )}
              </span>
              <span>Driver</span>
              <b>{displayPersonName(driver.fullName)}</b>
              <small>Driver ID: {driver.id}</small>
            </div>
            <div className="qr-detail-card">
              <span className="qr-detail-icon">
                <CarFront aria-hidden="true" />
              </span>
              <span>Vehicle</span>
              <b>{vehicle.plateNumber}</b>
              <small>Type: {vehicleType}</small>
            </div>
            <div className="qr-detail-card">
              <span className="qr-detail-icon">
                <FileText aria-hidden="true" />
              </span>
              <span>Franchise</span>
              <b>{driver.franchise?.franchiseNumber ?? "Not assigned"}</b>
              <small>
                {transportStatus.charAt(0) +
                  transportStatus.slice(1).toLowerCase()}
              </small>
            </div>
          </div>
          <div className="qr-steps-card">
            <div className="qr-steps-heading">
              <span className="qr-section-icon">
                <UsersRound aria-hidden="true" />
              </span>
              <div>
                <h4>How passengers use this QR</h4>
                <p>A quick way to verify the vehicle before riding.</p>
              </div>
            </div>
            <ol>
              <li>
                <span>1</span>Passenger scans the QR code
              </li>
              <li>
                <span>2</span>System checks the live registry
              </li>
              <li>
                <span>3</span>Driver and franchise details appear
              </li>
            </ol>
          </div>
        </div>
        <div className="qr-preview-column">
          <div className="qr-official-preview">
            <div className="qr-poster-heading">
              <img src="/Logo/Trisafe-logo-icon.webp" alt="TriSafe logo" />
              <div>
                <strong>TriSafe</strong>
                <b>OFFICIAL VEHICLE QR</b>
                <small>BPLO Trinidad, Bohol</small>
              </div>
              <img src="/Logo/LOGO-transparent.webp" alt="BPLO Trinidad seal" />
            </div>
            <div className="qr-poster-code">
              <QRCodeCanvas
                ref={canvasRef}
                value={qrValue}
                size={512}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin
              />
              <div>
                <strong>SCAN TO VERIFY</strong>
                <b>
                  {vehicle.plateNumber} · {vehicleType}
                </b>
                <small>TriSafe Registry</small>
              </div>
            </div>
            <div className="qr-poster-bottom">
              <strong>
                Biyahing
                <br />
                Ligtas.
                <br />
                Trinidad!
              </strong>
              <small>
                Place this QR code inside the vehicle where passengers can
                easily scan it.
              </small>
            </div>
          </div>
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

function daysUntil(value: string) {
  const target = new Date(value);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function describeFranchiseTimeline(expiresAt?: string) {
  if (!expiresAt) return "Expiry date not recorded";
  const days = daysUntil(expiresAt);
  if (days < 0)
    return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today — renew now";
  if (days === 1) return "Expires tomorrow — renewal due";
  if (days <= 90) return `Expires in ${days} days — renewal due`;
  return `Expires ${formatDate(expiresAt)}`;
}

function describeQrIdentity(driver: Driver, status: DriverStatus) {
  const issued = driver.vehicles.some((vehicle) =>
    Boolean(vehicle.qrCode?.token),
  );
  if (!issued) {
    return {
      label: "QR not issued",
      className: "qr-identity-missing",
      help: "No BPLO-issued vehicle QR is available for passenger verification.",
    };
  }
  if ((driver.accountStatus ?? "ACTIVE") !== "ACTIVE") {
    return {
      label: "QR issued · account inactive",
      className: "qr-identity-warning",
      help: "An BPLO-issued QR exists, but the driver's account cannot sign in.",
    };
  }
  if (status !== "VERIFIED") {
    return {
      label: "QR issued · ride blocked",
      className: "qr-identity-warning",
      help: "An BPLO-issued QR exists, but the current transport status blocks passenger rides.",
    };
  }
  return {
    label: "BPLO-issued QR active",
    className: "qr-identity-active",
    help: "This official QR can verify the vehicle against the live TriSafe registry.",
  };
}
function driverStatusHelp(status: DriverStatus) {
  return status === "VERIFIED"
    ? "Valid franchise; eligible for QR verification and rides."
    : status === "SUSPENDED"
      ? "Manually suspended by the BPLO."
      : "Franchise expiration date has passed.";
}

function normalizeVehicleType(value: string) {
  return value.trim().toUpperCase().replace(/[ -]+/g, "_");
}

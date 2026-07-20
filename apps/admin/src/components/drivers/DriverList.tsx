import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Driver, DriverStatus } from "../../api";
import { DataToolbar, Pagination } from "../shared/DataControls";
import { EmptyState } from "../shared/Feedback";

const pageSize = 8;
const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "VERIFIED", label: "Verified" },
  { value: "PENDING", label: "Pending" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "EXPIRED", label: "Expired" },
];
type Props = {
  drivers: Driver[];
  onRegister: () => void;
  onViewQr: (driver: Driver) => void;
  onUpdateFranchise: (driver: Driver) => void;
  onUpdateStatus: (driver: Driver, status: DriverStatus) => Promise<void>;
};

export function DriverList({
  drivers,
  onRegister,
  onViewQr,
  onUpdateFranchise,
  onUpdateStatus,
}: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [changing, setChanging] = useState("");
  const [error, setError] = useState("");
  const filtered = useMemo(
    () =>
      drivers.filter((driver) => {
        const text =
          `${driver.fullName} ${driver.email ?? ""} ${driver.phone ?? ""} ${driver.licenseNumber} ${driver.franchise?.franchiseNumber ?? ""} ${driver.vehicles.map((vehicle) => vehicle.plateNumber).join(" ")}`.toLowerCase();
        const currentStatus = driver.franchise?.status ?? driver.verification;
        return (
          (!search || text.includes(search.toLowerCase())) &&
          (!status || currentStatus === status)
        );
      }),
    [drivers, search, status],
  );
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function changeStatus(driver: Driver, nextStatus: DriverStatus) {
    setChanging(driver.id);
    setError("");
    try {
      await onUpdateStatus(driver, nextStatus);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to change driver status.",
      );
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
        searchLabel="Search driver, plate, license, or franchise"
        filter={status}
        onFilter={(value) => {
          setStatus(value);
          setPage(1);
        }}
        filterLabel="Status"
        options={statusOptions}
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
            <span>Driver</span>
            <span>Vehicle</span>
            <span>Franchise</span>
            <span>Renewal</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {visible.map((driver) => (
            <DriverRow
              driver={driver}
              changing={changing === driver.id}
              onViewQr={onViewQr}
              onUpdateFranchise={onUpdateFranchise}
              onUpdateStatus={(nextStatus) => changeStatus(driver, nextStatus)}
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
    </section>
  );
}

function DriverRow({
  driver,
  changing,
  onViewQr,
  onUpdateFranchise,
  onUpdateStatus,
}: {
  driver: Driver;
  changing: boolean;
  onViewQr: (driver: Driver) => void;
  onUpdateFranchise: (driver: Driver) => void;
  onUpdateStatus: (status: DriverStatus) => Promise<void>;
}) {
  const vehicle = driver.vehicles[0];
  const status = (driver.franchise?.status ??
    driver.verification) as DriverStatus;
  return (
    <div className="data-row driver-table-row">
      <div className="identity-cell">
        <span className="avatar">{initials(driver.fullName)}</span>
        <span>
          <b>{driver.fullName}</b>
          <small>
            {driver.licenseNumber} · {driver.phone ?? "No phone"}
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
        <b>{formatDate(driver.renewalDate)}</b>
        <small>Driver renewal</small>
      </span>
      <span
        className={`status ${status.toLowerCase()}`}
        title={driverStatusHelp(status)}
      >
        {status}
      </span>
      <span className="row-menu">
        <button
          className="row-action"
          onClick={() => onUpdateFranchise(driver)}
          type="button"
        >
          Franchise
        </button>
        {status === "VERIFIED" && (
          <button
            className="row-action danger-action"
            disabled={changing}
            onClick={() => void onUpdateStatus("SUSPENDED")}
            type="button"
          >
            {changing ? "Updating…" : "Suspend"}
          </button>
        )}
        {(status === "PENDING" || status === "SUSPENDED") && (
          <button
            className="row-action"
            disabled={changing}
            onClick={() => void onUpdateStatus("VERIFIED")}
            type="button"
          >
            {changing ? "Updating…" : "Verify"}
          </button>
        )}
        <button
          className="row-action"
          disabled={!vehicle?.qrCode?.token}
          onClick={() => onViewQr(driver)}
          type="button"
        >
          View QR
        </button>
      </span>
    </div>
  );
}

function DriverStatusGuide() {
  return (
    <aside className="driver-status-guide" aria-label="Driver status guide">
      <strong>
        <span aria-hidden="true">i</span> Driver eligibility
      </strong>
      <div>
        <span
          className="status verified"
          title="Valid franchise and eligible for rides"
        >
          Verified
        </span>
        <span className="status pending" title="Waiting for LGU approval">
          Pending
        </span>
        <span className="status suspended" title="Manually blocked by the LGU">
          Suspended
        </span>
        <span
          className="status expired"
          title="Franchise expiration date has passed"
        >
          Expired
        </span>
      </div>
      <p>
        Expired status is applied automatically when franchise validity ends.
      </p>
    </aside>
  );
}

export function QrCodePanel({
  driver,
  onClose,
}: {
  driver: Driver;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehicle = driver.vehicles[0];
  const token = vehicle?.qrCode?.token;
  if (!vehicle || !token) return null;
  const qrValue = `trisafe://verify/${token}`;
  function downloadQr() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `trisafe-${vehicle.plateNumber}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
  return (
    <section className="card qr-panel">
      <div className="qr-copy">
        <span className="eyebrow">LGU-ISSUED VEHICLE IDENTITY</span>
        <h3>QR code ready for display</h3>
        <p>
          Print and place this code inside the vehicle where passengers can scan
          it safely. Scanning verifies this driver and franchise against the
          live registry.
        </p>
        <div className="qr-details">
          <div>
            <span>Driver</span>
            <b>{driver.fullName}</b>
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
        <div className="qr-actions">
          <button className="primary" onClick={downloadQr} type="button">
            Download PNG
          </button>
          <button className="secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
      <div className="qr-preview">
        <QRCodeCanvas
          ref={canvasRef}
          value={qrValue}
          size={196}
          bgColor="#ffffff"
          fgColor="#123f39"
          level="H"
          includeMargin
        />
      </div>
    </section>
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

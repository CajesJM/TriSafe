import { Download, Printer } from "lucide-react";
import type { Driver, RegisterDriverInput } from "../../api";
import { ModalShell } from "../shared/ModalShell";
import { displayPersonName } from "../../utils/personName";

export type DriverRegistrationReceiptData = {
  receiptNumber: string;
  generatedAt: string;
  driverId: string;
  ownerName: string;
  driverName: string;
  username: string;
  phone: string;
  initialPassword: string;
  accountStatus: string;
  driverStatus: string;
  addressLine: string;
  unitLabel: string;
  unitNumber: string;
  engineNumber: string;
  chassisNumber: string;
  plateNumber: string;
  vehicleType: string;
  franchiseNumber: string;
  franchiseIssuedAt: string;
  franchiseExpiresAt: string;
  franchiseStatus: string;
  qrStatus: string;
};

export function createDriverReceipt(
  driver: Driver,
  input: RegisterDriverInput,
): DriverRegistrationReceiptData {
  const vehicle = driver.vehicles[0];
  const generatedAt = new Date().toISOString();
  const habal = (vehicle?.vehicleType ?? input.vehicleType) === "HABAL_HABAL";
  const unitNumber =
    vehicle?.permitNumber ??
    vehicle?.bodyNumber ??
    input.permitNumber ??
    input.bodyNumber ??
    "Not assigned";
  return {
    receiptNumber: `TRI-${generatedAt.slice(0, 10).replaceAll("-", "")}-${driver.id.slice(-6).toUpperCase()}`,
    generatedAt,
    driverId: driver.id,
    ownerName: driver.owner
      ? `${driver.owner.lastName}, ${driver.owner.firstName}${driver.owner.middleName ? ` ${driver.owner.middleName}` : ""}`
      : `${input.ownerLastName}, ${input.ownerFirstName}${input.ownerMiddleName ? ` ${input.ownerMiddleName}` : ""}`,
    driverName: displayPersonName(driver.fullName),
    username: driver.username ?? "Not assigned",
    phone: driver.phone ?? input.phone,
    initialPassword: unitNumber,
    accountStatus: driver.accountStatus ?? "ACTIVE",
    driverStatus: driver.verification,
    addressLine: [
      driver.address?.purok ?? input.address.purok,
      driver.address?.barangayName ?? input.address.barangayName,
      driver.address?.municipalityName ?? input.address.municipalityName,
      "Bohol",
    ]
      .filter(Boolean)
      .join(", "),
    unitLabel: habal ? "Permit number" : "Body number",
    unitNumber,
    engineNumber: vehicle?.engineNumber ?? input.engineNumber,
    chassisNumber: vehicle?.chassisNumber ?? input.chassisNumber,
    plateNumber: vehicle?.plateNumber ?? input.plateNumber,
    vehicleType: vehicle?.vehicleType ?? input.vehicleType,
    franchiseNumber: driver.franchise?.franchiseNumber ?? input.franchiseNumber,
    franchiseIssuedAt: driver.franchise?.issuedAt ?? input.franchiseIssuedAt,
    franchiseExpiresAt: driver.franchise?.expiresAt ?? input.franchiseExpiresAt,
    franchiseStatus: driver.franchise?.status ?? driver.verification,
    qrStatus: vehicle?.qrCode?.token ? "Generated and active" : "Not generated",
  };
}

export function DriverRegistrationReceipt({
  receipt,
  onClose,
  onDownloaded,
  onError,
}: {
  receipt: DriverRegistrationReceiptData;
  onClose: () => void;
  onDownloaded: () => void;
  onError: (message: string) => void;
}) {
  const rows = receiptRows(receipt);
  function download() {
    const blob = new Blob([receiptDocument(receipt)], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trisafe-driver-receipt-${safeName(receipt.driverName)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onDownloaded();
  }
  function print() {
    const target = window.open("", "_blank");
    if (!target) {
      onError("Printing was blocked. Allow pop-ups and try again.");
      return;
    }
    target.opener = null;
    target.document.write(receiptDocument(receipt, true));
    target.document.close();
  }
  return (
    <ModalShell
      eyebrow="REGISTRATION COMPLETE"
      title="Driver registration receipt"
      description="Review the official registration details before printing or downloading the record."
      onClose={onClose}
      size="large"
      className="driver-receipt-modal"
      footer={
        <>
          <button className="secondary" type="button" onClick={print}>
            <Printer /> Print
          </button>
          <button className="primary" type="button" onClick={download}>
            <Download /> Download receipt
          </button>
        </>
      }
    >
      <div className="driver-receipt-heading">
        <div>
          <span>Receipt number</span>
          <strong>{receipt.receiptNumber}</strong>
        </div>
        <div>
          <span>Generated</span>
          <strong>{formatDateTime(receipt.generatedAt)}</strong>
        </div>
      </div>
      <div className="driver-receipt-uniform-grid">
        {rows.map(([label, value]) => (
          <div
            className={`driver-receipt-field ${label === "Initial password" ? "driver-receipt-initial-password" : ""}`}
            key={label}
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function receiptRows(
  receipt: DriverRegistrationReceiptData,
): [string, string][] {
  return [
    ["Owner / leader", receipt.ownerName],
    ["Driver name", receipt.driverName],
    ["Login identifier", receipt.username],
    ["Driver contact", receipt.phone],
    ["Initial password", receipt.initialPassword],
    ["Account status", receipt.accountStatus],
    ["Present address", receipt.addressLine],
    ["Vehicle type", receipt.vehicleType.replaceAll("_", " ")],
    [receipt.unitLabel, receipt.unitNumber],
    ["Engine number", receipt.engineNumber],
    ["Chassis number", receipt.chassisNumber],
    ["Plate number", receipt.plateNumber],
    ["Franchise number", receipt.franchiseNumber],
    ["Franchise issued", formatDate(receipt.franchiseIssuedAt)],
    ["Franchise expires", formatDate(receipt.franchiseExpiresAt)],
    ["Franchise status", receipt.franchiseStatus],
    ["Transport status", receipt.driverStatus],
    ["QR status", receipt.qrStatus],
  ];
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function safeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ] ?? c,
  );
}
function receiptDocument(
  receipt: DriverRegistrationReceiptData,
  autoPrint = false,
) {
  const rows = receiptRows(receipt);
  return `<!doctype html><html><head><meta charset="utf-8"><title>TriSafe Driver Receipt</title><style>body{margin:0;background:#f8f8f8;color:#202020;font-family:Arial,sans-serif}.page{max-width:760px;margin:32px auto;background:#fff;border-top:8px solid #337418;padding:40px}.brand{color:#337418;font-size:13px;font-weight:800;letter-spacing:.12em}h1{margin:8px 0}.meta{color:#666;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ddd;margin-top:22px}.row{padding:12px 14px;border-bottom:1px solid #eee}.row:nth-child(odd){border-right:1px solid #eee}.row span{display:block;color:#777;font-size:10px;text-transform:uppercase;letter-spacing:.06em}.row strong{display:block;margin-top:5px;font-size:13px;overflow-wrap:anywhere}.password{background:#dff7d4}@media print{body{background:#fff}.page{margin:0}}@media(max-width:600px){.grid{grid-template-columns:1fr}.row:nth-child(odd){border-right:0}.page{margin:0;padding:24px}}</style></head><body><main class="page"><div class="brand">TRISAFE · LGU DRIVER REGISTRY</div><h1>Driver registration receipt</h1><div class="meta">${escapeHtml(receipt.receiptNumber)} · ${escapeHtml(formatDateTime(receipt.generatedAt))}</div><section class="grid">${rows.map(([label, value]) => `<div class="row ${label === "Initial password" ? "password" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</section></main>${autoPrint ? "<script>window.addEventListener('load',()=>window.print())<\/script>" : ""}</body></html>`;
}

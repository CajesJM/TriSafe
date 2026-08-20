import { Download, KeyRound, LockKeyhole, Printer } from "lucide-react";
import type { ReactNode } from "react";
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
  temporaryPassword: string;
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
  return {
    receiptNumber: `TRI-${generatedAt.slice(0, 10).replaceAll("-", "")}-${driver.id.slice(-6).toUpperCase()}`,
    generatedAt,
    driverId: driver.id,
    ownerName: driver.owner
      ? `${driver.owner.lastName}, ${driver.owner.firstName}${driver.owner.middleName ? ` ${driver.owner.middleName}` : ""}`
      : `${input.ownerLastName}, ${input.ownerFirstName}${input.ownerMiddleName ? ` ${input.ownerMiddleName}` : ""}`,
    driverName: displayPersonName(driver.fullName),
    username:
      driver.username ?? (habal ? input.permitNumber! : input.bodyNumber!),
    phone: driver.phone ?? input.phone,
    temporaryPassword: input.temporaryPassword,
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
    unitNumber:
      vehicle?.permitNumber ??
      vehicle?.bodyNumber ??
      input.permitNumber ??
      input.bodyNumber ??
      "Not assigned",
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
  function download() {
    const blob = new Blob([documentHtml(receipt)], {
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
    target.document.write(documentHtml(receipt, true));
    target.document.close();
  }
  return (
    <ModalShell
      eyebrow="REGISTRATION COMPLETE"
      title="Driver registration receipt"
      description="Give this confidential credential record only to the registered driver."
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
      <div className="driver-receipt-alert">
        <LockKeyhole />
        <div>
          <strong>Confidential one-time document</strong>
          <span>
            The temporary password is stored only as a secure hash after
            registration.
          </span>
        </div>
      </div>
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
      <Section title="Driver account">
        <Field label="Driver name" value={receipt.driverName} />
        <Field label="Login identifier" value={receipt.username} />
        <Field label="Contact number" value={receipt.phone} />
        <Field label="Account status" value={receipt.accountStatus} />
        <div className="driver-receipt-password">
          <span>
            <KeyRound /> Temporary password
          </span>
          <strong>{receipt.temporaryPassword}</strong>
          <small>Change this after first sign-in.</small>
        </div>
      </Section>
      <Section title="Owner and present address">
        <Field label="Owner / leader" value={receipt.ownerName} />
        <Field label="Present address" value={receipt.addressLine} />
      </Section>
      <Section title="Vehicle identity">
        <Field
          label="Vehicle type"
          value={receipt.vehicleType.replaceAll("_", " ")}
        />
        <Field label={receipt.unitLabel} value={receipt.unitNumber} />
        <Field label="Engine number" value={receipt.engineNumber} />
        <Field label="Chassis number" value={receipt.chassisNumber} />
        <Field label="Plate number" value={receipt.plateNumber} />
        <Field label="QR status" value={receipt.qrStatus} />
      </Section>
      <Section title="Internal franchise control">
        <Field label="Franchise number" value={receipt.franchiseNumber} />
        <Field label="Issued" value={formatDate(receipt.franchiseIssuedAt)} />
        <Field label="Expires" value={formatDate(receipt.franchiseExpiresAt)} />
        <Field label="Status" value={receipt.franchiseStatus} />
        <Field label="Transport status" value={receipt.driverStatus} />
      </Section>
    </ModalShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="driver-receipt-section">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="driver-receipt-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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
function documentHtml(
  receipt: DriverRegistrationReceiptData,
  autoPrint = false,
) {
  const rows: [string, string][] = [
    ["Owner / leader", receipt.ownerName],
    ["Driver name", receipt.driverName],
    ["Login identifier", receipt.username],
    ["Driver contact", receipt.phone],
    ["Temporary password", receipt.temporaryPassword],
    ["Present address", receipt.addressLine],
    ["Vehicle type", receipt.vehicleType.replaceAll("_", " ")],
    [receipt.unitLabel, receipt.unitNumber],
    ["Engine number", receipt.engineNumber],
    ["Chassis number", receipt.chassisNumber],
    ["Plate number", receipt.plateNumber],
    ["Account status", receipt.accountStatus],
    ["Transport status", receipt.driverStatus],
    ["Franchise number", receipt.franchiseNumber],
    ["Franchise expires", formatDate(receipt.franchiseExpiresAt)],
    ["QR status", receipt.qrStatus],
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><title>TriSafe Driver Receipt</title><style>body{margin:0;background:#f8f8f8;color:#202020;font-family:Arial,sans-serif}.page{max-width:760px;margin:32px auto;background:#fff;border-top:8px solid #337418;padding:40px}.brand{color:#337418;font-size:13px;font-weight:800;letter-spacing:.12em}h1{margin:8px 0}.meta{color:#666;font-size:12px}.notice{margin:22px 0;padding:14px;background:#eef8e9;color:#245b11}.grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ddd}.row{padding:12px 14px;border-bottom:1px solid #eee}.row span{display:block;color:#777;font-size:10px;text-transform:uppercase}.row strong{display:block;margin-top:5px;font-size:13px;overflow-wrap:anywhere}.password{background:#dff7d4}@media print{body{background:#fff}.page{margin:0}}@media(max-width:600px){.grid{grid-template-columns:1fr}.page{margin:0;padding:24px}}</style></head><body><main class="page"><div class="brand">TRISAFE · LGU DRIVER REGISTRY</div><h1>Driver registration receipt</h1><div class="meta">${escapeHtml(receipt.receiptNumber)} · ${escapeHtml(formatDateTime(receipt.generatedAt))}</div><div class="notice"><strong>CONFIDENTIAL:</strong> Give this record only to the registered driver.</div><section class="grid">${rows.map(([l, v]) => `<div class="row ${l === "Temporary password" ? "password" : ""}"><span>${escapeHtml(l)}</span><strong>${escapeHtml(v)}</strong></div>`).join("")}</section></main>${autoPrint ? "<script>window.addEventListener('load',()=>window.print())<\/script>" : ""}</body></html>`;
}

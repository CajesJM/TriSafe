import { Download, KeyRound, LockKeyhole, Printer } from "lucide-react";
import type { ReactNode } from "react";
import type { Driver, RegisterDriverInput } from "../../api";
import { ModalShell } from "../shared/ModalShell";
import { displayPersonName } from "../../utils/personName";

export type DriverRegistrationReceiptData = {
  receiptNumber: string;
  generatedAt: string;
  driverId: string;
  fullName: string;
  email: string;
  phone: string;
  temporaryPassword: string;
  accountStatus: string;
  driverStatus: string;
  licenseNumber: string;
  renewalDate: string;
  addressLine: string;
  postalCode: string;
  franchiseNumber: string;
  franchiseIssuedAt: string;
  franchiseExpiresAt: string;
  franchiseStatus: string;
  plateNumber: string;
  vehicleType: string;
  qrStatus: string;
};

export function createDriverReceipt(
  driver: Driver,
  registration: RegisterDriverInput,
): DriverRegistrationReceiptData {
  const vehicle = driver.vehicles[0];
  const generatedAt = new Date().toISOString();
  return {
    receiptNumber: `TRI-${generatedAt.slice(0, 10).replaceAll("-", "")}-${driver.id.slice(-6).toUpperCase()}`,
    generatedAt,
    driverId: driver.id,
    fullName: displayPersonName(driver.fullName),
    email: driver.email ?? registration.email,
    phone: driver.phone ?? registration.phone,
    temporaryPassword: registration.temporaryPassword,
    accountStatus: driver.accountStatus ?? "ACTIVE",
    driverStatus: driver.verification,
    licenseNumber: driver.licenseNumber,
    renewalDate: driver.renewalDate,
    addressLine: formatAddress(driver, registration),
    postalCode: driver.address?.postalCode ?? registration.postalCode,
    franchiseNumber: driver.franchise?.franchiseNumber ?? registration.franchiseNumber,
    franchiseIssuedAt: driver.franchise?.issuedAt ?? registration.franchiseIssuedAt,
    franchiseExpiresAt: driver.franchise?.expiresAt ?? registration.franchiseExpiresAt,
    franchiseStatus: driver.franchise?.status ?? driver.verification,
    plateNumber: vehicle?.plateNumber ?? registration.plateNumber,
    vehicleType: vehicle?.vehicleType ?? registration.vehicleType,
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
  function downloadReceipt() {
    const blob = new Blob([receiptDocument(receipt)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trisafe-driver-receipt-${safeFileName(receipt.fullName)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onDownloaded();
  }

  function printReceipt() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      onError("Printing was blocked by the browser. Allow pop-ups for TriSafe and try again.");
      return;
    }
    printWindow.opener = null;
    printWindow.document.write(receiptDocument(receipt, true));
    printWindow.document.close();
  }

  return (
    <ModalShell
      eyebrow="REGISTRATION COMPLETE"
      title="Driver registration receipt"
      description="Download or print this one-time credential record before closing it."
      onClose={onClose}
      size="large"
      className="driver-receipt-modal"
      footer={
        <>
          <button className="secondary" type="button" onClick={printReceipt}><Printer aria-hidden="true" /> Print</button>
          <button className="primary" type="button" onClick={downloadReceipt}><Download aria-hidden="true" /> Download receipt</button>
        </>
      }
    >
      <div className="driver-receipt-alert" role="note">
        <LockKeyhole aria-hidden="true" />
        <div><strong>Confidential one-time document</strong><span>The temporary password is not stored in readable form by TriSafe. Give this receipt only to the registered driver.</span></div>
      </div>
      <div className="driver-receipt-heading">
        <div><span>Receipt number</span><strong>{receipt.receiptNumber}</strong></div>
        <div><span>Generated</span><strong>{formatDateTime(receipt.generatedAt)}</strong></div>
      </div>
      <ReceiptSection title="Account and credentials">
        <ReceiptField label="Full name" value={receipt.fullName} />
        <ReceiptField label="Email" value={receipt.email} />
        <ReceiptField label="Mobile number" value={receipt.phone} />
        <ReceiptField label="Account status" value={receipt.accountStatus} />
        <div className="driver-receipt-password"><span><KeyRound aria-hidden="true" /> Temporary password</span><strong>{receipt.temporaryPassword}</strong><small>Change this password after the first successful login.</small></div>
      </ReceiptSection>
      <ReceiptSection title="Verified Bohol address">
        <ReceiptField label="Address" value={receipt.addressLine} />
        <ReceiptField label="Postal/ZIP code" value={receipt.postalCode} />
      </ReceiptSection>
      <div className="driver-receipt-columns">
        <ReceiptSection title="License and driver status">
          <ReceiptField label="Driver ID" value={receipt.driverId} />
          <ReceiptField label="License number" value={receipt.licenseNumber} />
          <ReceiptField label="Renewal date" value={formatDate(receipt.renewalDate)} />
          <ReceiptField label="Driver status" value={receipt.driverStatus} />
        </ReceiptSection>
        <ReceiptSection title="Franchise details">
          <ReceiptField label="Franchise number" value={receipt.franchiseNumber} />
          <ReceiptField label="Issued date" value={formatDate(receipt.franchiseIssuedAt)} />
          <ReceiptField label="Expiration date" value={formatDate(receipt.franchiseExpiresAt)} />
          <ReceiptField label="Franchise status" value={receipt.franchiseStatus} />
        </ReceiptSection>
      </div>
      <ReceiptSection title="Vehicle and QR identity">
        <ReceiptField label="Plate number" value={receipt.plateNumber} />
        <ReceiptField label="Vehicle type" value={receipt.vehicleType.replaceAll("_", " ")} />
        <ReceiptField label="QR status" value={receipt.qrStatus} />
      </ReceiptSection>
    </ModalShell>
  );
}

function ReceiptSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="driver-receipt-section"><h3>{title}</h3><div>{children}</div></section>;
}
function ReceiptField({ label, value }: { label: string; value: string }) {
  return <div className="driver-receipt-field"><span>{label}</span><strong>{value}</strong></div>;
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}
function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
function receiptDocument(receipt: DriverRegistrationReceiptData, autoPrint = false) {
  const rows = [
    ["Full name", receipt.fullName], ["Email", receipt.email], ["Mobile number", receipt.phone],
    ["Temporary password", receipt.temporaryPassword], ["Account status", receipt.accountStatus],
    ["Driver ID", receipt.driverId], ["Driver status", receipt.driverStatus],
    ["Verified address", receipt.addressLine], ["Postal/ZIP code", receipt.postalCode],
    ["License number", receipt.licenseNumber], ["License renewal", formatDate(receipt.renewalDate)],
    ["Franchise number", receipt.franchiseNumber], ["Franchise issued", formatDate(receipt.franchiseIssuedAt)],
    ["Franchise expiration", formatDate(receipt.franchiseExpiresAt)], ["Franchise status", receipt.franchiseStatus],
    ["Plate number", receipt.plateNumber], ["Vehicle type", receipt.vehicleType.replaceAll("_", " ")], ["QR status", receipt.qrStatus],
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><title>TriSafe Driver Receipt</title><style>body{margin:0;background:#f8f8f8;color:#202020;font-family:Arial,sans-serif}.page{max-width:760px;margin:32px auto;background:#fff;border-top:8px solid #337418;padding:40px;box-shadow:0 10px 35px #0001}.brand{color:#337418;font-size:13px;font-weight:800;letter-spacing:.12em}.title{margin:8px 0 4px;font-size:28px}.meta{color:#666;font-size:12px}.notice{margin:24px 0;padding:14px 16px;border-radius:8px;background:#eef8e9;color:#245b11;font-size:12px;line-height:1.5}.grid{display:grid;grid-template-columns:1fr 1fr;margin-top:20px;border:1px solid #ddd}.row{min-width:0;border-bottom:1px solid #eee;padding:12px 14px}.row:nth-child(odd){border-right:1px solid #eee}.row span{display:block;color:#777;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.row strong{display:block;margin-top:5px;font-size:13px;overflow-wrap:anywhere}.password{color:#0f0f0f;background:#dff7d4}.footer{margin-top:24px;border-top:1px solid #ddd;padding-top:14px;color:#777;font-size:10px;line-height:1.5}@media print{body{background:#fff}.page{margin:0;box-shadow:none}}@media(max-width:600px){.page{margin:0;padding:24px}.grid{grid-template-columns:1fr}.row:nth-child(odd){border-right:0}}</style></head><body><main class="page"><div class="brand">TRISAFE · LGU ADMIN PORTAL</div><h1 class="title">Driver registration receipt</h1><div class="meta">${escapeHtml(receipt.receiptNumber)} · ${escapeHtml(formatDateTime(receipt.generatedAt))}</div><div class="notice"><strong>CONFIDENTIAL:</strong> Give this receipt only to the registered driver. The temporary password must be changed after first login.</div><section class="grid">${rows.map(([label, value]) => `<div class="row ${label === "Temporary password" ? "password" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</section><p class="footer">This document confirms that the listed account, franchise, vehicle, and QR identity were created in TriSafe. Passwords are stored by the system only as secure hashes; this one-time receipt is the only readable copy generated during registration.</p></main>${autoPrint ? "<script>window.addEventListener('load',()=>window.print())<\/script>" : ""}</body></html>`;
}

function formatAddress(driver: Driver, registration: RegisterDriverInput) {
  const address = driver.address;
  return [
    address?.streetPurok ?? registration.streetPurok,
    address?.barangayName ?? registration.barangayName,
    address?.municipalityName ?? registration.municipalityName,
    address?.provinceName ?? registration.provinceName,
  ].filter(Boolean).join(", ");
}

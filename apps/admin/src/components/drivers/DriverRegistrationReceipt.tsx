import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Download, FileCheck2, FileText, Info, Printer, ShieldCheck, UserRound } from "lucide-react";
import type { Driver, RegisterDriverInput } from "../../api";
import {
  createDriverRegistrationFileBlob,
  driverFileFormats,
  type DriverFileFormat,
  type DriverRegistrationFileData,
} from "../../utils/driverRegistrationFile";
import { displayPersonName } from "../../utils/personName";
import { ModalShell } from "../shared/ModalShell";

export type DriverRegistrationReceiptData = {
  receiptNumber: string;
  generatedAt: string;
  driverId: string;
  ownerName: string;
  driverName: string;
  username: string;
  phone: string;
  avatarData?: string | null;
  initialPassword: string;
  accountStatus: string;
  driverStatus: string;
  province: string;
  municipality: string;
  barangay: string;
  purok: string;
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
    vehicle?.permitNumber ?? vehicle?.bodyNumber ?? input.permitNumber ??
    input.bodyNumber ?? "Not assigned";

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
    avatarData: driver.avatarData ?? input.avatarData,
    initialPassword: unitNumber,
    accountStatus: driver.accountStatus ?? "ACTIVE",
    driverStatus: driver.verification,
    province: driver.address?.provinceName ?? input.address.provinceName,
    municipality: driver.address?.municipalityName ?? input.address.municipalityName,
    barangay: driver.address?.barangayName ?? input.address.barangayName,
    purok: driver.address?.purok ?? input.address.purok,
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
    qrStatus: vehicle?.qrCode?.token ? "Generated" : "Not generated",
  };
}

export function DriverRegistrationReceipt({ receipt, onClose, onDownloaded, onError }: {
  receipt: DriverRegistrationReceiptData;
  onClose: () => void;
  onDownloaded: () => void;
  onError: (message: string) => void;
}) {
  const [format, setFormat] = useState<DriverFileFormat>("pdf");
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const formatControl = useRef<HTMLDivElement>(null);
  const file = useMemo(() => createReceiptFileData(receipt), [receipt]);
  const selectedFormat = driverFileFormats.find((item) => item.value === format)!;

  useEffect(() => {
    if (!formatMenuOpen) return;
    function closeMenu(event: PointerEvent) {
      if (!formatControl.current?.contains(event.target as Node)) setFormatMenuOpen(false);
    }
    function closeWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setFormatMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeWithKeyboard);
    };
  }, [formatMenuOpen]);

  function download() {
    setDownloading(true);
    try {
      const extension = driverFileFormats.find((item) => item.value === format)?.extension ?? ".html";
      downloadBlob(
        createDriverRegistrationFileBlob(file, format),
        `trisafe-driver-${safeName(receipt.driverName)}${extension}`,
      );
      onDownloaded();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to generate the driver registration file.");
    } finally {
      setDownloading(false);
    }
  }

  function preview() {
    const url = URL.createObjectURL(createDriverRegistrationFileBlob(file, "pdf"));
    const target = window.open(url, "_blank");
    if (!target) {
      URL.revokeObjectURL(url);
      onError("Preview was blocked. Allow pop-ups and try again.");
      return;
    }
    target.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <ModalShell
      eyebrow="REGISTRATION RECORD"
      title={`${receipt.driverName}'s File`}
      description="Review the newly created record before choosing a download format."
      onClose={onClose}
      busy={downloading}
      size="large"
      className="driver-file-modal driver-receipt-modal"
    >
      <div className="driver-record-layout">
        <aside className="driver-record-sidebar">
          <div className="driver-record-person">
            <span className={`driver-record-avatar${receipt.avatarData ? " has-photo" : ""}`}>
              {receipt.avatarData ? (
                <img src={receipt.avatarData} alt={`${receipt.driverName} profile`} />
              ) : (
                <UserRound aria-hidden="true" />
              )}
            </span>
            <div>
              <h3>{receipt.driverName}</h3>
              <FileStatus value={receipt.accountStatus} label={`${titleCase(receipt.accountStatus)} driver`} />
            </div>
          </div>
          <dl className="driver-record-quick-facts">
            <div><dt>Driver ID</dt><dd>{receipt.driverId}</dd></div>
            <div><dt>Mobile number</dt><dd>{receipt.phone}</dd></div>
          </dl>
          <div className="driver-record-download-control" ref={formatControl}>
            <div className="driver-record-download-split">
              <button className="driver-record-primary-action" type="button" onClick={download} disabled={downloading}>
                <Download aria-hidden="true" /> {downloading ? "Generating…" : "Download record"}
              </button>
              <button
                className="driver-record-format-trigger"
                type="button"
                aria-label={`Choose file type. Current selection: ${selectedFormat.label}`}
                aria-haspopup="menu"
                aria-expanded={formatMenuOpen}
                onClick={() => setFormatMenuOpen((open) => !open)}
                disabled={downloading}
              >
                <ChevronDown aria-hidden="true" />
              </button>
            </div>
            {formatMenuOpen && (
              <div className="driver-record-format-menu" role="menu" aria-label="File type">
                <span>Download as</span>
                {driverFileFormats.map((item) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={item.value === format}
                    className={item.value === format ? "selected" : ""}
                    key={item.value}
                    onClick={() => { setFormat(item.value); setFormatMenuOpen(false); }}
                  >
                    <span><strong>{item.label}</strong><small>{item.extension}</small></span>
                    {item.value === format && <Check aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="driver-record-print" type="button" onClick={preview} disabled={downloading}>
            <Printer aria-hidden="true" /> Print / Preview
          </button>
          <div className="driver-record-current-view">
            <FileText aria-hidden="true" />
            <div><strong>Registration record</strong><span>Complete driver and vehicle details</span></div>
          </div>
          <div className="driver-record-note">
            <Info aria-hidden="true" />
            <p>Save the initial password securely and ask the driver to change it after signing in.</p>
          </div>
          <div className="driver-record-brand" aria-label="TriSafe BPLO Driver Registry">
            <ShieldCheck aria-hidden="true" />
            <strong>TRISAFE</strong>
            <span>Safe Transport<br />A Stronger Trinidad</span>
          </div>
        </aside>

        <section className="driver-record-workspace">
          <header className="driver-record-workspace-heading">
            <span className="driver-record-file-icon" aria-hidden="true"><FileCheck2 /></span>
            <div>
              <h3>Driver registration file</h3>
              <p>Generated {formatDateTime(file.generatedAt)} from the completed registration</p>
            </div>
          </header>
          <article className="driver-record-document" aria-label="New driver registration file preview">
            <header className="driver-record-document-header">
              <div className="driver-record-document-brand">
                <ShieldCheck aria-hidden="true" />
                <div><strong>TRISAFE</strong><span>BPLO Driver Registry</span></div>
              </div>
              <div className="driver-record-document-tagline">Safe transport<br />A stronger Trinidad</div>
            </header>
            <h2>Driver Registration Record</h2>
            <p className="driver-record-document-meta">
              Generated {formatDateTime(file.generatedAt)} from the TriSafe registration record
            </p>
            {file.sections.map((section, index) => (
              <section className="driver-record-section" key={section.title}>
                <h3><span>{index + 1}</span>{section.title}</h3>
                <dl>
                  {section.fields.map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{isStatusField(field.label) ? <FileStatus value={field.value} /> : field.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <footer className="driver-record-document-footer">
              This record was generated when the driver account was created. Keep the initial password private and verify all information before relying on a downloaded copy.
              <strong>TriSafe · BPLO Trinidad, Bohol</strong>
            </footer>
          </article>
        </section>
      </div>
    </ModalShell>
  );
}

function createReceiptFileData(receipt: DriverRegistrationReceiptData): DriverRegistrationFileData {
  return {
    generatedAt: receipt.generatedAt,
    title: "Driver registration file",
    subtitle: "New account record from the TriSafe LGU Driver Registry",
    sections: [
      {
        title: "Driver account and contact",
        fields: [
          { label: "Driver name", value: receipt.driverName },
          { label: "Login identifier", value: receipt.username },
          { label: "Initial password", value: receipt.initialPassword },
          { label: "Mobile number", value: receipt.phone },
          { label: "Account status", value: receipt.accountStatus },
          { label: "Driver ID", value: receipt.driverId },
        ],
      },
      {
        title: "Owner and transport eligibility",
        fields: [
          { label: "Owner / organization leader", value: receipt.ownerName },
          { label: "Transport status", value: receipt.driverStatus },
        ],
      },
      {
        title: "Registered address",
        fields: [
          { label: "Province", value: receipt.province },
          { label: "Municipality / City", value: receipt.municipality },
          { label: "Barangay", value: receipt.barangay },
          { label: "Purok", value: receipt.purok },
        ],
      },
      {
        title: "Franchise details",
        fields: [
          { label: "Franchise number", value: receipt.franchiseNumber },
          { label: "Franchise issued", value: formatDate(receipt.franchiseIssuedAt) },
          { label: "Franchise expiration", value: formatDate(receipt.franchiseExpiresAt) },
          { label: "Franchise status", value: receipt.franchiseStatus },
        ],
      },
      {
        title: "Vehicle and QR identity",
        fields: [
          { label: "Plate number", value: receipt.plateNumber },
          { label: "Vehicle type", value: receipt.vehicleType.replaceAll("_", " ") },
          { label: receipt.unitLabel, value: receipt.unitNumber },
          { label: "Engine number", value: receipt.engineNumber },
          { label: "Chassis number", value: receipt.chassisNumber },
          { label: "LGU QR status", value: receipt.qrStatus },
        ],
      },
    ],
  };
}

function FileStatus({ value, label }: { value: string; label?: string }) {
  const normalized = value.toLowerCase();
  const negative = normalized.includes("expired") || normalized.includes("suspend") ||
    normalized.includes("inactive") || normalized.includes("not ");
  return <span className={`driver-record-status ${negative ? "negative" : "positive"}`}>
    <i aria-hidden="true" /> {label ?? titleCase(value)}
  </span>;
}

function isStatusField(label: string) {
  return label.toLowerCase().includes("status");
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

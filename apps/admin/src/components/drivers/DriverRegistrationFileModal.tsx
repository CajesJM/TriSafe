import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileCheck2,
  FileText,
  Info,
  Printer,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Driver } from "../../api";
import {
  createDriverRegistrationFileData,
  createDriverRegistrationFileBlob,
  downloadDriverRegistrationFile,
  driverFileFormats,
  type DriverFileFormat,
} from "../../utils/driverRegistrationFile";
import { displayPersonName } from "../../utils/personName";
import { ModalShell } from "../shared/ModalShell";

export function DriverRegistrationFileModal({
  driver,
  onClose,
  onDownloaded,
  onError,
}: {
  driver: Driver;
  onClose: () => void;
  onDownloaded: (format: DriverFileFormat) => void;
  onError: (message: string) => void;
}) {
  const [format, setFormat] = useState<DriverFileFormat>("pdf");
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const formatControl = useRef<HTMLDivElement>(null);
  const file = useMemo(
    () => createDriverRegistrationFileData(driver),
    [driver],
  );
  const selectedFormat = driverFileFormats.find((item) => item.value === format)!;

  useEffect(() => {
    if (!formatMenuOpen) return;
    function closeMenu(event: PointerEvent) {
      if (!formatControl.current?.contains(event.target as Node))
        setFormatMenuOpen(false);
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
      downloadDriverRegistrationFile(driver, format);
      onDownloaded(format);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Unable to generate the driver registration file.",
      );
    } finally {
      setDownloading(false);
    }
  }

  function preview() {
    const url = URL.createObjectURL(
      createDriverRegistrationFileBlob(file, "pdf"),
    );
    const target = window.open(url, "_blank");
    if (!target) {
      URL.revokeObjectURL(url);
      onError("Preview was blocked. Allow pop-ups and try again.");
      return;
    }
    target.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const displayName = displayPersonName(driver.fullName);

  return (
    <ModalShell
      eyebrow="REGISTRATION RECORD"
      title={`${displayName}'s File`}
      description="Review the current database record before choosing a download format."
      onClose={onClose}
      busy={downloading}
      size="large"
      className="driver-file-modal driver-receipt-modal"
    >
      <div className="driver-record-layout">
        <aside className="driver-record-sidebar">
          <div className="driver-record-person">
            <span
              className={`driver-record-avatar${driver.avatarData ? " has-photo" : ""}`}
            >
              {driver.avatarData ? (
                <img src={driver.avatarData} alt={`${displayName} profile`} />
              ) : (
                <UserRound aria-hidden="true" />
              )}
            </span>
            <div>
              <h3>{displayName}</h3>
              <FileStatus
                value={driver.accountStatus ?? "ACTIVE"}
                label={`${titleCase(driver.accountStatus ?? "ACTIVE")} driver`}
              />
            </div>
          </div>
          <dl className="driver-record-quick-facts">
            <div>
              <dt>Driver ID</dt>
              <dd>{driver.id}</dd>
            </div>
            <div>
              <dt>Mobile number</dt>
              <dd>{driver.phone ?? "Not recorded"}</dd>
            </div>
          </dl>
          <div className="driver-record-download-control" ref={formatControl}>
            <div className="driver-record-download-split">
              <button
                className="driver-record-primary-action"
                type="button"
                onClick={download}
                disabled={downloading}
              >
                <Download aria-hidden="true" />{" "}
                {downloading ? "Generating…" : "Download record"}
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
                    onClick={() => {
                      setFormat(item.value);
                      setFormatMenuOpen(false);
                    }}
                  >
                    <span><strong>{item.label}</strong><small>{item.extension}</small></span>
                    {item.value === format && <Check aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="driver-record-print"
            type="button"
            onClick={preview}
            disabled={downloading}
          >
            <Printer aria-hidden="true" /> Print / Preview
          </button>
          <div className="driver-record-current-view">
            <FileText aria-hidden="true" />
            <div>
              <strong>Registration record</strong>
              <span>Complete driver and vehicle details</span>
            </div>
          </div>
          <div className="driver-record-note">
            <Info aria-hidden="true" />
            <p>
              Use this record to verify the driver account, transport
              eligibility, and franchise status.
            </p>
          </div>
          <div
            className="driver-record-brand"
            aria-label="TriSafe BPLO Driver Registry"
          >
            <ShieldCheck aria-hidden="true" />
            <strong>TRISAFE</strong>
            <span>
              Safe Transport
              <br />A Stronger Trinidad
            </span>
          </div>
        </aside>

        <section className="driver-record-workspace">
          <header className="driver-record-workspace-heading">
            <span className="driver-record-file-icon" aria-hidden="true">
              <FileCheck2 />
            </span>
            <div>
              <h3>Driver registration file</h3>
              <p>
                Generated {formatDateTime(file.generatedAt)} from live registry
                data
              </p>
            </div>
          </header>

          <article
            className="driver-record-document"
            aria-label="Driver registration file preview"
          >
            <header className="driver-record-document-header">
              <div className="driver-record-document-brand">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>TRISAFE</strong>
                  <span>BPLO Driver Registry</span>
                </div>
              </div>
              <div className="driver-record-document-tagline">
                Safe transport
                <br />A stronger Trinidad
              </div>
            </header>
            <h2>Driver Registration Record</h2>
            <p className="driver-record-document-meta">
              Generated {formatDateTime(file.generatedAt)} from the live TriSafe
              registry
            </p>
            {file.sections.map((section, index) => (
              <section className="driver-record-section" key={section.title}>
                <h3>
                  <span>{index + 1}</span>
                  {section.title}
                </h3>
                <dl>
                  {section.fields.map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>
                        {isStatusField(field.label) ? (
                          <FileStatus value={field.value} />
                        ) : (
                          field.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <footer className="driver-record-document-footer">
              This record was generated from the live TriSafe registry. Verify
              all information before relying on a downloaded copy.
              <strong>TriSafe · BPLO Trinidad, Bohol</strong>
            </footer>
          </article>
        </section>
      </div>
    </ModalShell>
  );
}

function FileStatus({ value, label }: { value: string; label?: string }) {
  const normalized = value.toLowerCase();
  const negative =
    normalized.includes("expired") ||
    normalized.includes("suspend") ||
    normalized.includes("inactive") ||
    normalized.includes("not ");
  return (
    <span
      className={`driver-record-status ${negative ? "negative" : "positive"}`}
    >
      <i aria-hidden="true" /> {label ?? titleCase(value)}
    </span>
  );
}

function isStatusField(label: string) {
  return label.toLowerCase().includes("status");
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

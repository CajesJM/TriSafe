import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import type { Driver } from "../../api";
import {
  createDriverRegistrationFileData,
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
  const [downloading, setDownloading] = useState(false);
  const file = useMemo(() => createDriverRegistrationFileData(driver), [driver]);
  const selectedFormat = driverFileFormats.find((item) => item.value === format)!;

  function download() {
    setDownloading(true);
    try {
      downloadDriverRegistrationFile(driver, format);
      onDownloaded(format);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to generate the driver registration file.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ModalShell
      eyebrow="REGISTRATION RECORD"
      title={`${displayPersonName(driver.fullName)}'s file`}
      description="Review the current database record before choosing a download format."
      onClose={onClose}
      busy={downloading}
      size="large"
      className="driver-file-modal"
      footer={
        <>
          <button className="secondary" type="button" onClick={onClose} disabled={downloading}>Close</button>
          <label className="driver-file-format">
            <span>File type</span>
            <select value={format} onChange={(event) => setFormat(event.target.value as DriverFileFormat)} disabled={downloading}>
              {driverFileFormats.map((item) => <option key={item.value} value={item.value}>{item.label} ({item.extension})</option>)}
            </select>
          </label>
          <button className="primary" type="button" onClick={download} disabled={downloading}>
            <Download aria-hidden="true" /> {downloading ? "Generating…" : `Download ${selectedFormat.extension}`}
          </button>
        </>
      }
    >
      <article className="driver-file-preview" aria-label="Driver registration file preview">
        <header>
          <div className="driver-file-brand"><FileText aria-hidden="true" /><span>TRISAFE</span></div>
          <p>LGU DRIVER REGISTRY</p>
          <h3>{file.title}</h3>
          <small>Generated {formatDateTime(file.generatedAt)} from live registry data</small>
        </header>
        {file.sections.map((section) => (
          <section key={section.title}>
            <h4>{section.title}</h4>
            <div>
              {section.fields.map((field) => (
                <dl key={field.label}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </dl>
              ))}
            </div>
          </section>
        ))}
        <footer>Confirm current account and transport eligibility through the live TriSafe registry before relying on a downloaded copy.</footer>
      </article>
    </ModalShell>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  FileWarning,
  Info,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Driver, UpdateFranchiseInput } from "../../api";
import { ModalShell } from "../shared/ModalShell";
import { displayPersonName } from "../../utils/personName";

export function FranchiseEditor({
  driver,
  onCancel,
  onSave,
  onError,
}: {
  driver: Driver;
  onCancel: () => void;
  onSave: (input: UpdateFranchiseInput) => Promise<void>;
  onError: (message: string) => void;
}) {
  const franchise = driver.franchise;
  const [status, setStatus] = useState<UpdateFranchiseInput["status"]>(
    (franchise?.status as UpdateFranchiseInput["status"]) ?? "VERIFIED",
  );
  const [expiresAt, setExpiresAt] = useState(
    franchise?.expiresAt?.slice(0, 10) ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [informationOpen, setInformationOpen] = useState(false);
  const [informationClosing, setInformationClosing] = useState(false);
  const informationControl = useRef<HTMLDivElement>(null);
  const currentStatus = franchise?.status ?? driver.verification;
  const currentStatusLabel = statusLabel(currentStatus);
  const expirationLabel = franchise?.expiresAt
    ? formatFranchiseDate(franchise.expiresAt)
    : "No expiration date";

  useEffect(() => {
    if (!informationOpen || informationClosing) return;
    const dismissTimer = window.setTimeout(
      () => setInformationClosing(true),
      5_000,
    );
    function closeOutside(event: PointerEvent) {
      if (!informationControl.current?.contains(event.target as Node))
        setInformationClosing(true);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.clearTimeout(dismissTimer);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [informationClosing, informationOpen]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
      const message = "Select a valid franchise expiration date.";
      setError(message);
      onError(message);
      return;
    }
    if (status === "VERIFIED" && expiresAt <= localDate()) {
      const message =
        "A verified driver must have a future franchise expiration date.";
      setError(message);
      onError(message);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        status,
        expiresAt: new Date(`${expiresAt}T23:59:59+08:00`).toISOString(),
      });
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Unable to update the franchise.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      eyebrow="FRANCHISE MANAGEMENT"
      title={`Update ${displayPersonName(driver.fullName)}`}
      description="Control transport eligibility and keep the BPLO franchise expiration record current."
      onClose={onCancel}
      busy={saving}
      size="large"
      className="franchise-modal"
      headerAction={
        <div className="franchise-info-control" ref={informationControl}>
          <button
            type="button"
            aria-label="Show franchise information"
            aria-expanded={informationOpen && !informationClosing}
            aria-controls="franchise-information"
            onClick={() => {
              if (informationOpen) {
                setInformationClosing(true);
                return;
              }
              setInformationClosing(false);
              setInformationOpen(true);
            }}
          >
            <Info aria-hidden="true" />
          </button>
          {informationOpen && (
            <div
              id="franchise-information"
              className={`franchise-info-popover${informationClosing ? " closing" : ""}`}
              role="status"
              onAnimationEnd={() => {
                if (!informationClosing) return;
                setInformationOpen(false);
                setInformationClosing(false);
              }}
            >
              <strong>Automatic protection</strong>
              <p>
                If the expiration date passes, TriSafe automatically marks the
                franchise and driver as Expired.
              </p>
            </div>
          )}
        </div>
      }
      footer={
        <>
          <button
            className="secondary"
            onClick={onCancel}
            disabled={saving}
            type="button"
          >
            Cancel
          </button>
          <button
            className="primary"
            form="franchise-update-form"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <div
        className={`franchise-modal-summary franchise-modal-summary-${currentStatus.toLowerCase()}`}
      >
        <span className="franchise-summary-icon">
          {currentStatus === "EXPIRED" ? (
            <FileWarning aria-hidden="true" />
          ) : currentStatus === "SUSPENDED" ? (
            <ShieldAlert aria-hidden="true" />
          ) : (
            <ShieldCheck aria-hidden="true" />
          )}
        </span>
        <div className="franchise-summary-item franchise-number-summary">
          <small>Franchise number</small>
          <strong>{franchise?.franchiseNumber ?? "Not assigned"}</strong>
        </div>
        <div className="franchise-summary-item franchise-status-summary">
          <small>Current status</small>
          <strong className={`franchise-status-pill ${currentStatus.toLowerCase()}`}>
            <i aria-hidden="true" /> {currentStatusLabel}
          </strong>
          <span>{statusTimeline(currentStatus, expirationLabel)}</span>
        </div>
        <div className="franchise-summary-account">
          <UsersRound aria-hidden="true" />
          <p>The driver account follows franchise eligibility.</p>
        </div>
      </div>
      {error && (
        <div className="error franchise-modal-error" role="alert">
          {error}
        </div>
      )}
      <div className="franchise-details-heading">
        <h3>Franchise details</h3>
        <p>Update the driver’s franchise status and expiration date.</p>
      </div>
      <form
        id="franchise-update-form"
        className="franchise-modal-form"
        onSubmit={submit}
        noValidate
      >
        <label className="field">
          <span>
            Driver and franchise status <em>*</em>
          </span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as UpdateFranchiseInput["status"]);
              setError("");
            }}
            required
          >
            <option value="VERIFIED">Verified — eligible for rides</option>
            <option value="SUSPENDED">Suspended — temporarily blocked</option>
            <option value="EXPIRED">Expired — franchise ended</option>
          </select>
          <small className="field-input-hint">
            The selected status applies to both the driver and franchise.
          </small>
        </label>
        <label className="field">
          <span>
            Franchise expiration date <em>*</em>
          </span>
          <div className="franchise-date-input">
            <CalendarClock aria-hidden="true" />
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => {
                setExpiresAt(event.target.value);
                setError("");
              }}
              required
            />
          </div>
          <small className="field-input-hint">
            Verified status requires a date later than today.
          </small>
        </label>
      </form>
    </ModalShell>
  );
}

function formatFranchiseDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function statusTimeline(status: string, expiration: string) {
  if (status === "EXPIRED") return `Expired since ${expiration}`;
  if (status === "SUSPENDED") return `Franchise expires ${expiration}`;
  return `Valid until ${expiration}`;
}

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

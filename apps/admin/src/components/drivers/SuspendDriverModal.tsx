import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CarFront,
  FileText,
  Hash,
  IdCard,
  Info,
  Phone,
  UserRound,
} from "lucide-react";
import type { Driver } from "../../api";
import { displayPersonName } from "../../utils/personName";
import { ModalShell } from "../shared/ModalShell";

const commonReasons = [
  "Franchise expired",
  "Safety violation",
  "Invalid documents",
  "Vehicle not roadworthy",
  "Received multiple complaints",
  "Unauthorized route operation",
  "Unregistered vehicle or unit",
  "Other",
];

export function SuspendDriverModal({
  driver,
  onClose,
  onConfirm,
  onError,
}: {
  driver: Driver;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [informationOpen, setInformationOpen] = useState(false);
  const [informationClosing, setInformationClosing] = useState(false);
  const informationControl = useRef<HTMLDivElement>(null);
  const vehicle = driver.vehicles[0];
  const displayName = displayPersonName(driver.fullName);
  const ownerName = driver.owner
    ? displayPersonName(
        `${driver.owner.lastName}, ${driver.owner.firstName}${driver.owner.middleName ? ` ${driver.owner.middleName}` : ""}`,
      )
    : "Not recorded";
  const unitLabel =
    vehicle?.vehicleType === "HABAL_HABAL" ? "Permit Number" : "Body Number";
  const unitNumber =
    vehicle?.vehicleType === "HABAL_HABAL"
      ? vehicle.permitNumber
      : vehicle?.bodyNumber;

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
    const cleanReason = reason.trim().replace(/\s+/g, " ");
    if (cleanReason.length < 10)
      return fail(
        "Provide a clear suspension reason of at least 10 characters.",
      );
    if (cleanReason.length > 500)
      return fail("Suspension reason cannot exceed 500 characters.");
    if (!acknowledged)
      return fail(
        "Confirm that you understand this blocks QR and ride eligibility.",
      );
    setSaving(true);
    try {
      await onConfirm(cleanReason);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to suspend this driver.";
      onError(message);
      setSaving(false);
    }
  }

  function fail(message: string) {
    onError(message);
  }

  function chooseReason(value: string) {
    setReason(value === "Other" ? "" : value);
  }

  return (
    <ModalShell
      eyebrow="CRITICAL TRANSPORT ACTION"
      title={`Suspend ${displayName}`}
      description="This immediately blocks the driver’s QR and ride eligibility. Account login access will remain unchanged."
      onClose={onClose}
      busy={saving}
      size="large"
      className="suspend-driver-modal"
      headerAction={
        <div className="suspension-info-control" ref={informationControl}>
          <button
            type="button"
            aria-label="Show suspension information"
            aria-expanded={informationOpen && !informationClosing}
            aria-controls="suspension-information"
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
              id="suspension-information"
              className={`suspension-info-popover${informationClosing ? " closing" : ""}`}
              role="status"
              onAnimationEnd={() => {
                if (!informationClosing) return;
                setInformationOpen(false);
                setInformationClosing(false);
              }}
            >
              <strong>What suspension changes</strong>
              <p>
                The driver remains registered and can still sign in, but their
                QR will warn passengers and new rides will be blocked until
                transport access is verified again.
              </p>
            </div>
          )}
        </div>
      }
      footer={
        <>
          <button
            className="secondary"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="danger-confirm-button"
            type="submit"
            form="suspend-driver-form"
            disabled={saving}
          >
            {saving ? "Suspending…" : "Suspend transport"}
          </button>
        </>
      }
    >
      <div className="suspension-layout">
        <aside className="suspension-context">
          <h3>
            Suspend Driver
            <br />
            Transport Access
          </h3>
          <p>
            This action immediately blocks the driver’s QR and prevents ride
            eligibility. The driver will be notified about this action.
          </p>
          <div className="suspension-driver-card">
            <span
              className={`suspension-driver-avatar${driver.avatarData ? " has-photo" : ""}`}
            >
              {driver.avatarData ? (
                <img src={driver.avatarData} alt={`${displayName} profile`} />
              ) : (
                <UserRound />
              )}
            </span>
            <div>
              <strong>{displayName}</strong>
              <small>{vehicleTypeLabel(vehicle?.vehicleType)} Driver</small>
            </div>
          </div>
          <dl className="suspension-driver-facts">
            <DriverFact icon={<IdCard />} label="Driver ID" value={driver.id} />
            <DriverFact
              icon={<Phone />}
              label="Contact number"
              value={driver.phone ?? "Not recorded"}
            />
            <DriverFact icon={<UserRound />} label="Owner" value={ownerName} />
            <DriverFact
              icon={<Hash />}
              label={unitLabel}
              value={unitNumber ?? "Not assigned"}
            />
            <DriverFact
              icon={<CarFront />}
              label="Registered vehicle"
              value={vehicle?.plateNumber ?? "Not assigned"}
            />
            <DriverFact
              icon={<FileText />}
              label="Franchise no."
              value={driver.franchise?.franchiseNumber ?? "Not assigned"}
            />
          </dl>
          <div className="suspension-hero" aria-hidden="true">
            <img src="/images/dashboard/suspension-hero.webp" alt="" />
          </div>
        </aside>

        <div className="suspension-action-area">
          <div className="suspension-warning">
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>Passengers will be warned not to ride</strong>
              <span>
                The QR remains recognizable as LGU-issued but will display
                “Suspended” when scanned.
              </span>
            </div>
          </div>
          <form
            id="suspend-driver-form"
            className="suspension-form"
            onSubmit={submit}
            noValidate
          >
            <label className="field">
              <span>
                Reason for suspension <em>*</em>
              </span>
              <textarea
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value.slice(0, 500));
                }}
                placeholder="Describe the verified concern or LGU basis for this action…"
                minLength={10}
                maxLength={500}
                required
              />
              <small className="field-input-hint">
                {reason.trim().length}/500 characters · minimum 10
              </small>
            </label>
            <fieldset className="suspension-reasons">
              <legend>
                Common reasons <span>(optional)</span>
              </legend>
              <div>
                {commonReasons.map((item) => (
                  <button
                    type="button"
                    className={reason === item ? "selected" : ""}
                    onClick={() => chooseReason(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="suspension-acknowledgement">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => {
                  setAcknowledged(event.target.checked);
                }}
              />
              <span>
                I understand that this immediately blocks transport eligibility
                and passenger ride creation.
              </span>
            </label>
          </form>
        </div>
      </div>
    </ModalShell>
  );
}

function DriverFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt>
        {icon}
        <span>{label}</span>
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function vehicleTypeLabel(value?: string) {
  return value === "HABAL_HABAL"
    ? "Habal-habal"
    : value === "TRICYCLE"
      ? "Tricycle"
      : "Registered";
}

import { FormEvent, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { Driver } from "../../api";
import { displayPersonName } from "../../utils/personName";
import { ModalShell } from "../shared/ModalShell";

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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    setError("");
    try {
      await onConfirm(cleanReason);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to suspend this driver.";
      setError(message);
      setSaving(false);
    }
  }
  function fail(message: string) {
    setError(message);
    onError(message);
  }

  return (
    <ModalShell
      eyebrow="CRITICAL TRANSPORT ACTION"
      title={`Suspend ${displayPersonName(driver.fullName)}`}
      description="Suspension immediately blocks this driver’s QR and ride eligibility. It does not change account login access."
      onClose={onClose}
      busy={saving}
      size="small"
      className="suspend-driver-modal"
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
      <div className="suspension-warning">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Passengers will be warned not to ride</strong>
          <span>
            The QR remains recognizable as LGU-issued but will display
            Suspended.
          </span>
        </div>
      </div>
      {error && (
        <div className="error suspension-error" role="alert">
          {error}
        </div>
      )}
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
              setError("");
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
        <label className="suspension-acknowledgement">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => {
              setAcknowledged(event.target.checked);
              setError("");
            }}
          />
          <ShieldAlert aria-hidden="true" />
          <span>
            I understand that this immediately blocks transport eligibility and
            passenger ride creation.
          </span>
        </label>
      </form>
    </ModalShell>
  );
}

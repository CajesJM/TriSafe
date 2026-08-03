import { FormEvent, useState } from "react";
import { BadgeCheck, CalendarClock, Info } from "lucide-react";
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
  const [expiresAt, setExpiresAt] = useState(franchise?.expiresAt?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
      const message = "Select a valid franchise expiration date.";
      setError(message);
      onError(message);
      return;
    }
    if (status === "VERIFIED" && expiresAt <= localDate()) {
      const message = "A verified driver must have a future franchise expiration date.";
      setError(message);
      onError(message);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({ status, expiresAt: new Date(`${expiresAt}T23:59:59+08:00`).toISOString() });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to update the franchise.";
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
      description="Control transport eligibility and keep the LGU franchise expiration record current."
      onClose={onCancel}
      busy={saving}
      size="medium"
      className="franchise-modal"
      footer={
        <>
          <button className="secondary" onClick={onCancel} disabled={saving} type="button">Cancel</button>
          <button className="primary" form="franchise-update-form" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button>
        </>
      }
    >
      <div className="franchise-modal-summary">
        <span><BadgeCheck aria-hidden="true" /></span>
        <div><strong>{franchise?.franchiseNumber ?? "No franchise number"}</strong><small>Current status: {franchise?.status ?? driver.verification}</small></div>
      </div>
      {error && <div className="error franchise-modal-error" role="alert">{error}</div>}
      <form id="franchise-update-form" className="franchise-modal-form" onSubmit={submit} noValidate>
        <label className="field">
          <span>Driver and franchise status <em>*</em></span>
          <select value={status} onChange={(event) => { setStatus(event.target.value as UpdateFranchiseInput["status"]); setError(""); }} required>
            <option value="VERIFIED">Verified — eligible for rides</option>
            <option value="PENDING">Pending — awaiting LGU review</option>
            <option value="SUSPENDED">Suspended — temporarily blocked</option>
            <option value="EXPIRED">Expired — franchise ended</option>
          </select>
          <small className="field-input-hint">The selected status applies to both the driver and franchise.</small>
        </label>
        <label className="field">
          <span>Franchise expiration date <em>*</em></span>
          <div className="franchise-date-input"><CalendarClock aria-hidden="true" /><input type="date" value={expiresAt} onChange={(event) => { setExpiresAt(event.target.value); setError(""); }} required /></div>
          <small className="field-input-hint">Verified status requires a date later than today.</small>
        </label>
      </form>
      <div className="franchise-modal-note"><Info aria-hidden="true" /><p><strong>Automatic protection</strong><span>If the expiration date passes, TriSafe automatically marks the franchise and driver as Expired.</span></p></div>
    </ModalShell>
  );
}

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

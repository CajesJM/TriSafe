import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPinned, PhilippinePeso, Route } from "lucide-react";
import { FareRule, FareRuleInput, LocationOption } from "../../api";
import { ModalShell } from "../shared/ModalShell";

type Props = {
  locations: LocationOption[];
  rule?: FareRule;
  onCancel: () => void;
  onSave: (input: FareRuleInput) => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

function initialValues(rule?: FareRule): FareRuleInput {
  return {
    fromLocationId: rule?.fromLocationId ?? "",
    toLocationId: rule?.toLocationId ?? "",
    baseFare: Number(rule?.baseFare ?? 15),
    distanceKm: Number(rule?.distanceKm ?? 0),
    perKm: Number(rule?.perKm ?? 0),
    minimumFare: Number(rule?.minimumFare ?? 0),
    version: rule?.version ?? `LGU-${new Date().getFullYear()}-01`,
    effectiveFrom: rule?.effectiveFrom?.slice(0, 10) ?? today(),
    effectiveTo: rule?.effectiveTo?.slice(0, 10) ?? "",
  };
}

export function FareRuleForm({ locations, rule, onCancel, onSave }: Props) {
  const [values, setValues] = useState<FareRuleInput>(() => initialValues(rule));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setValues(initialValues(rule)), [rule]);

  const selectedRoute = useMemo(() => {
    const from = locations.find((location) => location.id === values.fromLocationId);
    const to = locations.find((location) => location.id === values.toLocationId);
    return { from: from?.name ?? "Origin", to: to?.name ?? "Destination" };
  }, [locations, values.fromLocationId, values.toLocationId]);

  function update(field: keyof FareRuleInput, value: string | number) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!values.fromLocationId || !values.toLocationId || values.fromLocationId === values.toLocationId) {
      setError("Choose two different locations for this official route rule.");
      return;
    }
    if (!values.version.trim()) {
      setError("Enter the LGU matrix version for this rule.");
      return;
    }
    if (values.distanceKm < 0 || values.baseFare < 0 || values.perKm < 0 || values.minimumFare < 0) {
      setError("Fare values cannot be negative.");
      return;
    }
    if (values.effectiveTo && values.effectiveTo < values.effectiveFrom) {
      setError("The effective-to date must be on or after the effective-from date.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...values,
        version: values.version.trim(),
        effectiveTo: values.effectiveTo || undefined,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save the fare rule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      eyebrow="OFFICIAL LGU MATRIX"
      title={rule ? "Edit route fare rule" : "Publish route fare rule"}
      description="Route rules provide a transparent pre-ride estimate. The passenger app only uses a rule that is active and within its effective dates."
      onClose={onCancel}
      busy={saving}
      size="large"
      className="fare-rule-modal"
      footer={
        <>
          <button className="secondary" onClick={onCancel} type="button" disabled={saving}>
            Cancel
          </button>
          <button className="primary" form="fare-rule-form" type="submit" disabled={saving}>
            {saving ? "Publishing…" : rule ? "Save changes" : "Publish official rule"}
          </button>
        </>
      }
    >
      <form id="fare-rule-form" className="fare-rule-form" onSubmit={submit}>
        {error && <div className="error form-error" role="alert">{error}</div>}
        <section className="fare-rule-section">
          <header><span><Route aria-hidden="true" /></span><div><h3>Route and published distance</h3><p>Set the official location pair and its LGU-recognized route distance.</p></div></header>
          <div className="fare-rule-route-preview" aria-label="Selected route"><MapPinned aria-hidden="true" /><strong>{selectedRoute.from} <span>to</span> {selectedRoute.to}</strong><small>{values.distanceKm.toFixed(1)} km official route distance</small></div>
          <div className="form-grid">
            <label className="field"><span>Origin <em>*</em></span><select value={values.fromLocationId} onChange={(event) => update("fromLocationId", event.target.value)} required><option value="">Select origin</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label>
            <label className="field"><span>Destination <em>*</em></span><select value={values.toLocationId} onChange={(event) => update("toLocationId", event.target.value)} required><option value="">Select destination</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label>
            <NumberField label="Official route distance" hint="Used for this route’s pre-ride estimate." suffix="km" value={values.distanceKm} onChange={(value) => update("distanceKm", value)} />
          </div>
        </section>

        <section className="fare-rule-section">
          <header><span><PhilippinePeso aria-hidden="true" /></span><div><h3>Route fare calculation</h3><p>The calculation is base fare + distance charge, with the minimum fare applied as the floor.</p></div></header>
          <div className="form-grid fare-rule-money-grid">
            <NumberField label="Base fare" hint="Starting amount before distance is charged." currency value={values.baseFare} onChange={(value) => update("baseFare", value)} />
            <NumberField label="Price per kilometer" hint="Amount added for every route kilometer." currency value={values.perKm} onChange={(value) => update("perKm", value)} />
            <NumberField label="Minimum fare" hint="Lowest final fare allowed for a short trip." currency value={values.minimumFare} onChange={(value) => update("minimumFare", value)} />
          </div>
        </section>

        <section className="fare-rule-section">
          <header><span><CalendarDays aria-hidden="true" /></span><div><h3>Version and effectivity</h3><p>Keep the published version traceable. Rules outside their effective dates are not used for new passenger estimates.</p></div></header>
          <div className="form-grid">
            <label className="field"><span>Matrix version <em>*</em></span><input value={values.version} maxLength={60} onChange={(event) => update("version", event.target.value)} required /></label>
            <label className="field"><span>Effective from <em>*</em></span><input type="date" value={values.effectiveFrom} onChange={(event) => update("effectiveFrom", event.target.value)} required /></label>
            <label className="field"><span>Effective to <small>Optional</small></span><input type="date" min={values.effectiveFrom} value={values.effectiveTo ?? ""} onChange={(event) => update("effectiveTo", event.target.value)} /></label>
          </div>
        </section>
      </form>
    </ModalShell>
  );
}

function NumberField({ label, hint, value, onChange, currency = false, suffix }: { label: string; hint: string; value: number; onChange: (value: number) => void; currency?: boolean; suffix?: string }) {
  return <label className="field fare-number-field"><span>{label} <em>*</em></span><div className="fare-number-input">{currency && <i>₱</i>}<input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} required />{suffix && <small>{suffix}</small>}</div><small className="field-hint">{hint}</small></label>;
}

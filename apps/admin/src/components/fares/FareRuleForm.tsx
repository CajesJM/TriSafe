import { FormEvent, useEffect, useState } from 'react';
import { FareRule, FareRuleInput, LocationOption } from '../../api';

type Props = {
  locations: LocationOption[];
  rule?: FareRule;
  onCancel: () => void;
  onSave: (input: FareRuleInput) => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

function initialValues(rule?: FareRule): FareRuleInput {
  return {
    fromLocationId: rule?.fromLocationId ?? '',
    toLocationId: rule?.toLocationId ?? '',
    baseFare: Number(rule?.baseFare ?? 15),
    distanceKm: Number(rule?.distanceKm ?? 0),
    perKm: Number(rule?.perKm ?? 0),
    passengerSurcharge: Number(rule?.passengerSurcharge ?? 0),
    minimumFare: Number(rule?.minimumFare ?? 0),
    version: rule?.version ?? 'LGU-2026-01',
    effectiveFrom: rule?.effectiveFrom?.slice(0, 10) ?? today(),
    effectiveTo: rule?.effectiveTo?.slice(0, 10) ?? '',
  };
}

export function FareRuleForm({ locations, rule, onCancel, onSave }: Props) {
  const [values, setValues] = useState<FareRuleInput>(() => initialValues(rule));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setValues(initialValues(rule)), [rule]);

  function update(field: keyof FareRuleInput, value: string | number) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!values.fromLocationId || !values.toLocationId || values.fromLocationId === values.toLocationId) {
      setError('Choose two different locations for this fare rule.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...values, effectiveTo: values.effectiveTo || undefined });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the fare rule.');
    } finally {
      setSaving(false);
    }
  }

  return <form className="card fare-form" onSubmit={submit}><div className="form-heading"><div><span className="eyebrow">OFFICIAL LGU MATRIX</span><h3>{rule ? 'Edit fare rule' : 'Add fare rule'}</h3><p>Only active rules are used for passenger fare estimates.</p></div><button className="close-button" onClick={onCancel} type="button" aria-label="Close fare form">×</button></div>{error && <div className="error form-error" role="alert">{error}</div>}<div className="form-section"><h4>Route</h4><div className="form-grid"><label className="field"><span>From <em>*</em></span><select value={values.fromLocationId} onChange={(event) => update('fromLocationId', event.target.value)} required><option value="">Select origin</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label><label className="field"><span>To <em>*</em></span><select value={values.toLocationId} onChange={(event) => update('toLocationId', event.target.value)} required><option value="">Select destination</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label></div></div><div className="form-section"><h4>Fare calculation</h4><div className="form-grid"><NumberField label="Base fare" value={values.baseFare} onChange={(value) => update('baseFare', value)} /><NumberField label="Distance (km)" value={values.distanceKm} onChange={(value) => update('distanceKm', value)} /><NumberField label="Price per km" value={values.perKm} onChange={(value) => update('perKm', value)} /><NumberField label="Passenger surcharge" value={values.passengerSurcharge} onChange={(value) => update('passengerSurcharge', value)} /><NumberField label="Minimum fare" value={values.minimumFare} onChange={(value) => update('minimumFare', value)} /></div></div><div className="form-section"><h4>Publication</h4><div className="form-grid"><label className="field"><span>Matrix version <em>*</em></span><input value={values.version} onChange={(event) => update('version', event.target.value)} required /></label><label className="field"><span>Effective from <em>*</em></span><input type="date" value={values.effectiveFrom} onChange={(event) => update('effectiveFrom', event.target.value)} required /></label><label className="field"><span>Effective to</span><input type="date" value={values.effectiveTo ?? ''} onChange={(event) => update('effectiveTo', event.target.value)} /></label></div></div><div className="form-actions"><button className="secondary" onClick={onCancel} type="button">Cancel</button><button className="primary submit-button" disabled={saving} type="submit">{saving ? 'Saving…' : rule ? 'Save changes' : 'Publish fare rule'}</button></div></form>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="field"><span>{label} <em>*</em></span><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} required /></label>;
}

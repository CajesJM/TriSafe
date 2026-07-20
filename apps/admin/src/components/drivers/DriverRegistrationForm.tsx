import { FormEvent, ReactNode, useState } from 'react';
import { api, Driver, RegisterDriverInput } from '../../api';

type DriverFormState = RegisterDriverInput;
const emptyDriverForm: DriverFormState = { fullName: '', phone: '', email: '', temporaryPassword: '', licenseNumber: '', renewalDate: '', franchiseNumber: '', franchiseIssuedAt: '', franchiseExpiresAt: '', plateNumber: '', vehicleType: 'Tricycle' };

export function DriverRegistrationForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (driver: Driver) => void }) {
  const [form, setForm] = useState<DriverFormState>(emptyDriverForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field: keyof DriverFormState, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(''); setSaving(true);
    try { onCreated(await api.registerDriver({ ...form, email: form.email.trim(), temporaryPassword: form.temporaryPassword })); }
    catch (requestError) { setFormError(requestError instanceof Error ? requestError.message : 'Unable to register the driver.'); }
    finally { setSaving(false); }
  }

  return <section className="registration-layout"><form className="card registration-form" onSubmit={submit}><div className="form-heading"><div><span className="eyebrow">NEW APPROVAL</span><h3>Register an approved driver</h3><p>Enter the details exactly as they appear on the LGU franchise record.</p></div><button className="close-button" onClick={onCancel} type="button" aria-label="Close form">×</button></div>{formError && <div className="error form-error" role="alert">{formError}</div>}
    <FormSection title="Driver identity"><div className="form-grid"><Field label="Full name" value={form.fullName} onChange={(value) => updateField('fullName', value)} placeholder="Juan Dela Cruz" required /><Field label="Mobile number" value={form.phone} onChange={(value) => updateField('phone', value)} placeholder="+639171234567" required /><Field label="Email address" value={form.email} onChange={(value) => updateField('email', value)} placeholder="driver@example.com" type="email" required /><Field label="Temporary login password" value={form.temporaryPassword} onChange={(value) => updateField('temporaryPassword', value)} placeholder="At least 8 characters" type="password" required /><Field label="Driver license number" value={form.licenseNumber} onChange={(value) => updateField('licenseNumber', value)} placeholder="DL-123456" required /><Field label="Renewal date" value={form.renewalDate} onChange={(value) => updateField('renewalDate', value)} type="date" required /></div></FormSection>
    <FormSection title="Franchise record"><div className="form-grid"><Field label="Franchise number" value={form.franchiseNumber} onChange={(value) => updateField('franchiseNumber', value)} placeholder="TRI-2026-001" required /><Field label="Issued date" value={form.franchiseIssuedAt} onChange={(value) => updateField('franchiseIssuedAt', value)} type="date" required /><Field label="Expiration date" value={form.franchiseExpiresAt} onChange={(value) => updateField('franchiseExpiresAt', value)} type="date" required /></div></FormSection>
    <FormSection title="Vehicle"><div className="form-grid"><Field label="Plate number" value={form.plateNumber} onChange={(value) => updateField('plateNumber', value)} placeholder="TRI-2026" required /><label className="field"><span>Vehicle type</span><select value={form.vehicleType} onChange={(event) => updateField('vehicleType', event.target.value)}><option>Tricycle</option><option>Habal-habal</option></select></label></div></FormSection>
    <div className="form-actions"><button className="secondary" onClick={onCancel} type="button">Cancel</button><button className="primary submit-button" disabled={saving} type="submit">{saving ? 'Registering…' : 'Create approved account'}</button></div>
  </form><aside className="card form-help"><div className="help-icon">✓</div><h3>What happens next?</h3><p>TriSafe creates the approved driver account, franchise record, vehicle record, and a unique QR identity in one secure transaction.</p><HelpStep number="01" text="Driver is marked verified" /><HelpStep number="02" text="Driver receives the temporary login credentials" /><HelpStep number="03" text="QR code is prepared for issuance" /></aside></section>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) { return <div className="form-section"><h4>{title}</h4>{children}</div>; }
function HelpStep({ number, text }: { number: string; text: string }) { return <div className="help-step"><b>{number}</b><span>{text}</span></div>; }
function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) { return <label className="field"><span>{label}{required && <em>*</em>}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} required={required} /></label>; }

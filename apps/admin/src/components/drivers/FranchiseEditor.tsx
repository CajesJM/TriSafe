import { FormEvent, useState } from 'react';
import { Driver, UpdateFranchiseInput } from '../../api';

export function FranchiseEditor({ driver, onCancel, onSave }: { driver: Driver; onCancel: () => void; onSave: (input: UpdateFranchiseInput) => Promise<void> }) {
  const franchise = driver.franchise;
  const [status, setStatus] = useState<UpdateFranchiseInput['status']>((franchise?.status as UpdateFranchiseInput['status']) ?? 'VERIFIED');
  const [expiresAt, setExpiresAt] = useState(franchise?.expiresAt?.slice(0, 10) ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ status, expiresAt: new Date(`${expiresAt}T23:59:59.000Z`).toISOString() });
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return <section className="card franchise-editor"><div className="form-heading"><div><span className="eyebrow">FRANCHISE RECORD</span><h3>Update {driver.fullName}</h3><p>Changing the franchise status immediately affects QR verification and ride eligibility.</p></div><button className="close-button" onClick={onCancel} type="button">×</button></div>{error && <p className="form-error">{error}</p>}<form onSubmit={submit}><div className="form-grid"><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as UpdateFranchiseInput['status'])}><option value="VERIFIED">Verified</option><option value="PENDING">Pending</option><option value="SUSPENDED">Suspended</option><option value="EXPIRED">Expired</option></select></label><label className="field"><span>Franchise expiry date</span><input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} required /></label></div><div className="form-actions"><button className="secondary" onClick={onCancel} type="button">Cancel</button><button className="primary submit-button" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save franchise record'}</button></div></form></section>;
}

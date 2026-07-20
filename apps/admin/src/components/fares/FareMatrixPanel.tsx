import { useState } from 'react';
import { api, FareRule, FareRuleInput, LocationOption } from '../../api';
import { EmptyState } from '../shared/Feedback';
import { FareRuleForm } from './FareRuleForm';

type Props = { rules: FareRule[]; locations: LocationOption[]; onChanged: () => Promise<void> };

export function FareMatrixPanel({ rules, locations, onChanged }: Props) {
  const [editing, setEditing] = useState<FareRule>();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [deactivating, setDeactivating] = useState('');

  async function save(input: FareRuleInput) {
    if (editing) {
      await api.updateFareRule(editing.id, input);
    } else {
      await api.createFareRule(input);
    }
    await onChanged();
    setEditing(undefined);
    setShowForm(false);
  }

  async function deactivate(rule: FareRule) {
    if (!window.confirm(`Deactivate the rule for ${rule.fromLocation.name} to ${rule.toLocation.name}?`)) return;
    setError('');
    setDeactivating(rule.id);
    try {
      await api.deactivateFareRule(rule.id);
      await onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to deactivate the fare rule.');
    } finally {
      setDeactivating('');
    }
  }

  async function activate(rule: FareRule) {
    setError('');
    setDeactivating(rule.id);
    try {
      await api.activateFareRule(rule.id);
      await onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to activate the fare rule.');
    } finally {
      setDeactivating('');
    }
  }

  if (showForm || editing) return <FareRuleForm locations={locations} rule={editing} onCancel={() => { setEditing(undefined); setShowForm(false); }} onSave={save} />;

  return <section className="card fare-matrix"><div className="section-heading"><div><span className="eyebrow">FARE TRANSPARENCY</span><h3>Official fare matrix</h3><p className="section-description">Manage the route rules used by passenger fare estimates.</p></div><button className="primary" onClick={() => { setError(''); setShowForm(true); }} type="button">+ Add fare rule</button></div>{error && <div className="error" role="alert">{error}</div>}<div className="fare-table"><div className="fare-table-head"><span>Route</span><span>Calculation</span><span>Version</span><span>Status</span><span>Actions</span></div>{rules.map((rule) => <div className="fare-table-row" key={rule.id}><div><b>{rule.fromLocation.name}</b><span>to {rule.toLocation.name}</span></div><div><b>PHP {Number(rule.baseFare).toFixed(2)} base</b><span>+ PHP {Number(rule.perKm).toFixed(2)} / km · min PHP {Number(rule.minimumFare).toFixed(2)}</span></div><div><b>{rule.version}</b><span>{new Date(rule.effectiveFrom).toLocaleDateString()}</span></div><span className={`status ${rule.active ? 'verified' : 'dismissed'}`}>{rule.active ? 'ACTIVE' : 'INACTIVE'}</span><div className="fare-actions"><button className="row-action" onClick={() => setEditing(rule)} type="button">Edit</button>{rule.active ? <button className="row-action danger-action" disabled={deactivating === rule.id} onClick={() => void deactivate(rule)} type="button">{deactivating === rule.id ? '…' : 'Deactivate'}</button> : <button className="row-action" disabled={deactivating === rule.id} onClick={() => void activate(rule)} type="button">{deactivating === rule.id ? '…' : 'Activate'}</button>}</div></div>)}{rules.length === 0 && <EmptyState text="No fare rules have been published yet." />}</div></section>;
}

import { useState } from 'react';
import { Incident, IncidentReviewInput } from '../../api';

const categories = ['SAFETY', 'OVERCHARGING', 'HARASSMENT', 'VEHICLE', 'OTHER'];

export function IncidentReviewCard({ incident, onReview }: { incident: Incident; onReview: (id: string, review: IncidentReviewInput) => Promise<void> }) {
  const [category, setCategory] = useState(incident.category);
  const [notes, setNotes] = useState(incident.reviewerNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function review(status: IncidentReviewInput['status']) {
    setSaving(true);
    setError('');
    try {
      await onReview(incident.id, { status, category, reviewerNotes: notes || undefined });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the review.');
    } finally {
      setSaving(false);
    }
  }

  return <article className="incident"><div className="incident-top"><span className={`status ${incident.status.toLowerCase()}`}>{incident.status}</span><span className="muted">{new Date(incident.createdAt).toLocaleDateString()}</span></div><div className="incident-heading"><div><h4>{incident.category}</h4><small>Submitted by {incident.passenger.fullName}</small></div>{incident.ride && <span className="incident-ride-badge">Ride linked</span>}</div>{incident.ride && <div className="incident-context"><span><b>Vehicle</b>{incident.ride.vehicle.plateNumber} · {incident.ride.vehicle.vehicleType}</span><span><b>Driver</b>{incident.ride.vehicle.driver.user.fullName}</span><span><b>Fare</b>PHP {Number(incident.ride.estimatedFare).toFixed(2)}</span></div>}<div className="incident-evidence"><div><span className="eyebrow">PASSENGER DESCRIPTION</span><p>{incident.rawDescription}</p></div><div className="ai-draft"><span className="eyebrow">AI-ASSISTED DRAFT</span><p>{incident.aiDraft ?? 'No AI draft was generated.'}</p></div></div><div className="incident-review-fields"><label className="field"><span>Final category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label className="field incident-notes"><span>Reviewer notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Record the LGU review outcome or follow-up." rows={3} /></label></div>{error && <div className="error" role="alert">{error}</div>}<div className="actions"><button disabled={saving} onClick={() => void review('UNDER_REVIEW')} type="button">Assign review</button><button disabled={saving} onClick={() => void review('RESOLVED')} type="button">Resolve</button><button className="quiet" disabled={saving} onClick={() => void review('DISMISSED')} type="button">Dismiss</button></div></article>;
}

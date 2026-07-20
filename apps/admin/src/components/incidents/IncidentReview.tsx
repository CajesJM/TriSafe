import { Incident, IncidentReviewInput } from '../../api';
import { EmptyState } from '../shared/Feedback';
import { IncidentReviewCard } from './IncidentReviewCard';

export function IncidentReview({ incidents, onReview }: { incidents: Incident[]; onReview: (id: string, review: IncidentReviewInput) => Promise<void> }) {
  return <section className="card"><div className="section-heading"><div><span className="eyebrow">SAFETY REPORTS</span><h3>Review queue</h3><p className="section-description">Review the original account and AI organization before making an LGU decision.</p></div><span className="muted">AI drafts are recommendations only</span></div><div className="table">{incidents.map((incident) => <IncidentReviewCard incident={incident} onReview={onReview} key={incident.id} />)}{incidents.length === 0 && <EmptyState text="No reports in the review queue." />}</div></section>;
}

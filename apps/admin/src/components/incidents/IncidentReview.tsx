import { useMemo, useState } from 'react';
import { Incident, IncidentReviewInput } from '../../api';
import { DataToolbar, Pagination } from '../shared/DataControls';
import { EmptyState } from '../shared/Feedback';
import { IncidentReviewCard } from './IncidentReviewCard';

const pageSize = 5;
export function IncidentReview({ incidents, onReview }: { incidents: Incident[]; onReview: (id: string, review: IncidentReviewInput) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => incidents.filter((incident) => {
    const text = `${incident.category} ${incident.rawDescription} ${incident.aiDraft ?? ''} ${incident.passenger.fullName} ${incident.ride?.vehicle.plateNumber ?? ''}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (!status || incident.status === status);
  }), [incidents, search, status]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  function updateSearch(value: string) { setSearch(value); setPage(1); }
  function updateStatus(value: string) { setStatus(value); setPage(1); }
  return <section className="card data-card"><div className="section-heading"><div><span className="eyebrow">PASSENGER SAFETY REPORTS</span><h3>LGU review queue</h3><p className="section-description">Compare the passenger statement with the AI-organized draft before recording an LGU decision.</p></div><span className="ai-notice">AI assists drafting only</span></div>
    <DataToolbar search={search} onSearch={updateSearch} searchLabel="Search passenger, category, plate, or report" filter={status} onFilter={updateStatus} filterLabel="Status" options={[{ value: '', label: 'All reports' }, { value: 'SUBMITTED', label: 'Submitted' }, { value: 'UNDER_REVIEW', label: 'Under review' }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'DISMISSED', label: 'Dismissed' }]} resultCount={filtered.length} />
    <div className="incident-list">{visible.map((incident) => <IncidentReviewCard incident={incident} onReview={onReview} key={incident.id} />)}{visible.length === 0 && <EmptyState title="No matching reports" text={incidents.length ? 'Try changing your search or status filter.' : 'No passenger reports have been submitted.'} />}</div>
    {filtered.length > 0 && <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />}
  </section>;
}

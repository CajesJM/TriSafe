import { useMemo, useState } from 'react';
import { AuditLog } from '../../api';
import { DataToolbar, Pagination } from '../shared/DataControls';
import { EmptyState } from '../shared/Feedback';

const pageSize = 12;
export function AuditLogPanel({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const entityOptions = useMemo(() => [{ value: '', label: 'All record types' }, ...Array.from(new Set(logs.map((log) => log.entityType))).sort().map((value) => ({ value, label: value }))], [logs]);
  const filtered = useMemo(() => logs.filter((log) => {
    const text = `${log.action} ${log.entityType} ${log.entityId ?? ''} ${log.actorName ?? ''} ${log.actorEmail ?? ''}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (!entity || log.entityType === entity);
  }), [logs, search, entity]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  function updateSearch(value: string) { setSearch(value); setPage(1); }
  function updateEntity(value: string) { setEntity(value); setPage(1); }
  return <section className="card data-card audit-panel"><div className="section-heading"><div><span className="eyebrow">ACCOUNTABILITY</span><h3>Administrative activity</h3><p className="section-description">A read-only record of LGU registry, fare, communication, and safety decisions.</p></div><span className="section-count">Latest {logs.length}</span></div>
    <DataToolbar search={search} onSearch={updateSearch} searchLabel="Search action, actor, or record ID" filter={entity} onFilter={updateEntity} filterLabel="Record type" options={entityOptions} resultCount={filtered.length} />
    {visible.length === 0 ? <EmptyState title="No matching activity" text={logs.length ? 'Try changing your search or record type filter.' : 'Administrative actions will appear here as they are completed.'} /> : <div className="audit-list">{visible.map((log) => <article className="audit-event" key={log.id}><div className="audit-event-marker" aria-hidden="true">{iconFor(log.action)}</div><div className="audit-event-main"><div className="audit-event-heading"><div><strong>{formatAction(log.action)}</strong><span className="entity-chip">{log.entityType}</span></div><time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString('en-PH')}</time></div><p>{log.actorName ? `${log.actorName}${log.actorEmail ? ` (${log.actorEmail})` : ''}` : 'TriSafe system'}{log.entityId ? ` · Record ${shortId(log.entityId)}` : ''}</p>{log.details && <div className="audit-details">{Object.entries(log.details).slice(0, 4).map(([key, value]) => <span key={key}><b>{formatAction(key)}</b>{String(value)}</span>)}</div>}</div></article>)}</div>}
    {filtered.length > 0 && <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />}
  </section>;
}

function formatAction(value: string) { return value.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
function shortId(value: string) { return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value; }
function iconFor(action: string) { if (action.includes('DRIVER')) return 'D'; if (action.includes('FARE')) return '₱'; if (action.includes('INCIDENT')) return '!'; if (action.includes('ANNOUNCEMENT')) return '✉'; return '•'; }

import { AuditLog } from '../../api';

function formatAction(action: string) {
  return action.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export function AuditLogPanel({ logs }: { logs: AuditLog[] }) {
  return (
    <section className="card audit-panel">
      <div className="section-heading">
        <div>
          <h3>Activity audit trail</h3>
          <p className="section-description">Recorded LGU and safety actions from the TriSafe API.</p>
        </div>
        <span className="audit-count">{logs.length} recent events</span>
      </div>
      {logs.length === 0 ? <div className="empty">No audit events have been recorded yet.</div> : (
        <div className="audit-list">
          {logs.map((log) => (
            <article className="audit-event" key={log.id}>
              <div className="audit-event-marker" aria-hidden="true">•</div>
              <div className="audit-event-main">
                <div className="audit-event-heading">
                  <strong>{formatAction(log.action)}</strong>
                  <time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time>
                </div>
                <p>{log.entityType}{log.entityId ? ` · ${log.entityId}` : ''}{log.actorName ? ` · by ${log.actorName}` : ''}</p>
                {log.details && <code>{JSON.stringify(log.details)}</code>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

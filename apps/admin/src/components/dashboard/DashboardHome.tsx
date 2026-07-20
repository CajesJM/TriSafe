import type { AuditLog, Dashboard, Driver } from '../../api';
import type { Tab } from '../../types/admin';

type Props = { dashboard: Dashboard; drivers: Driver[]; auditLogs: AuditLog[]; onRegister: () => void; onNavigate: (tab: Tab) => void };

export function DashboardHome({ dashboard, drivers, auditLogs, onRegister, onNavigate }: Props) {
  const verifiedPercent = dashboard.drivers ? Math.round((dashboard.verifiedDrivers / dashboard.drivers) * 100) : 0;
  const maxActivity = Math.max(...dashboard.rideActivity.map((day) => day.count), 1);
  return <div className="dashboard-page">
    <section className="metric-grid" aria-label="Current TriSafe metrics">
      <MetricCard icon="◎" label="Registered users" value={dashboard.users.total} detail={`${dashboard.users.passengers} passenger accounts`} tone="teal" onClick={() => onNavigate('users')} action="View users" />
      <MetricCard icon="✓" label="Verified drivers" value={dashboard.verifiedDrivers} detail={`${verifiedPercent}% of ${dashboard.drivers} registered`} tone="blue" onClick={() => onNavigate('drivers')} action="Open registry" />
      <MetricCard icon="↗" label="Active rides" value={dashboard.activeRides} detail={`${dashboard.rides.completed} completed overall`} tone="green" />
      <MetricCard icon="!" label="Reports requiring review" value={dashboard.openIncidents} detail={`${dashboard.incidents.underReview} already assigned`} tone={dashboard.openIncidents ? 'amber' : 'neutral'} onClick={() => onNavigate('incidents')} action="Review queue" />
    </section>

    <section className="dashboard-primary-grid">
      <article className="card chart-card">
        <div className="panel-title-row"><div><p className="eyebrow">RIDE ACTIVITY</p><h3>Rides started in the last 7 days</h3><p>Live sessions recorded by the passenger application.</p></div><span className="section-count">{dashboard.rideActivity.reduce((sum, day) => sum + day.count, 0)} rides</span></div>
        <div className="bar-chart" role="img" aria-label="Rides started in the last seven days">{dashboard.rideActivity.map((day) => <div className="bar-column" key={day.date}><div className="bar-value">{day.count}</div><div className="bar-track"><i style={{ height: `${Math.max(day.count ? 10 : 2, (day.count / maxActivity) * 100)}%` }} /></div><span>{day.label}</span></div>)}</div>
      </article>
      <article className="card action-card">
        <div className="panel-title-row"><div><p className="eyebrow">PRIORITY ACTIONS</p><h3>LGU work queue</h3><p>Move directly to records that need attention.</p></div></div>
        <ActionItem icon="!" label="Review incident reports" detail={`${dashboard.openIncidents} open`} urgent={dashboard.openIncidents > 0} onClick={() => onNavigate('incidents')} />
        <ActionItem icon="＋" label="Register approved driver" detail="Create account and QR" onClick={onRegister} />
        <ActionItem icon="₱" label="Maintain fare rules" detail="Official fare matrix" onClick={() => onNavigate('fares')} />
        <ActionItem icon="✉" label="Notify verified drivers" detail="Send announcement" onClick={() => onNavigate('announcements')} />
      </article>
    </section>

    <section className="dashboard-secondary-grid">
      <article className="card breakdown-card">
        <div className="panel-title-row"><div><p className="eyebrow">ACCOUNT DISTRIBUTION</p><h3>Users by role</h3></div><button className="text-button" onClick={() => onNavigate('users')} type="button">View directory →</button></div>
        <RoleBar label="Passengers" value={dashboard.users.passengers} total={dashboard.users.total} tone="teal" />
        <RoleBar label="Drivers" value={dashboard.users.drivers} total={dashboard.users.total} tone="blue" />
        <RoleBar label="LGU administrators" value={dashboard.users.administrators} total={dashboard.users.total} tone="amber" />
      </article>
      <article className="card breakdown-card">
        <div className="panel-title-row"><div><p className="eyebrow">RIDE OUTCOMES</p><h3>All recorded rides</h3></div><strong className="panel-total">{dashboard.rides.total}</strong></div>
        <RoleBar label="Completed" value={dashboard.rides.completed} total={dashboard.rides.total} tone="green" />
        <RoleBar label="Active" value={dashboard.rides.active} total={dashboard.rides.total} tone="blue" />
        <RoleBar label="Cancelled" value={dashboard.rides.cancelled} total={dashboard.rides.total} tone="red" />
      </article>
      <article className="card activity-card">
        <div className="panel-title-row"><div><p className="eyebrow">RECENT ACTIVITY</p><h3>Administrative log</h3></div><button className="text-button" onClick={() => onNavigate('audit')} type="button">View all →</button></div>
        <div className="compact-activity">{auditLogs.slice(0, 4).map((log) => <div key={log.id}><span className="activity-dot" /><p><b>{formatAction(log.action)}</b><small>{log.actorName ? `By ${log.actorName} · ` : ''}{relativeTime(log.createdAt)}</small></p></div>)}{auditLogs.length === 0 && <p className="inline-empty">No administrative activity recorded yet.</p>}</div>
      </article>
    </section>

    <section className="card recent-registry">
      <div className="panel-title-row"><div><p className="eyebrow">DRIVER REGISTRY</p><h3>Recently registered drivers</h3><p>Latest approved operator and vehicle records.</p></div><div className="panel-actions"><button className="secondary" onClick={() => onNavigate('drivers')} type="button">View all drivers</button><button className="primary" onClick={onRegister} type="button">Register driver</button></div></div>
      {drivers.length === 0 ? <p className="inline-empty">No drivers have been registered.</p> : <div className="responsive-table"><div className="data-row driver-summary-head data-head"><span>Driver</span><span>Vehicle</span><span>Franchise</span><span>Status</span></div>{drivers.slice(0, 5).map((driver) => <div className="data-row driver-summary-row" key={driver.id}><div className="identity-cell"><span className="avatar">{initials(driver.fullName)}</span><span><b>{driver.fullName}</b><small>{driver.licenseNumber}</small></span></div><span><b>{driver.vehicles[0]?.plateNumber ?? 'No vehicle'}</b><small>{driver.vehicles[0]?.vehicleType ?? '—'}</small></span><span><b>{driver.franchise?.franchiseNumber ?? 'Not assigned'}</b><small>{driver.franchise?.expiresAt ? `Expires ${new Date(driver.franchise.expiresAt).toLocaleDateString('en-PH')}` : '—'}</small></span><span className={`status ${(driver.franchise?.status ?? driver.verification).toLowerCase()}`}>{driver.franchise?.status ?? driver.verification}</span></div>)}</div>}
    </section>
    <p className="data-timestamp">Dashboard updated {new Date(dashboard.generatedAt).toLocaleString('en-PH')}</p>
  </div>;
}

function MetricCard({ icon, label, value, detail, tone, action, onClick }: { icon: string; label: string; value: number; detail: string; tone: string; action?: string; onClick?: () => void }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}>{icon}</span><div><p>{label}</p><strong>{value.toLocaleString()}</strong><small>{detail}</small>{action && onClick && <button onClick={onClick} type="button">{action} →</button>}</div></article>;
}
function ActionItem({ icon, label, detail, urgent = false, onClick }: { icon: string; label: string; detail: string; urgent?: boolean; onClick: () => void }) { return <button className="action-item" onClick={onClick} type="button"><span className={urgent ? 'urgent' : ''}>{icon}</span><div><b>{label}</b><small>{detail}</small></div><em>›</em></button>; }
function RoleBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) { const percent = total ? Math.round((value / total) * 100) : 0; return <div className="role-progress"><div><span>{label}</span><b>{value} <small>({percent}%)</small></b></div><div className="progress-track"><i className={tone} style={{ width: `${percent}%` }} /></div></div>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
function formatAction(action: string) { return action.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
function relativeTime(value: string) { const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000); if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`; if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`; return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); }

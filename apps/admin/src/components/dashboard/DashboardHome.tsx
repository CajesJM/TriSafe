import { Dashboard } from "../../api";

export function DashboardHome({
  dashboard,
  onRegister,
  onReview,
}: {
  dashboard: Dashboard;
  onRegister: () => void;
  onReview: () => void;
}) {
  return (
    <>
      <div className="hero">
        <div>
          <span className="pill">SYSTEM STATUS · OPERATIONAL</span>
          <h2>
            Safer rides start
            <br />
            with trusted data.
          </h2>
          <p>
            Monitor registered transport activity and respond to commuter
            reports from one place.
          </p>
        </div>
        <div className="hero-art">
          QR
          <br />
          <span>✓</span>
        </div>
      </div>
      <div className="stat-grid">
        <StatCard
          label="Verified drivers"
          value={dashboard.verifiedDrivers}
          hint={`of ${dashboard.drivers} registered`}
        />
        <StatCard
          label="Active rides"
          value={dashboard.activeRides}
          hint="currently in progress"
        />
        <StatCard
          label="Open incidents"
          value={dashboard.openIncidents}
          hint="need LGU attention"
        />
        <StatCard label="Last sync" value="Now" hint="data is current" />
      </div>
      <section className="card quick">
        <div>
          <span className="eyebrow">QUICK ACTIONS</span>
          <h3>Keep the network up to date</h3>
        </div>
        <button onClick={onRegister} type="button">
          Register approved driver <span>→</span>
        </button>
        <button onClick={onReview} type="button">
          Review reports <span>→</span>
        </button>
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  CircleAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { api, type RideAnalytics } from "../../api";

type Period = "last-7" | "previous-week" | "last-30" | "custom";
type DateRange = { from: string; to: string };

export function RideAnalyticsPanel() {
  const [period, setPeriod] = useState<Period>("last-7");
  const [range, setRange] = useState<DateRange>(() => rangeFor("last-7"));
  const [draftRange, setDraftRange] = useState<DateRange>(() => rangeFor("last-7"));
  const [analytics, setAnalytics] = useState<RideAnalytics>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .rideAnalytics(range)
      .then((result) => {
        if (active) setAnalytics(result);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "Ride analytics could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  function selectPeriod(nextPeriod: Period) {
    setPeriod(nextPeriod);
    if (nextPeriod !== "custom") {
      const nextRange = rangeFor(nextPeriod);
      setRange(nextRange);
      setDraftRange(nextRange);
    }
  }

  function applyCustomRange() {
    if (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to) {
      setError("Select a valid start and end date.");
      return;
    }
    setRange(draftRange);
  }

  return (
    <article className="dashboard-card activity-chart-card analytics-card">
      <header className="analytics-header">
        <div>
          <p className="eyebrow">RIDE ANALYTICS</p>
          <h3>Transport activity</h3>
          <p>Explore ride sessions recorded by the passenger application.</p>
        </div>
        <label className="analytics-period-select">
          <span className="sr-only">Analytics period</span>
          <select value={period} onChange={(event) => selectPeriod(event.target.value as Period)}>
            <option value="last-7">Last 7 days</option>
            <option value="previous-week">Previous week</option>
            <option value="last-30">Last 30 days</option>
            <option value="custom">Custom dates</option>
          </select>
          <ChevronDown aria-hidden="true" size={14} />
        </label>
      </header>

      {period === "custom" && (
        <div className="analytics-custom-range" aria-label="Custom analytics dates">
          <label>
            <span>From</span>
            <input
              type="date"
              value={draftRange.from}
              max={draftRange.to || todayString()}
              onChange={(event) => setDraftRange((current) => ({ ...current, from: event.target.value }))}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              value={draftRange.to}
              min={draftRange.from}
              max={todayString()}
              onChange={(event) => setDraftRange((current) => ({ ...current, to: event.target.value }))}
            />
          </label>
          <button type="button" className="primary" onClick={applyCustomRange}>Apply dates</button>
        </div>
      )}

      {error && (
        <div className="analytics-error" role="alert">
          <CircleAlert size={16} /> {error}
        </div>
      )}

      {loading && !analytics ? (
        <div className="analytics-loading" aria-live="polite">Loading ride history…</div>
      ) : analytics ? (
        <AnalyticsContent analytics={analytics} loading={loading} />
      ) : null}
    </article>
  );
}

function AnalyticsContent({ analytics, loading }: { analytics: RideAnalytics; loading: boolean }) {
  const chart = useMemo(() => buildChart(analytics), [analytics]);
  const comparison = comparisonLabel(analytics);

  return (
    <div className={loading ? "analytics-content is-refreshing" : "analytics-content"}>
      <section className="analytics-summary" aria-label="Selected period summary">
        <div className="analytics-primary-metric">
          <strong>{analytics.summary.total.toLocaleString()}</strong>
          <span>rides in selected period</span>
        </div>
        <div className={`analytics-comparison ${comparison.tone}`}>
          {comparison.tone === "up" ? <TrendingUp size={15} /> : comparison.tone === "down" ? <TrendingDown size={15} /> : null}
          <strong>{comparison.value}</strong>
          <span>{comparison.detail}</span>
        </div>
        <div className="analytics-status-summary">
          <span><i className="completed" /> {analytics.summary.completed} completed</span>
          <span><i className="active" /> {analytics.summary.active} active</span>
          <span><i className="cancelled" /> {analytics.summary.cancelled} cancelled</span>
        </div>
      </section>

      <div className="analytics-chart" role="img" aria-label={`Ride totals from ${formatDate(analytics.from)} to ${formatDate(analytics.to)}`}>
        <svg viewBox="0 0 760 250" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="analyticsRideArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--lime)" stopOpacity=".24" />
              <stop offset="100%" stopColor="var(--lime)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {chart.ticks.map((tick, index) => {
            const y = chartY(tick, chart.max);
            return (
              <g key={`${tick}-${index}`}>
                <line x1="54" x2="724" y1={y} y2={y} className="ride-grid-line" />
                <text x="40" y={y + 4} className="ride-axis-label">{tick}</text>
              </g>
            );
          })}
          <polygon points={chart.area} fill="url(#analyticsRideArea)" />
          <polyline points={chart.points} className="ride-chart-line" />
          {analytics.daily.map((day, index) => {
            const x = chartX(index, analytics.daily.length);
            const y = chartY(day.total, chart.max);
            const showLabel = shouldShowChartLabel(index, analytics.daily.length);
            return (
              <g key={day.date}>
                <circle cx={x} cy={y} r="5" className="ride-chart-point">
                  <title>{`${formatDate(day.date)}: ${day.total} ride${day.total === 1 ? "" : "s"}`}</title>
                </circle>
                {showLabel && <text x={x} y="224" className="ride-day-label">{shortDate(day.date, analytics.days)}</text>}
                {(analytics.days <= 10 || day.total > 0) && (
                  <text x={x} y={Math.max(18, y - 12)} className="ride-value-label">{day.total}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="analytics-range-band">
        <div className="analytics-range-label">
          <CalendarDays size={17} />
          <span><small>Selected period</small><strong>{formatDate(analytics.from)} – {formatDate(analytics.to)}</strong></span>
        </div>
        <div className="analytics-legend" aria-label="Graph legend">
          <span><i className="line" /> Daily ride total</span>
          <span><i className="point" /> Recorded day</span>
        </div>
        <span className="analytics-record-count">{analytics.days} calendar days</span>
      </div>

      <section className="analytics-history">
        <div className="analytics-history-heading">
          <div>
            <h4>Daily records</h4>
            <p>Complete database breakdown for the selected period.</p>
          </div>
          <strong>₱{analytics.summary.fareAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })} <small>recorded fares</small></strong>
        </div>
        <div className="analytics-history-table" role="table" aria-label="Historical ride records">
          <div className="analytics-history-row analytics-history-head" role="row">
            <span role="columnheader">Date</span><span role="columnheader">Total</span><span role="columnheader">Completed</span><span role="columnheader">Active</span><span role="columnheader">Cancelled</span><span role="columnheader">Fare amount</span>
          </div>
          {[...analytics.daily].reverse().map((day) => (
            <div className="analytics-history-row" role="row" key={day.date}>
              <span role="cell"><strong>{formatDate(day.date)}</strong><small>{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-PH", { weekday: "long" })}</small></span>
              <span role="cell"><b>{day.total}</b></span>
              <span role="cell">{day.completed}</span>
              <span role="cell">{day.active}</span>
              <span role="cell">{day.cancelled}</span>
              <span role="cell">₱{day.fareAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function buildChart(analytics: RideAnalytics) {
  const highest = Math.max(...analytics.daily.map((day) => day.total), 1);
  const max = Math.max(4, Math.ceil(highest / 4) * 4);
  const points = analytics.daily.map((day, index) => `${chartX(index, analytics.daily.length)},${chartY(day.total, max)}`).join(" ");
  return {
    max,
    points,
    area: `54,198 ${points} 724,198`,
    ticks: Array.from({ length: 5 }, (_, index) => max - index * (max / 4)),
  };
}

function chartX(index: number, length: number) {
  return length <= 1 ? 389 : 54 + index * (670 / (length - 1));
}

function chartY(value: number, max: number) {
  return 38 + (1 - value / max) * 160;
}

function shouldShowChartLabel(index: number, length: number) {
  if (length <= 10) return true;
  const interval = Math.ceil(length / 7);
  return index === 0 || index === length - 1 || index % interval === 0;
}

function comparisonLabel(analytics: RideAnalytics) {
  const percent = analytics.summary.changePercent;
  if (percent === null) return { value: "New activity", detail: "No rides in the prior period", tone: "up" };
  if (percent > 0) return { value: `+${percent}%`, detail: "from the previous equal period", tone: "up" };
  if (percent < 0) return { value: `${percent}%`, detail: "from the previous equal period", tone: "down" };
  return { value: "No change", detail: `${analytics.summary.previousTotal} rides in the prior period`, tone: "neutral" };
}

function rangeFor(period: Exclude<Period, "custom">): DateRange {
  const today = startOfDay(new Date());
  if (period === "previous-week") {
    const currentMonday = addDays(today, -((today.getDay() + 6) % 7));
    return { from: dateString(addDays(currentMonday, -7)), to: dateString(addDays(currentMonday, -1)) };
  }
  const days = period === "last-30" ? 30 : 7;
  return { from: dateString(addDays(today, -(days - 1))), to: dateString(today) };
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateString(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayString() {
  return dateString(new Date());
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function shortDate(value: string, days: number) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", days <= 7 ? { weekday: "short" } : { month: "short", day: "numeric" });
}

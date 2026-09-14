import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { api, type RideAnalytics } from "../../api";

type Period = "last-7" | "previous-week" | "last-30" | "custom";
type DateRange = { from: string; to: string };
type ToastTone = "error" | "warning" | "success";
type AnalyticsToast = { id: number; message: string; tone: ToastTone };
const periodOptions: { value: Period; label: string }[] = [
  { value: "last-7", label: "Last 7 days" },
  { value: "previous-week", label: "Previous week" },
  { value: "last-30", label: "Last 30 days" },
  { value: "custom", label: "Custom dates" },
];

export function RideAnalyticsPanel() {
  const [period, setPeriod] = useState<Period>("last-7");
  const [range, setRange] = useState<DateRange>(() => rangeFor("last-7"));
  const [draftRange, setDraftRange] = useState<DateRange>(() => rangeFor("last-7"));
  const [analytics, setAnalytics] = useState<RideAnalytics>();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<AnalyticsToast | null>(null);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const periodMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closePeriodMenu(event: MouseEvent) {
      if (!periodMenuRef.current?.contains(event.target as Node)) setPeriodMenuOpen(false);
    }
    function closePeriodMenuWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setPeriodMenuOpen(false);
    }
    document.addEventListener("mousedown", closePeriodMenu);
    document.addEventListener("keydown", closePeriodMenuWithKeyboard);
    return () => {
      document.removeEventListener("mousedown", closePeriodMenu);
      document.removeEventListener("keydown", closePeriodMenuWithKeyboard);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .rideAnalytics(range)
      .then((result) => {
        if (active) setAnalytics(result);
      })
      .catch((reason: unknown) => {
        if (active)
          showToast(reason instanceof Error ? reason.message : "Ride analytics could not be loaded.", "error");
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
    setPeriodMenuOpen(false);
    if (nextPeriod !== "custom") {
      const nextRange = rangeFor(nextPeriod);
      setRange(nextRange);
      setDraftRange(nextRange);
    }
  }

  function applyCustomRange() {
    if (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to) {
      showToast("Select a valid start and end date.", "warning");
      return;
    }
    if (dateRangeLength(draftRange) > 90) {
      showToast("Ride analytics can display up to 90 days at a time.", "warning");
      return;
    }
    setRange(draftRange);
    showToast("Custom date range applied.", "success");
  }

  function showToast(message: string, tone: ToastTone) {
    setToast({ id: Date.now(), message, tone });
  }

  return (
    <>
      {toast && createPortal(
        <div className="analytics-toast-region" aria-live="polite">
          <AnalyticsToastNotice key={toast.id} toast={toast} onDismiss={() => setToast(null)} />
        </div>,
        document.body,
      )}
      <article className="dashboard-card activity-chart-card analytics-card">
      <header className="analytics-header">
        <div>
          <p className="eyebrow">RIDE ANALYTICS</p>
          <h3>Transport activity</h3>
          <p>Explore ride sessions recorded by the passenger application.</p>
        </div>
        <div className="analytics-header-controls">
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
              <button type="button" className="primary" onClick={applyCustomRange}>Apply</button>
            </div>
          )}
          <div className={`analytics-period-select ${periodMenuOpen ? "is-open" : ""}`} ref={periodMenuRef}>
            <button
              aria-expanded={periodMenuOpen}
              aria-haspopup="listbox"
              className="analytics-period-trigger"
              onClick={() => setPeriodMenuOpen((open) => !open)}
              type="button"
            >
              <span>{periodOptions.find((option) => option.value === period)?.label}</span>
              <ChevronDown aria-hidden="true" size={15} />
            </button>
            <div className="analytics-period-menu" role="listbox" aria-label="Analytics period">
              {periodOptions.map((option) => (
                <button
                  aria-selected={period === option.value}
                  className={period === option.value ? "selected" : ""}
                  key={option.value}
                  onClick={() => selectPeriod(option.value)}
                  role="option"
                  tabIndex={periodMenuOpen ? 0 : -1}
                  type="button"
                >
                  <span>{option.label}</span>
                  {period === option.value && <Check aria-hidden="true" size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {loading && !analytics ? (
        <div className="analytics-loading" aria-live="polite">Loading ride history…</div>
      ) : analytics ? (
        <AnalyticsContent analytics={analytics} loading={loading} />
      ) : null}
      </article>
    </>
  );
}

function AnalyticsToastNotice({ toast, onDismiss }: { toast: AnalyticsToast; onDismiss: () => void }) {
  const dragStart = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const icon = toast.tone === "success"
    ? <CheckCircle2 aria-hidden="true" />
    : toast.tone === "warning"
      ? <TriangleAlert aria-hidden="true" />
      : <CircleAlert aria-hidden="true" />;

  function beginSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function continueSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStart.current !== null) setDragOffset(event.clientX - dragStart.current);
  }

  function finishSwipe() {
    if (Math.abs(dragOffset) >= 80) onDismiss();
    else setDragOffset(0);
    dragStart.current = null;
  }

  return (
    <div className="analytics-toast-entry">
      <div
        className={`analytics-toast analytics-toast-${toast.tone}`}
        onPointerCancel={finishSwipe}
        onPointerDown={beginSwipe}
        onPointerMove={continueSwipe}
        onPointerUp={finishSwipe}
        role={toast.tone === "error" ? "alert" : "status"}
        style={{ transform: `translateX(${dragOffset}px)` }}
      >
        <span className="analytics-toast-icon">{icon}</span>
        <div>
          <strong>{toast.tone === "success" ? "Success" : toast.tone === "warning" ? "Check your dates" : "Unable to continue"}</strong>
          <p>{toast.message}</p>
        </div>
        <button
          aria-label="Dismiss notification"
          onClick={onDismiss}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function AnalyticsContent({ analytics, loading }: { analytics: RideAnalytics; loading: boolean }) {
  const chart = useMemo(() => buildChart(analytics), [analytics]);
  const comparison = comparisonLabel(analytics);
  const tricycleTotal = analytics.daily.reduce((sum, day) => sum + day.tricycle, 0);
  const habalHabalTotal = analytics.daily.reduce((sum, day) => sum + day.habalHabal, 0);
  const animatedTotal = useAnimatedNumber(analytics.summary.total);
  const animatedTricycleTotal = useAnimatedNumber(tricycleTotal);
  const animatedHabalHabalTotal = useAnimatedNumber(habalHabalTotal);
  const animatedDays = useAnimatedNumber(analytics.days);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hoveredDay = hoveredIndex === null ? null : analytics.daily[hoveredIndex];
  const hoveredX = hoveredIndex === null ? 0 : chartX(hoveredIndex, analytics.daily.length);

  function updateHoveredDay(event: ReactPointerEvent<SVGSVGElement>) {
    if (analytics.daily.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const chartPosition = ((event.clientX - bounds.left) / bounds.width) * 760;
    const ratio = Math.min(1, Math.max(0, (chartPosition - 54) / 670));
    setHoveredIndex(Math.round(ratio * (analytics.daily.length - 1)));
  }

  return (
    <div className={loading ? "analytics-content is-refreshing" : "analytics-content"}>
      <section className="analytics-summary" aria-label="Selected period summary">
        <div className="analytics-primary-metric">
          <strong>{animatedTotal.toLocaleString()}</strong>
          <span>rides in selected period</span>
        </div>
        <div className={`analytics-comparison ${comparison.tone}`}>
          {comparison.tone === "up" ? <TrendingUp size={15} /> : comparison.tone === "down" ? <TrendingDown size={15} /> : null}
          <strong>{comparison.value}</strong>
          <span>{comparison.detail}</span>
        </div>
        <div className="analytics-status-summary">
          <span><i className="tricycle" /> {animatedTricycleTotal} tricycle rides</span>
          <span><i className="habal-habal" /> {animatedHabalHabalTotal} habal-habal rides</span>
        </div>
      </section>

      <div className="analytics-chart" role="img" aria-label={`Tricycle and habal-habal rides from ${formatDate(analytics.from)} to ${formatDate(analytics.to)}`}>
        <svg
          onPointerLeave={() => setHoveredIndex(null)}
          onPointerMove={updateHoveredDay}
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 760 250"
        >
          <defs>
            <linearGradient id="analyticsTricycleArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#55b982" stopOpacity=".16" />
              <stop offset="100%" stopColor="#55b982" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="analyticsHabalArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6597d5" stopOpacity=".14" />
              <stop offset="100%" stopColor="#6597d5" stopOpacity="0" />
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
          <path key={`tricycle-area-${analytics.from}-${analytics.to}`} className="ride-chart-area" d={chart.tricycleArea} fill="url(#analyticsTricycleArea)" />
          <path key={`habal-area-${analytics.from}-${analytics.to}`} className="ride-chart-area" d={chart.habalHabalArea} fill="url(#analyticsHabalArea)" />
          <path key={`tricycle-line-${analytics.from}-${analytics.to}`} d={chart.tricyclePath} className="ride-chart-line tricycle" pathLength="1" />
          <path key={`habal-line-${analytics.from}-${analytics.to}`} d={chart.habalHabalPath} className="ride-chart-line habal-habal" pathLength="1" />
          {analytics.daily.map((day, index) => {
            const x = chartX(index, analytics.daily.length);
            const showLabel = shouldShowChartLabel(index, analytics.daily.length);
            return (
              <g key={day.date}>
                {showLabel && <text x={x} y="224" className="ride-day-label">{shortDate(day.date, analytics.days)}</text>}
              </g>
            );
          })}
          <rect className="analytics-chart-hover-surface" x="54" y="28" width="670" height="180" />
          {hoveredDay && (
            <g className="analytics-chart-tooltip" pointerEvents="none">
              <line x1={hoveredX} x2={hoveredX} y1="38" y2="198" />
              <circle className="tricycle" cx={hoveredX} cy={chartY(hoveredDay.tricycle, chart.max)} r="5" />
              <circle className="habal-habal" cx={hoveredX} cy={chartY(hoveredDay.habalHabal, chart.max)} r="5" />
              <g transform={`translate(${hoveredX > 550 ? hoveredX - 174 : hoveredX + 14}, 44)`}>
                <rect width="160" height="66" rx="10" />
                <text className="tooltip-date" x="12" y="18">{formatDate(hoveredDay.date)}</text>
                <circle className="tricycle" cx="15" cy="35" r="3" />
                <text x="25" y="38">Tricycle</text>
                <text className="tooltip-value" x="147" y="38">{hoveredDay.tricycle}</text>
                <circle className="habal-habal" cx="15" cy="52" r="3" />
                <text x="25" y="55">Habal-habal</text>
                <text className="tooltip-value" x="147" y="55">{hoveredDay.habalHabal}</text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <div className="analytics-range-band">
        <div className="analytics-range-label">
          <span><small>Selected period</small><strong>{formatDate(analytics.from)} – {formatDate(analytics.to)}</strong></span>
        </div>
        <div className="analytics-legend" aria-label="Graph legend">
          <span><i className="line tricycle" /> Tricycle</span>
          <span><i className="line habal-habal" /> Habal-habal</span>
        </div>
        <span className="analytics-record-count">{animatedDays} calendar days</span>
      </div>
    </div>
  );
}

function buildChart(analytics: RideAnalytics) {
  const highest = Math.max(...analytics.daily.flatMap((day) => [day.tricycle, day.habalHabal]), 1);
  const max = Math.max(4, Math.ceil(highest / 4) * 4);
  const tricyclePoints = analytics.daily.map((day, index) => ({ x: chartX(index, analytics.daily.length), y: chartY(day.tricycle, max) }));
  const habalHabalPoints = analytics.daily.map((day, index) => ({ x: chartX(index, analytics.daily.length), y: chartY(day.habalHabal, max) }));
  const tricyclePath = smoothPath(tricyclePoints);
  const habalHabalPath = smoothPath(habalHabalPoints);
  return {
    max,
    tricyclePath,
    habalHabalPath,
    tricycleArea: `${tricyclePath} L 724 198 L 54 198 Z`,
    habalHabalArea: `${habalHabalPath} L 724 198 L 54 198 Z`,
    ticks: Array.from({ length: 5 }, (_, index) => max - index * (max / 4)),
  };
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function useAnimatedNumber(value: number, duration = 650) {
  const [displayValue, setDisplayValue] = useState(0);
  const displayedValueRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displayedValueRef.current = value;
      setDisplayValue(value);
      return;
    }
    const startValue = displayedValueRef.current;
    const startedAt = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (value - startValue) * eased);
      displayedValueRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return displayValue;
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

function dateRangeLength(range: DateRange) {
  const from = new Date(`${range.from}T00:00:00`).getTime();
  const to = new Date(`${range.to}T00:00:00`).getTime();
  return Math.floor((to - from) / 86_400_000) + 1;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function shortDate(value: string, days: number) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", days <= 7 ? { weekday: "short" } : { month: "short", day: "numeric" });
}

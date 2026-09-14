import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BellRing,
  CarFront,
  CheckCircle2,
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudMoon,
  CloudRain,
  Clock3,
  CloudSun,
  Droplets,
  FileClock,
  MapPin,
  Megaphone,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  UsersRound,
} from "lucide-react";
import {
  api,
  type AuditLog,
  type CalendarEvent,
  type Dashboard,
  type Driver,
  type SessionUser,
  type WeatherSnapshot,
} from "../../api";
import type { Tab } from "../../types/admin";
import { RideAnalyticsPanel } from "./RideAnalyticsPanel";

type Props = {
  dashboard: Dashboard;
  drivers: Driver[];
  auditLogs: AuditLog[];
  user: SessionUser | null;
  onRegister: () => void;
  onNavigate: (tab: Tab) => void;
};

const defaultWeatherLocation = {
  latitude: 9.8108,
  longitude: 124.1435,
  locationName: "Trinidad, Bohol",
};

export function DashboardHome({
  dashboard,
  drivers,
  auditLogs,
  user,
  onRegister,
  onNavigate,
}: Props) {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [weather, setWeather] = useState<WeatherSnapshot>();
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherUsesDevice, setWeatherUsesDevice] = useState(false);
  const verifiedPercent = dashboard.drivers
    ? Math.round((dashboard.verifiedDrivers / dashboard.drivers) * 100)
    : 0;
  const administratorName = user?.fullName?.trim() || "Administrator";
  const generatedAt = new Date(dashboard.generatedAt);
  const operationalSummary =
    dashboard.openIncidents > 0
      ? `${dashboard.openIncidents} ${dashboard.openIncidents === 1 ? "report requires" : "reports require"} review${dashboard.activeRides > 0 ? ` while ${dashboard.activeRides} ${dashboard.activeRides === 1 ? "ride is" : "rides are"} active` : ""}.`
      : dashboard.activeRides > 0
        ? `${dashboard.activeRides} ${dashboard.activeRides === 1 ? "ride is" : "rides are"} active, with no incident reports waiting for review.`
        : "Transport records are clear and no incident reports are waiting for review.";

  useEffect(() => {
    const clock = window.setInterval(
      () => setCurrentHour(new Date().getHours()),
      60 * 1000,
    );
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    let active = true;
    setWeatherLoading(true);
    const loadWeather = (position?: {
      latitude: number;
      longitude: number;
      locationName?: string;
    }) =>
      api
        .weather(position)
        .then((nextWeather) => {
          if (active) setWeather(nextWeather);
        })
        .catch(() => {
          if (active) setWeatherError(true);
        })
        .finally(() => {
          if (active) setWeatherLoading(false);
        });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setWeatherUsesDevice(true);
          void resolveDeviceLocationName(
            coords.latitude,
            coords.longitude,
          ).then((locationName) =>
            loadWeather({
              latitude: coords.latitude,
              longitude: coords.longitude,
              locationName,
            }),
          );
        },
        () => {
          setWeatherUsesDevice(false);
          void loadWeather(defaultWeatherLocation);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000,
        },
      );
    } else {
      setWeatherUsesDevice(false);
      void loadWeather(defaultWeatherLocation);
    }
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-top-grid">
        <section
          className="dashboard-command"
          aria-labelledby="dashboard-greeting"
        >
          <div className="dashboard-command-copy">
            <div className="dashboard-command-context">
              <time dateTime={generatedAt.toISOString()}>
                {generatedAt.toLocaleDateString("en-PH", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
            <h1 id="dashboard-greeting">
              {timeGreeting(currentHour)}, <span>{administratorName}</span>
            </h1>
            <p>{operationalSummary}</p>
            <div
              className="operations-pulse"
              aria-label="Current operations status"
            >
              <span className="operations-pulse-online">
                <i aria-hidden="true" /> System operational
              </span>
              <span>
                <Clock3 aria-hidden="true" /> Updated{" "}
                {generatedAt.toLocaleTimeString("en-PH", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span>
                <ShieldCheck aria-hidden="true" /> {verifiedPercent}% of drivers
                verified
              </span>
            </div>
          </div>
        </section>
        <WeatherCard
          weather={weather}
          loading={weatherLoading}
          error={weatherError}
          usesDeviceLocation={weatherUsesDevice}
        />
      </div>

      <section className="dashboard-main-grid">
        <div className="dashboard-primary-stack">
          <section className="metric-grid" aria-label="Current TriSafe metrics">
            <MetricCard
              icon={<UsersRound />}
              label="Passenger accounts"
              value={dashboard.users.passengers}
              detail={`${dashboard.users.total} total TriSafe accounts`}
              onClick={() => onNavigate("passengers")}
              tone="passenger"
              trend={dashboard.metricActivity.passengerAccounts}
              trendLabel="New passenger accounts during the last 7 months"
            />
            <MetricCard
              icon={<ShieldCheck />}
              label="Verified drivers"
              value={dashboard.verifiedDrivers}
              detail={`${verifiedPercent}% of ${dashboard.drivers} registered`}
              onClick={() => onNavigate("drivers")}
              tone="driver"
              trend={dashboard.metricActivity.verifiedDrivers}
              trendLabel="New verified drivers during the last 7 months"
            />
            <MetricCard
              icon={<AlertTriangle />}
              label="Reports to review"
              value={dashboard.openIncidents}
              detail={`${dashboard.incidents.underReview} already assigned`}
              onClick={() => onNavigate("incidents")}
              tone="report"
              trend={dashboard.metricActivity.incidentReports}
              trendLabel="New open incident reports during the last 7 months"
            />
          </section>
          <RideAnalyticsPanel />
        </div>

        <div className="dashboard-side-stack">
          <CalendarCard events={dashboard.calendarEvents} />
          <AccountDistributionCard dashboard={dashboard} />
        </div>
      </section>

      <section className="dashboard-three-grid">
        <article className="dashboard-card outcomes-card">
          <PanelHeading
            eyebrow="RIDE OUTCOMES"
            title="Service health"
            action={
              <strong className="panel-total-modern">
                {dashboard.rides.total}
              </strong>
            }
          />
          <OutcomeRow
            icon={<CheckCircle2 />}
            label="Completed rides"
            value={dashboard.rides.completed}
            total={dashboard.rides.total}
          />
          <OutcomeRow
            icon={<RefreshCw />}
            label="Active rides"
            value={dashboard.rides.active}
            total={dashboard.rides.total}
          />
          <OutcomeRow
            icon={<AlertTriangle />}
            label="Cancelled rides"
            value={dashboard.rides.cancelled}
            total={dashboard.rides.total}
          />
          <div className="outcome-footnote">
            <FileClock size={14} /> Updated from completed ride records
          </div>
        </article>
        <article className="dashboard-card priority-card">
          <PanelHeading
            eyebrow="PRIORITY ACTIONS"
            title="LGU work queue"
            detail="Go directly to records that need attention."
          />
          <ActionItem
            icon={<ShieldCheck />}
            label="Review incident reports"
            detail={`${dashboard.openIncidents} open`}
            urgent={dashboard.openIncidents > 0}
            onClick={() => onNavigate("incidents")}
          />
          <ActionItem
            icon={<CarFront />}
            label="Register approved driver"
            detail="Create account and QR"
            onClick={onRegister}
          />
          <ActionItem
            icon={<Banknote />}
            label="Maintain fare matrix"
            detail="Official distance rates"
            onClick={() => onNavigate("fares")}
          />
          <ActionItem
            icon={<Megaphone />}
            label="Send driver announcement"
            detail="Renewal and safety updates"
            onClick={() => onNavigate("announcements")}
          />
        </article>
      </section>

      <section className="dashboard-card recent-registry-modern">
        <PanelHeading
          eyebrow="DRIVER REGISTRY"
          title="Recently registered drivers"
          detail="Latest approved operator and vehicle records."
          action={
            <div className="panel-actions">
              <button
                className="secondary"
                onClick={() => onNavigate("drivers")}
                type="button"
              >
                View all drivers
              </button>
              <button className="primary" onClick={onRegister} type="button">
                Register driver
              </button>
            </div>
          }
        />
        {drivers.length === 0 ? (
          <p className="inline-empty">No drivers have been registered.</p>
        ) : (
          <div className="responsive-table">
            <div className="data-row driver-summary-head data-head">
              <span>Driver</span>
              <span>Vehicle</span>
              <span>Franchise</span>
              <span>Status</span>
            </div>
            {drivers.slice(0, 5).map((driver) => (
              <div className="data-row driver-summary-row" key={driver.id}>
                <div className="identity-cell">
                  <span className="avatar">{initials(driver.fullName)}</span>
                  <span>
                    <b>{driver.fullName}</b>
                    <small>{driver.username ?? "Record incomplete"}</small>
                  </span>
                </div>
                <span>
                  <b>{driver.vehicles[0]?.plateNumber ?? "No vehicle"}</b>
                  <small>{driver.vehicles[0]?.vehicleType ?? "—"}</small>
                </span>
                <span>
                  <b>{driver.franchise?.franchiseNumber ?? "Not assigned"}</b>
                  <small>
                    {driver.franchise?.expiresAt
                      ? `Expires ${new Date(driver.franchise.expiresAt).toLocaleDateString("en-PH")}`
                      : "—"}
                  </small>
                </span>
                <span
                  className={`status ${(driver.franchise?.status ?? driver.verification).toLowerCase()}`}
                >
                  {driver.franchise?.status ?? driver.verification}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="data-timestamp">
        Dashboard updated{" "}
        {new Date(dashboard.generatedAt).toLocaleString("en-PH")}
      </p>
    </div>
  );
}

function WeatherCard({
  weather,
  loading,
  error,
  usesDeviceLocation,
}: {
  weather?: WeatherSnapshot;
  loading: boolean;
  error: boolean;
  usesDeviceLocation: boolean;
}) {
  const locationName =
    weather?.locationName ??
    (usesDeviceLocation
      ? "Locating administrator…"
      : defaultWeatherLocation.locationName);
  const condition = weather
    ? weatherPresentation(weather.weatherCode, weather.isDay)
    : error
      ? {
          label: "Weather unavailable",
          tone: "neutral",
          icon: <Cloud aria-hidden="true" />,
        }
      : {
          label: "Local weather",
          tone: "neutral",
          icon: <CloudSun aria-hidden="true" />,
        };

  return (
    <article
      className={`metric-card-modern metric-card-weather weather-stat-card weather-${condition.tone}`}
      aria-label={`${condition.label} in ${locationName}`}
    >
      <div className="weather-scene" aria-hidden="true">
        <span className="weather-orb" />
        <span className="weather-cloud weather-cloud-a" />
        <span className="weather-cloud weather-cloud-b" />
        <span className="weather-cloud weather-cloud-c" />
        <span className="weather-rainfall" />
        <span className="weather-fog-bands" />
        <span className="weather-lightning" />
      </div>
      <div className="metric-card-topline">
        <div className="metric-card-title">
          <span className="metric-icon-modern">{condition.icon}</span>
          <p>{condition.label}</p>
        </div>
      </div>
      {loading ? (
        <div className="weather-stat-state">Getting local conditions…</div>
      ) : error || !weather ? (
        <div className="weather-stat-content">
          <div className="metric-value-block">
            <strong>—</strong>
            <small>{locationName}</small>
          </div>
          <span className="weather-stat-state">Temporarily unavailable</span>
        </div>
      ) : (
        <div className="weather-stat-content">
          <div className="metric-value-block">
            <strong>{Number(weather.temperatureC).toFixed(0)}°</strong>
            <small>
              <MapPin aria-hidden="true" size={11} /> {locationName}
            </small>
          </div>
          <div className="weather-stat-summary">
            <b>Feels {Number(weather.apparentC).toFixed(0)}°</b>
            <span>
              <Droplets aria-hidden="true" /> {weather.humidity}%
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

function CalendarCard({ events }: { events: CalendarEvent[] }) {
  const [calendarView, setCalendarView] = useState<"weekly" | "monthly">(
    "weekly",
  );
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const blanks = Array.from(
    { length: monthStart.getDay() },
    (_, index) => `blank-${index}`,
  );
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const monthEvents = events.filter((event) => {
    const date = new Date(event.date);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth()
    );
  });
  const eventDates = new Map<number, CalendarEvent[]>();
  monthEvents.forEach((event) => {
    const day = new Date(event.date).getDate();
    eventDates.set(day, [...(eventDates.get(day) ?? []), event]);
  });
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const eventCountLabel = `${monthEvents.length} scheduled ${monthEvents.length === 1 ? "item" : "items"}`;

  return (
    <article className="dashboard-card calendar-card calendar-card-visual">
      <div className="calendar-view-toolbar">
        <div
          className="calendar-view-switch"
          role="tablist"
          aria-label="Calendar view"
        >
          <button
            className={calendarView === "weekly" ? "active" : ""}
            role="tab"
            aria-selected={calendarView === "weekly"}
            onClick={() => setCalendarView("weekly")}
            type="button"
          >
            Weekly
          </button>
          <button
            className={calendarView === "monthly" ? "active" : ""}
            role="tab"
            aria-selected={calendarView === "monthly"}
            onClick={() => setCalendarView("monthly")}
            type="button"
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="calendar-date-hero">
        <div>
          <span>LGU schedule</span>
          <strong>
            {today.toLocaleDateString("en-PH", { month: "long" })}
          </strong>
        </div>
        <b>{today.getDate()}</b>
      </div>

      {calendarView === "weekly" ? (
        <div className="calendar-week-strip" role="tabpanel">
          {weekDays.map((date) => {
            const isToday = date.toDateString() === today.toDateString();
            const dayEvents =
              date.getMonth() === today.getMonth()
                ? (eventDates.get(date.getDate()) ?? [])
                : [];
            return (
              <div className={isToday ? "today" : ""} key={date.toISOString()}>
                <span>
                  {date.toLocaleDateString("en-PH", { weekday: "short" })}
                </span>
                <b>{date.getDate()}</b>
                {dayEvents.length > 0 && (
                  <i
                    className={dayEvents[0].type.toLowerCase()}
                    title={dayEvents.map((event) => event.label).join(", ")}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="calendar-month-panel" role="tabpanel">
          <div className="calendar-weekdays">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {[...blanks, ...days].map((value) => {
              if (typeof value === "string")
                return <span className="calendar-cell empty" key={value} />;
              const dayEvents = eventDates.get(value) ?? [];
              const isToday = value === today.getDate();
              return (
                <span
                  className={`calendar-cell ${isToday ? "today" : ""}`}
                  key={value}
                >
                  <b>{value}</b>
                  {dayEvents.length > 0 && (
                    <i
                      className={dayEvents[0].type.toLowerCase()}
                      title={dayEvents.map((event) => event.label).join(", ")}
                    />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="calendar-card-footer">
        <span>{eventCountLabel}</span>
      </div>
    </article>
  );
}

function AccountDistributionCard({ dashboard }: { dashboard: Dashboard }) {
  const roleValues = [
    dashboard.users.passengers,
    dashboard.users.drivers,
    dashboard.users.administrators,
  ];
  const rolePercentages = normalizePercentages(roleValues);

  return (
    <article className="dashboard-card role-distribution-card">
      <PanelHeading eyebrow="ACCOUNT DISTRIBUTION" title="Users by role" />
      <div className="donut-layout">
        <DonutChart values={roleValues} total={dashboard.users.total} />
        <div className="donut-legend">
          <LegendRow
            icon={<UsersRound />}
            label="Passengers"
            value={dashboard.users.passengers}
            percentage={rolePercentages[0]}
            tone="passenger"
          />
          <LegendRow
            icon={<CarFront />}
            label="Drivers"
            value={dashboard.users.drivers}
            percentage={rolePercentages[1]}
            tone="driver"
          />
          <LegendRow
            icon={<ShieldCheck />}
            label="Administrators"
            value={dashboard.users.administrators}
            percentage={rolePercentages[2]}
            tone="admin"
          />
        </div>
      </div>
    </article>
  );
}

function PanelHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-title-modern">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  );
}
function MetricCard({
  icon,
  label,
  value,
  detail,
  onClick,
  tone,
  trend,
  trendLabel,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  onClick: () => void;
  tone: "passenger" | "driver" | "report";
  trend: { date: string; label: string; count: number }[];
  trendLabel: string;
}) {
  return (
    <article
      className={`metric-card-modern metric-card-${tone} metric-card-interactive`}
      role="button"
      tabIndex={0}
      aria-label={`Open ${label}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="metric-card-topline">
        <div className="metric-card-title">
          <span className="metric-icon-modern">{icon}</span>
          <p>{label}</p>
        </div>
      </div>
      <div className="metric-card-content">
        <div className="metric-value-block">
          <strong>{value.toLocaleString()}</strong>
          <small>{detail}</small>
        </div>
        <MetricSparkline data={trend} label={trendLabel} />
      </div>
    </article>
  );
}

function MetricSparkline({
  data,
  label,
}: {
  data: { date: string; label: string; count: number }[];
  label: string;
}) {
  const width = 96;
  const height = 38;
  const padding = 4;
  const values = data.length ? data.map((day) => day.count) : [0];
  const maximum = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? width / 2
        : padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - (value / maximum) * (height - padding * 2);
    return { x, y };
  });
  const linePath = createSmoothSparklinePath(points);
  const firstPoint = points[0] ?? { x: padding, y: height - padding };
  const lastPoint = points.at(-1) ?? {
    x: width - padding,
    y: height - padding,
  };
  const areaPath = `${linePath} L ${lastPoint.x} ${height - padding} L ${firstPoint.x} ${height - padding} Z`;
  const currentValue = values.at(-1) ?? 0;
  const previousValue = values.at(-2) ?? 0;
  const percentage =
    previousValue === 0
      ? currentValue === 0
        ? 0
        : null
      : Math.round(((currentValue - previousValue) / previousValue) * 100);
  const trendDirection =
    percentage === null || percentage > 0
      ? "up"
      : percentage < 0
        ? "down"
        : "neutral";
  const trendText =
    percentage === null ? "New" : `${percentage > 0 ? "+" : ""}${percentage}%`;
  const comparisonText =
    percentage === null
      ? "New activity with no previous-month baseline"
      : percentage === 0
        ? "No change from the previous month"
        : `${Math.abs(percentage)} percent ${percentage > 0 ? "increase" : "decrease"} from the previous month`;
  const spokenValues = data
    .map((day) => `${day.label}: ${day.count}`)
    .join(", ");

  return (
    <div className={`metric-sparkline-panel trend-${trendDirection}`}>
      <span className="metric-trend-rate" aria-hidden="true">
        {trendText}
      </span>
      <svg
        className="metric-sparkline"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}. ${comparisonText}. ${spokenValues || "No activity recorded"}`}
      >
        <path className="metric-sparkline-area" d={areaPath} />
        <path className="metric-sparkline-line" d={linePath} />
        <circle cx={lastPoint.x} cy={lastPoint.y} r="2.75" />
      </svg>
    </div>
  );
}

function createSmoothSparklinePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const controlOneX = current.x + (next.x - previous.x) / 6;
    const controlOneY = current.y + (next.y - previous.y) / 6;
    const controlTwoX = next.x - (afterNext.x - current.x) / 6;
    const controlTwoY = next.y - (afterNext.y - current.y) / 6;
    path += ` C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${next.x} ${next.y}`;
  }
  return path;
}
function ActionItem({
  icon,
  label,
  detail,
  urgent,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  urgent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`action-item-modern ${urgent ? "urgent" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span>{icon}</span>
      <div>
        <b>{label}</b>
        <small>{detail}</small>
      </div>
      <ArrowUpRight size={16} />
    </button>
  );
}
function LegendRow({
  icon,
  label,
  value,
  percentage,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  percentage: number;
  tone: "passenger" | "driver" | "admin";
}) {
  return (
    <div className={`legend-row ${tone}`}>
      <span>{icon}</span>
      <div>
        <b>{label}</b>
        <small>
          {value} {value === 1 ? "account" : "accounts"} · {percentage}%
        </small>
      </div>
    </div>
  );
}
function OutcomeRow({
  icon,
  label,
  value,
  total,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  total: number;
}) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="outcome-row">
      <div>
        <span>{icon}</span>
        <b>{label}</b>
        <strong>{value}</strong>
      </div>
      <div className="outcome-track">
        <i style={{ width: `${percent}%` }} />
      </div>
      <small>{percent}%</small>
    </div>
  );
}
function DonutChart({ values, total }: { values: number[]; total: number }) {
  const chartLength = 100;
  const segmentGap = 3;
  const percentages = normalizePercentages(values);
  const roles = [
    {
      label: "Passengers",
      value: values[0],
      percentage: percentages[0],
      className: "passenger",
    },
    {
      label: "Drivers",
      value: values[1],
      percentage: percentages[1],
      className: "driver",
    },
    {
      label: "Administrators",
      value: values[2],
      percentage: percentages[2],
      className: "admin",
    },
  ];
  let offset = 0;
  return (
    <div
      className="donut-chart"
      role="group"
      aria-label={`${total} accounts distributed across passenger, driver, and administrator roles`}
    >
      <svg viewBox="0 0 110 68">
        <path
          className="donut-track"
          d="M 10 60 A 45 45 0 0 1 100 60"
          pathLength={chartLength}
        />
        {roles.map((role) => {
          const completeLength = role.percentage;
          const visibleLength =
            role.value > 0 ? Math.max(2, completeLength - segmentGap) : 0;
          const dashOffset = -offset;
          const midpoint = (offset + completeLength / 2) / chartLength;
          const angle = Math.PI - midpoint * Math.PI;
          const labelX = 56 + 46 * Math.cos(angle);
          const labelY = 65 - 50 * Math.sin(angle);
          offset += completeLength;
          return (
            <g key={role.className}>
              <path
                aria-label={`${role.label}: ${role.value} accounts, ${role.percentage}%`}
                className={`donut-segment ${role.className}`}
                d="M 10 60 A 45 45 0 0 1 100 60"
                pathLength={chartLength}
                role="img"
                strokeDasharray={`${visibleLength} ${chartLength - visibleLength}`}
                strokeDashoffset={dashOffset}
                tabIndex={role.value > 0 ? 0 : -1}
              >
                <title>{`${role.label}: ${role.value} (${role.percentage}%)`}</title>
              </path>
              {role.value > 0 && (
                <text className="donut-percentage" x={labelX} y={labelY}>
                  {role.percentage}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="donut-center">
        <strong>{total}</strong>
        <small>accounts</small>
      </div>
    </div>
  );
}

function normalizePercentages(values: number[]) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total === 0) return values.map(() => 0);

  const raw = values.map((value) => (Math.max(0, value) / total) * 100);
  const percentages = raw.map(Math.floor);
  let remainder = 100 - percentages.reduce((sum, value) => sum + value, 0);
  const priority = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort(
      (left, right) =>
        right.fraction - left.fraction || left.index - right.index,
    );

  for (let index = 0; index < priority.length && remainder > 0; index += 1) {
    percentages[priority[index].index] += 1;
    remainder -= 1;
  }
  return percentages;
}
async function resolveDeviceLocationName(latitude: number, longitude: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "en",
    });
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`,
      { signal: controller.signal },
    );
    if (!response.ok) return undefined;
    const location = (await response.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const locality = location.city || location.locality;
    const region = location.principalSubdivision || location.countryName;
    return (
      [locality, region]
        .filter(
          (value, index, values) => value && values.indexOf(value) === index,
        )
        .join(", ") || undefined
    );
  } catch {
    return undefined;
  } finally {
    window.clearTimeout(timeout);
  }
}
function weatherPresentation(code: number, isDay: boolean) {
  if (code === 0) {
    return isDay
      ? { label: "Sunny", tone: "sunny", icon: <Sun aria-hidden="true" /> }
      : {
          label: "Clear night",
          tone: "night",
          icon: <Moon aria-hidden="true" />,
        };
  }
  if (code === 1 || code === 2) {
    return {
      label: "Partly cloudy",
      tone: isDay ? "partly-cloudy" : "night-cloudy",
      icon: isDay ? (
        <CloudSun aria-hidden="true" />
      ) : (
        <CloudMoon aria-hidden="true" />
      ),
    };
  }
  if (code === 3) {
    return {
      label: "Cloudy",
      tone: "overcast",
      icon: <Cloud aria-hidden="true" />,
    };
  }
  if (code === 45 || code === 48) {
    return { label: "Foggy", tone: "fog", icon: <Cloud aria-hidden="true" /> };
  }
  if (code >= 51 && code <= 57) {
    return {
      label: "Light rain",
      tone: "drizzle",
      icon: <CloudDrizzle aria-hidden="true" />,
    };
  }
  if ((code >= 61 && code <= 67) || (code >= 71 && code <= 77)) {
    return {
      label: code === 65 || code === 67 || code >= 71 ? "Heavy rain" : "Rainy",
      tone: code === 65 || code === 67 || code >= 71 ? "heavy-rain" : "rain",
      icon: <CloudRain aria-hidden="true" />,
    };
  }
  if (code >= 80 && code <= 86) {
    return {
      label: code === 82 || code >= 85 ? "Heavy showers" : "Rain showers",
      tone: code === 82 || code >= 85 ? "heavy-rain" : "rain",
      icon: <CloudRain aria-hidden="true" />,
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      label: "Stormy",
      tone: "storm",
      icon: <CloudLightning aria-hidden="true" />,
    };
  }
  return {
    label: "Variable skies",
    tone: "partly-cloudy",
    icon: <CloudSun aria-hidden="true" />,
  };
}
function timeGreeting(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

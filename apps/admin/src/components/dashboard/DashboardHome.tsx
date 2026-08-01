import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BellRing,
  CalendarDays,
  CarFront,
  CheckCircle2,
  CloudSun,
  Droplets,
  FileClock,
  MapPin,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Thermometer,
  UsersRound,
  Wind,
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

type Props = {
  dashboard: Dashboard;
  drivers: Driver[];
  auditLogs: AuditLog[];
  user: SessionUser | null;
  onRegister: () => void;
  onNavigate: (tab: Tab) => void;
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
  const totalActivity = dashboard.rideActivity.reduce(
    (sum, day) => sum + day.count,
    0,
  );
  const maxActivity = Math.max(
    ...dashboard.rideActivity.map((day) => day.count),
    1,
  );
  const chartMax = Math.max(4, Math.ceil(maxActivity / 4) * 4);
  const chartPoints = dashboard.rideActivity
    .map(
      (day, index) =>
        `${rideChartX(index, dashboard.rideActivity.length)},${rideChartY(day.count, chartMax)}`,
    )
    .join(" ");
  const chartArea = `54,188 ${chartPoints} 654,188`;
  const chartTicks = Array.from(
    { length: 5 },
    (_, index) => chartMax - index * (chartMax / 4),
  );
  const administratorName =
    user?.username || user?.fullName.split(/\s+/)[0] || "Administrator";

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
          void loadWeather();
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 5 * 60 * 1000,
        },
      );
    } else {
      void loadWeather();
    }
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">TRINIDAD · BOHOL OPERATIONS</span>
          <h2>
            {timeGreeting(currentHour)},{" "}
            <span className="welcome-username">{administratorName}</span>.
          </h2>
          <p>
            Keep transport verified, fares transparent, and every passenger
            journey visible.
          </p>
        </div>
        <div className="live-status">
          <span />
          <strong>Live system</strong>
          <small>PostgreSQL connected</small>
        </div>
      </section>

      <section className="metric-grid" aria-label="Current TriSafe metrics">
        <MetricCard
          icon={<UsersRound />}
          label="Registered users"
          value={dashboard.users.total}
          detail={`${dashboard.users.passengers} passenger accounts`}
          onClick={() => onNavigate("users")}
          action="View users"
        />
        <MetricCard
          icon={<ShieldCheck />}
          label="Verified drivers"
          value={dashboard.verifiedDrivers}
          detail={`${verifiedPercent}% of ${dashboard.drivers} registered`}
          onClick={() => onNavigate("drivers")}
          action="Open registry"
        />
        <MetricCard
          icon={<CarFront />}
          label="Active rides"
          value={dashboard.activeRides}
          detail={`${dashboard.rides.completed} completed overall`}
        />
        <MetricCard
          icon={<AlertTriangle />}
          label="Reports to review"
          value={dashboard.openIncidents}
          detail={`${dashboard.incidents.underReview} already assigned`}
          warning={dashboard.openIncidents > 0}
          onClick={() => onNavigate("incidents")}
          action="Review queue"
        />
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-card activity-chart-card">
          <PanelHeading
            eyebrow="RIDE ANALYTICS"
            title="Transport activity"
            detail="Ride sessions recorded by the passenger application."
            action={
              <span className="data-badge">{totalActivity} rides · 7 days</span>
            }
          />
          <div className="chart-summary">
            <strong>{dashboard.rides.total.toLocaleString()}</strong>
            <span>Total rides recorded</span>
            <em>Database snapshot</em>
          </div>
          <div
            className="ride-chart"
            role="img"
            aria-label="Line chart of rides started during the last seven days"
          >
            <svg viewBox="0 0 700 235" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="rideArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--lime)" stopOpacity=".24" />
                  <stop offset="100%" stopColor="var(--lime)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {chartTicks.map((tick, index) => {
                const y = 28 + index * 40;
                return (
                  <g key={tick}>
                    <line
                      x1="54"
                      x2="654"
                      y1={y}
                      y2={y}
                      className="ride-grid-line"
                    />
                    <text x="39" y={y + 4} className="ride-axis-label">
                      {tick}
                    </text>
                  </g>
                );
              })}
              <polygon points={chartArea} fill="url(#rideArea)" />
              <polyline points={chartPoints} className="ride-chart-line" />
              {dashboard.rideActivity.map((day, index) => {
                const x = rideChartX(index, dashboard.rideActivity.length);
                const y = rideChartY(day.count, chartMax);
                return (
                  <g key={day.date}>
                    <circle cx={x} cy={y} r="5" className="ride-chart-point">
                      <title>{`${day.label}: ${day.count} ride${day.count === 1 ? "" : "s"}`}</title>
                    </circle>
                    <text x={x} y="215" className="ride-day-label">
                      {day.label}
                    </text>
                    <text
                      x={x}
                      y={Math.max(18, y - 12)}
                      className="ride-value-label"
                    >
                      {day.count}
                    </text>
                    {index === dashboard.rideActivity.length - 1 && (
                      <text x={x} y="230" className="ride-today-label">
                        TODAY
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </article>

        <div className="dashboard-side-stack">
          <WeatherCard
            weather={weather}
            loading={weatherLoading}
            error={weatherError}
            usesDeviceLocation={weatherUsesDevice}
          />
          <CalendarCard
            events={dashboard.calendarEvents}
            onNavigate={onNavigate}
          />
        </div>
      </section>

      <section className="dashboard-three-grid">
        <article className="dashboard-card role-distribution-card">
          <PanelHeading
            eyebrow="ACCOUNT DISTRIBUTION"
            title="Users by role"
            action={
              <button
                className="link-button"
                onClick={() => onNavigate("users")}
                type="button"
              >
                Directory <ArrowUpRight size={14} />
              </button>
            }
          />
          <div className="donut-layout">
            <DonutChart
              values={[
                dashboard.users.passengers,
                dashboard.users.drivers,
                dashboard.users.administrators,
              ]}
              total={dashboard.users.total}
            />
            <div className="donut-legend">
              <LegendRow
                icon={<UsersRound />}
                label="Passengers"
                value={dashboard.users.passengers}
                total={dashboard.users.total}
              />
              <LegendRow
                icon={<CarFront />}
                label="Drivers"
                value={dashboard.users.drivers}
                total={dashboard.users.total}
              />
              <LegendRow
                icon={<ShieldCheck />}
                label="LGU admins"
                value={dashboard.users.administrators}
                total={dashboard.users.total}
              />
            </div>
          </div>
        </article>
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
                    <small>{driver.licenseNumber}</small>
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
  return (
    <article className="dashboard-card weather-card">
      <div className="weather-top">
        <div>
          <span className="eyebrow">LOCAL WEATHER</span>
          <h3>{weather?.locationName ?? "Locating administrator…"}</h3>
          <small className="weather-location-source">
            <MapPin size={11} />{" "}
            {usesDeviceLocation
              ? "Current device location"
              : "Trinidad fallback location"}
          </small>
        </div>
        <CloudSun size={30} />
      </div>
      {loading ? (
        <div className="widget-loading">
          Getting current location and conditions…
        </div>
      ) : error || !weather ? (
        <div className="widget-empty">
          Weather data is temporarily unavailable.
        </div>
      ) : (
        <>
          <div className="weather-temperature">
            <strong>{Number(weather.temperatureC).toFixed(0)}°</strong>
            <span>{weatherLabel(weather.weatherCode)}</span>
          </div>
          <div className="weather-details">
            <span>
              <Thermometer size={14} /> Feels{" "}
              {Number(weather.apparentC).toFixed(0)}°
            </span>
            <span>
              <Droplets size={14} /> {weather.humidity}% humidity
            </span>
            <span>
              <Wind size={14} /> {Number(weather.windKmh).toFixed(0)} km/h wind
            </span>
          </div>
          <small className="weather-updated">
            Updated {new Date(weather.fetchedAt).toLocaleTimeString("en-PH")}
          </small>
        </>
      )}
    </article>
  );
}

function CalendarCard({
  events,
  onNavigate,
}: {
  events: CalendarEvent[];
  onNavigate: (tab: Tab) => void;
}) {
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
  return (
    <article className="dashboard-card calendar-card">
      <PanelHeading
        eyebrow="UPCOMING SCHEDULE"
        title="LGU calendar"
        action={
          <button
            className="icon-button"
            aria-label="Open announcements"
            onClick={() => onNavigate("announcements")}
            type="button"
          >
            <CalendarDays size={16} />
          </button>
        }
      />
      <div className="calendar-month">
        <strong>
          {today.toLocaleDateString("en-PH", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <span>
          {monthEvents.length} scheduled item
          {monthEvents.length === 1 ? "" : "s"}
        </span>
      </div>
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
      {monthEvents.length > 0 && (
        <div className="calendar-next">
          {monthEvents.slice(0, 2).map((event) => (
            <div key={event.id}>
              <span className={event.type.toLowerCase()} />
              <strong>{event.label}</strong>
              <small>
                {new Date(event.date).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                })}
              </small>
            </div>
          ))}
        </div>
      )}
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
  action,
  onClick,
  warning,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  action?: string;
  onClick?: () => void;
  warning?: boolean;
}) {
  return (
    <article className={`metric-card-modern ${warning ? "warning" : ""}`}>
      <span className="metric-icon-modern">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value.toLocaleString()}</strong>
        <small>{detail}</small>
        {action && onClick && (
          <button onClick={onClick} type="button">
            {action} <ArrowUpRight size={13} />
          </button>
        )}
      </div>
    </article>
  );
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
  total,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div className="legend-row">
      <span>{icon}</span>
      <div>
        <b>{label}</b>
        <small>{total ? Math.round((value / total) * 100) : 0}% of users</small>
      </div>
      <strong>{value}</strong>
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
  const safeTotal = Math.max(total, 1);
  const first = (values[0] / safeTotal) * 100;
  const second = first + (values[1] / safeTotal) * 100;
  return (
    <div
      className="donut-chart"
      style={{
        background: `conic-gradient(var(--orange) 0 ${first}%, var(--black) ${first}% ${second}%, var(--gray) ${second}% 100%)`,
      }}
    >
      <div>
        <strong>{total}</strong>
        <small>accounts</small>
      </div>
    </div>
  );
}
function rideChartX(index: number, length: number) {
  return length <= 1 ? 354 : 54 + index * (600 / (length - 1));
}
function rideChartY(value: number, max: number) {
  return 188 - (value / Math.max(max, 1)) * 160;
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
function weatherLabel(code: number) {
  if (code === 0) return "Clear skies";
  if (code < 4) return "Partly cloudy";
  if (code < 60) return "Cloudy";
  if (code < 80) return "Rain showers";
  if (code < 100) return "Thunderstorms";
  return "Variable conditions";
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

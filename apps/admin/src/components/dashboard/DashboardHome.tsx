import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BellRing,
  CalendarDays,
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
            />
            <MetricCard
              icon={<ShieldCheck />}
              label="Verified drivers"
              value={dashboard.verifiedDrivers}
              detail={`${verifiedPercent}% of ${dashboard.drivers} registered`}
              onClick={() => onNavigate("drivers")}
              tone="driver"
            />
            <MetricCard
              icon={<AlertTriangle />}
              label="Reports to review"
              value={dashboard.openIncidents}
              detail={`${dashboard.incidents.underReview} already assigned`}
              onClick={() => onNavigate("incidents")}
              tone="report"
            />
          </section>
          <RideAnalyticsPanel />
        </div>

        <div className="dashboard-side-stack">
          <CalendarCard
            events={dashboard.calendarEvents}
            onNavigate={onNavigate}
          />
          <AccountDistributionCard
            dashboard={dashboard}
            onNavigate={onNavigate}
          />
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

function AccountDistributionCard({
  dashboard,
  onNavigate,
}: {
  dashboard: Dashboard;
  onNavigate: (tab: Tab) => void;
}) {
  return (
    <article className="dashboard-card role-distribution-card">
      <PanelHeading
        eyebrow="ACCOUNT DISTRIBUTION"
        title="Users by role"
        action={
          <button
            className="link-button"
            onClick={() => onNavigate("passengers")}
            type="button"
          >
            <ArrowUpRight size={14} />
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
            tone="passenger"
          />
          <LegendRow
            icon={<CarFront />}
            label="Drivers"
            value={dashboard.users.drivers}
            total={dashboard.users.total}
            tone="driver"
          />
          <LegendRow
            icon={<ShieldCheck />}
            label="Administrators"
            value={dashboard.users.administrators}
            total={dashboard.users.total}
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
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  onClick: () => void;
  tone: "passenger" | "driver" | "report";
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
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  total: number;
  tone: "passenger" | "driver" | "admin";
}) {
  return (
    <div className={`legend-row ${tone}`}>
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
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const segmentGap = 9;
  const roles = [
    { label: "Passengers", value: values[0], className: "passenger" },
    { label: "Drivers", value: values[1], className: "driver" },
    { label: "Administrators", value: values[2], className: "admin" },
  ];
  let offset = 0;
  return (
    <div
      className="donut-chart"
      role="img"
      aria-label={`${total} accounts distributed across passenger, driver, and administrator roles`}
    >
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <circle className="donut-track" cx="55" cy="55" r={radius} />
        {roles.map((role) => {
          const completeLength = (role.value / safeTotal) * circumference;
          const visibleLength =
            role.value > 0 ? Math.max(2, completeLength - segmentGap) : 0;
          const dashOffset = -offset;
          offset += completeLength;
          return (
            <circle
              className={`donut-segment ${role.className}`}
              cx="55"
              cy="55"
              r={radius}
              key={role.className}
              pathLength={circumference}
              strokeDasharray={`${visibleLength} ${circumference}`}
              strokeDashoffset={dashOffset}
            >
              <title>{`${role.label}: ${role.value} (${Math.round((role.value / safeTotal) * 100)}%)`}</title>
            </circle>
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

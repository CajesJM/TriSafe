import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, LivePresence } from "../../api";

const BOHOL_CENTER: L.LatLngExpression = [9.85, 124.14];
const POLL_INTERVAL_MS = 8000;

function markerIcon(presence: LivePresence) {
  const passenger = presence.role === "PASSENGER";
  return L.divIcon({
    className: "transport-marker-shell",
    html: `<span class="transport-marker ${passenger ? "passenger" : "driver"}" aria-hidden="true"><b>${passenger ? "P" : "D"}</b></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function popupContent(presence: LivePresence) {
  const container = document.createElement("div");
  container.className = "map-popup";
  const title = document.createElement("strong");
  title.textContent = presence.fullName;
  const role = document.createElement("span");
  role.textContent =
    presence.role === "DRIVER" ? "Registered driver" : "Passenger";
  const detail = document.createElement("small");
  detail.textContent = presence.vehicle
    ? `${presence.vehicle.vehicleType.replaceAll("_", " ")} · ${presence.vehicle.plateNumber}`
    : presence.activeRide
      ? `${(presence.activeRide.actualDistanceMeters / 1000).toFixed(2)} km tracked`
      : "No active ride";
  const updated = document.createElement("small");
  updated.textContent = `Updated ${new Date(presence.updatedAt).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  container.append(title, role, detail, updated);
  return container;
}

export function LiveTransportMap() {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const [presences, setPresences] = useState<LivePresence[]>([]);
  const [roleFilter, setRoleFilter] = useState<"ALL" | "PASSENGER" | "DRIVER">(
    "ALL",
  );
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.livePresence();
      setPresences(data);
      setLastUpdated(new Date());
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to refresh live transport locations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!mapElement.current || map.current) return;
    const instance = L.map(mapElement.current, {
      zoomControl: true,
      minZoom: 8,
    }).setView(BOHOL_CENTER, 10);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance);
    markerLayer.current = L.layerGroup().addTo(instance);
    map.current = instance;
    window.setTimeout(() => instance.invalidateSize(), 0);
    return () => {
      instance.remove();
      map.current = null;
      markerLayer.current = null;
    };
  }, []);

  const visible = useMemo(
    () =>
      presences.filter(
        (presence) => roleFilter === "ALL" || presence.role === roleFilter,
      ),
    [presences, roleFilter],
  );

  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer) return;
    layer.clearLayers();
    visible.forEach((presence) => {
      L.marker([presence.latitude, presence.longitude], {
        icon: markerIcon(presence),
        keyboard: true,
        title: `${presence.fullName} · ${presence.role.toLowerCase()}`,
      })
        .bindPopup(popupContent(presence))
        .addTo(layer);
    });
  }, [visible]);

  const passengers = presences.filter(
    (presence) => presence.role === "PASSENGER",
  ).length;
  const drivers = presences.filter(
    (presence) => presence.role === "DRIVER",
  ).length;

  return (
    <section className="card live-map-card" aria-labelledby="live-map-title">
      <div className="live-map-header">
        <div>
          <span className="eyebrow">LIVE TRANSPORT OVERVIEW</span>
          <h3 id="live-map-title">Bohol passenger and driver map</h3>
          <p>
            Displays authenticated mobile users whose location was updated in
            the last five minutes. Data refreshes every eight seconds.
          </p>
        </div>
        <div className="map-sync">
          <span className={error ? "offline" : "online"} />
          <div>
            <strong>{error ? "Refresh delayed" : "Live feed connected"}</strong>
            <small>
              {lastUpdated
                ? `Synced ${lastUpdated.toLocaleTimeString("en-PH")}`
                : "Connecting…"}
            </small>
          </div>
          <button className="secondary" onClick={() => void load()} type="button">
            Refresh
          </button>
        </div>
      </div>
      <div className="map-stats" aria-label="Visible live users">
        <button
          className={roleFilter === "ALL" ? "active" : ""}
          onClick={() => setRoleFilter("ALL")}
          type="button"
        >
          <strong>{presences.length}</strong>
          <span>All live users</span>
        </button>
        <button
          className={`passenger-stat ${roleFilter === "PASSENGER" ? "active" : ""}`}
          onClick={() => setRoleFilter("PASSENGER")}
          type="button"
        >
          <strong>{passengers}</strong>
          <span>Passengers</span>
        </button>
        <button
          className={`driver-stat ${roleFilter === "DRIVER" ? "active" : ""}`}
          onClick={() => setRoleFilter("DRIVER")}
          type="button"
        >
          <strong>{drivers}</strong>
          <span>Drivers</span>
        </button>
      </div>
      {error && (
        <div className="map-inline-error" role="status">
          {error}
        </div>
      )}
      <div className="map-frame">
        <div
          className="bohol-map"
          ref={mapElement}
          role="region"
          aria-label="Live transport locations in Bohol"
        />
        {loading && <div className="map-loading">Loading live map…</div>}
        {!loading && visible.length === 0 && (
          <div className="map-empty">
            <strong>No fresh {roleFilter.toLowerCase()} locations</strong>
            <span>Open the mobile app with location permission to appear here.</span>
          </div>
        )}
        <div className="map-legend" aria-label="Map marker legend">
          <span><i className="passenger" /> Passenger</span>
          <span><i className="driver" /> Driver</span>
        </div>
      </div>
    </section>
  );
}

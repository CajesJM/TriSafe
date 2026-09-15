import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import * as Location from "expo-location";
import type { LocationObject, LocationSubscription } from "expo-location";
import type {
  PassengerIncident,
  PassengerProfile,
  QrVerificationResult,
  Ride,
  TrustedContact,
} from "../models/trisafe";
import { trisafeApi } from "../services/trisafeApi";
import { useToast } from "./ToastContext";

type VerifiedRide = { token: string; result: QrVerificationResult };
type PassengerContextValue = {
  profile: PassengerProfile | null;
  rides: Ride[];
  incidents: PassengerIncident[];
  contacts: TrustedContact[];
  verifiedRide: VerifiedRide | null;
  activeRide: Ride | null;
  latestLocation: LocationObject | null;
  loading: boolean;
  refresh: () => Promise<void>;
  verifyQr: (token: string) => Promise<QrVerificationResult>;
  clearVerifiedRide: () => void;
  setActiveRide: (ride: Ride | null) => void;
};

const PassengerContext = createContext<PassengerContextValue | null>(null);

export function PassengerProvider({ children }: PropsWithChildren) {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [incidents, setIncidents] = useState<PassengerIncident[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [verifiedRide, setVerifiedRide] = useState<VerifiedRide | null>(null);
  const [activeRide, setActiveRideState] = useState<Ride | null>(null);
  const [latestLocation, setLatestLocation] = useState<LocationObject | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const tracking = useRef<LocationSubscription | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextProfile, nextRides, nextIncidents, nextContacts] =
        await Promise.all([
          trisafeApi.profile(),
          trisafeApi.rideHistory(),
          trisafeApi.incidentHistory(),
          trisafeApi.trustedContacts(),
        ]);
      setProfile(nextProfile);
      setRides(nextRides);
      setIncidents(nextIncidents);
      setContacts(nextContacts);
      setActiveRideState(
        nextRides.find((ride) => ride.status === "ACTIVE") ?? null,
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Passenger information could not be loaded.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    async function startTracking() {
      if (!activeRide) return;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted" || cancelled) return;
      tracking.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 8,
          timeInterval: 5000,
        },
        (location) => {
          setLatestLocation(location);
          void trisafeApi.recordRideLocation(activeRide.id, {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
          });
        },
      );
    }
    void startTracking();
    return () => {
      cancelled = true;
      tracking.current?.remove();
      tracking.current = null;
    };
  }, [activeRide]);

  const value = useMemo<PassengerContextValue>(
    () => ({
      profile,
      rides,
      incidents,
      contacts,
      verifiedRide,
      activeRide,
      latestLocation,
      loading,
      refresh,
      async verifyQr(token) {
        const result = await trisafeApi.verifyQr(token);
        if (result.eligibleForRide) setVerifiedRide({ token, result });
        return result;
      },
      clearVerifiedRide: () => setVerifiedRide(null),
      setActiveRide(ride) {
        setActiveRideState(ride);
        if (ride)
          setRides((current) => [
            ride,
            ...current.filter((item) => item.id !== ride.id),
          ]);
        else void refresh();
      },
    }),
    [
      activeRide,
      contacts,
      incidents,
      latestLocation,
      loading,
      profile,
      refresh,
      rides,
      verifiedRide,
    ],
  );

  return (
    <PassengerContext.Provider value={value}>
      {children}
    </PassengerContext.Provider>
  );
}

export function usePassenger() {
  const context = useContext(PassengerContext);
  if (!context)
    throw new Error("usePassenger must be used within PassengerProvider");
  return context;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type {
  DriverAnnouncement,
  DriverNotification,
  DriverProfile,
  DriverRatingStatistics,
  DriverViolation,
} from "../models/trisafe";
import { trisafeApi } from "../services/trisafeApi";
import { useToast } from "./ToastContext";

type DriverContextValue = {
  profile: DriverProfile | null;
  announcements: DriverAnnouncement[];
  notifications: DriverNotification[];
  violations: DriverViolation[];
  ratings: DriverRatingStatistics | null;
  loading: boolean;
  refresh: () => Promise<void>;
  readAnnouncement: (id: string) => Promise<void>;
  readNotification: (id: string) => Promise<void>;
  readAllNotifications: () => Promise<void>;
};
const DriverContext = createContext<DriverContextValue | null>(null);

export function DriverProvider({ children }: PropsWithChildren) {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [announcements, setAnnouncements] = useState<DriverAnnouncement[]>([]);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [violations, setViolations] = useState<DriverViolation[]>([]);
  const [ratings, setRatings] = useState<DriverRatingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [
        nextProfile,
        nextAnnouncements,
        nextNotifications,
        nextViolations,
        nextRatings,
      ] = await Promise.all([
        trisafeApi.driverProfile(),
        trisafeApi.driverAnnouncements(),
        trisafeApi.driverNotifications(),
        trisafeApi.driverViolations(),
        trisafeApi.driverRatingStatistics(),
      ]);
      setProfile(nextProfile);
      setAnnouncements(nextAnnouncements);
      setNotifications(nextNotifications);
      setViolations(nextViolations);
      setRatings(nextRatings);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Driver information could not be loaded.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const value = useMemo<DriverContextValue>(
    () => ({
      profile,
      announcements,
      notifications,
      violations,
      ratings,
      loading,
      refresh,
      async readAnnouncement(id) {
        await trisafeApi.markDriverAnnouncementRead(id);
        setAnnouncements((rows) =>
          rows.map((row) =>
            row.id === id ? { ...row, readAt: new Date().toISOString() } : row,
          ),
        );
      },
      async readNotification(id) {
        await trisafeApi.markDriverNotificationRead(id);
        setNotifications((rows) =>
          rows.map((row) =>
            row.id === id ? { ...row, readAt: new Date().toISOString() } : row,
          ),
        );
      },
      async readAllNotifications() {
        await trisafeApi.markAllDriverNotificationsRead();
        setNotifications((rows) =>
          rows.map((row) => ({
            ...row,
            readAt: row.readAt ?? new Date().toISOString(),
          })),
        );
      },
    }),
    [
      announcements,
      loading,
      notifications,
      profile,
      ratings,
      refresh,
      violations,
    ],
  );
  return (
    <DriverContext.Provider value={value}>{children}</DriverContext.Provider>
  );
}
export function useDriver() {
  const value = useContext(DriverContext);
  if (!value) throw new Error("useDriver must be used within DriverProvider");
  return value;
}

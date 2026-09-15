import * as SecureStore from "expo-secure-store";
import type {
  AuthSession,
  DriverAnnouncement,
  DriverNotification,
  DriverProfile,
  DriverRatingStatistics,
  DriverViolation,
  EmergencyContact,
  FareEstimate,
  LocationOption,
  PassengerFareType,
  PassengerIncident,
  PassengerProfile,
  QrVerificationResult,
  Ride,
  RideProgress,
  TermsDocument,
  TrustedContact,
} from "../models/trisafe";

const TOKEN_KEY = "trisafe_access_token";
const DEFAULT_API_URL = "http://127.0.0.1:3000/api";

export class TriSafeApi {
  readonly baseUrl: string;
  private accessToken: string | null = null;

  constructor(
    baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_URL,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async restoreSession() {
    this.accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!this.accessToken) return null;
    try {
      return await this.profile();
    } catch {
      await this.logout();
      return null;
    }
  }

  async login(
    identifier: string,
    password: string,
    expectedRole: "PASSENGER" | "DRIVER",
  ) {
    const session = await this.request<AuthSession>("/auth/login", {
      method: "POST",
      body: { identifier: identifier.trim(), password, expectedRole },
      authenticated: false,
    });
    this.accessToken = session.accessToken;
    await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken);
    return session;
  }

  async logout() {
    this.accessToken = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  profile() {
    return this.request<PassengerProfile>("/auth/me");
  }

  updatePassengerProfile(
    input: Partial<
      Pick<
        PassengerProfile,
        "fullName" | "username" | "phone" | "email" | "avatarData"
      >
    >,
  ) {
    return this.request<PassengerProfile>("/auth/me/profile", {
      method: "PATCH",
      body: input,
    });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ changed: boolean }>("/auth/me/password", {
      method: "PATCH",
      body: { currentPassword, newPassword },
    });
  }

  verifyQr(token: string) {
    return this.request<QrVerificationResult>(
      `/vehicles/verify/${encodeURIComponent(token)}`,
    );
  }

  driverProfile() {
    return this.request<DriverProfile>("/drivers/me");
  }

  driverAnnouncements() {
    return this.request<DriverAnnouncement[]>("/drivers/me/announcements").then(
      (rows) => rows.map(normalizeAnnouncement),
    );
  }

  driverNotifications() {
    return this.request<DriverNotification[]>("/drivers/me/notifications");
  }

  driverViolations() {
    return this.request<DriverViolation[]>("/drivers/me/violations");
  }

  driverRatingStatistics() {
    return this.request<DriverRatingStatistics>("/ratings/driver/me");
  }

  markDriverAnnouncementRead(id: string) {
    return this.request(
      `/drivers/me/announcements/${encodeURIComponent(id)}/read`,
      { method: "PATCH", body: {} },
    );
  }

  markDriverNotificationRead(id: string) {
    return this.request(
      `/drivers/me/notifications/${encodeURIComponent(id)}/read`,
      { method: "PATCH", body: {} },
    );
  }

  markAllDriverNotificationsRead() {
    return this.request("/drivers/me/notifications/read-all", {
      method: "PATCH",
      body: {},
    });
  }

  updateDriverProfile(input: {
    phone?: string;
    avatarData?: string | null;
    address?: Record<string, string>;
  }) {
    return this.request<DriverProfile>("/drivers/me/profile", {
      method: "PATCH",
      body: input,
    });
  }

  driverMunicipalities() {
    return this.request<LocationOption[]>(
      "/drivers/me/locations/bohol/municipalities",
    );
  }

  driverBarangays(municipalityCode: string) {
    return this.request<LocationOption[]>(
      `/drivers/me/locations/bohol/municipalities/${encodeURIComponent(municipalityCode)}/barangays`,
    );
  }

  estimateDistanceFare(input: {
    vehicleType: string;
    passengerType: PassengerFareType;
    originLatitude: number;
    originLongitude: number;
    destinationLatitude: number;
    destinationLongitude: number;
  }) {
    return this.request<FareEstimate>("/distance-fare-estimates", {
      method: "POST",
      body: input,
    });
  }

  fareLocationName(latitude: number, longitude: number) {
    return this.request<{ name: string; context: string }>(
      "/fare-location-names",
      {
        method: "POST",
        body: { latitude, longitude },
      },
    );
  }

  startRide(input: {
    vehicleId: string;
    qrToken: string;
    originLatitude: number;
    originLongitude: number;
    destinationLatitude: number;
    destinationLongitude: number;
    originLocationName?: string;
    destinationLocationName?: string;
    passengerType: PassengerFareType;
    passengerCount: number;
  }) {
    return this.request<Ride>("/rides/map", { method: "POST", body: input });
  }

  endRide(id: string, endLatitude?: number, endLongitude?: number) {
    return this.request<Ride>(`/rides/${encodeURIComponent(id)}/end`, {
      method: "POST",
      body: { endLatitude, endLongitude },
    });
  }

  recordRideLocation(
    id: string,
    input: {
      latitude: number;
      longitude: number;
      accuracy?: number | null;
      heading?: number | null;
      speed?: number | null;
    },
  ) {
    return this.request<RideProgress>(
      `/rides/${encodeURIComponent(id)}/location`,
      { method: "POST", body: input },
    );
  }

  rideHistory(from?: Date, to?: Date) {
    const query = new URLSearchParams();
    if (from) query.set("from", from.toISOString());
    if (to) query.set("to", to.toISOString());
    const suffix = query.toString();
    return this.request<Ride[]>(`/rides${suffix ? `?${suffix}` : ""}`);
  }

  shareRide(id: string, latitude?: number, longitude?: number) {
    const query =
      latitude !== undefined && longitude !== undefined
        ? `?latitude=${latitude}&longitude=${longitude}`
        : "";
    return this.request<Record<string, unknown>>(
      `/rides/${encodeURIComponent(id)}/share${query}`,
    );
  }

  createRating(rideId: string, score: number, comment?: string) {
    return this.request("/ratings", {
      method: "POST",
      body: { rideId, score, comment: comment?.trim() || undefined },
    });
  }

  incidentHistory() {
    return this.request<PassengerIncident[]>("/incidents");
  }

  draftIncident(input: {
    rawDescription: string;
    rideId?: string;
    category?: string;
    evidenceData?: string;
    evidenceName?: string;
  }) {
    return this.request<PassengerIncident>("/incidents/draft", {
      method: "POST",
      body: input,
    });
  }

  updateIncidentDraft(
    id: string,
    input: {
      rawDescription: string;
      category?: string;
      evidenceData?: string;
      evidenceName?: string;
      removeEvidence?: boolean;
    },
  ) {
    return this.request<PassengerIncident>(
      `/incidents/${encodeURIComponent(id)}/draft`,
      { method: "PATCH", body: input },
    );
  }

  submitIncident(id: string, finalDescription: string, category?: string) {
    return this.request<PassengerIncident>(
      `/incidents/${encodeURIComponent(id)}/submit`,
      {
        method: "POST",
        body: { finalDescription, category },
      },
    );
  }

  trustedContacts() {
    return this.request<TrustedContact[]>("/safety/trusted-contacts");
  }

  saveTrustedContact(input: Omit<TrustedContact, "id"> & { id?: string }) {
    const { id, ...body } = input;
    return this.request<TrustedContact>(
      id
        ? `/safety/trusted-contacts/${encodeURIComponent(id)}`
        : "/safety/trusted-contacts",
      {
        method: id ? "PATCH" : "POST",
        body,
      },
    );
  }

  deleteTrustedContact(id: string) {
    return this.request(`/safety/trusted-contacts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  emergencyContacts() {
    return this.request<EmergencyContact[]>("/safety/emergency-contacts");
  }

  currentTerms() {
    return this.request<TermsDocument | null>("/terms/current", {
      authenticated: false,
    });
  }

  private async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (options.body !== undefined)
        headers["Content-Type"] = "application/json";
      if (options.authenticated !== false && this.accessToken)
        headers.Authorization = `Bearer ${this.accessToken}`;
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const text = await response.text();
      const payload: unknown = text ? JSON.parse(text) : null;
      if (!response.ok)
        throw new TriSafeApiError(response.status, apiMessage(payload));
      return payload as T;
    } catch (error) {
      if (error instanceof TriSafeApiError) throw error;
      throw new Error(
        `TriSafe cannot reach ${this.baseUrl}. Check the API and device connection.`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
};

export class TriSafeApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function apiMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("message" in payload))
    return "TriSafe request failed.";
  const message = (payload as { message: unknown }).message;
  return Array.isArray(message) ? message.join(" ") : String(message);
}

function normalizeAnnouncement(
  row:
    | DriverAnnouncement
    | { announcement: DriverAnnouncement; readAt?: string | null },
) {
  if (!("announcement" in row)) return row;
  return { ...row.announcement, readAt: row.readAt ?? null };
}

export const trisafeApi = new TriSafeApi();

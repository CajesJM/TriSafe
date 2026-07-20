const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const TOKEN_KEY = "trisafe.accessToken";
let accessToken = localStorage.getItem(TOKEN_KEY);

export function hasAuthToken() {
  return Boolean(accessToken);
}

export function logout() {
  accessToken = null;
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      `TriSafe API is unavailable at ${API_URL}. Start the API with “npm run dev:api” and try again.`,
    );
  }
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      window.dispatchEvent(new Event("trisafe-auth-expired"));
    }
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new Error(
      message || `Request failed with status ${response.status}.`,
    );
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error(
      `TriSafe API is unavailable at ${API_URL}. Start the API with “npm run dev:api” and try again.`,
    );
  }
  const body = (await response.json().catch(() => null)) as {
    accessToken?: string;
    message?: string | string[];
  } | null;
  if (!response.ok || !body?.accessToken) {
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new Error(
      message || `Request failed with status ${response.status}.`,
    );
  }
  accessToken = body.accessToken;
  localStorage.setItem(TOKEN_KEY, accessToken);
}

export type Dashboard = {
  drivers: number;
  verifiedDrivers: number;
  activeRides: number;
  openIncidents: number;
  generatedAt: string;
};
export type Driver = {
  id: string;
  fullName: string;
  phone?: string;
  verification: string;
  licenseNumber: string;
  renewalDate: string;
  franchise?: { franchiseNumber: string; issuedAt: string; expiresAt: string; status: string };
  vehicles: {
    plateNumber: string;
    vehicleType: string;
    qrCode?: { token: string };
  }[];
};
export type Incident = {
  id: string;
  rawDescription: string;
  aiDraft?: string;
  category: string;
  status: string;
  passenger: { fullName: string };
  reviewerNotes?: string | null;
  ride?: {
    estimatedFare: number | string;
    fromLocationId: string;
    toLocationId: string;
    vehicle: { plateNumber: string; vehicleType: string; driver: { user: { fullName: string } } };
  } | null;
  createdAt: string;
};
export type IncidentReviewInput = { status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'; category?: string; reviewerNotes?: string };
export type AuditLog = {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
};
export type AnnouncementInput = { title: string; body: string; expiresAt?: string };
export type LocationOption = { id: string; name: string };
export type FareRule = {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  baseFare: number | string;
  distanceKm: number | string;
  perKm: number | string;
  passengerSurcharge: number | string;
  minimumFare: number | string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  active: boolean;
  fromLocation: LocationOption;
  toLocation: LocationOption;
};
export type FareRuleInput = {
  fromLocationId: string;
  toLocationId: string;
  baseFare: number;
  distanceKm: number;
  perKm: number;
  passengerSurcharge: number;
  minimumFare: number;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
};
export type RegisterDriverInput = {
  fullName: string;
  phone: string;
  email: string;
  temporaryPassword: string;
  licenseNumber: string;
  renewalDate: string;
  franchiseNumber: string;
  franchiseIssuedAt: string;
  franchiseExpiresAt: string;
  plateNumber: string;
  vehicleType: string;
};
export type UpdateFranchiseInput = { status: 'PENDING' | 'VERIFIED' | 'SUSPENDED' | 'EXPIRED'; expiresAt: string };

export const api = {
  dashboard: () => request<Dashboard>("/admin/dashboard"),
  drivers: () => request<Driver[]>("/admin/drivers"),
  incidents: () => request<Incident[]>("/incidents/admin/all"),
  auditLogs: (limit = 100) => request<AuditLog[]>(`/admin/audit-logs?limit=${limit}`),
  locations: () => request<LocationOption[]>("/locations"),
  fareRules: () => request<FareRule[]>("/admin/fare-rules"),
  registerDriver: (body: RegisterDriverInput) =>
    request<Driver>("/admin/drivers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateFranchise: (driverId: string, body: UpdateFranchiseInput) =>
    request<Driver>(`/admin/drivers/${driverId}/franchise`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  reviewIncident: (id: string, body: IncidentReviewInput) =>
    request(`/incidents/admin/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createFareRule: (body: FareRuleInput) => request<FareRule>("/admin/fare-rules", { method: "POST", body: JSON.stringify(body) }),
  updateFareRule: (id: string, body: FareRuleInput) => request<FareRule>(`/admin/fare-rules/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deactivateFareRule: (id: string) => request<FareRule>(`/admin/fare-rules/${id}`, { method: "DELETE" }),
  activateFareRule: (id: string) => request<FareRule>(`/admin/fare-rules/${id}/activate`, { method: "POST" }),
  createAnnouncement: (body: AnnouncementInput) => request("/admin/announcements", { method: "POST", body: JSON.stringify(body) }),
};

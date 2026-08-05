const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const TOKEN_KEY = "trisafe.accessToken";
const USER_KEY = "trisafe.adminUser";
let accessToken = localStorage.getItem(TOKEN_KEY);

export type SessionUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: "LGU_ADMIN" | "DRIVER" | "PASSENGER";
  status?: UserStatus;
  username?: string | null;
  phone?: string | null;
  avatarData?: string | null;
};

export type AdminProfile = SessionUser & { status: UserStatus };
export type UpdateProfileInput = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  avatarData?: string | null;
};

export type UserRole = "PASSENGER" | "DRIVER" | "LGU_ADMIN";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type DriverStatus = "VERIFIED" | "PENDING" | "SUSPENDED" | "EXPIRED";

export function hasAuthToken() {
  return Boolean(accessToken);
}

export function logout() {
  accessToken = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSessionUser(): SessionUser | null {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as SessionUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function updateSessionUser(user: SessionUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
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
    user?: SessionUser;
    message?: string | string[];
  } | null;
  if (!response.ok || !body?.accessToken || !body.user) {
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new Error(
      message || `Request failed with status ${response.status}.`,
    );
  }
  accessToken = body.accessToken;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(body.user));
  return body.user;
}

export type Dashboard = {
  drivers: number;
  verifiedDrivers: number;
  activeRides: number;
  openIncidents: number;
  generatedAt: string;
  users: {
    total: number;
    passengers: number;
    drivers: number;
    administrators: number;
    inactive?: number;
  };
  rides: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  incidents: {
    submitted: number;
    underReview: number;
    resolved: number;
    dismissed: number;
  };
  rideActivity: { date: string; label: string; count: number }[];
  calendarEvents: CalendarEvent[];
};
export type CalendarEvent = {
  id: string;
  date: string;
  label: string;
  type: "ANNOUNCEMENT" | "RENEWAL";
  detail: string;
};
export type WeatherSnapshot = {
  id: string;
  locationName: string;
  temperatureC: number | string;
  apparentC: number | string;
  humidity: number;
  windKmh: number | string;
  weatherCode: number;
  isDay: boolean;
  observedAt: string;
  fetchedAt: string;
  latitude?: number | string;
  longitude?: number | string;
};
export type RideAnalyticsDay = {
  date: string;
  label: string;
  total: number;
  completed: number;
  active: number;
  cancelled: number;
  fareAmount: number;
};
export type RideAnalytics = {
  from: string;
  to: string;
  days: number;
  previousPeriod: { from: string; to: string; total: number };
  summary: {
    total: number;
    completed: number;
    active: number;
    cancelled: number;
    fareAmount: number;
    previousTotal: number;
    changePercent: number | null;
  };
  daily: RideAnalyticsDay[];
};

type DashboardResponse = Partial<Dashboard> &
  Pick<
    Dashboard,
    | "drivers"
    | "verifiedDrivers"
    | "activeRides"
    | "openIncidents"
    | "generatedAt"
  >;

function normalizeDashboard(value: DashboardResponse): Dashboard {
  const rideActivity = Array.isArray(value.rideActivity)
    ? value.rideActivity
    : Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return {
          date: date.toISOString().slice(0, 10),
          label: date.toLocaleDateString("en-PH", { weekday: "short" }),
          count: 0,
        };
      });
  return {
    drivers: Number(value.drivers ?? 0),
    verifiedDrivers: Number(value.verifiedDrivers ?? 0),
    activeRides: Number(value.activeRides ?? 0),
    openIncidents: Number(value.openIncidents ?? 0),
    generatedAt: value.generatedAt ?? new Date().toISOString(),
    users: value.users ?? {
      total: Number(value.drivers ?? 0),
      passengers: 0,
      drivers: Number(value.drivers ?? 0),
      administrators: 0,
    },
    rides: value.rides ?? {
      total: Number(value.activeRides ?? 0),
      active: Number(value.activeRides ?? 0),
      completed: 0,
      cancelled: 0,
    },
    incidents: value.incidents ?? {
      submitted: Number(value.openIncidents ?? 0),
      underReview: 0,
      resolved: 0,
      dismissed: 0,
    },
    rideActivity,
    calendarEvents: Array.isArray(value.calendarEvents)
      ? value.calendarEvents
      : [],
  };
}
export type AdminUser = {
  id: string;
  fullName: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  roleDefinition: { name: string };
  driverProfile?: {
    id?: string;
    verification: DriverStatus;
    licenseNumber: string;
  } | null;
};
export type UserPage = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};
export type RoleDefinition = {
  id: string;
  key: UserRole;
  name: string;
  description?: string | null;
  permissions: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { users: number };
};
export type CreateUserInput = {
  fullName: string;
  username?: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  temporaryPassword: string;
};
export type UpdateUserInput = {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  newPassword?: string;
};
export type RoleInput = {
  key: UserRole;
  name: string;
  description?: string;
  permissions: string[];
  active?: boolean;
};
export type Driver = {
  id: string;
  userId: string;
  fullName: string;
  email?: string | null;
  phone?: string;
  accountStatus?: UserStatus;
  verification: DriverStatus;
  licenseNumber: string;
  renewalDate: string;
  franchise?: {
    franchiseNumber: string;
    issuedAt: string;
    expiresAt: string;
    status: string;
  };
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
    vehicle: {
      plateNumber: string;
      vehicleType: string;
      driver: { user: { fullName: string } };
    };
  } | null;
  createdAt: string;
};
export type IncidentReviewInput = {
  status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
  category?: string;
  reviewerNotes?: string;
};
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
export type AnnouncementInput = {
  title: string;
  body: string;
  expiresAt?: string;
};
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
export type VehicleFarePolicy = {
  id: string;
  vehicleType: "TRICYCLE" | "HABAL_HABAL";
  baseFare: number | string;
  ratePerKm: number | string;
  minimumFare: number | string;
  passengerSurcharge: number | string;
  version: string;
  active: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  updatedAt: string;
};
export type VehicleFarePolicyInput = {
  vehicleType: "TRICYCLE" | "HABAL_HABAL";
  baseFare: number;
  ratePerKm: number;
  minimumFare: number;
  passengerSurcharge: number;
  version: string;
  active: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
};
export type LivePresence = {
  id: string;
  userId: string;
  role: "PASSENGER" | "DRIVER";
  fullName: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  updatedAt: string;
  vehicle?: { plateNumber: string; vehicleType: string } | null;
  activeRide?: { id: string; actualDistanceMeters: number } | null;
};
export type RegisterDriverInput = {
  fullName: string;
  accountStatus: UserStatus;
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
export type UpdateFranchiseInput = {
  status: "PENDING" | "VERIFIED" | "SUSPENDED" | "EXPIRED";
  expiresAt: string;
};

export const api = {
  profile: () => request<AdminProfile>("/auth/me"),
  updateProfile: (body: UpdateProfileInput) =>
    request<AdminProfile>("/auth/me/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  dashboard: () =>
    request<DashboardResponse>("/admin/dashboard").then(normalizeDashboard),
  rideAnalytics: (range?: { from: string; to: string }) => {
    const params = new URLSearchParams();
    if (range) {
      params.set("from", range.from);
      params.set("to", range.to);
    }
    const query = params.toString();
    return request<RideAnalytics>(
      `/admin/ride-analytics${query ? `?${query}` : ""}`,
    );
  },
  weather: (position?: {
    latitude: number;
    longitude: number;
    locationName?: string;
  }) => {
    const params = new URLSearchParams();
    if (position) {
      params.set("latitude", String(position.latitude));
      params.set("longitude", String(position.longitude));
      if (position.locationName)
        params.set("locationName", position.locationName);
    }
    const query = params.toString();
    return request<WeatherSnapshot>(
      `/admin/weather${query ? `?${query}` : ""}`,
    );
  },
  users: (
    options: {
      search?: string;
      role?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (options.search) params.set("search", options.search);
    if (options.role) params.set("role", options.role);
    if (options.status) params.set("status", options.status);
    if (options.page) params.set("page", String(options.page));
    if (options.pageSize) params.set("pageSize", String(options.pageSize));
    return request<UserPage>(`/admin/users?${params.toString()}`);
  },
  user: (id: string) => request<AdminUser>(`/admin/users/${id}`),
  createUser: (body: CreateUserInput) =>
    request<AdminUser>("/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateUser: (id: string, body: UpdateUserInput) =>
    request<AdminUser>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteUser: (id: string) =>
    request<{ deleted: true }>(`/admin/users/${id}`, { method: "DELETE" }),
  roles: () => request<RoleDefinition[]>("/admin/roles"),
  createRole: (body: RoleInput) =>
    request<RoleDefinition>("/admin/roles", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateRole: (id: string, body: Omit<RoleInput, "key">) =>
    request<RoleDefinition>(`/admin/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteRole: (id: string) =>
    request<{ deleted: true }>(`/admin/roles/${id}`, { method: "DELETE" }),
  drivers: () => request<Driver[]>("/admin/drivers"),
  incidents: () => request<Incident[]>("/incidents/admin/all"),
  auditLogs: (limit = 100) =>
    request<AuditLog[]>(`/admin/audit-logs?limit=${limit}`),
  locations: () => request<LocationOption[]>("/locations"),
  fareRules: () => request<FareRule[]>("/admin/fare-rules"),
  vehicleFarePolicies: () =>
    request<VehicleFarePolicy[]>("/admin/vehicle-fare-policies"),
  saveVehicleFarePolicy: (body: VehicleFarePolicyInput) =>
    request<VehicleFarePolicy>("/admin/vehicle-fare-policies", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  livePresence: () => request<LivePresence[]>("/admin/live-presence"),
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
  updateDriverStatus: (driverId: string, status: DriverStatus, reason?: string) =>
    request<Driver>(`/admin/drivers/${driverId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
    }),
  reviewIncident: (id: string, body: IncidentReviewInput) =>
    request(`/incidents/admin/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createFareRule: (body: FareRuleInput) =>
    request<FareRule>("/admin/fare-rules", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateFareRule: (id: string, body: FareRuleInput) =>
    request<FareRule>(`/admin/fare-rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deactivateFareRule: (id: string) =>
    request<FareRule>(`/admin/fare-rules/${id}`, { method: "DELETE" }),
  activateFareRule: (id: string) =>
    request<FareRule>(`/admin/fare-rules/${id}/activate`, { method: "POST" }),
  createAnnouncement: (body: AnnouncementInput) =>
    request("/admin/announcements", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

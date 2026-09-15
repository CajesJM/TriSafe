export type UserRole = "PASSENGER" | "DRIVER" | "LGU_ADMIN";
export type AccountType = "PASSENGER" | "DRIVER";
export type PassengerFareType = "REGULAR" | "STUDENT" | "SENIOR_CITIZEN";

export interface SessionUser {
  id: string;
  fullName: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarData?: string | null;
  role: UserRole;
  status: string;
}

export interface AuthSession {
  accessToken: string;
  user: SessionUser;
}

export interface PassengerProfile extends SessionUser {
  address?: DriverAddress | null;
}

export interface DriverOwner {
  lastName: string;
  firstName: string;
  middleName?: string | null;
}

export interface DriverAddress {
  provinceCode: string;
  provinceName: string;
  municipalityCode: string;
  municipalityName: string;
  barangayCode: string;
  barangayName: string;
  purok?: string;
  streetPurok?: string;
  postalCode?: string | null;
}

export interface DriverFranchise {
  franchiseNumber: string;
  status: string;
  issuedAt: string;
  expiresAt: string;
}

export interface DriverQrCode {
  id: string;
  token: string;
  generatedAt: string;
  revokedAt?: string | null;
}

export interface DriverVehicle {
  id: string;
  plateNumber: string;
  vehicleType: "TRICYCLE" | "HABAL_HABAL" | string;
  makeModel?: string | null;
  bodyNumber?: string | null;
  permitNumber?: string | null;
  engineNumber?: string | null;
  chassisNumber?: string | null;
  isActive: boolean;
  qrCode?: DriverQrCode | null;
}

export interface DriverProfile {
  id: string;
  fullName: string;
  username: string;
  avatarData?: string | null;
  phone: string;
  accountStatus: string;
  verification: string;
  owner?: DriverOwner | null;
  address?: DriverAddress | null;
  renewalReminder?: string | null;
  franchise?: DriverFranchise | null;
  vehicles: DriverVehicle[];
}

export interface DriverAnnouncement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  expiresAt?: string | null;
  readAt?: string | null;
  imageData?: string | null;
}

export interface DriverNotification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  announcementId?: string | null;
}

export interface DriverViolation {
  id: string;
  category: string;
  offenseLevel: string;
  description: string;
  occurredAt: string;
  status: string;
  penaltyAmount?: number | string | null;
  penaltyStatus: string;
  dueAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface DriverRatingStatistics {
  average?: number | null;
  totalReviews: number;
  distribution: { score: number; count: number }[];
  reviews: {
    id: string;
    score: number;
    comment?: string | null;
    createdAt: string;
  }[];
}

export interface VerifiedVehicle {
  driverId: string;
  driverName: string;
  driverAddress?: string | null;
  ownerName?: string | null;
  bodyNumber?: string | null;
  permitNumber?: string | null;
  engineNumber?: string | null;
  chassisNumber?: string | null;
  franchiseNumber?: string | null;
  franchiseExpiresAt?: string | null;
  vehicleId: string;
  plateNumber: string;
  vehicleType: string;
  qrCodeId: string;
  averageRating?: number | null;
  ratingCount: number;
}

export interface QrVerificationResult {
  legitimate: boolean;
  eligibleForRide: boolean;
  transportStatus: string;
  accountStatus?: string | null;
  qrStatus: string;
  message: string;
  vehicle?: VerifiedVehicle | null;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface FareEstimate {
  amount: number;
  subtotal: number;
  baseFare: number;
  distanceCharge: number;
  passengerType: PassengerFareType;
  discountPercent: number;
  discountAmount: number;
  matrixVersion: string;
  disclaimer: string;
  distanceMeters?: number;
  distanceKm?: number;
  ratePerKm?: number;
  vehicleType?: string;
  routeDurationSeconds?: number;
  routeCoordinates: Coordinate[];
}

export interface Ride {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | string;
  estimatedFare: number | string;
  finalFare?: number | string | null;
  actualDistanceMeters?: number | string;
  currentFare?: number | { amount: number } | null;
  fromLocationName?: string | null;
  toLocationName?: string | null;
  operatorName?: string | null;
  bodyNumber?: string | null;
  permitNumber?: string | null;
  averageDriverRating?: number | null;
  driverRatingCount?: number;
  vehicleType?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  rating?: { score: number } | null;
  vehicle?: {
    plateNumber: string;
    vehicleType: string;
    driver?: { user?: { fullName?: string } };
  };
}

export interface RideProgress {
  actualDistanceMeters: number;
  currentFare: { amount: number } | number;
  pointAccepted: boolean;
}

export interface TrustedContact {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  active: boolean;
}

export interface PassengerIncident {
  id: string;
  category: string;
  status: string;
  rawDescription: string;
  aiDraft?: string | null;
  finalDescription?: string | null;
  reviewerNotes?: string | null;
  createdAt: string;
  submittedAt?: string | null;
  rideId?: string | null;
  evidence?: { fileName: string }[];
}

export interface TermsDocument {
  id: string;
  version: string;
  title: string;
  content: string;
  effectiveFrom?: string | null;
  publishedAt?: string | null;
}

export interface LocationOption {
  code: string;
  name: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  description?: string;
  active: boolean;
}

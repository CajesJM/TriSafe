export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  LGU_ADMIN = 'LGU_ADMIN',
}

export enum DriverVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

export enum RideStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum IncidentCategory {
  SAFETY = 'SAFETY',
  OVERCHARGING = 'OVERCHARGING',
  HARASSMENT = 'HARASSMENT',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER',
}

export enum IncidentStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export type FareEstimateRequest = {
  fromLocationId: string;
  toLocationId: string;
};

export type FareEstimate = {
  currency: 'PHP';
  amount: number;
  subtotal: number;
  baseFare: number;
  distanceCharge: number;
  passengerType: PassengerFareType;
  discountPercent: number;
  discountAmount: number;
  matrixVersion: string;
  disclaimer: string;
};

export const PASSENGER_FARE_TYPES = ['REGULAR', 'STUDENT', 'SENIOR_CITIZEN'] as const;
export type PassengerFareType = (typeof PASSENGER_FARE_TYPES)[number];

function applyPassengerDiscount(
  subtotal: number,
  passengerType: PassengerFareType = 'REGULAR',
  discountPercent = 0,
) {
  const appliedDiscountPercent = passengerType === 'REGULAR'
    ? 0
    : Math.max(0, Math.min(100, discountPercent));
  const discountAmount = subtotal * (appliedDiscountPercent / 100);
  return {
    subtotal: Number(subtotal.toFixed(2)),
    passengerType,
    discountPercent: Number(appliedDiscountPercent.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    amount: Number((subtotal - discountAmount).toFixed(2)),
  };
}

export type VerifiedVehicle = {
  driverId: string;
  driverName: string;
  franchiseNumber: string | null;
  franchiseExpiresAt: string | null;
  vehicleId: string;
  plateNumber: string;
  vehicleType: string;
  qrCodeId: string;
};

export type QrVerificationResult = {
  legitimate: boolean;
  eligibleForRide: boolean;
  transportStatus: "VERIFIED" | "PENDING" | "SUSPENDED" | "EXPIRED" | "NOT_LGU_ISSUED";
  accountStatus: "ACTIVE" | "INACTIVE" | null;
  qrStatus: "ACTIVE" | "REVOKED" | "UNKNOWN";
  message: string;
  vehicle: VerifiedVehicle | null;
};

export type SafeSharePayload = {
  rideId: string;
  driverName: string;
  vehiclePlateNumber: string;
  from?: string;
  to?: string;
  startedAt: string;
  estimatedArrivalSeconds?: number;
  liveLocationUrl?: string;
};

export const calculateFare = (input: {
  baseFare: number;
  distanceKm: number;
  perKm: number;
  minimumFare?: number;
  passengerType?: PassengerFareType;
  discountPercent?: number;
}): FareEstimate => {
  const distanceCharge = Math.max(0, input.distanceKm) * input.perKm;
  const discount = applyPassengerDiscount(
    Math.max(input.minimumFare ?? 0, input.baseFare + distanceCharge),
    input.passengerType,
    input.discountPercent,
  );

  return {
    currency: 'PHP',
    ...discount,
    baseFare: input.baseFare,
    distanceCharge: Number(distanceCharge.toFixed(2)),
    matrixVersion: 'runtime',
    disclaimer: 'Estimate based on the active LGU fare matrix. Final fare may depend on approved local rules.',
  };
};

export const calculateDistanceFare = (input: {
  baseFare: number;
  distanceMeters: number;
  ratePerKm: number;
  minimumFare?: number;
  passengerType?: PassengerFareType;
  discountPercent?: number;
}): FareEstimate & { distanceMeters: number; distanceKm: number; ratePerKm: number } => {
  const distanceMeters = Math.max(0, input.distanceMeters);
  const distanceKm = distanceMeters / 1000;
  const distanceCharge = distanceKm * input.ratePerKm;
  const discount = applyPassengerDiscount(Math.max(
    input.minimumFare ?? 0,
    input.baseFare + distanceCharge,
  ), input.passengerType, input.discountPercent);

  return {
    currency: 'PHP',
    ...discount,
    baseFare: Number(input.baseFare.toFixed(2)),
    distanceCharge: Number(distanceCharge.toFixed(2)),
    distanceMeters: Number(distanceMeters.toFixed(1)),
    distanceKm: Number(distanceKm.toFixed(3)),
    ratePerKm: Number(input.ratePerKm.toFixed(2)),
    matrixVersion: 'runtime',
    disclaimer:
      'Fare is calculated from tracked ride distance using the active LGU rate for this vehicle type.',
  };
};

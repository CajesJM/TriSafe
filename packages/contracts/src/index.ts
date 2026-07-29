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
  passengerCount?: number;
};

export type FareEstimate = {
  currency: 'PHP';
  amount: number;
  baseFare: number;
  distanceCharge: number;
  passengerSurcharge: number;
  matrixVersion: string;
  disclaimer: string;
};

export type VerifiedVehicle = {
  driverId: string;
  driverName: string;
  franchiseNumber: string;
  franchiseExpiresAt: string;
  vehicleId: string;
  plateNumber: string;
  vehicleType: string;
  qrCodeId: string;
  verified: true;
};

export type SafeSharePayload = {
  rideId: string;
  driverName: string;
  vehiclePlateNumber: string;
  from?: string;
  to?: string;
  startedAt: string;
  liveLocationUrl?: string;
};

export const calculateFare = (input: {
  baseFare: number;
  distanceKm: number;
  perKm: number;
  passengerCount: number;
  passengerSurcharge: number;
  minimumFare?: number;
}): FareEstimate => {
  const distanceCharge = Math.max(0, input.distanceKm) * input.perKm;
  const surcharge = Math.max(0, input.passengerCount - 1) * input.passengerSurcharge;
  const amount = Math.max(input.minimumFare ?? 0, input.baseFare + distanceCharge + surcharge);

  return {
    currency: 'PHP',
    amount: Number(amount.toFixed(2)),
    baseFare: input.baseFare,
    distanceCharge: Number(distanceCharge.toFixed(2)),
    passengerSurcharge: Number(surcharge.toFixed(2)),
    matrixVersion: 'runtime',
    disclaimer: 'Estimate based on the active LGU fare matrix. Final fare may depend on approved local rules.',
  };
};

export const calculateDistanceFare = (input: {
  baseFare: number;
  distanceMeters: number;
  ratePerKm: number;
  passengerCount: number;
  passengerSurcharge: number;
  minimumFare?: number;
}): FareEstimate & { distanceMeters: number; distanceKm: number; ratePerKm: number } => {
  const distanceMeters = Math.max(0, input.distanceMeters);
  const distanceKm = distanceMeters / 1000;
  const distanceCharge = distanceKm * input.ratePerKm;
  const surcharge =
    Math.max(0, input.passengerCount - 1) * input.passengerSurcharge;
  const amount = Math.max(
    input.minimumFare ?? 0,
    input.baseFare + distanceCharge + surcharge,
  );

  return {
    currency: 'PHP',
    amount: Number(amount.toFixed(2)),
    baseFare: Number(input.baseFare.toFixed(2)),
    distanceCharge: Number(distanceCharge.toFixed(2)),
    passengerSurcharge: Number(surcharge.toFixed(2)),
    distanceMeters: Number(distanceMeters.toFixed(1)),
    distanceKm: Number(distanceKm.toFixed(3)),
    ratePerKm: Number(input.ratePerKm.toFixed(2)),
    matrixVersion: 'runtime',
    disclaimer:
      'Fare is calculated from tracked ride distance using the active LGU rate for this vehicle type.',
  };
};

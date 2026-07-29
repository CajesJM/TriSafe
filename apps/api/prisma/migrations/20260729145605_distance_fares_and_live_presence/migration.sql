-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "actualDistanceMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "finalFare" DECIMAL(10,2),
ADD COLUMN     "passengerCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "vehicleType" TEXT NOT NULL DEFAULT 'TRICYCLE';

-- CreateTable
CREATE TABLE "VehicleFarePolicy" (
    "id" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "baseFare" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ratePerKm" DECIMAL(10,2) NOT NULL,
    "minimumFare" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "passengerSurcharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleFarePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideLocationPoint" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideLocationPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivePresence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LivePresence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleFarePolicy_vehicleType_key" ON "VehicleFarePolicy"("vehicleType");

-- CreateIndex
CREATE INDEX "VehicleFarePolicy_active_effectiveFrom_idx" ON "VehicleFarePolicy"("active", "effectiveFrom");

-- CreateIndex
CREATE INDEX "RideLocationPoint_rideId_recordedAt_idx" ON "RideLocationPoint"("rideId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LivePresence_userId_key" ON "LivePresence"("userId");

-- CreateIndex
CREATE INDEX "LivePresence_updatedAt_idx" ON "LivePresence"("updatedAt");

-- AddForeignKey
ALTER TABLE "RideLocationPoint" ADD CONSTRAINT "RideLocationPoint_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePresence" ADD CONSTRAINT "LivePresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

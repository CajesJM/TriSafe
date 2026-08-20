CREATE TYPE "ViolationStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
CREATE TYPE "PenaltyStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'PAID', 'WAIVED');

CREATE TABLE "DriverViolation" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "incidentId" TEXT,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "status" "ViolationStatus" NOT NULL DEFAULT 'OPEN',
  "penaltyAmount" DECIMAL(10,2),
  "penaltyStatus" "PenaltyStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  "dueAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverViolation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DriverViolation_driverId_status_idx" ON "DriverViolation"("driverId", "status");
CREATE INDEX "DriverViolation_status_penaltyStatus_dueAt_idx" ON "DriverViolation"("status", "penaltyStatus", "dueAt");
CREATE INDEX "DriverViolation_occurredAt_idx" ON "DriverViolation"("occurredAt");
ALTER TABLE "DriverViolation" ADD CONSTRAINT "DriverViolation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

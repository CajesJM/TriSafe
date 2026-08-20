CREATE TABLE "TransportOwner" (
    "id" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportOwner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportOwner_identityKey_key" ON "TransportOwner"("identityKey");

ALTER TABLE "Driver" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Driver" DROP COLUMN "licenseNumber";
ALTER TABLE "Driver" DROP COLUMN "renewalDate";

DROP INDEX IF EXISTS "DriverAddress_postalCode_idx";
ALTER TABLE "DriverAddress" RENAME COLUMN "streetPurok" TO "purok";
ALTER TABLE "DriverAddress" DROP COLUMN "postalCode";
ALTER TABLE "DriverAddress" DROP COLUMN "externalPlaceId";
ALTER TABLE "DriverAddress" DROP COLUMN "latitude";
ALTER TABLE "DriverAddress" DROP COLUMN "longitude";

ALTER TABLE "Vehicle" ADD COLUMN "bodyNumber" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "permitNumber" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "engineNumber" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "chassisNumber" TEXT;

CREATE UNIQUE INDEX "Vehicle_bodyNumber_key" ON "Vehicle"("bodyNumber");
CREATE UNIQUE INDEX "Vehicle_permitNumber_key" ON "Vehicle"("permitNumber");
CREATE UNIQUE INDEX "Vehicle_engineNumber_key" ON "Vehicle"("engineNumber");
CREATE UNIQUE INDEX "Vehicle_chassisNumber_key" ON "Vehicle"("chassisNumber");

UPDATE "User" SET "email" = NULL WHERE "role" = 'DRIVER';

ALTER TABLE "Driver" ADD CONSTRAINT "Driver_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "TransportOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Map-planned rides use GPS coordinates instead of predefined LGU locations.
ALTER TABLE "Ride"
ALTER COLUMN "fromLocationId" DROP NOT NULL,
ALTER COLUMN "toLocationId" DROP NOT NULL,
ADD COLUMN "fromLocationName" TEXT,
ADD COLUMN "toLocationName" TEXT,
ADD COLUMN "destinationLatitude" DECIMAL(10,7),
ADD COLUMN "destinationLongitude" DECIMAL(10,7);

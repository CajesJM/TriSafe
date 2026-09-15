-- Preserve readable route labels on historical rides before removing the
-- retired location-to-location fare matrix.
UPDATE "Ride" AS ride
SET "fromLocationName" = COALESCE(ride."fromLocationName", location."name")
FROM "Location" AS location
WHERE ride."fromLocationId" = location."id";

UPDATE "Ride" AS ride
SET "toLocationName" = COALESCE(ride."toLocationName", location."name")
FROM "Location" AS location
WHERE ride."toLocationId" = location."id";

DROP TABLE "FareRule";

ALTER TABLE "Ride"
  DROP COLUMN "fromLocationId",
  DROP COLUMN "toLocationId";

DROP TABLE "Location";

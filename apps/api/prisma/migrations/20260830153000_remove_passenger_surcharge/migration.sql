-- Passenger count remains part of a ride record, but it must not change the
-- LGU-regulated fare. Remove the obsolete configurable surcharge from both
-- fare-policy models so it cannot be re-enabled accidentally.
ALTER TABLE "FareRule" DROP COLUMN "passengerSurcharge";
ALTER TABLE "VehicleFarePolicy" DROP COLUMN "passengerSurcharge";

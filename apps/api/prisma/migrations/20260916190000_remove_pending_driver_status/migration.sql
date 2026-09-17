-- BPLO registration creates complete, verified transport records. Preserve any
-- legacy pending records before removing the unreachable workflow state.
UPDATE "Driver"
SET "verification" = 'VERIFIED'
WHERE "verification" = 'PENDING';

UPDATE "Franchise"
SET "status" = 'VERIFIED'
WHERE "status" = 'PENDING';

ALTER TABLE "Driver" ALTER COLUMN "verification" DROP DEFAULT;
ALTER TABLE "Franchise" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "DriverVerificationStatus_new" AS ENUM (
  'VERIFIED',
  'SUSPENDED',
  'EXPIRED'
);

ALTER TABLE "Driver"
  ALTER COLUMN "verification" TYPE "DriverVerificationStatus_new"
  USING ("verification"::text::"DriverVerificationStatus_new");

ALTER TABLE "Franchise"
  ALTER COLUMN "status" TYPE "DriverVerificationStatus_new"
  USING ("status"::text::"DriverVerificationStatus_new");

DROP TYPE "DriverVerificationStatus";
ALTER TYPE "DriverVerificationStatus_new" RENAME TO "DriverVerificationStatus";

ALTER TABLE "Driver"
  ALTER COLUMN "verification" SET DEFAULT 'VERIFIED';
ALTER TABLE "Franchise"
  ALTER COLUMN "status" SET DEFAULT 'VERIFIED';

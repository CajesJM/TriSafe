DROP INDEX "DriverRating_driverId_visible_createdAt_idx";
CREATE INDEX "DriverRating_driverId_createdAt_idx" ON "DriverRating"("driverId", "createdAt");

ALTER TABLE "DriverRating"
  DROP COLUMN "visible",
  DROP COLUMN "moderationNotes";

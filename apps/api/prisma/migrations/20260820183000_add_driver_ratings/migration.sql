CREATE TABLE "DriverRating" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "passengerId" TEXT NOT NULL,
  "rideId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "comment" TEXT,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "moderationNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DriverRating_rideId_key" ON "DriverRating"("rideId");
CREATE INDEX "DriverRating_driverId_visible_createdAt_idx" ON "DriverRating"("driverId", "visible", "createdAt");
CREATE INDEX "DriverRating_passengerId_createdAt_idx" ON "DriverRating"("passengerId", "createdAt");
ALTER TABLE "DriverRating" ADD CONSTRAINT "DriverRating_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverRating" ADD CONSTRAINT "DriverRating_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverRating" ADD CONSTRAINT "DriverRating_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

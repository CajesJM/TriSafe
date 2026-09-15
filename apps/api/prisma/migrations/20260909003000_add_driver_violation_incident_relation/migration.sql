CREATE INDEX "DriverViolation_incidentId_idx" ON "DriverViolation"("incidentId");

ALTER TABLE "DriverViolation"
ADD CONSTRAINT "DriverViolation_incidentId_fkey"
FOREIGN KEY ("incidentId") REFERENCES "Incident"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

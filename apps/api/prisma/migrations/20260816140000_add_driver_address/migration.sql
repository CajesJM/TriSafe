CREATE TABLE "DriverAddress" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "provinceName" TEXT NOT NULL,
    "municipalityCode" TEXT NOT NULL,
    "municipalityName" TEXT NOT NULL,
    "barangayCode" TEXT NOT NULL,
    "barangayName" TEXT NOT NULL,
    "streetPurok" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "externalPlaceId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverAddress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DriverAddress_driverId_key" ON "DriverAddress"("driverId");
CREATE INDEX "DriverAddress_provinceCode_municipalityCode_barangayCode_idx" ON "DriverAddress"("provinceCode", "municipalityCode", "barangayCode");
CREATE INDEX "DriverAddress_postalCode_idx" ON "DriverAddress"("postalCode");

ALTER TABLE "DriverAddress" ADD CONSTRAINT "DriverAddress_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAddress_userId_key" ON "UserAddress"("userId");
CREATE INDEX "UserAddress_provinceCode_municipalityCode_barangayCode_idx" ON "UserAddress"("provinceCode", "municipalityCode", "barangayCode");
CREATE INDEX "UserAddress_postalCode_idx" ON "UserAddress"("postalCode");

ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

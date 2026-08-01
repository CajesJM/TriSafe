-- CreateTable
CREATE TABLE "WeatherSnapshot" (
    "id" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "temperatureC" DECIMAL(5,2) NOT NULL,
    "apparentC" DECIMAL(5,2) NOT NULL,
    "humidity" INTEGER NOT NULL,
    "windKmh" DECIMAL(6,2) NOT NULL,
    "weatherCode" INTEGER NOT NULL,
    "isDay" BOOLEAN NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeatherSnapshot_pkey" PRIMARY KEY ("id")
);

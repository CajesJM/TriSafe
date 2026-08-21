-- CreateEnum
CREATE TYPE "DriverNotificationType" AS ENUM ('ANNOUNCEMENT', 'ACCOUNT_STATUS', 'FRANCHISE_STATUS', 'VEHICLE_STATUS', 'VIOLATION_RECORDED', 'VIOLATION_UPDATED', 'GENERAL');

-- CreateEnum
CREATE TYPE "DriverNotificationPriority" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "imageData" TEXT;

-- CreateTable
CREATE TABLE "DriverNotification" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "DriverNotificationType" NOT NULL,
    "priority" "DriverNotificationPriority" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverNotification_driverId_readAt_createdAt_idx" ON "DriverNotification"("driverId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "DriverNotification_driverId_type_createdAt_idx" ON "DriverNotification"("driverId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "DriverNotification" ADD CONSTRAINT "DriverNotification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

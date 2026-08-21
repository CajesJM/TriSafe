-- CreateEnum
CREATE TYPE "OffenseLevel" AS ENUM ('FIRST_OFFENSE', 'SECOND_OFFENSE', 'THIRD_OFFENSE', 'GRAVE_OFFENSE');

-- AlterTable
ALTER TABLE "DriverViolation" ADD COLUMN     "offenseLevel" "OffenseLevel" NOT NULL DEFAULT 'FIRST_OFFENSE';

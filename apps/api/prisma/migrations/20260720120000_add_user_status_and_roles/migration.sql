CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "User"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "RoleDefinition" (
  "id" TEXT NOT NULL,
  "key" "UserRole" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoleDefinition_key_key" ON "RoleDefinition"("key");

INSERT INTO "RoleDefinition" ("id", "key", "name", "description", "permissions") VALUES
  ('role-passenger', 'PASSENGER', 'Passenger', 'Commuter access to verification, fares, rides, sharing, SOS, and reports.', ARRAY['rides:self', 'incidents:self', 'drivers:verify']::TEXT[]),
  ('role-driver', 'DRIVER', 'Driver', 'Approved operator access to profile, franchise, reminders, and announcements.', ARRAY['profile:self', 'announcements:self']::TEXT[]),
  ('role-lgu-admin', 'LGU_ADMIN', 'LGU Administrator', 'Administrative access to registry, fares, users, incidents, announcements, and audit records.', ARRAY['admin:all']::TEXT[]);

ALTER TABLE "User" ADD CONSTRAINT "User_role_fkey"
  FOREIGN KEY ("role") REFERENCES "RoleDefinition"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

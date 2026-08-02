import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth/password";

const prisma = new PrismaClient();

async function main() {
  await Promise.all([
    prisma.roleDefinition.upsert({
      where: { key: "PASSENGER" },
      update: {},
      create: {
        id: "role-passenger",
        key: "PASSENGER",
        name: "Passenger",
        description:
          "Commuter access to verification, fares, rides, sharing, SOS, and reports.",
        permissions: ["rides:self", "incidents:self", "drivers:verify"],
      },
    }),
    prisma.roleDefinition.upsert({
      where: { key: "DRIVER" },
      update: {},
      create: {
        id: "role-driver",
        key: "DRIVER",
        name: "Driver",
        description:
          "Approved operator access to profile, franchise, reminders, and announcements.",
        permissions: ["profile:self", "announcements:self"],
      },
    }),
    prisma.roleDefinition.upsert({
      where: { key: "LGU_ADMIN" },
      update: { name: "Administrator" },
      create: {
        id: "role-lgu-admin",
        key: "LGU_ADMIN",
        name: "Administrator",
        description:
          "Administrative access to registry, fares, users, incidents, announcements, and audit records.",
        permissions: ["admin:all"],
      },
    }),
  ]);
  await Promise.all([
    prisma.vehicleFarePolicy.upsert({
      where: { vehicleType: "TRICYCLE" },
      update: {},
      create: {
        id: "fare-policy-tricycle",
        vehicleType: "TRICYCLE",
        baseFare: 15,
        ratePerKm: 8,
        minimumFare: 15,
        passengerSurcharge: 5,
        version: "LGU-DISTANCE-2026-01",
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.vehicleFarePolicy.upsert({
      where: { vehicleType: "HABAL_HABAL" },
      update: {},
      create: {
        id: "fare-policy-habal-habal",
        vehicleType: "HABAL_HABAL",
        baseFare: 20,
        ratePerKm: 12,
        minimumFare: 20,
        passengerSurcharge: 0,
        version: "LGU-DISTANCE-2026-01",
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);
  const [market, terminal] = await Promise.all([
    prisma.location.upsert({
      where: { id: "loc-trinidad-market" },
      update: {},
      create: {
        id: "loc-trinidad-market",
        name: "Trinidad Public Market",
        latitude: 9.8108,
        longitude: 124.1435,
      },
    }),
    prisma.location.upsert({
      where: { id: "loc-trinidad-terminal" },
      update: {},
      create: {
        id: "loc-trinidad-terminal",
        name: "Trinidad Transport Terminal",
        latitude: 9.817,
        longitude: 124.1451,
      },
    }),
  ]);
  const fareRule = {
    baseFare: 15,
    distanceKm: 2.1,
    perKm: 2,
    passengerSurcharge: 5,
    minimumFare: 15,
    version: "LGU-2026-01",
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  };

  await Promise.all([
    prisma.fareRule.upsert({
      where: { id: "fare-trinidad-market-to-terminal" },
      update: {
        ...fareRule,
        fromLocationId: market.id,
        toLocationId: terminal.id,
      },
      create: {
        id: "fare-trinidad-market-to-terminal",
        ...fareRule,
        fromLocationId: market.id,
        toLocationId: terminal.id,
      },
    }),
    prisma.fareRule.upsert({
      where: { id: "fare-trinidad-terminal-to-market" },
      update: {
        ...fareRule,
        fromLocationId: terminal.id,
        toLocationId: market.id,
      },
      create: {
        id: "fare-trinidad-terminal-to-market",
        ...fareRule,
        fromLocationId: terminal.id,
        toLocationId: market.id,
      },
    }),
  ]);
  await Promise.all([
    prisma.emergencyContact.upsert({
      where: {
        name_phone: { name: "Trinidad Municipal Police", phone: "911" },
      },
      update: { description: "Emergency response", active: true },
      create: {
        id: "emergency-trinidad-police",
        name: "Trinidad Municipal Police",
        phone: "911",
        description: "Emergency response",
      },
    }),
    prisma.emergencyContact.upsert({
      where: {
        name_phone: {
          name: "Trinidad Rural Health Unit",
          phone: "(038) 554-1234",
        },
      },
      update: { description: "Medical assistance", active: true },
      create: {
        id: "emergency-trinidad-health",
        name: "Trinidad Rural Health Unit",
        phone: "(038) 554-1234",
        description: "Medical assistance",
      },
    }),
  ]);
  await prisma.user.upsert({
    where: { id: "passenger-demo" },
    update: {
      email: "passenger@trisafe.local",
      passwordHash: hashPassword("passenger123"),
    },
    create: {
      id: "passenger-demo",
      role: "PASSENGER",
      fullName: "Demo Passenger",
      email: "passenger@trisafe.local",
      passwordHash: hashPassword("passenger123"),
    },
  });
  await prisma.user.upsert({
    where: { id: "lgu-admin-demo" },
    update: {
      username: "lguadmin",
      email: "admin@gmail.com",
      passwordHash: hashPassword("admin12345"),
    },
    create: {
      id: "lgu-admin-demo",
      role: "LGU_ADMIN",
      fullName: "Trinidad LGU Administrator",
      username: "lguadmin",
      email: "admin@gmail.com",
      passwordHash: hashPassword("admin12345"),
    },
  });
  await prisma.user.upsert({
    where: { id: "driver-demo-user" },
    update: {
      email: "driver@trisafe.local",
      passwordHash: hashPassword("driver12345"),
    },
    create: {
      id: "driver-demo-user",
      role: "DRIVER",
      fullName: "Juan Dela Cruz",
      email: "driver@trisafe.local",
      phone: "+639171234567",
      passwordHash: hashPassword("driver12345"),
    },
  });
  await prisma.driver.upsert({
    where: { id: "driver-demo" },
    update: { verification: "VERIFIED", renewalDate: new Date("2027-12-31") },
    create: {
      id: "driver-demo",
      userId: "driver-demo-user",
      verification: "VERIFIED",
      licenseNumber: "DL-DEMO-001",
      renewalDate: new Date("2027-12-31"),
    },
  });
  await prisma.franchise.upsert({
    where: { driverId: "driver-demo" },
    update: { expiresAt: new Date("2027-12-31"), status: "VERIFIED" },
    create: {
      driverId: "driver-demo",
      franchiseNumber: "TRI-DEMO-001",
      issuedAt: new Date("2026-01-01"),
      expiresAt: new Date("2027-12-31"),
      status: "VERIFIED",
    },
  });
  await prisma.vehicle.upsert({
    where: { id: "vehicle-demo" },
    update: { isActive: true, vehicleType: "Tricycle" },
    create: {
      id: "vehicle-demo",
      driverId: "driver-demo",
      plateNumber: "TRI-2026",
      vehicleType: "Tricycle",
      qrCode: { create: { token: "demo-trinidad-qr" } },
    },
  });
}

main().finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();

async function main() {
  const [market, terminal] = await Promise.all([
    prisma.location.upsert({ where: { id: 'loc-trinidad-market' }, update: {}, create: { id: 'loc-trinidad-market', name: 'Trinidad Public Market', latitude: 9.8108, longitude: 124.1435 } }),
    prisma.location.upsert({ where: { id: 'loc-trinidad-terminal' }, update: {}, create: { id: 'loc-trinidad-terminal', name: 'Trinidad Transport Terminal', latitude: 9.8170, longitude: 124.1451 } }),
  ]);
  const fareRule = {
    baseFare: 15,
    distanceKm: 2.1,
    perKm: 2,
    passengerSurcharge: 5,
    minimumFare: 15,
    version: 'LGU-2026-01',
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
  };

  await Promise.all([
    prisma.fareRule.upsert({
      where: { id: 'fare-trinidad-market-to-terminal' },
      update: { ...fareRule, fromLocationId: market.id, toLocationId: terminal.id },
      create: { id: 'fare-trinidad-market-to-terminal', ...fareRule, fromLocationId: market.id, toLocationId: terminal.id },
    }),
    prisma.fareRule.upsert({
      where: { id: 'fare-trinidad-terminal-to-market' },
      update: { ...fareRule, fromLocationId: terminal.id, toLocationId: market.id },
      create: { id: 'fare-trinidad-terminal-to-market', ...fareRule, fromLocationId: terminal.id, toLocationId: market.id },
    }),
  ]);
  await Promise.all([
    prisma.emergencyContact.upsert({ where: { name_phone: { name: 'Trinidad Municipal Police', phone: '911' } }, update: { description: 'Emergency response', active: true }, create: { id: 'emergency-trinidad-police', name: 'Trinidad Municipal Police', phone: '911', description: 'Emergency response' } }),
    prisma.emergencyContact.upsert({ where: { name_phone: { name: 'Trinidad Rural Health Unit', phone: '(038) 554-1234' } }, update: { description: 'Medical assistance', active: true }, create: { id: 'emergency-trinidad-health', name: 'Trinidad Rural Health Unit', phone: '(038) 554-1234', description: 'Medical assistance' } }),
  ]);
  await prisma.user.upsert({ where: { id: 'passenger-demo' }, update: { email: 'passenger@trisafe.local', passwordHash: hashPassword('passenger123') }, create: { id: 'passenger-demo', role: 'PASSENGER', fullName: 'Demo Passenger', email: 'passenger@trisafe.local', passwordHash: hashPassword('passenger123') } });
  await prisma.user.upsert({ where: { id: 'lgu-admin-demo' }, update: { email: 'admin@trisafe.local', passwordHash: hashPassword('admin12345') }, create: { id: 'lgu-admin-demo', role: 'LGU_ADMIN', fullName: 'Trinidad LGU Administrator', email: 'admin@trisafe.local', passwordHash: hashPassword('admin12345') } });
  await prisma.user.upsert({ where: { id: 'driver-demo-user' }, update: { email: 'driver@trisafe.local', passwordHash: hashPassword('driver12345') }, create: { id: 'driver-demo-user', role: 'DRIVER', fullName: 'Juan Dela Cruz', email: 'driver@trisafe.local', phone: '+639171234567', passwordHash: hashPassword('driver12345') } });
  await prisma.driver.upsert({ where: { id: 'driver-demo' }, update: {}, create: { id: 'driver-demo', userId: 'driver-demo-user', verification: 'VERIFIED', licenseNumber: 'DL-DEMO-001', renewalDate: new Date('2027-12-31') } });
  await prisma.franchise.upsert({ where: { driverId: 'driver-demo' }, update: {}, create: { driverId: 'driver-demo', franchiseNumber: 'TRI-DEMO-001', issuedAt: new Date('2026-01-01'), expiresAt: new Date('2027-12-31'), status: 'VERIFIED' } });
  await prisma.vehicle.upsert({ where: { id: 'vehicle-demo' }, update: {}, create: { id: 'vehicle-demo', driverId: 'driver-demo', plateNumber: 'TRI-2026', vehicleType: 'Tricycle', qrCode: { create: { token: 'demo-trinidad-qr' } } } });
}

main().finally(() => prisma.$disconnect());

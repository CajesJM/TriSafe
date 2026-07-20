import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DriverVerificationStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { UpdateDriverContactDto } from './dto/update-driver-contact.dto';
import { hashPassword } from '../auth/password';
import { AuditService } from '../audit/audit.service';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async registerApprovedDriver(actorId: string, dto: RegisterDriverDto) {
    const identityFilters = [{ phone: dto.phone }, ...(dto.email ? [{ email: dto.email }] : [])];
    const [existingUser, existingFranchise, existingVehicle] = await Promise.all([
      this.prisma.user.findFirst({ where: { OR: identityFilters } }),
      this.prisma.franchise.findUnique({ where: { franchiseNumber: dto.franchiseNumber } }),
      this.prisma.vehicle.findUnique({ where: { plateNumber: dto.plateNumber } }),
    ]);

    if (existingUser) throw new ConflictException('A driver account already uses this phone number or email.');
    if (existingFranchise) throw new ConflictException('This franchise number is already registered.');
    if (existingVehicle) throw new ConflictException('This plate number is already registered.');

    try {
      const driver = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { fullName: dto.fullName, email: dto.email, phone: dto.phone, passwordHash: hashPassword(dto.temporaryPassword), role: 'DRIVER' } });
        const driver = await tx.driver.create({
          data: {
            userId: user.id, licenseNumber: dto.licenseNumber, renewalDate: new Date(dto.renewalDate), verification: DriverVerificationStatus.VERIFIED,
            franchise: { create: { franchiseNumber: dto.franchiseNumber, issuedAt: new Date(dto.franchiseIssuedAt), expiresAt: new Date(dto.franchiseExpiresAt), status: DriverVerificationStatus.VERIFIED } },
            vehicles: { create: { plateNumber: dto.plateNumber, vehicleType: dto.vehicleType, qrCode: { create: { token: randomUUID() } } } },
          },
          include: { user: true, franchise: true, vehicles: { include: { qrCode: true } } },
        });
        return this.toAdminDriver(driver);
      });
      await this.audit.record({
        actorId,
        action: 'DRIVER_REGISTERED',
        entityType: 'Driver',
        entityId: driver.id,
        details: { franchiseNumber: dto.franchiseNumber, plateNumber: dto.plateNumber },
      });
      return driver;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A driver, franchise, or vehicle with one of these details already exists.');
      }
      throw error;
    }
  }

  async verifyQr(token: string) {
    const qr = await this.prisma.qrCode.findUnique({ where: { token }, include: { vehicle: { include: { driver: { include: { user: true, franchise: true } } } } } });
    const franchise = qr?.vehicle.driver.franchise;
    const valid = Boolean(qr && !qr.revokedAt && qr.vehicle.isActive && qr.vehicle.driver.verification === 'VERIFIED' && franchise?.status === 'VERIFIED' && franchise.expiresAt > new Date());
    if (!valid || !qr || !franchise) throw new NotFoundException('This QR code is not linked to an active verified vehicle');
    return { driverId: qr.vehicle.driver.id, driverName: qr.vehicle.driver.user.fullName, franchiseNumber: franchise.franchiseNumber, franchiseExpiresAt: franchise.expiresAt.toISOString(), vehicleId: qr.vehicle.id, plateNumber: qr.vehicle.plateNumber, vehicleType: qr.vehicle.vehicleType, qrCodeId: qr.id, verified: true as const };
  }

  async getDriver(id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id }, include: { user: true, franchise: true, vehicles: { include: { qrCode: true } } } });
    if (!driver) throw new NotFoundException('Driver not found');
    return this.toAdminDriver(driver);
  }

  async getByUserId(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId }, include: { user: true, franchise: true, vehicles: { include: { qrCode: true } } } });
    if (!driver) throw new NotFoundException('Driver profile not found');
    const renewalTimes = [driver.renewalDate.getTime(), ...(driver.franchise ? [driver.franchise.expiresAt.getTime()] : [])];
    const daysUntilRenewal = Math.ceil((Math.min(...renewalTimes) - Date.now()) / 86400000);
    return { ...this.toAdminDriver(driver), renewalReminder: daysUntilRenewal <= 30 ? `Renewal due in ${Math.max(0, daysUntilRenewal)} days` : null };
  }

  announcements(userId: string) {
    return this.prisma.announcementRecipient.findMany({ where: { driver: { userId }, announcement: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }, include: { announcement: true }, orderBy: { announcement: { publishedAt: 'desc' } } });
  }

  updateContact(userId: string, dto: UpdateDriverContactDto) {
    return this.prisma.user.update({ where: { id: userId }, data: { phone: dto.phone, email: dto.email }, select: { id: true, fullName: true, email: true, phone: true } });
  }

  async rotateQr(actorId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    const qr = await this.prisma.qrCode.upsert({ where: { vehicleId }, update: { token: randomUUID(), generatedAt: new Date(), revokedAt: null }, create: { vehicleId, token: randomUUID() } });
    await this.audit.record({ actorId, action: 'QR_ROTATED', entityType: 'QrCode', entityId: qr.id, details: { vehicleId } });
    return qr;
  }

  async updateFranchise(actorId: string, driverId: string, dto: UpdateFranchiseDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId }, include: { franchise: true } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (!driver.franchise) throw new NotFoundException('Franchise record not found');

    const franchise = await this.prisma.franchise.update({
      where: { id: driver.franchise.id },
      data: { status: dto.status, expiresAt: new Date(dto.expiresAt) },
    });
    await this.audit.record({
      actorId,
      action: 'FRANCHISE_UPDATED',
      entityType: 'Franchise',
      entityId: franchise.id,
      details: { driverId, status: dto.status, expiresAt: dto.expiresAt },
    });
    return this.getDriver(driverId);
  }

  async list() {
    const drivers = await this.prisma.driver.findMany({ include: { user: true, franchise: true, vehicles: { include: { qrCode: true } } }, orderBy: { createdAt: 'desc' } });
    return drivers.map((driver) => this.toAdminDriver(driver));
  }

  private toAdminDriver(driver: Prisma.DriverGetPayload<{ include: { user: true; franchise: true; vehicles: { include: { qrCode: true } } } }>) {
    return { id: driver.id, fullName: driver.user.fullName, email: driver.user.email, phone: driver.user.phone, verification: driver.verification, licenseNumber: driver.licenseNumber, renewalDate: driver.renewalDate, franchise: driver.franchise, vehicles: driver.vehicles };
  }
}

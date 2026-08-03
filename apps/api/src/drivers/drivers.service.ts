import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DriverVerificationStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { UpdateDriverContactDto } from './dto/update-driver-contact.dto';
import { hashPassword } from '../auth/password';
import { AuditService } from '../audit/audit.service';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { DriverStatusService } from './driver-status.service';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly statuses: DriverStatusService) {}

  async registerApprovedDriver(actorId: string, dto: RegisterDriverDto) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (dto.renewalDate < today) throw new BadRequestException('The license renewal date cannot be in the past.');
    if (dto.franchiseIssuedAt > today) throw new BadRequestException('The franchise issued date cannot be in the future.');
    if (dto.franchiseExpiresAt <= dto.franchiseIssuedAt) throw new BadRequestException('The franchise expiration date must be after its issued date.');
    if (dto.franchiseExpiresAt <= today) throw new BadRequestException('The franchise expiration date must be in the future.');
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
        const user = await tx.user.create({ data: { fullName: dto.fullName, email: dto.email, phone: dto.phone, passwordHash: hashPassword(dto.temporaryPassword), role: 'DRIVER', status: dto.accountStatus } });
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
        details: { franchiseNumber: dto.franchiseNumber, plateNumber: dto.plateNumber, accountStatus: dto.accountStatus },
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
    await this.statuses.syncExpiredDrivers();
    const qr = await this.prisma.qrCode.findUnique({ where: { token }, include: { vehicle: { include: { driver: { include: { user: true, franchise: true } } } } } });
    if (!qr) {
      return {
        legitimate: false,
        eligibleForRide: false,
        transportStatus: 'NOT_LGU_ISSUED',
        accountStatus: null,
        qrStatus: 'UNKNOWN',
        message: 'This QR code was not created by the LGU and is not registered in TriSafe.',
        vehicle: null,
      };
    }

    const driver = qr.vehicle.driver;
    const franchise = driver.franchise;
    const transportStatus = franchise?.status ?? driver.verification;
    const qrStatus = qr.revokedAt ? 'REVOKED' : 'ACTIVE';
    const eligibleForRide = Boolean(
      !qr.revokedAt &&
      qr.vehicle.isActive &&
      franchise &&
      driver.verification === 'VERIFIED' &&
      franchise.status === 'VERIFIED' &&
      franchise.expiresAt > new Date(),
    );

    return {
      legitimate: true,
      eligibleForRide,
      transportStatus,
      accountStatus: driver.user.status,
      qrStatus,
      message: this.qrVerificationMessage({ qrRevoked: Boolean(qr.revokedAt), vehicleActive: qr.vehicle.isActive, hasFranchise: Boolean(franchise), transportStatus, eligibleForRide }),
      vehicle: {
        driverId: driver.id,
        driverName: driver.user.fullName,
        franchiseNumber: franchise?.franchiseNumber ?? null,
        franchiseExpiresAt: franchise?.expiresAt.toISOString() ?? null,
        vehicleId: qr.vehicle.id,
        plateNumber: qr.vehicle.plateNumber,
        vehicleType: qr.vehicle.vehicleType,
        qrCodeId: qr.id,
      },
    };
  }

  async getDriver(id: string) {
    await this.statuses.syncExpiredDrivers();
    const driver = await this.prisma.driver.findUnique({ where: { id }, include: { user: true, franchise: true, vehicles: { include: { qrCode: true } } } });
    if (!driver) throw new NotFoundException('Driver not found');
    return this.toAdminDriver(driver);
  }

  async getByUserId(userId: string) {
    await this.statuses.syncExpiredDrivers();
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

    const expiresAt = new Date(dto.expiresAt);
    const effectiveStatus = expiresAt <= new Date() ? DriverVerificationStatus.EXPIRED : dto.status;
    const [franchise] = await this.prisma.$transaction([
      this.prisma.franchise.update({ where: { id: driver.franchise.id }, data: { status: effectiveStatus, expiresAt } }),
      this.prisma.driver.update({ where: { id: driverId }, data: { verification: effectiveStatus } }),
    ]);
    await this.audit.record({
      actorId,
      action: 'FRANCHISE_UPDATED',
      entityType: 'Franchise',
      entityId: franchise.id,
      details: { driverId, previousStatus: driver.verification, requestedStatus: dto.status, status: effectiveStatus, expiresAt: dto.expiresAt },
    });
    return this.getDriver(driverId);
  }

  async list() {
    await this.statuses.syncExpiredDrivers();
    const drivers = await this.prisma.driver.findMany({ include: { user: true, franchise: true, vehicles: { include: { qrCode: true } } }, orderBy: { createdAt: 'desc' } });
    return drivers.map((driver) => this.toAdminDriver(driver));
  }

  async updateStatus(actorId: string, driverId: string, dto: UpdateDriverStatusDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId }, include: { franchise: true } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (dto.status === DriverVerificationStatus.VERIFIED && (!driver.franchise || driver.franchise.expiresAt <= new Date())) throw new BadRequestException('Renew the franchise before verifying this driver.');
    await this.prisma.$transaction([
      this.prisma.driver.update({ where: { id: driverId }, data: { verification: dto.status } }),
      ...(driver.franchise ? [this.prisma.franchise.update({ where: { id: driver.franchise.id }, data: { status: dto.status } })] : []),
    ]);
    await this.audit.record({ actorId, action: 'DRIVER_STATUS_CHANGED', entityType: 'Driver', entityId: driverId, details: { previousStatus: driver.verification, status: dto.status, ...(dto.reason ? { reason: dto.reason } : {}) } });
    return this.getDriver(driverId);
  }

  private toAdminDriver(driver: Prisma.DriverGetPayload<{ include: { user: true; franchise: true; vehicles: { include: { qrCode: true } } } }>) {
    return { id: driver.id, userId: driver.user.id, fullName: driver.user.fullName, email: driver.user.email, phone: driver.user.phone, accountStatus: driver.user.status, verification: driver.verification, licenseNumber: driver.licenseNumber, renewalDate: driver.renewalDate, franchise: driver.franchise, vehicles: driver.vehicles };
  }

  private qrVerificationMessage(input: { qrRevoked: boolean; vehicleActive: boolean; hasFranchise: boolean; transportStatus: string; eligibleForRide: boolean }) {
    if (input.qrRevoked) return 'This LGU-issued QR code has been revoked. Do not continue the ride.';
    if (!input.vehicleActive) return 'This LGU-issued QR belongs to an inactive vehicle. Do not continue the ride.';
    if (!input.hasFranchise) return 'This LGU-issued QR has no active franchise record. Do not continue the ride.';
    if (input.transportStatus === 'PENDING') return 'This driver is still pending LGU transport approval. Do not continue the ride.';
    if (input.transportStatus === 'SUSPENDED') return 'This driver is suspended by the LGU. Do not continue the ride.';
    if (input.transportStatus === 'EXPIRED') return 'This driver’s franchise has expired. Do not continue the ride.';
    if (input.eligibleForRide) return 'LGU-issued QR verified. This driver and vehicle are eligible for rides.';
    return 'This LGU-issued QR is not currently eligible for rides.';
  }
}

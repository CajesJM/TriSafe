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
import { BoholLocationService } from './bohol-location.service';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly statuses: DriverStatusService, private readonly locations: BoholLocationService) {}

  async registerApprovedDriver(actorId: string, dto: RegisterDriverDto) {
    const verifiedAddress = await this.locations.validateDriverPresentAddress(dto.address);
    const unitNumber = dto.vehicleType === 'TRICYCLE' ? dto.bodyNumber! : dto.permitNumber!;
    const username = unitNumber.toLowerCase();
    const fullName = formatPersonName(dto.driverLastName, dto.driverFirstName, dto.driverMiddleName);
    const ownerIdentityKey = [dto.ownerLastName, dto.ownerFirstName, dto.ownerMiddleName ?? ''].map(normalizeIdentityPart).join('|');
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (dto.franchiseIssuedAt > today) throw new BadRequestException('The franchise issued date cannot be in the future.');
    if (dto.franchiseExpiresAt <= dto.franchiseIssuedAt) throw new BadRequestException('The franchise expiration date must be after its issued date.');
    if (dto.franchiseExpiresAt <= today) throw new BadRequestException('The franchise expiration date must be in the future.');
    if (dto.vehicleType === 'TRICYCLE' && dto.permitNumber) throw new BadRequestException('Tricycles use a body number, not a permit number.');
    if (dto.vehicleType === 'HABAL_HABAL' && dto.bodyNumber) throw new BadRequestException('Habal-habal vehicles use a permit number, not a body number.');
    const [existingUser, existingFranchise, existingVehicle] = await Promise.all([
      this.prisma.user.findFirst({ where: { OR: [{ phone: dto.phone }, { username }] } }),
      this.prisma.franchise.findUnique({ where: { franchiseNumber: dto.franchiseNumber } }),
      this.prisma.vehicle.findFirst({ where: { OR: [{ plateNumber: dto.plateNumber }, { engineNumber: dto.engineNumber }, { chassisNumber: dto.chassisNumber }, ...(dto.bodyNumber ? [{ bodyNumber: dto.bodyNumber }] : []), ...(dto.permitNumber ? [{ permitNumber: dto.permitNumber }] : [])] } }),
    ]);

    if (existingUser) throw new ConflictException('A driver account already uses this contact number or body/permit number.');
    if (existingFranchise) throw new ConflictException('This franchise number is already registered.');
    if (existingVehicle) throw new ConflictException('This plate number is already registered.');

    try {
      const driver = await this.prisma.$transaction(async (tx) => {
        const owner = await tx.transportOwner.upsert({
          where: { identityKey: ownerIdentityKey },
          update: { lastName: dto.ownerLastName, firstName: dto.ownerFirstName, middleName: dto.ownerMiddleName || null },
          create: { identityKey: ownerIdentityKey, lastName: dto.ownerLastName, firstName: dto.ownerFirstName, middleName: dto.ownerMiddleName || null },
        });
        const user = await tx.user.create({ data: { fullName, username, email: null, phone: dto.phone, passwordHash: hashPassword(dto.temporaryPassword), role: 'DRIVER', status: dto.accountStatus } });
        const driver = await tx.driver.create({
          data: {
            userId: user.id, ownerId: owner.id, verification: DriverVerificationStatus.VERIFIED,
            address: { create: verifiedAddress },
            franchise: { create: { franchiseNumber: dto.franchiseNumber, issuedAt: new Date(dto.franchiseIssuedAt), expiresAt: new Date(dto.franchiseExpiresAt), status: DriverVerificationStatus.VERIFIED } },
            vehicles: { create: { plateNumber: dto.plateNumber, vehicleType: dto.vehicleType, bodyNumber: dto.bodyNumber, permitNumber: dto.permitNumber, engineNumber: dto.engineNumber, chassisNumber: dto.chassisNumber, qrCode: { create: { token: randomUUID() } } } },
          },
          include: { user: true, owner: true, address: true, franchise: true, vehicles: { include: { qrCode: true } } },
        });
        return this.toAdminDriver(driver);
      });
      await this.audit.record({
        actorId,
        action: 'DRIVER_REGISTERED',
        entityType: 'Driver',
        entityId: driver.id,
        details: { franchiseNumber: dto.franchiseNumber, plateNumber: dto.plateNumber, unitNumber, accountStatus: dto.accountStatus, ownerIdentityKey, barangayCode: verifiedAddress.barangayCode },
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
    const qr = await this.prisma.qrCode.findUnique({ where: { token }, include: { vehicle: { include: { driver: { include: { user: true, owner: true, address: true, franchise: true } } } } } });
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
    const recordComplete = Boolean(
      driver.owner &&
      driver.address &&
      qr.vehicle.engineNumber &&
      qr.vehicle.chassisNumber &&
      (qr.vehicle.vehicleType === 'HABAL_HABAL' ? qr.vehicle.permitNumber : qr.vehicle.bodyNumber),
    );
    const eligibleForRide = Boolean(
      !qr.revokedAt &&
      qr.vehicle.isActive &&
      driver.user.status === 'ACTIVE' &&
      franchise &&
      driver.verification === 'VERIFIED' &&
      franchise.status === 'VERIFIED' &&
      franchise.expiresAt > new Date() &&
      recordComplete,
    );

    return {
      legitimate: true,
      eligibleForRide,
      transportStatus,
      accountStatus: driver.user.status,
      qrStatus,
      recordComplete,
      message: this.qrVerificationMessage({ qrRevoked: Boolean(qr.revokedAt), vehicleActive: qr.vehicle.isActive, accountActive: driver.user.status === 'ACTIVE', hasFranchise: Boolean(franchise), recordComplete, transportStatus, eligibleForRide }),
      vehicle: {
        driverId: driver.id,
        driverName: driver.user.fullName,
        ownerName: driver.owner ? formatPersonName(driver.owner.lastName, driver.owner.firstName, driver.owner.middleName ?? undefined) : null,
        driverAddress: driver.address
          ? [driver.address.purok, driver.address.barangayName, driver.address.municipalityName, driver.address.provinceName].join(', ')
          : null,
        bodyNumber: qr.vehicle.bodyNumber,
        permitNumber: qr.vehicle.permitNumber,
        engineNumber: qr.vehicle.engineNumber,
        chassisNumber: qr.vehicle.chassisNumber,
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
    const driver = await this.prisma.driver.findUnique({ where: { id }, include: { user: true, owner: true, address: true, franchise: true, vehicles: { include: { qrCode: true } } } });
    if (!driver) throw new NotFoundException('Driver not found');
    return this.toAdminDriver(driver);
  }

  async getByUserId(userId: string) {
    await this.statuses.syncExpiredDrivers();
    const driver = await this.prisma.driver.findUnique({ where: { userId }, include: { user: true, owner: true, address: true, franchise: true, vehicles: { include: { qrCode: true } } } });
    if (!driver) throw new NotFoundException('Driver profile not found');
    const daysUntilRenewal = driver.franchise ? Math.ceil((driver.franchise.expiresAt.getTime() - Date.now()) / 86400000) : null;
    return { ...this.toAdminDriver(driver), renewalReminder: daysUntilRenewal !== null && daysUntilRenewal <= 30 ? `Franchise renewal due in ${Math.max(0, daysUntilRenewal)} days` : null };
  }

  announcements(userId: string) {
    return this.prisma.announcementRecipient.findMany({ where: { driver: { userId }, announcement: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }, include: { announcement: true }, orderBy: { announcement: { publishedAt: 'desc' } } });
  }

  async markAnnouncementRead(userId: string, announcementId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId }, select: { id: true } });
    if (!driver) throw new NotFoundException('Driver profile not found');
    try {
      return await this.prisma.announcementRecipient.update({
        where: { announcementId_driverId: { announcementId, driverId: driver.id } },
        data: { readAt: new Date() },
        include: { announcement: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Announcement not found for this driver');
      }
      throw error;
    }
  }

  async notifications(userId: string) {
    await this.statuses.syncExpiredDrivers();
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        franchise: true,
        vehicles: true,
        announcements: {
          where: { readAt: null, announcement: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
          include: { announcement: true },
        },
      },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const now = new Date();
    const daysUntil = (date: Date) => Math.ceil((date.getTime() - now.getTime()) / 86400000);
    const notifications: Array<{ id: string; type: string; priority: string; title: string; message: string; createdAt: Date; read: boolean; announcementId?: string }> = [];
    const franchise = driver.franchise;

    if (franchise && franchise.status !== 'VERIFIED') {
      notifications.push({
        id: `franchise-status-${franchise.id}`,
        type: 'FRANCHISE_STATUS',
        priority: franchise.status === 'PENDING' ? 'WARNING' : 'CRITICAL',
        title: `Franchise ${franchise.status.toLowerCase()}`,
        message: 'Review your franchise status and coordinate with the LGU before accepting rides.',
        createdAt: now,
        read: false,
      });
    } else if (franchise && daysUntil(franchise.expiresAt) <= 30) {
      notifications.push({
        id: `franchise-renewal-${franchise.id}`,
        type: 'RENEWAL',
        priority: daysUntil(franchise.expiresAt) <= 7 ? 'CRITICAL' : 'WARNING',
        title: 'Franchise renewal reminder',
        message: `Your franchise expires in ${Math.max(0, daysUntil(franchise.expiresAt))} day(s). Contact the LGU to renew it.`,
        createdAt: franchise.expiresAt,
        read: false,
      });
    }

    for (const vehicle of driver.vehicles.filter((item) => !item.isActive)) {
      notifications.push({
        id: `vehicle-inactive-${vehicle.id}`,
        type: 'VEHICLE_STATUS',
        priority: 'CRITICAL',
        title: 'Vehicle inactive',
        message: `${vehicle.plateNumber} is inactive and cannot be used for verified rides.`,
        createdAt: now,
        read: false,
      });
    }

    for (const recipient of driver.announcements) {
      notifications.push({
        id: `announcement-${recipient.announcementId}`,
        type: 'ANNOUNCEMENT',
        priority: 'INFO',
        title: recipient.announcement.title,
        message: 'A new LGU announcement is waiting for you.',
        createdAt: recipient.announcement.publishedAt,
        read: false,
        announcementId: recipient.announcementId,
      });
    }

    return notifications.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async updateContact(userId: string, dto: UpdateDriverContactDto) {
    try {
      const user = await this.prisma.user.update({ where: { id: userId }, data: { phone: dto.phone }, select: { id: true, fullName: true, username: true, phone: true } });
      await this.audit.record({ actorId: userId, action: 'DRIVER_CONTACT_UPDATED', entityType: 'User', entityId: userId, details: { phone: user.phone } });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('That contact number is already used by another account.');
      }
      throw error;
    }
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
    const drivers = await this.prisma.driver.findMany({ include: { user: true, owner: true, address: true, franchise: true, vehicles: { include: { qrCode: true } } }, orderBy: { createdAt: 'desc' } });
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

  private toAdminDriver(driver: Prisma.DriverGetPayload<{ include: { user: true; owner: true; address: true; franchise: true; vehicles: { include: { qrCode: true } } } }>) {
    return { id: driver.id, userId: driver.user.id, fullName: driver.user.fullName, username: driver.user.username, phone: driver.user.phone, accountStatus: driver.user.status, verification: driver.verification, owner: driver.owner, address: driver.address, franchise: driver.franchise, vehicles: driver.vehicles };
  }

  private qrVerificationMessage(input: { qrRevoked: boolean; vehicleActive: boolean; accountActive: boolean; hasFranchise: boolean; recordComplete: boolean; transportStatus: string; eligibleForRide: boolean }) {
    if (input.qrRevoked) return 'This LGU-issued QR code has been revoked. Do not continue the ride.';
    if (!input.vehicleActive) return 'This LGU-issued QR belongs to an inactive vehicle. Do not continue the ride.';
    if (!input.accountActive) return 'This driver account is inactive. Do not continue the ride.';
    if (!input.hasFranchise) return 'This LGU-issued QR has no active franchise record. Do not continue the ride.';
    if (!input.recordComplete) return 'This LGU-issued record is incomplete. The LGU must add the owner, address, and required vehicle numbers before rides can continue.';
    if (input.transportStatus === 'PENDING') return 'This driver is still pending LGU transport approval. Do not continue the ride.';
    if (input.transportStatus === 'SUSPENDED') return 'This driver is suspended by the LGU. Do not continue the ride.';
    if (input.transportStatus === 'EXPIRED') return 'This driver’s franchise has expired. Do not continue the ride.';
    if (input.eligibleForRide) return 'LGU-issued QR verified. This driver and vehicle are eligible for rides.';
    return 'This LGU-issued QR is not currently eligible for rides.';
  }
}

function normalizeIdentityPart(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function formatPersonName(lastName: string, firstName: string, middleName?: string) {
  return `${lastName.trim()}, ${firstName.trim()}${middleName?.trim() ? ` ${middleName.trim()}` : ''}`;
}

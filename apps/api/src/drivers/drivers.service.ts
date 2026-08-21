import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DriverNotificationPriority, DriverNotificationType, DriverVerificationStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDriverDto } from "./dto/register-driver.dto";
import { UpdateDriverContactDto } from "./dto/update-driver-contact.dto";
import { UpdateDriverProfileDto } from "./dto/update-driver-profile.dto";
import { hashPassword } from "../auth/password";
import { AuditService } from "../audit/audit.service";
import { UpdateFranchiseDto } from "./dto/update-franchise.dto";
import { UpdateDriverStatusDto } from "./dto/update-driver-status.dto";
import { DriverStatusService } from "./driver-status.service";
import { BoholLocationService } from "./bohol-location.service";
import { DriverNotificationsService } from './driver-notifications.service';

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly statuses: DriverStatusService,
    private readonly locations: BoholLocationService,
    private readonly driverNotifications: DriverNotificationsService,
  ) {}

  async registerApprovedDriver(actorId: string, dto: RegisterDriverDto) {
    if (
      dto.avatarData &&
      dataImageByteLength(dto.avatarData) > 2 * 1024 * 1024
    ) {
      throw new BadRequestException(
        "The driver profile photo must be 2 MB or smaller.",
      );
    }
    const verifiedAddress = await this.locations.validateDriverPresentAddress(
      dto.address,
    );
    const unitNumber =
      dto.vehicleType === "TRICYCLE" ? dto.bodyNumber! : dto.permitNumber!;
    const fullName = formatPersonName(
      dto.driverLastName,
      dto.driverFirstName,
      dto.driverMiddleName,
    );
    const ownerIdentityKey = [
      dto.ownerLastName,
      dto.ownerFirstName,
      dto.ownerMiddleName ?? "",
    ]
      .map(normalizeIdentityPart)
      .join("|");
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (dto.franchiseIssuedAt > today)
      throw new BadRequestException(
        "The franchise issued date cannot be in the future.",
      );
    if (dto.franchiseExpiresAt <= dto.franchiseIssuedAt)
      throw new BadRequestException(
        "The franchise expiration date must be after its issued date.",
      );
    if (dto.franchiseExpiresAt <= today)
      throw new BadRequestException(
        "The franchise expiration date must be in the future.",
      );
    if (dto.vehicleType === "TRICYCLE" && dto.permitNumber)
      throw new BadRequestException(
        "Tricycles use a body number, not a permit number.",
      );
    if (dto.vehicleType === "HABAL_HABAL" && dto.bodyNumber)
      throw new BadRequestException(
        "Habal-habal vehicles use a permit number, not a body number.",
      );
    const [existingUser, existingFranchise, existingVehicle] =
      await Promise.all([
        this.prisma.user.findFirst({ where: { phone: dto.phone } }),
        this.prisma.franchise.findUnique({
          where: { franchiseNumber: dto.franchiseNumber },
        }),
        this.prisma.vehicle.findFirst({
          where: {
            OR: [
              { plateNumber: dto.plateNumber },
              { engineNumber: dto.engineNumber },
              { chassisNumber: dto.chassisNumber },
              ...(dto.bodyNumber ? [{ bodyNumber: dto.bodyNumber }] : []),
              ...(dto.permitNumber ? [{ permitNumber: dto.permitNumber }] : []),
            ],
          },
        }),
      ]);

    if (existingUser)
      throw new ConflictException(
        "A driver account already uses this contact number.",
      );
    if (existingFranchise)
      throw new ConflictException(
        "This franchise number is already registered.",
      );
    if (existingVehicle) {
      if (dto.bodyNumber && existingVehicle.bodyNumber === dto.bodyNumber) {
        throw new ConflictException(
          `Body Number ${dto.bodyNumber} is already assigned to another registered driver.`,
        );
      }
      if (
        dto.permitNumber &&
        existingVehicle.permitNumber === dto.permitNumber
      ) {
        throw new ConflictException(
          `Permit Number ${dto.permitNumber} is already assigned to another registered driver.`,
        );
      }
      if (existingVehicle.plateNumber === dto.plateNumber) {
        throw new ConflictException(
          `Plate Number ${dto.plateNumber} is already registered.`,
        );
      }
      if (existingVehicle.engineNumber === dto.engineNumber) {
        throw new ConflictException(
          `Engine Number ${dto.engineNumber} is already registered.`,
        );
      }
      if (existingVehicle.chassisNumber === dto.chassisNumber) {
        throw new ConflictException(
          `Chassis Number ${dto.chassisNumber} is already registered.`,
        );
      }
      throw new ConflictException(
        "A vehicle with one of these identity details is already registered.",
      );
    }

    try {
      const driver = await this.prisma.$transaction(async (tx) => {
        const owner = await tx.transportOwner.upsert({
          where: { identityKey: ownerIdentityKey },
          update: {
            lastName: dto.ownerLastName,
            firstName: dto.ownerFirstName,
            middleName: dto.ownerMiddleName || null,
          },
          create: {
            identityKey: ownerIdentityKey,
            lastName: dto.ownerLastName,
            firstName: dto.ownerFirstName,
            middleName: dto.ownerMiddleName || null,
          },
        });
        const username = await this.allocateDriverUsername(
          tx,
          dto.driverLastName,
          dto.driverFirstName,
        );
        const user = await tx.user.create({
          data: {
            fullName,
            username,
            email: null,
            phone: dto.phone,
            avatarData: dto.avatarData || null,
            passwordHash: hashPassword(unitNumber),
            role: "DRIVER",
            status: dto.accountStatus,
          },
        });
        const driver = await tx.driver.create({
          data: {
            userId: user.id,
            ownerId: owner.id,
            verification: DriverVerificationStatus.VERIFIED,
            address: { create: verifiedAddress },
            franchise: {
              create: {
                franchiseNumber: dto.franchiseNumber,
                issuedAt: new Date(dto.franchiseIssuedAt),
                expiresAt: new Date(dto.franchiseExpiresAt),
                status: DriverVerificationStatus.VERIFIED,
              },
            },
            vehicles: {
              create: {
                plateNumber: dto.plateNumber,
                vehicleType: dto.vehicleType,
                bodyNumber: dto.bodyNumber,
                permitNumber: dto.permitNumber,
                engineNumber: dto.engineNumber,
                chassisNumber: dto.chassisNumber,
                qrCode: { create: { token: randomUUID() } },
              },
            },
          },
          include: {
            user: true,
            owner: true,
            address: true,
            franchise: true,
            vehicles: { include: { qrCode: true } },
          },
        });
        return this.toAdminDriver(driver);
      });
      await this.audit.record({
        actorId,
        action: "DRIVER_REGISTERED",
        entityType: "Driver",
        entityId: driver.id,
        details: {
          franchiseNumber: dto.franchiseNumber,
          plateNumber: dto.plateNumber,
          unitNumber,
          username: driver.username,
          accountStatus: dto.accountStatus,
          ownerIdentityKey,
          barangayCode: verifiedAddress.barangayCode,
          profilePhotoAdded: Boolean(dto.avatarData),
        },
      });
      return driver;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(",")
          : String(error.meta?.target ?? "");
        if (target.includes("bodyNumber"))
          throw new ConflictException(
            "This Body Number is already assigned to another registered driver.",
          );
        if (target.includes("permitNumber"))
          throw new ConflictException(
            "This Permit Number is already assigned to another registered driver.",
          );
        if (target.includes("plateNumber"))
          throw new ConflictException(
            "This Plate Number is already registered.",
          );
        if (target.includes("engineNumber"))
          throw new ConflictException(
            "This Engine Number is already registered.",
          );
        if (target.includes("chassisNumber"))
          throw new ConflictException(
            "This Chassis Number is already registered.",
          );
        throw new ConflictException(
          "A driver, franchise, or vehicle with one of these details already exists.",
        );
      }
      throw error;
    }
  }

  async verifyQr(token: string) {
    await this.statuses.syncExpiredDrivers();
    const qr = await this.prisma.qrCode.findUnique({
      where: { token },
      include: {
        vehicle: {
          include: {
            driver: {
              include: {
                user: true,
                owner: true,
                address: true,
                franchise: true,
              },
            },
          },
        },
      },
    });
    if (!qr) {
      return {
        legitimate: false,
        eligibleForRide: false,
        transportStatus: "NOT_LGU_ISSUED",
        accountStatus: null,
        qrStatus: "UNKNOWN",
        message:
          "This QR code was not created by the LGU and is not registered in TriSafe.",
        vehicle: null,
      };
    }

    const driver = qr.vehicle.driver;
    const franchise = driver.franchise;
    const transportStatus = franchise?.status ?? driver.verification;
    const qrStatus = qr.revokedAt ? "REVOKED" : "ACTIVE";
    const recordComplete = Boolean(
      driver.owner &&
      driver.address &&
      qr.vehicle.engineNumber &&
      qr.vehicle.chassisNumber &&
      (qr.vehicle.vehicleType === "HABAL_HABAL"
        ? qr.vehicle.permitNumber
        : qr.vehicle.bodyNumber),
    );
    const eligibleForRide = Boolean(
      !qr.revokedAt &&
      qr.vehicle.isActive &&
      driver.user.status === "ACTIVE" &&
      franchise &&
      driver.verification === "VERIFIED" &&
      franchise.status === "VERIFIED" &&
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
      message: this.qrVerificationMessage({
        qrRevoked: Boolean(qr.revokedAt),
        vehicleActive: qr.vehicle.isActive,
        accountActive: driver.user.status === "ACTIVE",
        hasFranchise: Boolean(franchise),
        recordComplete,
        transportStatus,
        eligibleForRide,
      }),
      vehicle: {
        driverId: driver.id,
        driverName: driver.user.fullName,
        ownerName: driver.owner
          ? formatPersonName(
              driver.owner.lastName,
              driver.owner.firstName,
              driver.owner.middleName ?? undefined,
            )
          : null,
        driverAddress: driver.address
          ? [
              driver.address.purok,
              driver.address.barangayName,
              driver.address.municipalityName,
              driver.address.provinceName,
            ].join(", ")
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
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: true,
        owner: true,
        address: true,
        franchise: true,
        vehicles: { include: { qrCode: true } },
      },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    return this.toAdminDriver(driver);
  }

  async getByUserId(userId: string) {
    await this.statuses.syncExpiredDrivers();
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        user: true,
        owner: true,
        address: true,
        franchise: true,
        vehicles: { include: { qrCode: true } },
      },
    });
    if (!driver) throw new NotFoundException("Driver profile not found");
    const daysUntilRenewal = driver.franchise
      ? Math.ceil(
          (driver.franchise.expiresAt.getTime() - Date.now()) / 86400000,
        )
      : null;
    return {
      ...this.toAdminDriver(driver),
      renewalReminder:
        daysUntilRenewal !== null && daysUntilRenewal <= 30
          ? `Franchise renewal due in ${Math.max(0, daysUntilRenewal)} days`
          : null,
    };
  }

  announcements(userId: string) {
    return this.prisma.announcementRecipient.findMany({
      where: {
        driver: { userId },
        announcement: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      },
      include: { announcement: true },
      orderBy: { announcement: { publishedAt: "desc" } },
    });
  }

  async markAnnouncementRead(userId: string, announcementId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Driver profile not found");
    try {
      const recipient = await this.prisma.announcementRecipient.update({
        where: {
          announcementId_driverId: { announcementId, driverId: driver.id },
        },
        data: { readAt: new Date() },
        include: { announcement: true },
      });
      await this.driverNotifications.markEntityRead(
        driver.id,
        'Announcement',
        announcementId,
      );
      return recipient;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException("Announcement not found for this driver");
      }
      throw error;
    }
  }

  async notifications(userId: string) {
    return this.driverNotifications.listForUser(userId);
  }

  markNotificationRead(userId: string, notificationId: string) {
    return this.driverNotifications.markRead(userId, notificationId);
  }

  markAllNotificationsRead(userId: string) {
    return this.driverNotifications.markAllRead(userId);
  }

  /** Official compliance records are visible only to their authenticated driver. */
  async violations(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Driver profile not found");
    return this.prisma.driverViolation.findMany({
      where: { driverId: driver.id },
      select: {
        id: true,
        category: true,
        offenseLevel: true,
        description: true,
        occurredAt: true,
        status: true,
        penaltyAmount: true,
        penaltyStatus: true,
        dueAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });
  }

  async updateContact(userId: string, dto: UpdateDriverContactDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { phone: dto.phone },
        select: { id: true, fullName: true, username: true, phone: true },
      });
      await this.audit.record({
        actorId: userId,
        action: "DRIVER_CONTACT_UPDATED",
        entityType: "User",
        entityId: userId,
        details: { phone: user.phone },
      });
      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "That contact number is already used by another account.",
        );
      }
      throw error;
    }
  }

  /**
   * The Driver app may update only its private photo, phone number, and
   * present Bohol address. LGU-controlled identity, vehicle, franchise,
   * eligibility, and QR data do not appear in this update contract.
   */
  async updateProfile(userId: string, dto: UpdateDriverProfileDto) {
    if (
      dto.avatarData &&
      dataImageByteLength(dto.avatarData) > 2 * 1024 * 1024
    ) {
      throw new BadRequestException(
        "The driver profile photo must be 2 MB or smaller.",
      );
    }

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true, user: { select: { phone: true, avatarData: true } } },
    });
    if (!driver) throw new NotFoundException("Driver profile not found");

    const verifiedAddress = dto.address
      ? await this.locations.validateDriverPresentAddress(dto.address)
      : null;
    const userUpdate: Prisma.UserUpdateInput = {};
    if (dto.phone !== undefined) userUpdate.phone = dto.phone;
    if (dto.avatarData !== undefined) userUpdate.avatarData = dto.avatarData;

    if (!verifiedAddress && Object.keys(userUpdate).length === 0) {
      throw new BadRequestException("Choose at least one profile detail to update.");
    }

    try {
      await this.prisma.driver.update({
        where: { id: driver.id },
        data: {
          ...(Object.keys(userUpdate).length > 0
            ? { user: { update: userUpdate } }
            : {}),
          ...(verifiedAddress
            ? {
                address: {
                  upsert: {
                    create: verifiedAddress,
                    update: verifiedAddress,
                  },
                },
              }
            : {}),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "That contact number is already used by another account.",
        );
      }
      throw error;
    }

    const changedFields = [
      ...(dto.phone !== undefined ? ["phone"] : []),
      ...(dto.avatarData !== undefined ? ["profilePhoto"] : []),
      ...(verifiedAddress ? ["presentAddress"] : []),
    ];
    await this.audit.record({
      actorId: userId,
      action: "DRIVER_PROFILE_UPDATED",
      entityType: "Driver",
      entityId: driver.id,
      details: {
        changedFields,
        profilePhotoRemoved: dto.avatarData === null,
        barangayCode: verifiedAddress?.barangayCode,
      },
    });
    return this.getByUserId(userId);
  }

  async rotateQr(actorId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    const qr = await this.prisma.qrCode.upsert({
      where: { vehicleId },
      update: { token: randomUUID(), generatedAt: new Date(), revokedAt: null },
      create: { vehicleId, token: randomUUID() },
    });
    await this.audit.record({
      actorId,
      action: "QR_ROTATED",
      entityType: "QrCode",
      entityId: qr.id,
      details: { vehicleId },
    });
    return qr;
  }

  async updateFranchise(
    actorId: string,
    driverId: string,
    dto: UpdateFranchiseDto,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { franchise: true },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    if (!driver.franchise)
      throw new NotFoundException("Franchise record not found");

    const expiresAt = new Date(dto.expiresAt);
    const effectiveStatus =
      expiresAt <= new Date() ? DriverVerificationStatus.EXPIRED : dto.status;
    const [franchise] = await this.prisma.$transaction([
      this.prisma.franchise.update({
        where: { id: driver.franchise.id },
        data: { status: effectiveStatus, expiresAt },
      }),
      this.prisma.driver.update({
        where: { id: driverId },
        data: { verification: effectiveStatus },
      }),
    ]);
    await this.audit.record({
      actorId,
      action: "FRANCHISE_UPDATED",
      entityType: "Franchise",
      entityId: franchise.id,
      details: {
        driverId,
        previousStatus: driver.verification,
        requestedStatus: dto.status,
        status: effectiveStatus,
        expiresAt: dto.expiresAt,
      },
    });
    await this.driverNotifications.create({
      driverId,
      type: DriverNotificationType.FRANCHISE_STATUS,
      priority: effectiveStatus === DriverVerificationStatus.VERIFIED
          ? DriverNotificationPriority.INFO
          : DriverNotificationPriority.WARNING,
      title: 'Franchise record updated',
      message: `Your franchise is now ${effectiveStatus.toLowerCase()} and expires on ${dto.expiresAt}.`,
      entityType: 'Franchise',
      entityId: franchise.id,
    });
    return this.getDriver(driverId);
  }

  async list() {
    await this.statuses.syncExpiredDrivers();
    const drivers = await this.prisma.driver.findMany({
      include: {
        user: true,
        owner: true,
        address: true,
        franchise: true,
        vehicles: { include: { qrCode: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return drivers.map((driver) => this.toAdminDriver(driver));
  }

  async updateStatus(
    actorId: string,
    driverId: string,
    dto: UpdateDriverStatusDto,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { franchise: true },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    if (
      dto.status === DriverVerificationStatus.VERIFIED &&
      (!driver.franchise || driver.franchise.expiresAt <= new Date())
    )
      throw new BadRequestException(
        "Renew the franchise before verifying this driver.",
      );
    await this.prisma.$transaction([
      this.prisma.driver.update({
        where: { id: driverId },
        data: { verification: dto.status },
      }),
      ...(driver.franchise
        ? [
            this.prisma.franchise.update({
              where: { id: driver.franchise.id },
              data: { status: dto.status },
            }),
          ]
        : []),
    ]);
    await this.audit.record({
      actorId,
      action: "DRIVER_STATUS_CHANGED",
      entityType: "Driver",
      entityId: driverId,
      details: {
        previousStatus: driver.verification,
        status: dto.status,
        ...(dto.reason ? { reason: dto.reason } : {}),
      },
    });
    await this.driverNotifications.create({
      driverId,
      type: DriverNotificationType.ACCOUNT_STATUS,
      priority: dto.status === DriverVerificationStatus.VERIFIED
          ? DriverNotificationPriority.INFO
          : DriverNotificationPriority.CRITICAL,
      title: 'Driver status updated',
      message: dto.reason?.trim() || `Your LGU driver status is now ${dto.status.toLowerCase()}.`,
      entityType: 'Driver',
      entityId: driverId,
    });
    return this.getDriver(driverId);
  }

  private async allocateDriverUsername(
    tx: Prisma.TransactionClient,
    lastName: string,
    firstName: string,
  ) {
    const last = usernamePart(lastName) || "driver";
    const first = usernamePart(firstName) || "account";
    const base = `${last}.${first}`.slice(0, 30);
    let candidate = base;
    let suffix = 2;
    while (
      await tx.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      })
    ) {
      const ending = String(suffix++);
      candidate = `${base.slice(0, 30 - ending.length)}${ending}`;
    }
    return candidate;
  }

  private toAdminDriver(
    driver: Prisma.DriverGetPayload<{
      include: {
        user: true;
        owner: true;
        address: true;
        franchise: true;
        vehicles: { include: { qrCode: true } };
      };
    }>,
  ) {
    return {
      id: driver.id,
      userId: driver.user.id,
      fullName: driver.user.fullName,
      username: driver.user.username,
      avatarData: driver.user.avatarData,
      phone: driver.user.phone,
      accountStatus: driver.user.status,
      verification: driver.verification,
      owner: driver.owner,
      address: driver.address,
      franchise: driver.franchise,
      vehicles: driver.vehicles,
    };
  }

  private qrVerificationMessage(input: {
    qrRevoked: boolean;
    vehicleActive: boolean;
    accountActive: boolean;
    hasFranchise: boolean;
    recordComplete: boolean;
    transportStatus: string;
    eligibleForRide: boolean;
  }) {
    if (input.qrRevoked)
      return "This LGU-issued QR code has been revoked. Do not continue the ride.";
    if (!input.vehicleActive)
      return "This LGU-issued QR belongs to an inactive vehicle. Do not continue the ride.";
    if (!input.accountActive)
      return "This driver account is inactive. Do not continue the ride.";
    if (!input.hasFranchise)
      return "This LGU-issued QR has no active franchise record. Do not continue the ride.";
    if (!input.recordComplete)
      return "This LGU-issued record is incomplete. The LGU must add the owner, address, and required vehicle numbers before rides can continue.";
    if (input.transportStatus === "PENDING")
      return "This driver is still pending LGU transport approval. Do not continue the ride.";
    if (input.transportStatus === "SUSPENDED")
      return "This driver is suspended by the LGU. Do not continue the ride.";
    if (input.transportStatus === "EXPIRED")
      return "This driver’s franchise has expired. Do not continue the ride.";
    if (input.eligibleForRide)
      return "LGU-issued QR verified. This driver and vehicle are eligible for rides.";
    return "This LGU-issued QR is not currently eligible for rides.";
  }
}

function normalizeIdentityPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function usernamePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function dataImageByteLength(value: string) {
  const base64 = value.slice(value.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function formatPersonName(
  lastName: string,
  firstName: string,
  middleName?: string,
) {
  return `${lastName.trim()}, ${firstName.trim()}${middleName?.trim() ? ` ${middleName.trim()}` : ""}`;
}

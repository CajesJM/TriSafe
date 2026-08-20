import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PenaltyStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/announcement.dto';
import { AuditService } from '../audit/audit.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { hashPassword } from '../auth/password';
import { RideAnalyticsQueryDto } from './dto/ride-analytics-query.dto';
import { BoholLocationService } from '../drivers/bohol-location.service';
import { CreateViolationDto, UpdateViolationDto } from './dto/violation.dto';

const canonicalPersonNamePattern = /^[\p{L}][\p{L} '-]{1,44}, [\p{L}][\p{L}'-]+(?: [\p{L}][\p{L}'-]+)*(?: \p{L}\.)?$/u;
const dataImageByteLength = (value: string) => {
  const payload = value.split(',')[1] ?? '';
  return Math.floor((payload.length * 3) / 4) - (payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0);
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly locations: BoholLocationService) {}

  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activityStart = new Date(today);
    activityStart.setDate(activityStart.getDate() - 6);

    const [drivers, verifiedDrivers, activeRides, openIncidents, usersByRole, inactiveUsers, ridesByStatus, incidentsByStatus, recentRides, announcements, renewals] = await Promise.all([
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { verification: 'VERIFIED' } }),
      this.prisma.ride.count({ where: { status: 'ACTIVE' } }),
      this.prisma.incident.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.count({ where: { status: UserStatus.INACTIVE } }),
      this.prisma.ride.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.incident.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.ride.findMany({
        where: { startedAt: { gte: activityStart } },
        select: { startedAt: true },
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.announcement.findMany({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gte: today } }] },
        select: { id: true, title: true, publishedAt: true, expiresAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 8,
      }),
      this.prisma.franchise.findMany({
        where: { expiresAt: { gte: today } },
        select: { id: true, expiresAt: true, driver: { select: { user: { select: { fullName: true } } } } },
        orderBy: { expiresAt: 'asc' },
        take: 8,
      }),
    ]);

    const roleCount = new Map(usersByRole.map((entry) => [entry.role, entry._count._all]));
    const rideCount = new Map(ridesByStatus.map((entry) => [entry.status, entry._count._all]));
    const incidentCount = new Map(incidentsByStatus.map((entry) => [entry.status, entry._count._all]));
    const rideActivity = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(activityStart);
      date.setDate(activityStart.getDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      return {
        date: dateKey,
        label: date.toLocaleDateString('en-PH', { weekday: 'short' }),
        count: recentRides.filter((ride) => ride.startedAt.toISOString().slice(0, 10) === dateKey).length,
      };
    });

    return {
      drivers,
      verifiedDrivers,
      activeRides,
      openIncidents,
      generatedAt: new Date().toISOString(),
      users: {
        total: usersByRole.reduce((total, entry) => total + entry._count._all, 0),
        passengers: roleCount.get(UserRole.PASSENGER) ?? 0,
        drivers: roleCount.get(UserRole.DRIVER) ?? 0,
        administrators: roleCount.get(UserRole.LGU_ADMIN) ?? 0,
        inactive: inactiveUsers,
      },
      rides: {
        total: ridesByStatus.reduce((total, entry) => total + entry._count._all, 0),
        active: rideCount.get('ACTIVE') ?? 0,
        completed: rideCount.get('COMPLETED') ?? 0,
        cancelled: rideCount.get('CANCELLED') ?? 0,
      },
      incidents: {
        submitted: incidentCount.get('SUBMITTED') ?? 0,
        underReview: incidentCount.get('UNDER_REVIEW') ?? 0,
        resolved: incidentCount.get('RESOLVED') ?? 0,
        dismissed: incidentCount.get('DISMISSED') ?? 0,
      },
      rideActivity,
      calendarEvents: [
        ...announcements.map((announcement) => ({
          id: `announcement-${announcement.id}`,
          date: announcement.publishedAt.toISOString(),
          label: announcement.title,
          type: 'ANNOUNCEMENT',
          detail: announcement.expiresAt
            ? `Active until ${announcement.expiresAt.toLocaleDateString('en-PH')}`
            : 'Published announcement',
        })),
        ...renewals.map((franchise) => ({
          id: `renewal-${franchise.id}`,
          date: franchise.expiresAt.toISOString(),
          label: `${franchise.driver.user.fullName} franchise renewal`,
          type: 'RENEWAL',
          detail: 'Driver franchise renewal date',
        })),
      ].sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async rideAnalytics(query: RideAnalyticsQueryDto) {
    const to = query.to ?? manilaDateString(new Date());
    const from = query.from ?? addDateString(to, -6);
    const rangeDays = dateRangeDays(from, to);

    if (rangeDays < 1) throw new BadRequestException('The start date must be before or equal to the end date.');
    if (rangeDays > 90) throw new BadRequestException('Ride analytics can display up to 90 days at a time.');

    const previousTo = addDateString(from, -1);
    const previousFrom = addDateString(previousTo, -(rangeDays - 1));
    const [rides, previousTotal] = await Promise.all([
      this.prisma.ride.findMany({
        where: {
          startedAt: {
            gte: manilaDayStart(from),
            lt: manilaDayStart(addDateString(to, 1)),
          },
        },
        select: {
          startedAt: true,
          status: true,
          estimatedFare: true,
          finalFare: true,
        },
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.ride.count({
        where: {
          startedAt: {
            gte: manilaDayStart(previousFrom),
            lt: manilaDayStart(addDateString(previousTo, 1)),
          },
        },
      }),
    ]);

    const dailyRecords = new Map<string, {
      total: number;
      completed: number;
      active: number;
      cancelled: number;
      fareAmount: number;
    }>();

    for (const ride of rides) {
      const date = manilaDateString(ride.startedAt);
      const record = dailyRecords.get(date) ?? {
        total: 0,
        completed: 0,
        active: 0,
        cancelled: 0,
        fareAmount: 0,
      };
      record.total += 1;
      if (ride.status === 'COMPLETED') record.completed += 1;
      if (ride.status === 'ACTIVE') record.active += 1;
      if (ride.status === 'CANCELLED') record.cancelled += 1;
      record.fareAmount += Number(ride.finalFare ?? ride.estimatedFare ?? 0);
      dailyRecords.set(date, record);
    }

    const daily = Array.from({ length: rangeDays }, (_, index) => {
      const date = addDateString(from, index);
      const record = dailyRecords.get(date) ?? {
        total: 0,
        completed: 0,
        active: 0,
        cancelled: 0,
        fareAmount: 0,
      };
      return {
        date,
        label: formatAnalyticsDay(date),
        ...record,
        fareAmount: Number(record.fareAmount.toFixed(2)),
      };
    });

    const total = rides.length;
    const changePercent = previousTotal === 0
      ? (total === 0 ? 0 : null)
      : Number((((total - previousTotal) / previousTotal) * 100).toFixed(1));

    return {
      from,
      to,
      days: rangeDays,
      previousPeriod: { from: previousFrom, to: previousTo, total: previousTotal },
      summary: {
        total,
        completed: daily.reduce((sum, day) => sum + day.completed, 0),
        active: daily.reduce((sum, day) => sum + day.active, 0),
        cancelled: daily.reduce((sum, day) => sum + day.cancelled, 0),
        fareAmount: Number(daily.reduce((sum, day) => sum + day.fareAmount, 0).toFixed(2)),
        previousTotal,
        changePercent,
      },
      daily,
    };
  }

  async weather(latitudeInput?: string, longitudeInput?: string, locationNameInput?: string) {
    const suppliedCoordinates = latitudeInput !== undefined || longitudeInput !== undefined;
    const latitude = suppliedCoordinates ? Number(latitudeInput) : 9.8108;
    const longitude = suppliedCoordinates ? Number(longitudeInput) : 124.1435;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Provide valid latitude and longitude coordinates');
    }
    const requestedLocationName = locationNameInput?.trim();
    if (requestedLocationName && requestedLocationName.length > 120) throw new BadRequestException('Location name is too long');
    const snapshotId = suppliedCoordinates ? `geo-${latitude.toFixed(3)}-${longitude.toFixed(3)}` : 'bohol';
    const params = new URLSearchParams({
      latitude: String(latitude), longitude: String(longitude),
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
      timezone: 'auto',
    });
    const query = `api.open-meteo.com/v1/forecast?${params.toString()}`;
    try {
      let response: Response | undefined;
      let lastError: unknown;
      for (const protocol of ['https', 'http']) {
        try {
          const candidate = await fetch(`${protocol}://${query}`);
          if (candidate.ok) {
            response = candidate;
            break;
          }
          lastError = new Error(`Weather provider returned ${candidate.status}`);
        } catch (error) {
          lastError = error;
        }
      }
      if (!response) throw lastError ?? new Error('Weather provider unavailable');
      const payload = (await response.json()) as {
        current: {
          time: string;
          temperature_2m: number;
          apparent_temperature: number;
          relative_humidity_2m: number;
          wind_speed_10m: number;
          weather_code: number;
          is_day: number;
        };
      };
      const current = payload.current;
      const cached = await this.prisma.weatherSnapshot.findUnique({ where: { id: snapshotId } });
      const locationName = suppliedCoordinates
        ? requestedLocationName || await this.resolveLocationName(latitude, longitude, cached?.locationName)
        : 'Trinidad, Bohol';
      return this.prisma.weatherSnapshot.upsert({
        where: { id: snapshotId },
        create: {
          id: snapshotId, locationName, latitude, longitude,
          temperatureC: current.temperature_2m, apparentC: current.apparent_temperature,
          humidity: current.relative_humidity_2m, windKmh: current.wind_speed_10m,
          weatherCode: current.weather_code, isDay: current.is_day === 1,
          observedAt: new Date(current.time),
        },
        update: {
          locationName, latitude, longitude,
          temperatureC: current.temperature_2m, apparentC: current.apparent_temperature,
          humidity: current.relative_humidity_2m, windKmh: current.wind_speed_10m,
          weatherCode: current.weather_code, isDay: current.is_day === 1,
          observedAt: new Date(current.time),
        },
      });
    } catch (error) {
      const cached = await this.prisma.weatherSnapshot.findUnique({ where: { id: snapshotId } });
      if (cached) return cached;
      throw error;
    }
  }

  private async resolveLocationName(latitude: number, longitude: number, cachedName?: string) {
    try {
      const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: 'jsonv2', addressdetails: '1', zoom: '10', 'accept-language': 'en' });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: { 'User-Agent': 'TriSafe-LGU/0.1 (transport safety administration)' },
      });
      if (!response.ok) throw new Error(`Reverse geocoder returned ${response.status}`);
      const result = (await response.json()) as { display_name?: string; address?: Record<string, string> };
      const address = result.address ?? {};
      const locality = address.city ?? address.town ?? address.municipality ?? address.village ?? address.county;
      const region = address.province ?? address.state ?? address.region ?? address.country;
      const conciseName = [locality, region].filter((value, index, values) => value && values.indexOf(value) === index).join(', ');
      return conciseName || result.display_name?.split(',').slice(0, 2).join(',').trim() || cachedName || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
    } catch {
      return cachedName || `Current location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;
    }
  }

  async users(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search ? {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roleDefinition: { select: { name: true } },
          driverProfile: { select: { id: true, verification: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, username: true, avatarData: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true, roleDefinition: { select: { name: true } }, driverProfile: { select: { id: true, verification: true } } },
    });
    if (!user) throw new NotFoundException('User account not found');
    return user;
  }

  async createUser(actorId: string, dto: CreateUserDto) {
    if (dto.role === UserRole.DRIVER) throw new BadRequestException('Create driver accounts through the Drivers & QR registration workflow.');
    if (dto.role === UserRole.PASSENGER && !canonicalPersonNamePattern.test(dto.fullName.trim())) throw new BadRequestException('Passenger names must use Last Name, First Name M. format.');
    await this.requireActiveRole(dto.role);
    try {
      const user = await this.prisma.user.create({
        data: { fullName: dto.fullName.trim(), username: dto.username, email: dto.email.trim().toLowerCase(), phone: dto.phone, role: dto.role, status: dto.status ?? UserStatus.ACTIVE, passwordHash: hashPassword(dto.temporaryPassword) },
        select: { id: true, fullName: true, username: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true, roleDefinition: { select: { name: true } }, driverProfile: { select: { verification: true } } },
      });
      await this.audit.record({ actorId, action: 'USER_CREATED', entityType: 'User', entityId: user.id, details: { role: user.role, status: user.status, email: user.email } });
      return user;
    } catch (error) {
      this.handleUniqueUserError(error);
    }
  }

  async updateUser(actorId: string, id: string, dto: UpdateUserDto) {
    const current = await this.prisma.user.findUnique({ where: { id }, include: { driverProfile: { include: { vehicles: true } } } });
    if (!current) throw new NotFoundException('User account not found');
    if (current.driverProfile && dto.fullName && !canonicalPersonNamePattern.test(dto.fullName.trim())) {
      throw new BadRequestException('Driver names must use Last Name, First Name M. format.');
    }
    const effectiveRole = dto.role ?? current.role;
    const editsPassengerIdentity = effectiveRole === UserRole.PASSENGER && (dto.fullName !== undefined || dto.username !== undefined || dto.role === UserRole.PASSENGER);
    if (editsPassengerIdentity && !canonicalPersonNamePattern.test((dto.fullName ?? current.fullName).trim())) throw new BadRequestException('Passenger names must use Last Name, First Name M. format.');
    if (editsPassengerIdentity && !(dto.username ?? current.username)) throw new BadRequestException('A username is required for passenger accounts.');
    if (actorId === id && dto.status === UserStatus.INACTIVE) throw new ForbiddenException('You cannot deactivate your own account.');
    if (actorId === id && dto.role && dto.role !== UserRole.LGU_ADMIN) throw new ForbiddenException('You cannot remove your own administrator role.');
    if (dto.role && dto.role !== current.role) {
      await this.requireActiveRole(dto.role);
      if (current.driverProfile && dto.role !== UserRole.DRIVER) throw new BadRequestException('A registered driver must retain the Driver role.');
      if (!current.driverProfile && dto.role === UserRole.DRIVER) throw new BadRequestException('Use the Drivers & QR workflow to create a complete driver profile.');
    }
    await this.ensureAdminContinuity(current.role, current.status, dto.role ?? current.role, dto.status ?? current.status, id);
    if (dto.driverRecord && !current.driverProfile) {
      throw new BadRequestException('Driver transport information can only be assigned to a registered driver.');
    }
    const verifiedDriverAddress = dto.driverRecord
      ? await this.locations.validateDriverPresentAddress(dto.driverRecord.address)
      : null;
    const unitNumber = dto.driverRecord
      ? (dto.driverRecord.vehicleType === 'TRICYCLE' ? dto.driverRecord.bodyNumber! : dto.driverRecord.permitNumber!)
      : null;
    if (typeof dto.avatarData === 'string' && dataImageByteLength(dto.avatarData) > 2 * 1024 * 1024) {
      throw new BadRequestException('The driver profile photo must be 2 MB or smaller.');
    }
    const currentVehicle = current.driverProfile?.vehicles[0];
    const currentUnitNumber = currentVehicle?.vehicleType === 'HABAL_HABAL'
      ? currentVehicle.permitNumber
      : currentVehicle?.bodyNumber;
    const unitNumberChanged = Boolean(unitNumber && unitNumber !== currentUnitNumber);
    const data: Prisma.UserUncheckedUpdateInput = {
      ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
      ...(dto.username !== undefined ? { username: dto.username } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.newPassword ? { passwordHash: hashPassword(dto.newPassword) } : {}),
      ...(dto.avatarData !== undefined ? { avatarData: dto.avatarData || null } : {}),
      ...(unitNumberChanged ? { email: null, passwordHash: hashPassword(unitNumber!) } : {}),
    };
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id }, data,
          select: { id: true, fullName: true, username: true, avatarData: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true, roleDefinition: { select: { name: true } }, driverProfile: { select: { verification: true } } },
        });
        if (verifiedDriverAddress && current.driverProfile) {
          const record = dto.driverRecord!;
          const identityKey = [record.ownerLastName, record.ownerFirstName, record.ownerMiddleName ?? ''].map(normalizeIdentityPart).join('|');
          const owner = await tx.transportOwner.upsert({
            where: { identityKey },
            update: { lastName: record.ownerLastName, firstName: record.ownerFirstName, middleName: record.ownerMiddleName || null },
            create: { identityKey, lastName: record.ownerLastName, firstName: record.ownerFirstName, middleName: record.ownerMiddleName || null },
          });
          await tx.driver.update({
            where: { id: current.driverProfile.id },
            data: { ownerId: owner.id, address: { upsert: { create: verifiedDriverAddress, update: verifiedDriverAddress } } },
          });
          const vehicle = current.driverProfile.vehicles[0];
          if (!vehicle) throw new BadRequestException('The driver has no registered vehicle to update.');
          await tx.vehicle.update({ where: { id: vehicle.id }, data: {
            vehicleType: record.vehicleType,
            bodyNumber: record.vehicleType === 'TRICYCLE' ? record.bodyNumber : null,
            permitNumber: record.vehicleType === 'HABAL_HABAL' ? record.permitNumber : null,
            engineNumber: record.engineNumber,
            chassisNumber: record.chassisNumber,
            plateNumber: record.plateNumber,
          } });
        }
        return user;
      });
      const statusChanged = current.status !== updated.status;
      await this.audit.record({ actorId, action: statusChanged ? 'USER_STATUS_CHANGED' : 'USER_UPDATED', entityType: 'User', entityId: id, details: { previousRole: current.role, role: updated.role, previousStatus: current.status, status: updated.status, passwordReset: Boolean(dto.newPassword) || unitNumberChanged, driverRecordUpdated: Boolean(dto.driverRecord), profilePhotoUpdated: dto.avatarData !== undefined, unitNumber, barangayCode: verifiedDriverAddress?.barangayCode } });
      return updated;
    } catch (error) {
      this.handleUniqueUserError(error);
    }
  }

  async deleteUser(actorId: string, id: string) {
    if (actorId === id) throw new ForbiddenException('You cannot delete your own account.');
    const user = await this.prisma.user.findUnique({ where: { id }, include: { driverProfile: true }, });
    if (!user) throw new NotFoundException('User account not found');
    await this.ensureAdminContinuity(user.role, user.status, user.role, UserStatus.INACTIVE, id);
    const [rides, incidents] = await Promise.all([this.prisma.ride.count({ where: { passengerId: id } }), this.prisma.incident.count({ where: { passengerId: id } })]);
    if (user.driverProfile || rides > 0 || incidents > 0) throw new ConflictException('This account has linked operational records and cannot be deleted. Mark it inactive instead.');
    await this.prisma.user.delete({ where: { id } });
    await this.audit.record({ actorId, action: 'USER_DELETED', entityType: 'User', entityId: id, details: { email: user.email, role: user.role } });
    return { deleted: true };
  }

  async deleteDriver(actorId: string, driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true, owner: true, vehicles: { select: { id: true } } },
    });
    if (!driver) throw new NotFoundException('Driver record not found.');
    const rideCount = await this.prisma.ride.count({ where: { vehicle: { driverId } } });
    if (rideCount > 0) {
      throw new ConflictException('This driver has ride history and cannot be permanently deleted. Deactivate the account and suspend transport instead.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.announcementRecipient.deleteMany({ where: { driverId } });
      await tx.qrCode.deleteMany({ where: { vehicle: { driverId } } });
      await tx.franchise.deleteMany({ where: { driverId } });
      await tx.driverAddress.deleteMany({ where: { driverId } });
      await tx.vehicle.deleteMany({ where: { driverId } });
      await tx.driver.delete({ where: { id: driverId } });
      await tx.user.delete({ where: { id: driver.userId } });
      if (driver.ownerId) {
        const remainingDrivers = await tx.driver.count({ where: { ownerId: driver.ownerId } });
        if (remainingDrivers === 0) await tx.transportOwner.delete({ where: { id: driver.ownerId } });
      }
    });
    await this.audit.record({ actorId, action: 'DRIVER_DELETED', entityType: 'Driver', entityId: driverId, details: { userId: driver.userId, fullName: driver.user.fullName, vehicleCount: driver.vehicles.length, ownerRemoved: Boolean(driver.ownerId) } });
    return { deleted: true };
  }

  roles() {
    return this.prisma.roleDefinition.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: 'asc' } });
  }

  async createRole(actorId: string, dto: CreateRoleDto) {
    try {
      const role = await this.prisma.roleDefinition.create({ data: { key: dto.key, name: dto.name.trim(), description: dto.description?.trim(), permissions: this.cleanPermissions(dto.permissions), active: dto.active ?? true }, include: { _count: { select: { users: true } } } });
      await this.audit.record({ actorId, action: 'ROLE_CREATED', entityType: 'RoleDefinition', entityId: role.id, details: { key: role.key, name: role.name } });
      return role;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('That system role already exists.');
      throw error;
    }
  }

  async updateRole(actorId: string, id: string, dto: UpdateRoleDto) {
    const current = await this.prisma.roleDefinition.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Role definition not found');
    if (dto.active === false) {
      const activeUsers = await this.prisma.user.count({ where: { role: current.key, status: UserStatus.ACTIVE } });
      if (activeUsers > 0) throw new ConflictException('Move or deactivate assigned users before disabling this role.');
    }
    const role = await this.prisma.roleDefinition.update({ where: { id }, data: { ...(dto.name !== undefined ? { name: dto.name.trim() } : {}), ...(dto.description !== undefined ? { description: dto.description.trim() } : {}), ...(dto.permissions !== undefined ? { permissions: this.cleanPermissions(dto.permissions) } : {}), ...(dto.active !== undefined ? { active: dto.active } : {}) }, include: { _count: { select: { users: true } } } });
    await this.audit.record({ actorId, action: 'ROLE_UPDATED', entityType: 'RoleDefinition', entityId: id, details: { key: role.key, active: role.active, permissions: role.permissions } });
    return role;
  }

  async deleteRole(actorId: string, id: string) {
    const role = await this.prisma.roleDefinition.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) throw new NotFoundException('Role definition not found');
    if (role._count.users > 0) throw new ConflictException('This role is assigned to users and cannot be deleted.');
    await this.prisma.roleDefinition.delete({ where: { id } });
    await this.audit.record({ actorId, action: 'ROLE_DELETED', entityType: 'RoleDefinition', entityId: id, details: { key: role.key, name: role.name } });
    return { deleted: true };
  }

  async createAnnouncement(actorId: string, dto: CreateAnnouncementDto) {
    const drivers = await this.prisma.driver.findMany({ where: { verification: 'VERIFIED' }, select: { id: true } });
    const announcement = await this.prisma.announcement.create({ data: { title: dto.title, body: dto.body, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, recipients: { create: drivers.map(({ id }) => ({ driverId: id })) } }, include: { recipients: true } });
    await this.audit.record({ actorId, action: 'ANNOUNCEMENT_PUBLISHED', entityType: 'Announcement', entityId: announcement.id, details: { title: dto.title, recipientCount: drivers.length } });
    return announcement;
  }

  announcements() {
    return this.prisma.announcement.findMany({
      include: {
        _count: { select: { recipients: true } },
        recipients: { where: { readAt: { not: null } }, select: { announcementId: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    }).then((announcements) => announcements.map(({ recipients, _count, ...announcement }) => ({
      ...announcement,
      recipientCount: _count.recipients,
      readCount: recipients.length,
    })));
  }

  violations() {
    return this.prisma.driverViolation.findMany({
      include: {
        driver: {
          include: { user: { select: { fullName: true, username: true, phone: true } }, vehicles: { take: 1, select: { plateNumber: true, vehicleType: true } } },
        },
      },
      orderBy: [{ status: 'asc' }, { occurredAt: 'desc' }],
      take: 200,
    });
  }

  async createViolation(actorId: string, dto: CreateViolationDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id: dto.driverId }, select: { id: true, user: { select: { fullName: true } } } });
    if (!driver) throw new NotFoundException('Registered driver not found');
    if (dto.dueAt && new Date(dto.dueAt) < new Date(dto.occurredAt)) throw new BadRequestException('The penalty due date cannot be earlier than the violation date.');
    const hasPenalty = dto.penaltyAmount !== undefined && dto.penaltyAmount > 0;
    const violation = await this.prisma.driverViolation.create({
      data: {
        driverId: dto.driverId,
        category: dto.category.trim(),
        description: dto.description.trim(),
        occurredAt: new Date(dto.occurredAt),
        penaltyAmount: hasPenalty ? dto.penaltyAmount : null,
        penaltyStatus: hasPenalty ? PenaltyStatus.PENDING : PenaltyStatus.NOT_APPLICABLE,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        notes: dto.notes?.trim() || null,
      },
    });
    await this.audit.record({ actorId, action: 'VIOLATION_RECORDED', entityType: 'DriverViolation', entityId: violation.id, details: { driverId: driver.id, driverName: driver.user.fullName, category: violation.category, penaltyAmount: violation.penaltyAmount?.toString() ?? null } });
    return violation;
  }

  async updateViolation(actorId: string, id: string, dto: UpdateViolationDto) {
    const current = await this.prisma.driverViolation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Violation record not found');
    const nextPenaltyAmount = dto.penaltyAmount === undefined ? current.penaltyAmount : dto.penaltyAmount;
    const nextPenaltyStatus = dto.penaltyStatus ?? current.penaltyStatus;
    if (nextPenaltyStatus !== PenaltyStatus.NOT_APPLICABLE && (!nextPenaltyAmount || Number(nextPenaltyAmount) <= 0)) throw new BadRequestException('Enter a penalty amount before assigning a penalty status.');
    if (dto.dueAt && new Date(dto.dueAt) < current.occurredAt) throw new BadRequestException('The penalty due date cannot be earlier than the violation date.');
    const updated = await this.prisma.driverViolation.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.penaltyStatus ? { penaltyStatus: dto.penaltyStatus } : {}),
        ...(dto.penaltyAmount !== undefined ? { penaltyAmount: dto.penaltyAmount } : {}),
        ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    });
    await this.audit.record({ actorId, action: 'VIOLATION_UPDATED', entityType: 'DriverViolation', entityId: id, details: { previousStatus: current.status, status: updated.status, previousPenaltyStatus: current.penaltyStatus, penaltyStatus: updated.penaltyStatus, penaltyAmount: updated.penaltyAmount?.toString() ?? null } });
    return updated;
  }

  auditLogs(limit?: number) { return this.audit.list(limit); }

  private async requireActiveRole(role: UserRole) {
    const definition = await this.prisma.roleDefinition.findUnique({ where: { key: role } });
    if (!definition?.active) throw new BadRequestException('The selected role is unavailable or inactive.');
  }

  private async ensureAdminContinuity(previousRole: UserRole, previousStatus: UserStatus, nextRole: UserRole, nextStatus: UserStatus, excludedId: string) {
    if (previousRole !== UserRole.LGU_ADMIN || previousStatus !== UserStatus.ACTIVE || (nextRole === UserRole.LGU_ADMIN && nextStatus === UserStatus.ACTIVE)) return;
    const remaining = await this.prisma.user.count({ where: { id: { not: excludedId }, role: UserRole.LGU_ADMIN, status: UserStatus.ACTIVE } });
    if (remaining === 0) throw new ConflictException('At least one active Administrator account is required.');
  }

  private cleanPermissions(permissions: string[]) {
    return [...new Set(permissions.map((permission) => permission.trim()).filter(Boolean))];
  }

  private handleUniqueUserError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target ?? '');
      if (target.includes('username')) throw new ConflictException('That username is already assigned to another account.');
      throw new ConflictException('That email address is already assigned to another user.');
    }
    throw error;
  }
}

function manilaDateString(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addDateString(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateRangeDays(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

function manilaDayStart(value: string) {
  return new Date(`${value}T00:00:00+08:00`);
}

function formatAnalyticsDay(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function normalizeIdentityPart(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

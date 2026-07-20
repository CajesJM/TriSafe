import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/announcement.dto';
import { AuditService } from '../audit/audit.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { hashPassword } from '../auth/password';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activityStart = new Date(today);
    activityStart.setDate(activityStart.getDate() - 6);

    const [drivers, verifiedDrivers, activeRides, openIncidents, usersByRole, inactiveUsers, ridesByStatus, incidentsByStatus, recentRides] = await Promise.all([
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
    };
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
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roleDefinition: { select: { name: true } },
          driverProfile: { select: { verification: true, licenseNumber: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true, roleDefinition: { select: { name: true } }, driverProfile: { select: { id: true, verification: true, licenseNumber: true } } },
    });
    if (!user) throw new NotFoundException('User account not found');
    return user;
  }

  async createUser(actorId: string, dto: CreateUserDto) {
    if (dto.role === UserRole.DRIVER) throw new BadRequestException('Create driver accounts through the Drivers & QR registration workflow.');
    await this.requireActiveRole(dto.role);
    try {
      const user = await this.prisma.user.create({
        data: { fullName: dto.fullName.trim(), email: dto.email.trim().toLowerCase(), phone: dto.phone, role: dto.role, status: dto.status ?? UserStatus.ACTIVE, passwordHash: hashPassword(dto.temporaryPassword) },
        select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true, roleDefinition: { select: { name: true } }, driverProfile: { select: { verification: true, licenseNumber: true } } },
      });
      await this.audit.record({ actorId, action: 'USER_CREATED', entityType: 'User', entityId: user.id, details: { role: user.role, status: user.status, email: user.email } });
      return user;
    } catch (error) {
      this.handleUniqueUserError(error);
    }
  }

  async updateUser(actorId: string, id: string, dto: UpdateUserDto) {
    const current = await this.prisma.user.findUnique({ where: { id }, include: { driverProfile: true } });
    if (!current) throw new NotFoundException('User account not found');
    if (actorId === id && dto.status === UserStatus.INACTIVE) throw new ForbiddenException('You cannot deactivate your own account.');
    if (actorId === id && dto.role && dto.role !== UserRole.LGU_ADMIN) throw new ForbiddenException('You cannot remove your own administrator role.');
    if (dto.role && dto.role !== current.role) {
      await this.requireActiveRole(dto.role);
      if (current.driverProfile && dto.role !== UserRole.DRIVER) throw new BadRequestException('A registered driver must retain the Driver role.');
      if (!current.driverProfile && dto.role === UserRole.DRIVER) throw new BadRequestException('Use the Drivers & QR workflow to create a complete driver profile.');
    }
    await this.ensureAdminContinuity(current.role, current.status, dto.role ?? current.role, dto.status ?? current.status, id);
    const data: Prisma.UserUncheckedUpdateInput = {
      ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.newPassword ? { passwordHash: hashPassword(dto.newPassword) } : {}),
    };
    try {
      const updated = await this.prisma.user.update({
        where: { id }, data,
        select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true, updatedAt: true, roleDefinition: { select: { name: true } }, driverProfile: { select: { verification: true, licenseNumber: true } } },
      });
      const statusChanged = current.status !== updated.status;
      await this.audit.record({ actorId, action: statusChanged ? 'USER_STATUS_CHANGED' : 'USER_UPDATED', entityType: 'User', entityId: id, details: { previousRole: current.role, role: updated.role, previousStatus: current.status, status: updated.status, passwordReset: Boolean(dto.newPassword) } });
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

  auditLogs(limit?: number) { return this.audit.list(limit); }

  private async requireActiveRole(role: UserRole) {
    const definition = await this.prisma.roleDefinition.findUnique({ where: { key: role } });
    if (!definition?.active) throw new BadRequestException('The selected role is unavailable or inactive.');
  }

  private async ensureAdminContinuity(previousRole: UserRole, previousStatus: UserStatus, nextRole: UserRole, nextStatus: UserStatus, excludedId: string) {
    if (previousRole !== UserRole.LGU_ADMIN || previousStatus !== UserStatus.ACTIVE || (nextRole === UserRole.LGU_ADMIN && nextStatus === UserStatus.ACTIVE)) return;
    const remaining = await this.prisma.user.count({ where: { id: { not: excludedId }, role: UserRole.LGU_ADMIN, status: UserStatus.ACTIVE } });
    if (remaining === 0) throw new ConflictException('At least one active LGU administrator account is required.');
  }

  private cleanPermissions(permissions: string[]) {
    return [...new Set(permissions.map((permission) => permission.trim()).filter(Boolean))];
  }

  private handleUniqueUserError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('That email address is already assigned to another user.');
    throw error;
  }
}

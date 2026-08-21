import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminProfile, LoginResponse } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { hashPassword, verifyPassword } from './password';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';
import { BoholLocationService } from '../drivers/bohol-location.service';

@Injectable()
export class AuthService {
  private readonly failedAttempts = new Map<string, { count: number; windowStartedAt: number }>();

  constructor(private readonly prisma: PrismaService, private readonly tokens: TokenService, private readonly audit: AuditService, private readonly locations: BoholLocationService) {}

  async login(dto: LoginDto, ipAddress = 'unknown'): Promise<LoginResponse> {
    const identifier = dto.identifier.trim().toLowerCase();
    const key = `${ipAddress}:${identifier}`;
    const now = Date.now();
    const current = this.failedAttempts.get(key);
    if (current && now - current.windowStartedAt < 15 * 60 * 1000 && current.count >= 5) {
      throw new HttpException('Too many login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (current && now - current.windowStartedAt >= 15 * 60 * 1000) {
      this.failedAttempts.delete(key);
    }

    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] }, include: { roleDefinition: true } });
    if (!user?.passwordHash || !verifyPassword(dto.password, user.passwordHash)) {
      const attempt = this.failedAttempts.get(key);
      this.failedAttempts.set(key, { count: (attempt?.count ?? 0) + 1, windowStartedAt: attempt?.windowStartedAt ?? now });
      throw new UnauthorizedException('Login identifier or password is incorrect');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Your account is inactive. Please contact support.');
    }
    if (!user.roleDefinition.active) {
      throw new ForbiddenException('Your assigned role is inactive. Please contact support.');
    }
    if (dto.expectedRole && user.role !== dto.expectedRole) {
      const actual = user.role === UserRole.DRIVER ? 'Driver' : 'Passenger';
      throw new ForbiddenException(
        `This is a ${actual} account. Select ${actual} before signing in.`,
      );
    }

    this.failedAttempts.delete(key);

    return {
      accessToken: this.tokens.sign({ id: user.id, role: user.role }),
      user: { id: user.id, role: user.role, status: user.status, fullName: user.fullName, username: user.username, email: user.email, phone: user.phone, avatarData: user.avatarData },
    };
  }

  async getProfile(userId: string): Promise<AdminProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, username: true, email: true, phone: true, avatarData: true, role: true, status: true, address: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return this.toAdminProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AdminProfile> {
    const current = await this.getProfile(userId);
    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.username !== undefined) data.username = dto.username.trim().toLowerCase();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase() || null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.avatarData !== undefined) data.avatarData = dto.avatarData || null;
    if (dto.address !== undefined) {
      const address = await this.locations.validateRegistrationAddress(dto.address);
      data.address = { upsert: { create: address, update: address } };
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: { id: true, fullName: true, username: true, email: true, phone: true, avatarData: true, role: true, status: true, address: true },
      });
      const profile = this.toAdminProfile(updated);
      const changedFields = Object.keys(data).filter((field) => field !== 'avatarData' || current.avatarData !== profile.avatarData);
      await this.audit.record({ actorId: userId, action: 'ADMIN_PROFILE_UPDATED', entityType: 'User', entityId: userId, details: { changedFields } });
      return profile;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('That username or email is already in use.');
      }
      throw error;
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Account credentials are unavailable.');
    }
    if (!verifyPassword(dto.currentPassword, user.passwordHash)) {
      throw new ForbiddenException('Your current password is incorrect.');
    }
    if (verifyPassword(dto.newPassword, user.passwordHash)) {
      throw new ConflictException('Choose a new password that is different from your current password.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(dto.newPassword) },
    });
    await this.audit.record({
      actorId: userId,
      action: 'ACCOUNT_PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      details: { initiatedByAccountOwner: true },
    });
    return { changed: true };
  }

  private toAdminProfile(user: Prisma.UserGetPayload<{ select: { id: true; fullName: true; username: true; email: true; phone: true; avatarData: true; role: true; status: true; address: true } }>): AdminProfile {
    return {
      ...user,
      address: user.address ? {
        provinceCode: user.address.provinceCode,
        provinceName: user.address.provinceName,
        municipalityCode: user.address.municipalityCode,
        municipalityName: user.address.municipalityName,
        barangayCode: user.address.barangayCode,
        barangayName: user.address.barangayName,
        streetPurok: user.address.streetPurok,
        postalCode: user.address.postalCode,
        externalPlaceId: user.address.externalPlaceId,
        latitude: Number(user.address.latitude),
        longitude: Number(user.address.longitude),
      } : null,
    };
  }
}

import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminProfile, LoginResponse } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { verifyPassword } from './password';
import { TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  private readonly failedAttempts = new Map<string, { count: number; windowStartedAt: number }>();

  constructor(private readonly prisma: PrismaService, private readonly tokens: TokenService, private readonly audit: AuditService) {}

  async login(dto: LoginDto, ipAddress = 'unknown'): Promise<LoginResponse> {
    const email = dto.email.trim().toLowerCase();
    const key = `${ipAddress}:${email}`;
    const now = Date.now();
    const current = this.failedAttempts.get(key);
    if (current && now - current.windowStartedAt < 15 * 60 * 1000 && current.count >= 5) {
      throw new HttpException('Too many login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (current && now - current.windowStartedAt >= 15 * 60 * 1000) {
      this.failedAttempts.delete(key);
    }

    const user = await this.prisma.user.findUnique({ where: { email }, include: { roleDefinition: true } });
    if (!user?.passwordHash || !verifyPassword(dto.password, user.passwordHash)) {
      const attempt = this.failedAttempts.get(key);
      this.failedAttempts.set(key, { count: (attempt?.count ?? 0) + 1, windowStartedAt: attempt?.windowStartedAt ?? now });
      throw new UnauthorizedException('Email or password is incorrect');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Your account is inactive. Please contact support.');
    }
    if (!user.roleDefinition.active) {
      throw new ForbiddenException('Your assigned role is inactive. Please contact support.');
    }

    this.failedAttempts.delete(key);

    return {
      accessToken: this.tokens.sign({ id: user.id, role: user.role }),
      user: { id: user.id, role: user.role, status: user.status, fullName: user.fullName, username: user.username, email, phone: user.phone, avatarData: user.avatarData },
    };
  }

  async getProfile(userId: string): Promise<AdminProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, username: true, email: true, phone: true, avatarData: true, role: true, status: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AdminProfile> {
    const current = await this.getProfile(userId);
    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.username !== undefined) data.username = dto.username.trim().toLowerCase();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase() || null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.avatarData !== undefined) data.avatarData = dto.avatarData || null;

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: { id: true, fullName: true, username: true, email: true, phone: true, avatarData: true, role: true, status: true },
      });
      const changedFields = Object.keys(data).filter((field) => field !== 'avatarData' || current.avatarData !== updated.avatarData);
      await this.audit.record({ actorId: userId, action: 'ADMIN_PROFILE_UPDATED', entityType: 'User', entityId: userId, details: { changedFields } });
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('That username or email is already in use.');
      }
      throw error;
    }
  }
}

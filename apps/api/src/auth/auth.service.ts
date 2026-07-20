import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginResponse } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { verifyPassword } from './password';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly failedAttempts = new Map<string, { count: number; windowStartedAt: number }>();

  constructor(private readonly prisma: PrismaService, private readonly tokens: TokenService) {}

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
      user: { id: user.id, role: user.role, status: user.status, fullName: user.fullName, email },
    };
  }
}

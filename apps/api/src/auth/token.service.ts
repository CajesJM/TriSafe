import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from './auth.types';

type TokenPayload = AuthenticatedUser & { exp: number };

@Injectable()
export class TokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    const configuredSecret = config.get<string>('JWT_SECRET');
    const environment = config.get<string>('NODE_ENV', 'development');
    if (environment === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    this.secret = configuredSecret ?? 'replace-in-production';
  }

  sign(user: AuthenticatedUser): string {
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({ ...user, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 });
    const signature = this.signature(`${header}.${payload}`);
    return `${header}.${payload}.${signature}`;
  }

  verify(token: string): AuthenticatedUser {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) {
      throw new UnauthorizedException('Invalid access token');
    }

    const expectedSignature = this.signature(`${header}.${payload}`);
    const expected = Buffer.from(expectedSignature);
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('Invalid access token');
    }

    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenPayload;
      if (parsed.exp <= Math.floor(Date.now() / 1000) || !parsed.id || !Object.values(UserRole).includes(parsed.role)) {
        throw new UnauthorizedException('Access token has expired');
      }
      return { id: parsed.id, role: parsed.role };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private signature(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}

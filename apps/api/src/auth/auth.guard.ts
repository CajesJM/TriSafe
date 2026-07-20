import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, UserStatus } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { RequestWithUser } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly tokens: TokenService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization?.toString();
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Provide a valid access token');

    const tokenUser = this.tokens.verify(authorization.slice('Bearer '.length));
    const account = await this.prisma.user.findUnique({ where: { id: tokenUser.id }, select: { id: true, role: true, status: true, roleDefinition: { select: { active: true } } } });
    if (!account) throw new UnauthorizedException('Account no longer exists');
    if (account.status === UserStatus.INACTIVE) throw new UnauthorizedException('Your account is inactive. Please contact support.');
    if (!account.roleDefinition.active) throw new UnauthorizedException('Your assigned role is inactive. Please contact support.');
    const user = { id: account.id, role: account.role };
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (required?.length && !required.includes(user.role)) throw new UnauthorizedException('Insufficient role');
    request.user = user;
    return true;
  }
}

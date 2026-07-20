import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { RequestWithUser } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';
import { TokenService } from './token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization?.toString();
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Provide a valid access token');

    const user = this.tokens.verify(authorization.slice('Bearer '.length));
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (required?.length && !required.includes(user.role)) throw new UnauthorizedException('Insufficient role');
    request.user = user;
    return true;
  }
}

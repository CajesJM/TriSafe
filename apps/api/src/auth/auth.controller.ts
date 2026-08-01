import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { Roles } from './roles.decorator';
import type { RequestWithUser } from './auth.types';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Req() request: { ip?: string }, @Body() dto: LoginDto) {
    return this.auth.login(dto, request.ip);
  }

  @Get('me')
  @Roles(UserRole.LGU_ADMIN)
  me(@Req() request: RequestWithUser) {
    return this.auth.getProfile(request.user.id);
  }

  @Patch('me/profile')
  @Roles(UserRole.LGU_ADMIN)
  updateProfile(@Req() request: RequestWithUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(request.user.id, dto);
  }
}

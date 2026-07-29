import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { RequestWithUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { UpdatePresenceDto } from './dto/update-presence.dto';
import { PresenceService } from './presence.service';

@Controller()
export class PresenceController {
  constructor(private readonly service: PresenceService) {}

  @Roles(UserRole.PASSENGER, UserRole.DRIVER)
  @Post('presence/me')
  update(
    @Req() request: RequestWithUser,
    @Body() dto: UpdatePresenceDto,
  ) {
    return this.service.update(request.user.id, dto);
  }

  @Roles(UserRole.LGU_ADMIN)
  @Get('admin/live-presence')
  listLive() {
    return this.service.listLive();
  }
}

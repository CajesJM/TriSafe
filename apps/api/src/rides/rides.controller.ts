import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { RequestWithUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { EndRideDto, StartRideDto } from './dto/start-ride.dto';
import { RidesService } from './rides.service';

@Roles(UserRole.PASSENGER)
@Controller('rides')
export class RidesController {
  constructor(private readonly service: RidesService) {}

  @Post('preview') preview(@Body() dto: StartRideDto) { return this.service.preview(dto); }
  @Post() start(@Req() req: RequestWithUser, @Body() dto: StartRideDto) { return this.service.start(req.user.id, dto); }
  @Get() history(@Req() req: RequestWithUser) { return this.service.history(req.user.id); }
  @Post(':id/end') end(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: EndRideDto) { return this.service.end(req.user.id, id, dto); }
  @Get(':id/share') share(@Req() req: RequestWithUser, @Param('id') id: string, @Query('liveLocationUrl') liveLocationUrl?: string) { return this.service.share(req.user.id, id, liveLocationUrl); }
}

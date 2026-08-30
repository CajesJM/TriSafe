import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { RequestWithUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { EndRideDto, StartMapRideDto, StartRideDto } from './dto/start-ride.dto';
import { RidesService } from './rides.service';
import { RecordRideLocationDto } from './dto/record-ride-location.dto';
import { RideHistoryQueryDto } from './dto/ride-history-query.dto';

@Roles(UserRole.PASSENGER)
@Controller('rides')
export class RidesController {
  constructor(private readonly service: RidesService) {}

  @Post('preview') preview(@Body() dto: StartRideDto) { return this.service.preview(dto); }
  @Post('map') startMapRide(@Req() req: RequestWithUser, @Body() dto: StartMapRideDto) {
    return this.service.startMapRide(req.user.id, dto);
  }
  @Post() start(@Req() req: RequestWithUser, @Body() dto: StartRideDto) { return this.service.start(req.user.id, dto); }
  @Get() history(@Req() req: RequestWithUser, @Query() query: RideHistoryQueryDto) {
    return this.service.history(req.user.id, query);
  }
  @Post(':id/end') end(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: EndRideDto) { return this.service.end(req.user.id, id, dto); }
  @Post(':id/location') location(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: RecordRideLocationDto,
  ) {
    return this.service.recordLocation(req.user.id, id, dto);
  }
  @Get(':id/share') share(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    // Kept as a fallback for older app versions while they update.
    @Query('liveLocationUrl') legacyLiveLocationUrl?: string,
  ) {
    return this.service.share(
      req.user.id,
      id,
      this.queryCoordinate(latitude),
      this.queryCoordinate(longitude),
      legacyLiveLocationUrl,
    );
  }

  private queryCoordinate(value?: string) {
    if (value == null || value.trim() === '') return undefined;
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : undefined;
  }
}

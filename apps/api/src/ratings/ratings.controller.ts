import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { RequestWithUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { CreateRatingDto, ModerateRatingDto } from './dto/rating.dto';
import { RatingsService } from './ratings.service';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly service: RatingsService) {}
  @Roles(UserRole.PASSENGER) @Post() create(@Req() req: RequestWithUser, @Body() dto: CreateRatingDto) { return this.service.create(req.user.id, dto); }
  @Roles(UserRole.PASSENGER) @Get('mine') mine(@Req() req: RequestWithUser) { return this.service.mine(req.user.id); }
  @Roles(UserRole.DRIVER) @Get('driver/me') driverStatistics(@Req() req: RequestWithUser) { return this.service.driverStatistics(req.user.id); }
  @Roles(UserRole.LGU_ADMIN) @Get('admin/summary') summaries() { return this.service.summaries(); }
  @Roles(UserRole.LGU_ADMIN) @Get('admin/all') all() { return this.service.all(); }
  @Roles(UserRole.LGU_ADMIN) @Patch('admin/:id') moderate(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: ModerateRatingDto) { return this.service.moderate(req.user.id, id, dto); }
}

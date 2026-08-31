import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { RequestWithUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { DraftIncidentDto, ReviewIncidentDto, SubmitIncidentDto, UpdateIncidentDraftDto } from './dto/incident.dto';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  @Roles(UserRole.PASSENGER) @Post('draft') draft(@Req() req: RequestWithUser, @Body() dto: DraftIncidentDto) { return this.service.createDraft(req.user.id, dto); }
  @Roles(UserRole.PASSENGER) @Get() mine(@Req() req: RequestWithUser) { return this.service.listForPassenger(req.user.id); }
  @Roles(UserRole.PASSENGER) @Get('ride/:rideId') forRide(@Req() req: RequestWithUser, @Param('rideId') rideId: string) { return this.service.incidentForRide(req.user.id, rideId); }
  @Roles(UserRole.PASSENGER) @Patch(':id/draft') updateDraft(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateIncidentDraftDto) { return this.service.updateDraft(req.user.id, id, dto); }
  @Roles(UserRole.PASSENGER) @Post(':id/submit') submit(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: SubmitIncidentDto) { return this.service.submit(req.user.id, id, dto); }
  @Roles(UserRole.LGU_ADMIN) @Get('admin/all') all() { return this.service.listForLgu(); }
  @Roles(UserRole.LGU_ADMIN) @Patch('admin/:id/review') review(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: ReviewIncidentDto) { return this.service.review(req.user.id, id, dto); }
}

import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { CreateAnnouncementDto } from './dto/announcement.dto';
import { RequestWithUser } from '../auth/auth.types';

@Controller('admin')
@Roles(UserRole.LGU_ADMIN)
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('audit-logs') auditLogs(@Query('limit') limit?: string) { return this.service.auditLogs(limit ? Number(limit) : undefined); }
  @Post('announcements') announce(@Req() req: RequestWithUser, @Body() dto: CreateAnnouncementDto) { return this.service.createAnnouncement(req.user.id, dto); }
}

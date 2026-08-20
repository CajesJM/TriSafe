import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { CreateAnnouncementDto } from './dto/announcement.dto';
import type { RequestWithUser } from '../auth/auth.types';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RideAnalyticsQueryDto } from './dto/ride-analytics-query.dto';
import { CreateViolationDto, UpdateViolationDto } from './dto/violation.dto';

@Controller('admin')
@Roles(UserRole.LGU_ADMIN)
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('ride-analytics') rideAnalytics(@Query() query: RideAnalyticsQueryDto) { return this.service.rideAnalytics(query); }
  @Get('weather') weather(@Query('latitude') latitude?: string, @Query('longitude') longitude?: string, @Query('locationName') locationName?: string) {
    return this.service.weather(latitude, longitude, locationName);
  }
  @Get('users') users(@Query() query: ListUsersQueryDto) { return this.service.users(query); }
  @Get('users/:id') user(@Param('id') id: string) { return this.service.user(id); }
  @Post('users') createUser(@Req() req: RequestWithUser, @Body() dto: CreateUserDto) { return this.service.createUser(req.user.id, dto); }
  @Patch('users/:id') updateUser(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateUserDto) { return this.service.updateUser(req.user.id, id, dto); }
  @Delete('users/:id') deleteUser(@Req() req: RequestWithUser, @Param('id') id: string) { return this.service.deleteUser(req.user.id, id); }
  @Delete('drivers/:id') deleteDriver(@Req() req: RequestWithUser, @Param('id') id: string) { return this.service.deleteDriver(req.user.id, id); }
  @Get('roles') roles() { return this.service.roles(); }
  @Post('roles') createRole(@Req() req: RequestWithUser, @Body() dto: CreateRoleDto) { return this.service.createRole(req.user.id, dto); }
  @Patch('roles/:id') updateRole(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateRoleDto) { return this.service.updateRole(req.user.id, id, dto); }
  @Delete('roles/:id') deleteRole(@Req() req: RequestWithUser, @Param('id') id: string) { return this.service.deleteRole(req.user.id, id); }
  @Get('audit-logs') auditLogs(@Query('limit') limit?: string) { return this.service.auditLogs(limit ? Number(limit) : undefined); }
  @Get('announcements') announcements() { return this.service.announcements(); }
  @Post('announcements') announce(@Req() req: RequestWithUser, @Body() dto: CreateAnnouncementDto) { return this.service.createAnnouncement(req.user.id, dto); }
  @Get('violations') violations() { return this.service.violations(); }
  @Post('violations') createViolation(@Req() req: RequestWithUser, @Body() dto: CreateViolationDto) { return this.service.createViolation(req.user.id, dto); }
  @Patch('violations/:id') updateViolation(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateViolationDto) { return this.service.updateViolation(req.user.id, id, dto); }
}

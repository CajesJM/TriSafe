import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SafetyService } from './safety.service';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import type { RequestWithUser } from '../auth/auth.types';
import { SaveTrustedContactDto } from './dto/trusted-contact.dto';

@Controller('safety')
export class SafetyController {
  constructor(private readonly service: SafetyService) {}
  @Public() @Get('emergency-contacts') contacts() { return this.service.contacts(); }
  @Roles(UserRole.PASSENGER) @Get('trusted-contacts') trusted(@Req() req: RequestWithUser) { return this.service.trustedContacts(req.user.id); }
  @Roles(UserRole.PASSENGER) @Post('trusted-contacts') createTrusted(@Req() req: RequestWithUser, @Body() dto: SaveTrustedContactDto) { return this.service.createTrustedContact(req.user.id, dto); }
  @Roles(UserRole.PASSENGER) @Patch('trusted-contacts/:id') updateTrusted(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: SaveTrustedContactDto) { return this.service.updateTrustedContact(req.user.id, id, dto); }
  @Roles(UserRole.PASSENGER) @Delete('trusted-contacts/:id') deleteTrusted(@Req() req: RequestWithUser, @Param('id') id: string) { return this.service.deleteTrustedContact(req.user.id, id); }
}

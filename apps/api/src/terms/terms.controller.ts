import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { RequestWithUser } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { SaveTermsDto } from './dto/terms.dto';
import { TermsService } from './terms.service';

@Controller('terms')
export class TermsController {
  constructor(private readonly service: TermsService) {}
  @Public() @Get('current') current() { return this.service.current(); }
  @Roles(UserRole.LGU_ADMIN) @Get('admin') list() { return this.service.list(); }
  @Roles(UserRole.LGU_ADMIN) @Post('admin') create(@Req() req: RequestWithUser, @Body() dto: SaveTermsDto) { return this.service.create(req.user.id, dto); }
  @Roles(UserRole.LGU_ADMIN) @Patch('admin/:id') update(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: SaveTermsDto) { return this.service.update(req.user.id, id, dto); }
  @Roles(UserRole.LGU_ADMIN) @Post('admin/:id/publish') publish(@Req() req: RequestWithUser, @Param('id') id: string) { return this.service.publish(req.user.id, id); }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CreateFareRuleDto } from './dto/create-fare-rule.dto';
import { FareEstimateDto } from './dto/fare-estimate.dto';
import { FaresService } from './fares.service';
import { Public } from '../auth/public.decorator';
import { RequestWithUser } from '../auth/auth.types';

@Controller()
export class FaresController {
  constructor(private readonly service: FaresService) {}

  @Public() @Get('locations') locations() { return this.service.listLocations(); }
  @Public() @Get('fare-estimates') estimate(@Query() dto: FareEstimateDto) { return this.service.estimate(dto); }

  @Roles(UserRole.LGU_ADMIN)
  @Get('admin/fare-rules') rules() { return this.service.listRules(); }

  @Roles(UserRole.LGU_ADMIN)
  @Post('admin/fare-rules') create(@Req() req: RequestWithUser, @Body() dto: CreateFareRuleDto) { return this.service.createRule(req.user.id, dto); }

  @Roles(UserRole.LGU_ADMIN)
  @Patch('admin/fare-rules/:id') update(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: CreateFareRuleDto) { return this.service.updateRule(req.user.id, id, dto); }

  @Roles(UserRole.LGU_ADMIN)
  @Delete('admin/fare-rules/:id') deactivate(@Req() req: RequestWithUser, @Param('id') id: string) { return this.service.deactivateRule(req.user.id, id); }

  @Roles(UserRole.LGU_ADMIN)
  @Post('admin/fare-rules/:id/activate') activate(@Req() req: RequestWithUser, @Param('id') id: string) { return this.service.activateRule(req.user.id, id); }
}

import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { DriversService } from './drivers.service';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { UpdateDriverContactDto } from './dto/update-driver-contact.dto';
import { Public } from '../auth/public.decorator';
import type { RequestWithUser } from '../auth/auth.types';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { BoholLocationService } from './bohol-location.service';

@Controller()
export class DriversController {
  constructor(
    private readonly service: DriversService,
    private readonly locations: BoholLocationService,
  ) {}

  @Public() @Get('vehicles/verify/:token') verify(@Param('token') token: string) { return this.service.verifyQr(token); }

  @Roles(UserRole.LGU_ADMIN)
  @Post('admin/drivers') register(@Req() req: RequestWithUser, @Body() dto: RegisterDriverDto) { return this.service.registerApprovedDriver(req.user.id, dto); }

  @Roles(UserRole.LGU_ADMIN)
  @Get('admin/locations/bohol') province() { return this.locations.province(); }

  @Roles(UserRole.LGU_ADMIN)
  @Get('admin/locations/bohol/municipalities') municipalities() { return this.locations.municipalities(); }

  @Roles(UserRole.LGU_ADMIN)
  @Get('admin/locations/bohol/municipalities/:municipalityCode/barangays')
  barangays(@Param('municipalityCode') municipalityCode: string) {
    return this.locations.barangays(municipalityCode);
  }

  @Roles(UserRole.LGU_ADMIN)
  @Get('admin/locations/bohol/municipalities/:municipalityCode/barangays/:barangayCode/streets')
  streets(
    @Param('municipalityCode') municipalityCode: string,
    @Param('barangayCode') barangayCode: string,
    @Query('q') query = '',
  ) {
    return this.locations.streetSuggestions(municipalityCode, barangayCode, query);
  }

  @Roles(UserRole.LGU_ADMIN)
  @Get('admin/drivers') list() { return this.service.list(); }

  @Roles(UserRole.LGU_ADMIN)
  @Patch('admin/drivers/:id/franchise') updateFranchise(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateFranchiseDto) { return this.service.updateFranchise(req.user.id, id, dto); }

  @Roles(UserRole.LGU_ADMIN)
  @Patch('admin/drivers/:id/status') updateStatus(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateDriverStatusDto) { return this.service.updateStatus(req.user.id, id, dto); }

  @Roles(UserRole.LGU_ADMIN)
  @Post('admin/vehicles/:vehicleId/qr') rotateQr(@Req() req: RequestWithUser, @Param('vehicleId') vehicleId: string) { return this.service.rotateQr(req.user.id, vehicleId); }

  @Roles(UserRole.DRIVER)
  @Get('drivers/me') me(@Req() req: RequestWithUser) { return this.service.getByUserId(req.user.id); }

  @Roles(UserRole.DRIVER)
  @Get('drivers/me/announcements') announcements(@Req() req: RequestWithUser) { return this.service.announcements(req.user.id); }

  @Roles(UserRole.DRIVER)
  @Patch('drivers/me/announcements/:announcementId/read') markAnnouncementRead(@Req() req: RequestWithUser, @Param('announcementId') announcementId: string) { return this.service.markAnnouncementRead(req.user.id, announcementId); }

  @Roles(UserRole.DRIVER)
  @Get('drivers/me/notifications') notifications(@Req() req: RequestWithUser) { return this.service.notifications(req.user.id); }

  @Roles(UserRole.DRIVER)
  @Patch('drivers/me/contact') updateContact(@Req() req: RequestWithUser, @Body() dto: UpdateDriverContactDto) { return this.service.updateContact(req.user.id, dto); }

  @Roles(UserRole.LGU_ADMIN)
  @Get('drivers/:id') get(@Param('id') id: string) { return this.service.getDriver(id); }
}

import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { FaresService } from './fares.service';
import type { RequestWithUser } from '../auth/auth.types';
import {
  DistanceFareEstimateDto,
  SaveVehicleFarePolicyDto,
} from './dto/vehicle-fare-policy.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';

@Controller()
export class FaresController {
  constructor(private readonly service: FaresService) {}

  @Roles(UserRole.PASSENGER)
  @Post('distance-fare-estimates')
  estimateDistance(@Body() dto: DistanceFareEstimateDto) {
    return this.service.estimateDistance(dto);
  }

  @Roles(UserRole.PASSENGER)
  @Post('fare-location-names')
  locationName(@Body() dto: ReverseGeocodeDto) {
    return this.service.reverseGeocode(dto);
  }

  @Roles(UserRole.LGU_ADMIN)
  @Get('admin/vehicle-fare-policies') vehiclePolicies() { return this.service.listVehiclePolicies(); }

  @Roles(UserRole.LGU_ADMIN)
  @Post('admin/vehicle-fare-policies') saveVehiclePolicy(
    @Req() req: RequestWithUser,
    @Body() dto: SaveVehicleFarePolicyDto,
  ) {
    return this.service.saveVehiclePolicy(req.user.id, dto);
  }

}

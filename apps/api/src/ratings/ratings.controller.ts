import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { RequestWithUser } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { CreateRatingDto, ResetDriverRatingsDto } from "./dto/rating.dto";
import { RatingsService } from "./ratings.service";

@Controller("ratings")
export class RatingsController {
  constructor(private readonly service: RatingsService) {}
  @Roles(UserRole.PASSENGER) @Post() create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateRatingDto,
  ) {
    return this.service.create(req.user.id, dto);
  }
  @Roles(UserRole.PASSENGER) @Get("mine") mine(@Req() req: RequestWithUser) {
    return this.service.mine(req.user.id);
  }
  @Roles(UserRole.DRIVER) @Get("driver/me") driverStatistics(
    @Req() req: RequestWithUser,
  ) {
    return this.service.driverStatistics(req.user.id);
  }
  @Roles(UserRole.LGU_ADMIN) @Get("admin/summary") summaries() {
    return this.service.summaries();
  }
  @Roles(UserRole.LGU_ADMIN) @Get("admin/all") all() {
    return this.service.all();
  }
  @Roles(UserRole.LGU_ADMIN) @Get("admin/driver/:driverId") byDriver(
    @Param("driverId") driverId: string,
  ) {
    return this.service.byDriver(driverId);
  }
  @Roles(UserRole.LGU_ADMIN)
  @Delete("admin/driver/:driverId")
  resetDriverRatings(
    @Req() req: RequestWithUser,
    @Param("driverId") driverId: string,
    @Body() dto: ResetDriverRatingsDto,
  ) {
    return this.service.resetDriverRatings(
      req.user.id,
      driverId,
      dto.confirmation,
    );
  }
}

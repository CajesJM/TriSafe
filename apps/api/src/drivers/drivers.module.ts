import { Module } from "@nestjs/common";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";
import { DriverStatusService } from "./driver-status.service";
import { BoholLocationService } from "./bohol-location.service";
import { DriverNotificationsService } from './driver-notifications.service';

@Module({
  controllers: [DriversController],
  providers: [DriversService, DriverStatusService, BoholLocationService, DriverNotificationsService],
  exports: [DriversService, DriverStatusService, BoholLocationService, DriverNotificationsService],
})
export class DriversModule {}

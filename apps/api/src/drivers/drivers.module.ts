import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriverStatusService } from './driver-status.service';
import { BoholLocationService } from './bohol-location.service';

@Module({ controllers: [DriversController], providers: [DriversService, DriverStatusService, BoholLocationService], exports: [DriversService, DriverStatusService, BoholLocationService] })
export class DriversModule {}

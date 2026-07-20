import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriverStatusService } from './driver-status.service';

@Module({ controllers: [DriversController], providers: [DriversService, DriverStatusService], exports: [DriversService, DriverStatusService] })
export class DriversModule {}

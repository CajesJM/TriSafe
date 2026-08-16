import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DriversModule } from '../drivers/drivers.module';

@Module({ imports: [DriversModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
